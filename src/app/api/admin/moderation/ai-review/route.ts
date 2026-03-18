/**
 * POST /api/admin/moderation/ai-review
 * مازن — AI Listing Moderation (Rule-based v1)
 * Auto-reviews new ads for fraud, banned content, and quality.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAlert } from '@/lib/ai/tracker';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env vars');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

interface ReviewResult {
  decision: 'approve' | 'reject' | 'review';
  fraud_score: number;
  confidence: number;
  reasons: string[];
}

function reviewListing(listing: Record<string, any>): ReviewResult {
  const reasons: string[] = [];
  let fraudScore = 0;
  let confidence = 0.9;

  // ── Price check: suspiciously low prices ──
  const suspiciousPrices: Record<string, number> = {
    phones: 500,
    vehicles: 10000,
    luxury: 1000,
    gold: 500,
    appliances: 200,
    properties: 50000,
  };
  const categoryId = listing.category_id || listing.category || '';
  const minPrice = suspiciousPrices[categoryId];
  if (minPrice && listing.price && listing.price < minPrice) {
    fraudScore += 40;
    reasons.push(`السعر منخفض جداً (${listing.price}ج) للفئة ${categoryId}`);
  }

  // ── Banned content check ──
  const bannedWords = ['سلاح', 'مخدر', 'مسروق', 'تهريب', 'حشيش', 'بانجو', 'ترامادول'];
  const text = `${listing.title || ''} ${listing.description || ''}`.toLowerCase();
  for (const word of bannedWords) {
    if (text.includes(word)) {
      fraudScore += 60;
      reasons.push(`محتوى محظور: ${word}`);
    }
  }

  // ── Description quality check ──
  if (!listing.description || listing.description.length < 20) {
    fraudScore += 15;
    reasons.push('الوصف قصير جداً');
    confidence = 0.7;
  }

  // ── Missing price check ──
  if (listing.sale_type === 'cash' && (!listing.price || listing.price === 0)) {
    fraudScore += 20;
    reasons.push('السعر غير محدد لإعلان بيع نقدي');
  }

  // ── No images check ──
  const images = listing.images || [];
  if (images.length === 0) {
    fraudScore += 10;
    reasons.push('الإعلان بدون صور');
  }

  // ── Decision logic ──
  let decision: 'approve' | 'reject' | 'review' = 'approve';
  if (fraudScore >= 60) {
    decision = 'reject';
    confidence = 0.95;
  } else if (fraudScore >= 20) {
    decision = 'review';
    confidence = 0.6;
  }

  return { decision, fraud_score: fraudScore, confidence, reasons };
}

export async function POST(request: NextRequest) {
  try {
    const { listing } = await request.json();
    if (!listing || !listing.id) {
      return NextResponse.json({ error: 'Missing listing data' }, { status: 400 });
    }

    const supabase = getServiceClient();
    const startTime = Date.now();
    const review = reviewListing(listing);
    const responseTimeMs = Date.now() - startTime;

    // Save moderation result
    await supabase.from('listing_moderation').insert({
      listing_id: listing.id,
      decision: review.decision,
      fraud_score: review.fraud_score,
      confidence: review.confidence,
      reasons: review.reasons,
      ai_model: 'rule_based_v1',
      response_time_ms: responseTimeMs,
    });

    // Handle decision
    if (review.decision === 'reject') {
      // Alert admin
      createAlert({
        type: 'listing_rejected',
        priority: review.fraud_score >= 60 ? 'high' : 'medium',
        message: `مازن: إعلان مرفوض — ${review.reasons.join(' | ')}`,
        listing_id: listing.id,
        user_id: listing.user_id,
      });

      // Update ad status
      await supabase
        .from('ads')
        .update({ status: 'deleted' })
        .eq('id', listing.id);
    } else if (review.decision === 'review') {
      // Flag for human review
      createAlert({
        type: 'listing_needs_review',
        priority: 'medium',
        message: `مازن: إعلان يحتاج مراجعة بشرية — ${review.reasons.join(' | ')}`,
        listing_id: listing.id,
        user_id: listing.user_id,
      });
    }
    // If approved with high confidence — ad stays active (default status)

    return NextResponse.json({
      decision: review.decision,
      fraud_score: review.fraud_score,
      confidence: review.confidence,
      reasons: review.reasons,
      response_time_ms: responseTimeMs,
    });
  } catch (error) {
    console.error('[MAZEN] Review error:', error);
    return NextResponse.json({ error: 'Review failed' }, { status: 500 });
  }
}
