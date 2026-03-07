/**
 * Maksab Seller Discovery — Content Script
 *
 * Injected into OLX Egypt pages to extract publicly visible seller information.
 * Only extracts data that is already visible on the page — no hidden data access.
 *
 * Usage: Navigate to an OLX seller profile or ad listing page manually.
 * The extension will detect the page type and extract relevant data.
 */

(function () {
  'use strict';

  // ── Page Type Detection ────────────────────────────────

  function detectPageType() {
    const url = window.location.href;
    if (url.includes('/profile/')) return 'seller_profile';
    if (url.includes('/item/') || url.includes('/listing/')) return 'ad_detail';
    if (url.includes('/search') || url.match(/\/[a-z-]+_c\d+/)) return 'search_results';
    return 'unknown';
  }

  // ── Seller Profile Extraction ──────────────────────────

  function extractSellerProfile() {
    const data = {
      type: 'seller_profile',
      name: '',
      phone: '',
      memberSince: '',
      location: '',
      responseRate: '',
      activeAdsCount: 0,
      ads: [],
      categories: [],
      profileUrl: window.location.href,
      extractedAt: new Date().toISOString(),
    };

    // Extract seller name
    const nameSelectors = [
      '[data-aut-id="profileName"]',
      '.profile-user-info h2',
      '.user-profile-header h1',
      'h1[class*="Name"]',
      '.seller-info h2',
    ];
    for (const sel of nameSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        data.name = el.textContent.trim();
        break;
      }
    }

    // Extract member since
    const memberSelectors = [
      '[data-aut-id="profileMemberSince"]',
      '.profile-user-info span',
      '[class*="memberSince"]',
      '[class*="member-since"]',
    ];
    for (const sel of memberSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.includes('عضو')) {
        data.memberSince = el.textContent.trim();
        break;
      }
    }

    // Extract location
    const locationSelectors = [
      '[data-aut-id="profileLocation"]',
      '.profile-location',
      '[class*="location"]',
    ];
    for (const sel of locationSelectors) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        data.location = el.textContent.trim();
        break;
      }
    }

    // Extract phone (only if publicly displayed)
    const phoneSelectors = [
      '[data-aut-id="btnCall"]',
      'a[href^="tel:"]',
      '[class*="phone"]',
    ];
    for (const sel of phoneSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        const phoneText = el.textContent.replace(/\D/g, '');
        if (phoneText.match(/^01[0125]\d{8}$/)) {
          data.phone = phoneText;
          break;
        }
        const href = el.getAttribute('href');
        if (href && href.startsWith('tel:')) {
          const num = href.replace('tel:', '').replace(/\D/g, '');
          if (num.match(/^01[0125]\d{8}$/)) {
            data.phone = num;
            break;
          }
        }
      }
    }

    // Extract ads from profile listing
    const adCards = document.querySelectorAll(
      '[data-aut-id="itemBox"], .items-list li, [class*="adCard"], [class*="listing-card"]'
    );
    data.activeAdsCount = adCards.length;

    const categorySet = new Set();

    adCards.forEach((card) => {
      const ad = extractAdCard(card);
      if (ad) {
        data.ads.push(ad);
        if (ad.category) categorySet.add(ad.category);
      }
    });

    data.categories = Array.from(categorySet);

    return data;
  }

  // ── Ad Detail Extraction ───────────────────────────────

  function extractAdDetail() {
    const data = {
      type: 'ad_detail',
      title: '',
      price: '',
      priceNumeric: 0,
      category: '',
      subcategory: '',
      location: '',
      description: '',
      sellerName: '',
      sellerPhone: '',
      sellerProfileUrl: '',
      imageCount: 0,
      attributes: {},
      adUrl: window.location.href,
      extractedAt: new Date().toISOString(),
    };

    // Title
    const titleEl = document.querySelector(
      '[data-aut-id="itemTitle"], h1[class*="title"], .item-title h1'
    );
    if (titleEl) data.title = titleEl.textContent.trim();

    // Price
    const priceEl = document.querySelector(
      '[data-aut-id="itemPrice"], [class*="price"], .item-price'
    );
    if (priceEl) {
      data.price = priceEl.textContent.trim();
      data.priceNumeric = parseInt(priceEl.textContent.replace(/\D/g, ''), 10) || 0;
    }

    // Category breadcrumb
    const breadcrumbs = document.querySelectorAll(
      '[data-aut-id="breadcrumb"] a, .breadcrumb a, nav[aria-label="breadcrumb"] a'
    );
    if (breadcrumbs.length >= 2) {
      data.category = breadcrumbs[1]?.textContent?.trim() || '';
      data.subcategory = breadcrumbs[2]?.textContent?.trim() || '';
    }

    // Location
    const locEl = document.querySelector(
      '[data-aut-id="itemLocation"], [class*="location"], .item-location'
    );
    if (locEl) data.location = locEl.textContent.trim();

    // Description
    const descEl = document.querySelector(
      '[data-aut-id="itemDescription"], [class*="description"], .item-description'
    );
    if (descEl) data.description = descEl.textContent.trim().substring(0, 500);

    // Seller info
    const sellerEl = document.querySelector(
      '[data-aut-id="sellerName"], [class*="seller"] [class*="name"], .seller-name'
    );
    if (sellerEl) data.sellerName = sellerEl.textContent.trim();

    const sellerLink = document.querySelector(
      '[data-aut-id="sellerProfile"] a, a[href*="/profile/"]'
    );
    if (sellerLink) data.sellerProfileUrl = sellerLink.href;

    // Phone
    const phoneBtn = document.querySelector(
      '[data-aut-id="btnCall"], a[href^="tel:"], [class*="phone-button"]'
    );
    if (phoneBtn) {
      const href = phoneBtn.getAttribute('href');
      if (href && href.startsWith('tel:')) {
        const num = href.replace('tel:', '').replace(/\D/g, '');
        if (num.match(/^01[0125]\d{8}$/)) data.sellerPhone = num;
      }
    }

    // Images count
    const images = document.querySelectorAll(
      '[data-aut-id="gallery"] img, .gallery img, [class*="carousel"] img'
    );
    data.imageCount = images.length;

    // Attributes/details
    const attrRows = document.querySelectorAll(
      '[data-aut-id="itemAttribute"], .item-attributes li, [class*="detail-row"]'
    );
    attrRows.forEach((row) => {
      const label = row.querySelector('[class*="label"], dt, span:first-child');
      const value = row.querySelector('[class*="value"], dd, span:last-child');
      if (label && value) {
        data.attributes[label.textContent.trim()] = value.textContent.trim();
      }
    });

    return data;
  }

  // ── Ad Card Extraction (from listings) ─────────────────

  function extractAdCard(card) {
    try {
      const title = card.querySelector(
        '[data-aut-id="itemTitle"], [class*="title"], h3, h2'
      );
      const price = card.querySelector(
        '[data-aut-id="itemPrice"], [class*="price"]'
      );
      const location = card.querySelector(
        '[data-aut-id="item-location"], [class*="location"]'
      );
      const category = card.querySelector(
        '[class*="category"]'
      );
      const link = card.querySelector('a[href]');
      const img = card.querySelector('img');

      return {
        title: title?.textContent?.trim() || '',
        price: price?.textContent?.trim() || '',
        priceNumeric: parseInt(price?.textContent?.replace(/\D/g, '') || '0', 10),
        location: location?.textContent?.trim() || '',
        category: category?.textContent?.trim() || '',
        url: link?.href || '',
        hasImage: !!img?.src,
      };
    } catch {
      return null;
    }
  }

  // ── Search Results Extraction ──────────────────────────

  function extractSearchResults() {
    const adCards = document.querySelectorAll(
      '[data-aut-id="itemBox"], .items-list li, [class*="listing-card"]'
    );

    const ads = [];
    adCards.forEach((card) => {
      const ad = extractAdCard(card);
      if (ad && ad.title) ads.push(ad);
    });

    return {
      type: 'search_results',
      query: new URLSearchParams(window.location.search).get('q') || '',
      totalResults: ads.length,
      ads,
      pageUrl: window.location.href,
      extractedAt: new Date().toISOString(),
    };
  }

  // ── Seller Score Calculation ───────────────────────────

  function calculateSellerScore(profileData) {
    let score = 0;

    // Active ads count (max 10)
    if (profileData.activeAdsCount >= 10) score += 10;
    else if (profileData.activeAdsCount >= 5) score += 7;
    else if (profileData.activeAdsCount >= 3) score += 4;
    else score += 1;

    // Account age (max 10)
    const memberText = profileData.memberSince || '';
    if (memberText.includes('سنة') || memberText.includes('سنوات') || memberText.includes('year')) {
      score += 10;
    } else if (memberText.includes('شهر') || memberText.includes('أشهر') || memberText.includes('month')) {
      score += 5;
    } else {
      score += 2;
    }

    // Ad quality — images + descriptions (max 10)
    const adsWithImages = profileData.ads.filter((a) => a.hasImage).length;
    const imageRatio = profileData.ads.length > 0 ? adsWithImages / profileData.ads.length : 0;
    score += Math.round(imageRatio * 10);

    // Category focus (max 10)
    if (profileData.categories.length === 1) score += 10; // Specialized
    else if (profileData.categories.length <= 3) score += 7;
    else score += 3;

    // Phone available (max 10)
    if (profileData.phone) score += 10;
    else score += 0;

    // Determine tier
    let tier = 'bronze';
    if (score >= 40) tier = 'platinum';
    else if (score >= 30) tier = 'gold';
    else if (score >= 20) tier = 'silver';

    return { score, tier, maxScore: 50 };
  }

  // ── Category Mapping (OLX → Maksab) ───────────────────

  function mapCategory(olxCategory) {
    const mapping = {
      'سيارات': 'cars',
      'عقارات': 'real_estate',
      'موبايلات': 'phones',
      'تابلت': 'phones',
      'إلكترونيات': 'phones',
      'موضة': 'fashion',
      'ملابس': 'fashion',
      'أثاث': 'furniture',
      'مفروشات': 'furniture',
      'أجهزة منزلية': 'home_appliances',
      'حيوانات': 'hobbies',
      'رياضة': 'hobbies',
      'خدمات': 'services',
      'وظائف': null, // Not in Maksab
      'عقارات للإيجار': 'real_estate',
      'cars': 'cars',
      'properties': 'real_estate',
      'mobiles': 'phones',
      'fashion': 'fashion',
      'furniture': 'furniture',
      'electronics': 'phones',
    };

    const lower = olxCategory.toLowerCase().trim();
    for (const [key, value] of Object.entries(mapping)) {
      if (lower.includes(key.toLowerCase())) return value;
    }
    return 'other';
  }

  // ── Main Extraction Function ───────────────────────────

  function extractPageData() {
    const pageType = detectPageType();

    switch (pageType) {
      case 'seller_profile': {
        const profile = extractSellerProfile();
        const scoring = calculateSellerScore(profile);
        profile.sellerScore = scoring.score;
        profile.sellerTier = scoring.tier;
        profile.maxScore = scoring.maxScore;
        profile.mappedCategories = profile.categories.map(mapCategory).filter(Boolean);
        return profile;
      }
      case 'ad_detail':
        return extractAdDetail();
      case 'search_results':
        return extractSearchResults();
      default:
        return { type: 'unknown', url: window.location.href };
    }
  }

  // ── Communication with Popup/Background ────────────────

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractData') {
      const data = extractPageData();
      sendResponse(data);
    }
    if (request.action === 'getPageType') {
      sendResponse({ pageType: detectPageType() });
    }
    return true; // async response
  });

  // ── Visual Indicator ──────────────────────────────────

  function showIndicator(pageType) {
    const indicator = document.createElement('div');
    indicator.id = 'maksab-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #1B7A3D;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        font-family: 'Cairo', sans-serif;
        font-size: 13px;
        z-index: 99999;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        direction: rtl;
        cursor: pointer;
        transition: opacity 0.3s;
      ">
        💚 مكسب — ${pageType === 'seller_profile' ? 'صفحة بائع' : pageType === 'ad_detail' ? 'تفاصيل إعلان' : 'نتائج بحث'}
      </div>
    `;

    // Remove after 3 seconds
    document.body.appendChild(indicator);
    setTimeout(() => {
      indicator.style.opacity = '0';
      setTimeout(() => indicator.remove(), 300);
    }, 3000);
  }

  // Show indicator on supported pages
  const pageType = detectPageType();
  if (pageType !== 'unknown') {
    showIndicator(pageType);
  }
})();
