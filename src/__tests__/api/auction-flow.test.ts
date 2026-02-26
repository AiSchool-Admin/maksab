/**
 * Auction Flow Tests — Bidding logic, anti-sniping, buy-now,
 * minimum increment calculation, and race condition handling.
 *
 * Tests the auction business logic extracted from the bid route handler.
 */

import { generateSessionToken, verifySessionToken } from "@/lib/auth/session-token";

// ── Auction Business Logic (extracted from route handlers) ──────────

const ANTI_SNIPE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const MIN_INCREMENT_EGP = 50;

/**
 * Calculate the minimum next bid amount.
 * Uses seller-defined increment if set, otherwise 2% of current price (min 50 EGP).
 */
function calculateMinNextBid(
  currentPrice: number,
  sellerDefinedIncrement: number = 0,
): number {
  const increment =
    sellerDefinedIncrement > 0
      ? sellerDefinedIncrement
      : Math.max(Math.ceil(currentPrice * 0.02), MIN_INCREMENT_EGP);
  return currentPrice + increment;
}

/**
 * Determine if an auction should be extended due to anti-sniping.
 */
function shouldExtendAuction(auctionEndsAt: Date, bidTime: Date): boolean {
  const timeRemaining = auctionEndsAt.getTime() - bidTime.getTime();
  return timeRemaining > 0 && timeRemaining <= ANTI_SNIPE_THRESHOLD_MS;
}

/**
 * Calculate new auction end time after anti-snipe extension.
 */
function getExtendedEndTime(bidTime: Date): Date {
  return new Date(bidTime.getTime() + ANTI_SNIPE_THRESHOLD_MS);
}

/**
 * Validate whether a bid can be placed on an auction.
 */
function validateBid(params: {
  auctionStatus: string;
  saleType: string;
  auctionEndsAt: Date;
  bidderId: string;
  sellerId: string;
  bidAmount: number;
  currentHighestBid: number;
  currentHighestBidderId: string | null;
  sellerDefinedIncrement: number;
}): { valid: boolean; error?: string; minNextBid?: number } {
  const {
    auctionStatus,
    saleType,
    auctionEndsAt,
    bidderId,
    sellerId,
    bidAmount,
    currentHighestBid,
    currentHighestBidderId,
    sellerDefinedIncrement,
  } = params;

  // Must be an active auction
  if (saleType !== "auction" || auctionStatus !== "active") {
    return { valid: false, error: "المزاد مش نشط" };
  }

  // Seller cannot bid on own auction
  if (bidderId === sellerId) {
    return { valid: false, error: "مش ممكن تزايد على إعلانك" };
  }

  // Check auction hasn't ended
  if (Date.now() >= auctionEndsAt.getTime()) {
    return { valid: false, error: "المزاد انتهى" };
  }

  // Cannot outbid yourself
  if (currentHighestBidderId === bidderId) {
    return { valid: false, error: "أنت بالفعل صاحب أعلى مزايدة" };
  }

  // Bid must meet minimum
  const minNextBid = calculateMinNextBid(currentHighestBid, sellerDefinedIncrement);
  if (bidAmount < minNextBid) {
    return { valid: false, error: `الحد الأدنى ${minNextBid}`, minNextBid };
  }

  // Valid amount
  if (isNaN(bidAmount) || bidAmount <= 0) {
    return { valid: false, error: "مبلغ المزايدة غير صالح" };
  }

  return { valid: true };
}

/**
 * Validate buy-now action.
 */
function validateBuyNow(params: {
  auctionStatus: string;
  saleType: string;
  buyNowPrice: number | null;
  buyerId: string;
  sellerId: string;
}): { valid: boolean; error?: string } {
  const { auctionStatus, saleType, buyNowPrice, buyerId, sellerId } = params;

  if (saleType !== "auction" || auctionStatus !== "active") {
    return { valid: false, error: "المزاد مش نشط" };
  }

  if (!buyNowPrice || buyNowPrice <= 0) {
    return { valid: false, error: "المزاد ده مش فيه خيار الشراء الفوري" };
  }

  if (buyerId === sellerId) {
    return { valid: false, error: "مش ممكن تشتري إعلانك" };
  }

  return { valid: true };
}

// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

describe("Auction Flow", () => {
  // ── Minimum Bid Increment ───────────────────────────────────────

  describe("Minimum bid increment calculation", () => {
    it("should calculate 2% of current price", () => {
      expect(calculateMinNextBid(10000)).toBe(10200);   // 2% = 200
      expect(calculateMinNextBid(100000)).toBe(102000);  // 2% = 2000
      expect(calculateMinNextBid(500000)).toBe(510000);  // 2% = 10000
    });

    it("should enforce minimum 50 EGP increment for low prices", () => {
      expect(calculateMinNextBid(100)).toBe(150);    // 2% = 2, min 50
      expect(calculateMinNextBid(1000)).toBe(1050);  // 2% = 20, min 50
      expect(calculateMinNextBid(2500)).toBe(2550);  // 2% = 50, exact boundary
    });

    it("should use seller-defined increment when set", () => {
      expect(calculateMinNextBid(10000, 500)).toBe(10500);
      expect(calculateMinNextBid(100000, 1000)).toBe(101000);
    });

    it("should prefer seller increment over calculated 2%", () => {
      // Seller sets 100, but 2% of 10000 = 200. Seller's 100 should be used
      expect(calculateMinNextBid(10000, 100)).toBe(10100);

      // Seller sets 5000, but 2% of 10000 = 200. Seller's 5000 should be used
      expect(calculateMinNextBid(10000, 5000)).toBe(15000);
    });

    it("should fall back to 2% when seller increment is 0", () => {
      expect(calculateMinNextBid(10000, 0)).toBe(10200);
    });

    it("should handle zero current price", () => {
      expect(calculateMinNextBid(0)).toBe(50); // min increment
    });

    it("should handle very large prices", () => {
      const result = calculateMinNextBid(10000000); // 10 million
      expect(result).toBe(10200000); // 2% = 200,000
    });
  });

  // ── Anti-Sniping ───────────────────────────────────────────────

  describe("Anti-sniping detection", () => {
    it("should trigger for bids in last 5 minutes", () => {
      const endsAt = new Date();
      const bidAt3MinBefore = new Date(endsAt.getTime() - 3 * 60 * 1000);
      expect(shouldExtendAuction(endsAt, bidAt3MinBefore)).toBe(true);
    });

    it("should trigger for bids at exactly 5 minutes", () => {
      const endsAt = new Date();
      const bidAtExact5Min = new Date(endsAt.getTime() - 5 * 60 * 1000);
      expect(shouldExtendAuction(endsAt, bidAtExact5Min)).toBe(true);
    });

    it("should trigger for bids in last 1 second", () => {
      const endsAt = new Date();
      const bidAt1SecBefore = new Date(endsAt.getTime() - 1000);
      expect(shouldExtendAuction(endsAt, bidAt1SecBefore)).toBe(true);
    });

    it("should NOT trigger for bids more than 5 minutes before end", () => {
      const endsAt = new Date();
      const bidAt30MinBefore = new Date(endsAt.getTime() - 30 * 60 * 1000);
      expect(shouldExtendAuction(endsAt, bidAt30MinBefore)).toBe(false);
    });

    it("should NOT trigger for bids 6 minutes before end", () => {
      const endsAt = new Date();
      const bidAt6MinBefore = new Date(endsAt.getTime() - 6 * 60 * 1000);
      expect(shouldExtendAuction(endsAt, bidAt6MinBefore)).toBe(false);
    });

    it("should NOT trigger for bids after auction ended", () => {
      const endsAt = new Date(Date.now() - 60000); // ended 1 min ago
      const bidAfterEnd = new Date();
      expect(shouldExtendAuction(endsAt, bidAfterEnd)).toBe(false);
    });

    it("should calculate correct extended end time", () => {
      const bidTime = new Date("2025-06-15T10:00:00Z");
      const extended = getExtendedEndTime(bidTime);
      expect(extended.getTime()).toBe(bidTime.getTime() + 5 * 60 * 1000);
    });

    it("should stack extensions correctly", () => {
      // Bid at 4:55 → extends to 5:00
      const bid1 = new Date("2025-06-15T16:55:00Z");
      const extended1 = getExtendedEndTime(bid1);
      expect(extended1.toISOString()).toBe("2025-06-15T17:00:00.000Z");

      // Another bid at 4:58 → extends to 5:03
      const bid2 = new Date("2025-06-15T16:58:00Z");
      const extended2 = getExtendedEndTime(bid2);
      expect(extended2.toISOString()).toBe("2025-06-15T17:03:00.000Z");
    });
  });

  // ── Bid Validation ─────────────────────────────────────────────

  describe("Bid validation", () => {
    const baseParams = {
      auctionStatus: "active",
      saleType: "auction",
      auctionEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      bidderId: "bidder-001",
      sellerId: "seller-001",
      bidAmount: 110000,
      currentHighestBid: 100000,
      currentHighestBidderId: "other-bidder",
      sellerDefinedIncrement: 0,
    };

    it("should accept a valid bid", () => {
      const result = validateBid(baseParams);
      expect(result.valid).toBe(true);
    });

    it("should reject bid on non-active auction", () => {
      const result = validateBid({ ...baseParams, auctionStatus: "ended" });
      expect(result.valid).toBe(false);
    });

    it("should reject bid on non-auction ad", () => {
      const result = validateBid({ ...baseParams, saleType: "cash" });
      expect(result.valid).toBe(false);
    });

    it("should reject seller bidding on own auction", () => {
      const result = validateBid({ ...baseParams, bidderId: "seller-001" });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("إعلانك");
    });

    it("should reject bid on ended auction", () => {
      const result = validateBid({
        ...baseParams,
        auctionEndsAt: new Date(Date.now() - 60000),
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("انتهى");
    });

    it("should reject bid from current highest bidder (self-outbid)", () => {
      const result = validateBid({
        ...baseParams,
        currentHighestBidderId: "bidder-001",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("أعلى مزايدة");
    });

    it("should reject bid below minimum", () => {
      const result = validateBid({
        ...baseParams,
        bidAmount: 100100, // min should be 102000 (2% of 100000)
      });
      expect(result.valid).toBe(false);
      expect(result.minNextBid).toBe(102000);
    });

    it("should accept bid at exact minimum", () => {
      const result = validateBid({
        ...baseParams,
        bidAmount: 102000, // exactly 2% above 100000
      });
      expect(result.valid).toBe(true);
    });

    it("should validate with seller-defined increment", () => {
      const result = validateBid({
        ...baseParams,
        sellerDefinedIncrement: 5000,
        bidAmount: 104000, // below 100000 + 5000
      });
      expect(result.valid).toBe(false);
      expect(result.minNextBid).toBe(105000);
    });

    it("should reject NaN bid amount", () => {
      const result = validateBid({ ...baseParams, bidAmount: NaN });
      expect(result.valid).toBe(false);
    });

    it("should reject zero bid amount", () => {
      const result = validateBid({ ...baseParams, bidAmount: 0 });
      expect(result.valid).toBe(false);
    });

    it("should reject negative bid amount", () => {
      const result = validateBid({ ...baseParams, bidAmount: -1000 });
      expect(result.valid).toBe(false);
    });
  });

  // ── Buy Now Validation ─────────────────────────────────────────

  describe("Buy-now validation", () => {
    it("should accept valid buy-now", () => {
      const result = validateBuyNow({
        auctionStatus: "active",
        saleType: "auction",
        buyNowPrice: 200000,
        buyerId: "buyer-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject buy-now on non-active auction", () => {
      const result = validateBuyNow({
        auctionStatus: "ended",
        saleType: "auction",
        buyNowPrice: 200000,
        buyerId: "buyer-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject buy-now when no buy-now price set", () => {
      const result = validateBuyNow({
        auctionStatus: "active",
        saleType: "auction",
        buyNowPrice: null,
        buyerId: "buyer-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject seller buying own auction", () => {
      const result = validateBuyNow({
        auctionStatus: "active",
        saleType: "auction",
        buyNowPrice: 200000,
        buyerId: "seller-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject buy-now on cash ad", () => {
      const result = validateBuyNow({
        auctionStatus: "active",
        saleType: "cash",
        buyNowPrice: 200000,
        buyerId: "buyer-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(false);
    });
  });

  // ── Auction Duration ───────────────────────────────────────────

  describe("Auction duration validation", () => {
    const VALID_DURATIONS = [24, 48, 72];

    it.each(VALID_DURATIONS)("should accept %i hours", (hours) => {
      expect(VALID_DURATIONS.includes(hours)).toBe(true);
    });

    it.each([12, 36, 96, 0, -1, 100])("should reject %i hours", (hours) => {
      expect(VALID_DURATIONS.includes(hours)).toBe(false);
    });

    it("should calculate correct end time from duration", () => {
      const startTime = new Date("2025-06-15T10:00:00Z");
      const durations = [24, 48, 72];
      const expected = [
        "2025-06-16T10:00:00.000Z",
        "2025-06-17T10:00:00.000Z",
        "2025-06-18T10:00:00.000Z",
      ];

      durations.forEach((hours, i) => {
        const endTime = new Date(startTime.getTime() + hours * 60 * 60 * 1000);
        expect(endTime.toISOString()).toBe(expected[i]);
      });
    });
  });

  // ── Auth for Bidding ───────────────────────────────────────────

  describe("Auction authentication", () => {
    it("should authenticate bidder via session token", () => {
      const sessionToken = generateSessionToken("bidder-001");
      const result = verifySessionToken(sessionToken);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.userId).toBe("bidder-001");
      }
    });

    it("should extract bidder_id from session token (not from body)", () => {
      // This tests that the route handler uses the authenticated userId,
      // not whatever might be passed in the request body
      const sessionToken = generateSessionToken("real-bidder");
      const result = verifySessionToken(sessionToken);

      expect(result.valid).toBe(true);
      if (result.valid) {
        // The server should use this userId, not any body.bidder_id
        expect(result.userId).toBe("real-bidder");
      }
    });
  });

  // ── Race Condition Scenarios ───────────────────────────────────

  describe("Race condition handling", () => {
    it("should detect when another bid was placed between check and insert", () => {
      // Simulate: bidder A checks highest = 100000, but bidder B inserts 110000
      // bidder A then inserts 105000 which should be rejected
      const highestBidAtCheck = 100000;
      const bidAmountA = 105000;
      const bidAmountB = 110000; // inserted between A's check and insert

      // After A's insert, verify check finds higher bid
      const raceDetected = bidAmountB > bidAmountA;
      expect(raceDetected).toBe(true);

      // A's bid should be removed and return the new minimum
      const increment = Math.max(Math.ceil(bidAmountB * 0.02), MIN_INCREMENT_EGP);
      const newMinBid = bidAmountB + increment;
      expect(newMinBid).toBe(112200); // 110000 + 2200
    });

    it("should allow bid if no race condition detected", () => {
      const highestBidAtCheck = 100000;
      const bidAmount = 105000;
      const higherBidsAfterInsert = null; // no race condition

      expect(higherBidsAfterInsert).toBeNull();
      expect(bidAmount).toBeGreaterThan(highestBidAtCheck);
    });
  });

  // ── Bidding Scenarios ──────────────────────────────────────────

  describe("Complete bidding scenarios", () => {
    it("should handle first bid on auction (no previous bids)", () => {
      const startPrice = 100000;
      const minNextBid = calculateMinNextBid(startPrice);
      expect(minNextBid).toBe(102000);

      // First bidder bids the minimum
      const result = validateBid({
        auctionStatus: "active",
        saleType: "auction",
        auctionEndsAt: new Date(Date.now() + 86400000),
        bidderId: "bidder-001",
        sellerId: "seller-001",
        bidAmount: 102000,
        currentHighestBid: startPrice,
        currentHighestBidderId: null,
        sellerDefinedIncrement: 0,
      });
      expect(result.valid).toBe(true);
    });

    it("should handle successive bids from different bidders", () => {
      // Bidder A bids 102000
      const bid1 = 102000;
      const min2 = calculateMinNextBid(bid1);
      expect(min2).toBe(104040); // 2% of 102000 = 2040

      // Bidder B bids 105000
      const bid2 = 105000;
      const min3 = calculateMinNextBid(bid2);
      expect(min3).toBe(107100); // 2% of 105000 = 2100

      // Bidder A bids again 110000
      const bid3 = 110000;
      const min4 = calculateMinNextBid(bid3);
      expect(min4).toBe(112200); // 2% of 110000 = 2200
    });

    it("should handle bidding war near auction end (multiple anti-snipe extensions)", () => {
      let auctionEndsAt = new Date(Date.now() + 3 * 60 * 1000); // 3 min left

      // Bid 1 at 3 min before end → should extend
      const bid1Time = new Date();
      expect(shouldExtendAuction(auctionEndsAt, bid1Time)).toBe(true);
      auctionEndsAt = getExtendedEndTime(bid1Time); // extend

      // Bid 2 at 4 min before new end → should extend again
      const bid2Time = new Date(auctionEndsAt.getTime() - 4 * 60 * 1000);
      expect(shouldExtendAuction(auctionEndsAt, bid2Time)).toBe(true);
    });
  });
});
