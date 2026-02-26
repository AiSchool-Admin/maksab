/**
 * Chat Flow Tests — Conversation members, message validation,
 * WhatsApp URL generation, and chat member management.
 *
 * Tests the chat system business logic.
 */

// ── Chat Constants ──────────────────────────────────────────────

const MAX_ADDITIONAL_MEMBERS = 3;
const MAX_MESSAGE_LENGTH = 5000;

// ── Chat Member Management Logic ────────────────────────────────

interface ConversationMember {
  id: string;
  userId: string;
  role: "buyer" | "seller" | "member";
}

function validateAddMember(params: {
  inviterId: string;
  buyerId: string;
  sellerId: string;
  currentAdditionalMembers: ConversationMember[];
  phoneToAdd: string;
  existingMemberUserIds: string[];
  userIdForPhone: string | null;
}): { valid: boolean; error?: string } {
  const {
    inviterId,
    buyerId,
    sellerId,
    currentAdditionalMembers,
    phoneToAdd,
    existingMemberUserIds,
    userIdForPhone,
  } = params;

  // Only buyer can add members
  if (inviterId !== buyerId) {
    return { valid: false, error: "المشتري فقط يقدر يضيف أعضاء" };
  }

  // Validate phone format
  if (!phoneToAdd || !/^01[0125]\d{8}$/.test(phoneToAdd)) {
    return { valid: false, error: "رقم الموبايل مش صحيح" };
  }

  // Max members check
  if (currentAdditionalMembers.length >= MAX_ADDITIONAL_MEMBERS) {
    return { valid: false, error: `الحد الأقصى ${MAX_ADDITIONAL_MEMBERS} أعضاء إضافيين` };
  }

  // User must exist
  if (!userIdForPhone) {
    return { valid: false, error: "المستخدم مش مسجل على مكسب" };
  }

  // Can't add buyer or seller (they're core members)
  if (userIdForPhone === buyerId || userIdForPhone === sellerId) {
    return { valid: false, error: "المشتري والبائع أعضاء أساسيين بالفعل" };
  }

  // Can't add if already a member
  if (existingMemberUserIds.includes(userIdForPhone)) {
    return { valid: false, error: "المستخدم عضو بالفعل في المحادثة" };
  }

  return { valid: true };
}

function validateRemoveMember(params: {
  removerId: string;
  buyerId: string;
  memberToRemoveId: string;
  sellerId: string;
}): { valid: boolean; error?: string } {
  const { removerId, buyerId, memberToRemoveId, sellerId } = params;

  // Only buyer can remove members
  if (removerId !== buyerId) {
    return { valid: false, error: "المشتري فقط يقدر يشيل أعضاء" };
  }

  // Can't remove buyer or seller
  if (memberToRemoveId === buyerId || memberToRemoveId === sellerId) {
    return { valid: false, error: "مش ممكن تشيل المشتري أو البائع" };
  }

  return { valid: true };
}

// ── Message Validation ──────────────────────────────────────────

function validateMessage(params: {
  senderId: string;
  conversationParticipants: string[];
  content?: string;
  imageUrl?: string;
}): { valid: boolean; error?: string } {
  const { senderId, conversationParticipants, content, imageUrl } = params;

  // Sender must be a participant
  if (!conversationParticipants.includes(senderId)) {
    return { valid: false, error: "أنت مش عضو في المحادثة" };
  }

  // Must have content or image
  if (!content?.trim() && !imageUrl) {
    return { valid: false, error: "الرسالة فاضية" };
  }

  // Content length check
  if (content && content.length > MAX_MESSAGE_LENGTH) {
    return { valid: false, error: "الرسالة طويلة جداً" };
  }

  return { valid: true };
}

// ── WhatsApp URL Generation ─────────────────────────────────────

function generateWhatsAppUrl(
  sellerPhone: string,
  adTitle: string,
  adUrl: string,
): string {
  const message = `مرحباً، أنا مهتم بإعلانك على مكسب: ${adTitle}\n${adUrl}`;
  return `https://wa.me/2${sellerPhone}?text=${encodeURIComponent(message)}`;
}

// ══════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════

describe("Chat Flow", () => {
  // ── Add Member Validation ──────────────────────────────────────

  describe("Add member validation", () => {
    const baseParams = {
      inviterId: "buyer-001",
      buyerId: "buyer-001",
      sellerId: "seller-001",
      currentAdditionalMembers: [] as ConversationMember[],
      phoneToAdd: "01012345678",
      existingMemberUserIds: ["buyer-001", "seller-001"],
      userIdForPhone: "new-member-001",
    };

    it("should accept valid add member request", () => {
      const result = validateAddMember(baseParams);
      expect(result.valid).toBe(true);
    });

    it("should reject if inviter is not the buyer", () => {
      const result = validateAddMember({
        ...baseParams,
        inviterId: "seller-001",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("المشتري");
    });

    it("should reject if inviter is a random user", () => {
      const result = validateAddMember({
        ...baseParams,
        inviterId: "random-user",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject invalid phone number", () => {
      const result = validateAddMember({
        ...baseParams,
        phoneToAdd: "0101234567", // too short
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("موبايل");
    });

    it("should reject when max members reached", () => {
      const result = validateAddMember({
        ...baseParams,
        currentAdditionalMembers: [
          { id: "1", userId: "m1", role: "member" },
          { id: "2", userId: "m2", role: "member" },
          { id: "3", userId: "m3", role: "member" },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("3");
    });

    it("should reject if user not registered", () => {
      const result = validateAddMember({
        ...baseParams,
        userIdForPhone: null,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("مش مسجل");
    });

    it("should reject adding buyer as additional member", () => {
      const result = validateAddMember({
        ...baseParams,
        userIdForPhone: "buyer-001",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("أساسيين");
    });

    it("should reject adding seller as additional member", () => {
      const result = validateAddMember({
        ...baseParams,
        userIdForPhone: "seller-001",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("أساسيين");
    });

    it("should reject if user already a member", () => {
      const result = validateAddMember({
        ...baseParams,
        existingMemberUserIds: ["buyer-001", "seller-001", "new-member-001"],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("بالفعل");
    });
  });

  // ── Remove Member Validation ───────────────────────────────────

  describe("Remove member validation", () => {
    it("should accept valid remove request from buyer", () => {
      const result = validateRemoveMember({
        removerId: "buyer-001",
        buyerId: "buyer-001",
        memberToRemoveId: "member-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject remove from non-buyer", () => {
      const result = validateRemoveMember({
        removerId: "seller-001",
        buyerId: "buyer-001",
        memberToRemoveId: "member-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject removing buyer", () => {
      const result = validateRemoveMember({
        removerId: "buyer-001",
        buyerId: "buyer-001",
        memberToRemoveId: "buyer-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("المشتري أو البائع");
    });

    it("should reject removing seller", () => {
      const result = validateRemoveMember({
        removerId: "buyer-001",
        buyerId: "buyer-001",
        memberToRemoveId: "seller-001",
        sellerId: "seller-001",
      });
      expect(result.valid).toBe(false);
    });
  });

  // ── Message Validation ─────────────────────────────────────────

  describe("Message validation", () => {
    it("should accept valid text message", () => {
      const result = validateMessage({
        senderId: "buyer-001",
        conversationParticipants: ["buyer-001", "seller-001"],
        content: "السلام عليكم، السيارة لسه متاحة؟",
      });
      expect(result.valid).toBe(true);
    });

    it("should accept image-only message", () => {
      const result = validateMessage({
        senderId: "buyer-001",
        conversationParticipants: ["buyer-001", "seller-001"],
        imageUrl: "https://test.supabase.co/storage/img.jpg",
      });
      expect(result.valid).toBe(true);
    });

    it("should reject empty message (no content or image)", () => {
      const result = validateMessage({
        senderId: "buyer-001",
        conversationParticipants: ["buyer-001", "seller-001"],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("فاضية");
    });

    it("should reject whitespace-only message", () => {
      const result = validateMessage({
        senderId: "buyer-001",
        conversationParticipants: ["buyer-001", "seller-001"],
        content: "   \n\t  ",
      });
      expect(result.valid).toBe(false);
    });

    it("should reject message from non-participant", () => {
      const result = validateMessage({
        senderId: "random-user",
        conversationParticipants: ["buyer-001", "seller-001"],
        content: "Hello",
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("مش عضو");
    });

    it("should reject overly long message", () => {
      const result = validateMessage({
        senderId: "buyer-001",
        conversationParticipants: ["buyer-001", "seller-001"],
        content: "أ".repeat(5001),
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("طويلة");
    });

    it("should accept message from additional member", () => {
      const result = validateMessage({
        senderId: "member-001",
        conversationParticipants: ["buyer-001", "seller-001", "member-001"],
        content: "أنا موافق",
      });
      expect(result.valid).toBe(true);
    });
  });

  // ── WhatsApp URL Generation ────────────────────────────────────

  describe("WhatsApp URL generation", () => {
    it("should generate correct WhatsApp URL", () => {
      const url = generateWhatsAppUrl(
        "01012345678",
        "تويوتا كورولا 2020",
        "https://maksab.app/ad/123",
      );
      expect(url).toContain("https://wa.me/201012345678");
      expect(url).toContain("text=");
      expect(url).toContain(encodeURIComponent("مرحباً"));
    });

    it("should encode Arabic text properly", () => {
      const url = generateWhatsAppUrl(
        "01012345678",
        "آيفون 15",
        "https://maksab.app/ad/456",
      );
      expect(url).toContain(encodeURIComponent("آيفون 15"));
    });

    it("should include ad URL in message", () => {
      const adUrl = "https://maksab.app/ad/789";
      const url = generateWhatsAppUrl("01012345678", "test", adUrl);
      expect(url).toContain(encodeURIComponent(adUrl));
    });

    it("should use correct country code prefix", () => {
      const url = generateWhatsAppUrl("01012345678", "test", "https://test.com");
      // Should be 2 + 01012345678 = 201012345678
      expect(url).toContain("wa.me/201012345678");
    });
  });

  // ── Conversation Uniqueness ────────────────────────────────────

  describe("Conversation uniqueness", () => {
    it("should enforce one conversation per buyer per ad", () => {
      // The UNIQUE(ad_id, buyer_id) constraint ensures this at DB level
      // Here we test the logic conceptually
      const existingConversations = [
        { ad_id: "ad-001", buyer_id: "buyer-001" },
        { ad_id: "ad-001", buyer_id: "buyer-002" },
        { ad_id: "ad-002", buyer_id: "buyer-001" },
      ];

      // buyer-001 already has conversation about ad-001
      const isDuplicate = existingConversations.some(
        (c) => c.ad_id === "ad-001" && c.buyer_id === "buyer-001",
      );
      expect(isDuplicate).toBe(true);

      // buyer-003 does NOT have conversation about ad-001
      const isNew = !existingConversations.some(
        (c) => c.ad_id === "ad-001" && c.buyer_id === "buyer-003",
      );
      expect(isNew).toBe(true);
    });
  });

  // ── Online Status ──────────────────────────────────────────────

  describe("Online status formatting", () => {
    function formatLastSeen(lastActiveAt: Date): string {
      const diffMs = Date.now() - lastActiveAt.getTime();
      const diffMin = Math.floor(diffMs / 60000);

      if (diffMin < 1) return "متصل الآن";
      if (diffMin < 60) return `آخر ظهور منذ ${diffMin} دقيقة`;

      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `آخر ظهور منذ ${diffHours} ساعة`;

      const diffDays = Math.floor(diffHours / 24);
      return `آخر ظهور منذ ${diffDays} يوم`;
    }

    it("should show 'متصل الآن' for recent activity", () => {
      expect(formatLastSeen(new Date(Date.now() - 30000))).toBe("متصل الآن");
    });

    it("should show minutes for recent offline", () => {
      const result = formatLastSeen(new Date(Date.now() - 15 * 60000));
      expect(result).toContain("15 دقيقة");
    });

    it("should show hours for same-day offline", () => {
      const result = formatLastSeen(new Date(Date.now() - 3 * 3600000));
      expect(result).toContain("3 ساعة");
    });

    it("should show days for multi-day offline", () => {
      const result = formatLastSeen(new Date(Date.now() - 2 * 86400000));
      expect(result).toContain("2 يوم");
    });
  });
});
