/**
 * BHE — Buyer Classification & Scoring
 *
 * Classifies discovered buyers into tiers based on:
 *   - Phone availability (+30)
 *   - Product specificity (+20)
 *   - Budget specification (+15)
 *   - Location clarity (+10)
 *   - Condition preference (+5)
 *   - Source quality (+5–10)
 *   - High budget bonus (+10)
 *
 * Tiers:
 *   hot_buyer  (70+)  — ready to buy, has phone + budget + product
 *   warm_buyer (40–69) — interested, asking questions
 *   cold_buyer (<40)   — browsing, unclear intent
 */

export interface BuyerInput {
  buyer_phone?: string | null;
  product_wanted?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  governorate?: string | null;
  condition_wanted?: string | null;
  source?: string | null;
  category?: string | null;
}

export interface BuyerClassification {
  tier: "hot_buyer" | "warm_buyer" | "cold_buyer";
  score: number;
  estimated_purchase_value: number;
}

export function classifyBuyer(buyer: BuyerInput): BuyerClassification {
  let score = 0;

  // Phone = +30
  if (buyer.buyer_phone) score += 30;

  // Specific product = +20
  if (buyer.product_wanted && buyer.product_wanted.length > 5) score += 20;

  // Budget = +15
  if (buyer.budget_min || buyer.budget_max) score += 15;

  // Location = +10
  if (buyer.governorate) score += 10;

  // Condition preference = +5
  if (buyer.condition_wanted) score += 5;

  // Source quality
  if (buyer.source === "dubizzle_comment") score += 10;
  if (buyer.source === "facebook_group") score += 5;

  // High budget bonus = +10
  if ((buyer.budget_max ?? 0) >= 20000) score += 10;

  // Tier
  let tier: BuyerClassification["tier"] = "cold_buyer";
  if (score >= 70) tier = "hot_buyer";
  else if (score >= 40) tier = "warm_buyer";

  // Estimated purchase value
  const estimated_purchase_value =
    buyer.budget_max ||
    buyer.budget_min ||
    (buyer.category === "vehicles"
      ? 500000
      : buyer.category === "properties"
        ? 1000000
        : buyer.category === "phones"
          ? 20000
          : 10000);

  return { tier, score, estimated_purchase_value };
}
