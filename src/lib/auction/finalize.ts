/**
 * Shared auction finalization logic.
 *
 * Used by both the cron worker (Railway) and the client-side
 * fetchAuctionState (as a read-only status check).
 *
 * Only the cron worker or server-side API routes should call
 * `finalizeAuctionInDb` — the client uses `resolveAuctionStatus`
 * for display-only purposes.
 */

import type { AuctionStatus } from "./types";

/**
 * Determine the correct display status for an auction based on
 * its stored status, end time, and bid count.
 *
 * This is a pure function — it does NOT write to the database.
 */
export function resolveAuctionStatus(
  storedStatus: AuctionStatus,
  endsAt: string | null,
  hasBids: boolean,
): AuctionStatus {
  if (storedStatus !== "active") return storedStatus;
  if (!endsAt) return storedStatus;
  if (new Date(endsAt).getTime() <= Date.now()) {
    return hasBids ? "ended_winner" : "ended_no_bids";
  }
  return "active";
}

/**
 * Calculate the original auction end time from creation timestamp
 * and duration. Used to detect anti-snipe extensions.
 */
export function calcOriginalEndsAt(
  createdAt: string,
  durationHours: number,
): string {
  return new Date(
    new Date(createdAt).getTime() + durationHours * 3600000,
  ).toISOString();
}

/**
 * Detect whether the auction timer was extended by anti-sniping.
 */
export function wasAuctionExtended(
  endsAt: string | null,
  createdAt: string,
  durationHours: number,
): boolean {
  if (!endsAt) return false;
  const originalEnd = new Date(createdAt).getTime() + durationHours * 3600000;
  return new Date(endsAt).getTime() > originalEnd;
}
