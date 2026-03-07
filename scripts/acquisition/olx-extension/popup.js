/**
 * Maksab Seller Discovery — Popup Script
 *
 * Manages the extension popup UI, extraction triggers,
 * local storage of leads, and CSV/JSON export.
 */

// ── Storage Keys ─────────────────────────────────────

const STORAGE_KEY = 'maksab_leads';
const STORAGE_ADS_KEY = 'maksab_collected_ads';
const STORAGE_STATS = 'maksab_lead_stats';

// ── DOM Elements ─────────────────────────────────────

const savedCountEl = document.getElementById('saved-count');
const savedAdsCountEl = document.getElementById('saved-ads-count');
const pageIconEl = document.getElementById('page-icon');
const pageTypeTextEl = document.getElementById('page-type-text');
const resultAreaEl = document.getElementById('result-area');
const emptyStateEl = document.getElementById('empty-state');
const btnExtract = document.getElementById('btn-extract');
const btnBulkAds = document.getElementById('btn-bulk-ads');
const btnExport = document.getElementById('btn-export');
const btnExportAds = document.getElementById('btn-export-ads');
const toastEl = document.getElementById('toast');

// ── Toast ────────────────────────────────────────────

function showToast(message, duration = 2000) {
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), duration);
}

// ── Storage ──────────────────────────────────────────

async function getLeads() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

async function saveLead(lead) {
  const leads = await getLeads();

  // Deduplicate by phone or profile URL
  const exists = leads.some(
    (l) =>
      (lead.phone && l.phone === lead.phone) ||
      (lead.profileUrl && l.profileUrl === lead.profileUrl)
  );

  if (exists) {
    showToast('⚠️ البائع ده محفوظ بالفعل');
    return false;
  }

  leads.push({
    ...lead,
    savedAt: new Date().toISOString(),
    status: 'new',
  });

  await chrome.storage.local.set({ [STORAGE_KEY]: leads });
  updateSavedCount(leads.length);
  showToast('✅ تم حفظ البائع بنجاح');
  return true;
}

async function updateSavedCount(count) {
  if (count === undefined) {
    const leads = await getLeads();
    count = leads.length;
  }
  savedCountEl.textContent = count;
}

// ── Ads Storage ─────────────────────────────────────

async function getCollectedAds() {
  const result = await chrome.storage.local.get(STORAGE_ADS_KEY);
  return result[STORAGE_ADS_KEY] || [];
}

async function saveCollectedAds(newAds) {
  const existingAds = await getCollectedAds();
  const existingUrls = new Set(existingAds.map((a) => a.url));

  let addedCount = 0;
  for (const ad of newAds) {
    if (ad.url && !existingUrls.has(ad.url)) {
      existingAds.push({
        ...ad,
        collectedAt: new Date().toISOString(),
      });
      existingUrls.add(ad.url);
      addedCount++;
    }
  }

  await chrome.storage.local.set({ [STORAGE_ADS_KEY]: existingAds });
  updateSavedAdsCount(existingAds.length);
  return addedCount;
}

async function updateSavedAdsCount(count) {
  if (count === undefined) {
    const ads = await getCollectedAds();
    count = ads.length;
  }
  if (savedAdsCountEl) savedAdsCountEl.textContent = count;
}

// ── Page Type Display ────────────────────────────────

const pageTypeConfig = {
  seller_profile: { icon: '👤', text: 'صفحة بائع', color: '#1B7A3D' },
  ad_detail: { icon: '📦', text: 'تفاصيل إعلان', color: '#D4A843' },
  search_results: { icon: '🔍', text: 'نتائج بحث', color: '#3B82F6' },
  unknown: { icon: '❓', text: 'صفحة غير معروفة', color: '#6B7280' },
};

function updatePageType(type) {
  const config = pageTypeConfig[type] || pageTypeConfig.unknown;
  pageIconEl.textContent = config.icon;
  pageTypeTextEl.textContent = config.text;
  pageTypeTextEl.style.color = config.color;
}

// ── Render Results ───────────────────────────────────

function renderSellerProfile(data) {
  const tierLabels = {
    platinum: '💎 بلاتينيوم',
    gold: '🥇 ذهبي',
    silver: '🥈 فضي',
    bronze: '🥉 برونزي',
  };

  emptyStateEl.style.display = 'none';

  resultAreaEl.innerHTML = `
    <div class="seller-card">
      <div class="name">${data.name || 'بدون اسم'}</div>

      <div class="detail">
        <span class="label">📱 الهاتف</span>
        <span>${data.phone || 'غير ظاهر'}</span>
      </div>
      <div class="detail">
        <span class="label">📍 الموقع</span>
        <span>${data.location || 'غير محدد'}</span>
      </div>
      <div class="detail">
        <span class="label">📅 عضو منذ</span>
        <span>${data.memberSince || 'غير محدد'}</span>
      </div>
      <div class="detail">
        <span class="label">📦 إعلانات نشطة</span>
        <span>${data.activeAdsCount}</span>
      </div>

      <div class="score-badge ${data.sellerTier}">
        ${tierLabels[data.sellerTier] || '—'}
        — ${data.sellerScore}/${data.maxScore} نقطة
      </div>

      ${
        data.categories.length > 0
          ? `<div class="categories">
               ${data.categories.map((c) => `<span class="tag">${c}</span>`).join('')}
             </div>`
          : ''
      }

      ${
        data.ads.length > 0
          ? `<div id="ad-list" style="margin-top: 12px;">
               <div style="font-size: 12px; color: #6B7280; margin-bottom: 6px;">
                 آخر ${Math.min(data.ads.length, 10)} إعلانات:
               </div>
               ${data.ads
                 .slice(0, 10)
                 .map(
                   (ad) => `
                 <div class="ad-item">
                   <div class="ad-title">${ad.title}</div>
                   <div class="ad-price">${ad.price}</div>
                 </div>
               `
                 )
                 .join('')}
             </div>`
          : ''
      }
    </div>

    <div class="actions">
      <button class="btn btn-primary" id="btn-save-seller">💾 حفظ البائع</button>
    </div>
  `;

  // Bind save button
  document.getElementById('btn-save-seller').addEventListener('click', async () => {
    await saveLead({
      name: data.name,
      phone: data.phone,
      source: 'olx',
      sourceProfileUrl: data.profileUrl,
      categories: data.mappedCategories || [],
      activeAdsCount: data.activeAdsCount,
      location: data.location,
      sellerScore: data.sellerScore,
      sellerTier: data.sellerTier,
      notes: `${data.activeAdsCount} إعلان — ${data.categories.join(', ')}`,
    });
  });
}

function renderAdDetail(data) {
  emptyStateEl.style.display = 'none';

  resultAreaEl.innerHTML = `
    <div class="seller-card">
      <div class="name">${data.title || 'بدون عنوان'}</div>

      <div class="detail">
        <span class="label">💰 السعر</span>
        <span style="color: #1B7A3D; font-weight: 700;">${data.price || 'غير محدد'}</span>
      </div>
      <div class="detail">
        <span class="label">📂 القسم</span>
        <span>${data.category || 'غير محدد'}</span>
      </div>
      <div class="detail">
        <span class="label">📍 الموقع</span>
        <span>${data.location || 'غير محدد'}</span>
      </div>
      <div class="detail">
        <span class="label">👤 البائع</span>
        <span>${data.sellerName || 'غير ظاهر'}</span>
      </div>
      <div class="detail">
        <span class="label">📸 الصور</span>
        <span>${data.imageCount} صورة</span>
      </div>
    </div>

    ${
      data.sellerPhone
        ? `<div class="actions">
             <button class="btn btn-primary" id="btn-save-from-ad">💾 حفظ البائع</button>
           </div>`
        : '<p style="text-align: center; font-size: 12px; color: #6B7280;">رقم البائع مش ظاهر — روح لصفحة البروفايل بتاعه</p>'
    }
  `;

  if (data.sellerPhone) {
    document.getElementById('btn-save-from-ad').addEventListener('click', async () => {
      await saveLead({
        name: data.sellerName,
        phone: data.sellerPhone,
        source: 'olx',
        sourceProfileUrl: data.sellerProfileUrl,
        categories: [data.category].filter(Boolean),
        activeAdsCount: 1,
        location: data.location,
        sellerScore: 0,
        sellerTier: 'bronze',
        notes: `من إعلان: ${data.title}`,
      });
    });
  }
}

function renderSearchResults(data) {
  emptyStateEl.style.display = 'none';

  resultAreaEl.innerHTML = `
    <div class="stats">
      <div class="stat-box">
        <div class="number">${data.totalResults}</div>
        <div class="label">إعلان في الصفحة</div>
      </div>
      <div class="stat-box">
        <div class="number">${data.ads.filter((a) => a.priceNumeric > 0).length}</div>
        <div class="label">بسعر محدد</div>
      </div>
    </div>

    <p style="font-size: 12px; color: #6B7280; text-align: center;">
      لحفظ البائعين — افتح صفحة كل بائع على حدة
    </p>
  `;
}

// ── Extract Data ─────────────────────────────────────

async function extractData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showToast('❌ مفيش تاب مفتوح');
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractData' });

    if (!response) {
      showToast('❌ مش قادر يستخرج بيانات — تأكد إنك على صفحة OLX');
      return;
    }

    updatePageType(response.type);

    switch (response.type) {
      case 'seller_profile':
        renderSellerProfile(response);
        break;
      case 'ad_detail':
        renderAdDetail(response);
        break;
      case 'search_results':
        renderSearchResults(response);
        break;
      default:
        showToast('⚠️ الصفحة دي مش مدعومة');
    }
  } catch (err) {
    console.error('Extract error:', err);
    showToast('❌ حصل خطأ — جرب تحدّث الصفحة');
  }
}

// ── Export ────────────────────────────────────────────

async function exportLeads() {
  const leads = await getLeads();

  if (leads.length === 0) {
    showToast('⚠️ مفيش بائعين محفوظين');
    return;
  }

  // Generate both JSON and CSV
  const jsonData = JSON.stringify({ sellers: leads, exportedAt: new Date().toISOString() }, null, 2);

  // CSV
  const headers = ['name', 'phone', 'source', 'sourceProfileUrl', 'categories', 'activeAdsCount', 'location', 'sellerScore', 'sellerTier', 'notes', 'status', 'savedAt'];
  const csvRows = [headers.join(',')];
  for (const lead of leads) {
    const row = headers.map((h) => {
      const val = lead[h];
      if (Array.isArray(val)) return `"${val.join('; ')}"`;
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? '';
    });
    csvRows.push(row.join(','));
  }
  const csvData = csvRows.join('\n');

  // Download JSON
  downloadFile(jsonData, `maksab-leads-${formatDate()}.json`, 'application/json');

  // Download CSV
  setTimeout(() => {
    downloadFile(csvData, `maksab-leads-${formatDate()}.csv`, 'text/csv');
  }, 500);

  showToast(`✅ تم تصدير ${leads.length} بائع (JSON + CSV)`);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` }); // BOM for Arabic
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Init ─────────────────────────────────────────────

async function init() {
  await updateSavedCount();
  await updateSavedAdsCount();

  // Detect current page type
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.includes('olx.com.eg')) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getPageType' });
      if (response) {
        updatePageType(response.pageType);
        // Auto-extract on seller profile pages
        if (response.pageType === 'seller_profile') {
          extractData();
        }
      }
    } else {
      updatePageType('unknown');
      emptyStateEl.innerHTML = `
        <div class="icon">🌐</div>
        <p>
          افتح موقع OLX Egypt<br>
          <a href="https://www.olx.com.eg" target="_blank" style="color: #1B7A3D;">olx.com.eg</a>
        </p>
      `;
    }
  } catch {
    updatePageType('unknown');
  }
}

// ── Bulk Ads Collection ──────────────────────────────

async function collectBulkAds() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showToast('❌ مفيش تاب مفتوح');
      return;
    }

    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractBulkAds' });

    if (!response || !response.ads || response.ads.length === 0) {
      showToast('⚠️ مفيش إعلانات في الصفحة دي');
      return;
    }

    const addedCount = await saveCollectedAds(response.ads);
    showToast(`✅ تم جمع ${addedCount} إعلان جديد (${response.ads.length} في الصفحة)`);

    // Show results
    emptyStateEl.style.display = 'none';
    const totalAds = await getCollectedAds();

    resultAreaEl.innerHTML = `
      <div class="stats">
        <div class="stat-box">
          <div class="number">${response.ads.length}</div>
          <div class="label">في الصفحة</div>
        </div>
        <div class="stat-box">
          <div class="number">${addedCount}</div>
          <div class="label">جديد تم حفظه</div>
        </div>
        <div class="stat-box">
          <div class="number">${totalAds.length}</div>
          <div class="label">إجمالي محفوظ</div>
        </div>
        <div class="stat-box">
          <div class="number">${response.ads.filter((a) => a.priceNumeric > 0).length}</div>
          <div class="label">بسعر محدد</div>
        </div>
      </div>

      <div id="ad-list" style="max-height: 250px; overflow-y: auto;">
        <div style="font-size: 12px; color: #6B7280; margin-bottom: 6px;">
          إعلانات الصفحة الحالية:
        </div>
        ${response.ads.slice(0, 20).map((ad) => `
          <div class="ad-item">
            <div class="ad-title">${ad.title}</div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;">
              <span class="ad-price">${ad.price || 'بدون سعر'}</span>
              <span style="color:#6B7280;font-size:11px;">${ad.location || ''}</span>
            </div>
          </div>
        `).join('')}
        ${response.ads.length > 20 ? `<div style="text-align:center;padding:8px;color:#6B7280;font-size:12px;">... و${response.ads.length - 20} إعلان آخر</div>` : ''}
      </div>

      <p style="font-size: 11px; color: #6B7280; text-align: center; margin-top: 8px;">
        💡 افتح صفحات أكتر واضغط "جمع كل الإعلانات" لجمع بيانات أكتر
      </p>
    `;
  } catch (err) {
    console.error('Bulk extract error:', err);
    showToast('❌ حصل خطأ — جرب تحدّث الصفحة');
  }
}

// ── Export Ads ───────────────────────────────────────

async function exportAds() {
  const ads = await getCollectedAds();

  if (ads.length === 0) {
    showToast('⚠️ مفيش إعلانات محفوظة');
    return;
  }

  // JSON export (for importer.ts)
  const jsonData = JSON.stringify(ads, null, 2);

  // CSV export
  const headers = ['title', 'price', 'priceNumeric', 'location', 'category', 'url', 'imageUrl', 'hasImage', 'date', 'collectedAt'];
  const csvRows = [headers.join(',')];
  for (const ad of ads) {
    const row = headers.map((h) => {
      const val = ad[h];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? '';
    });
    csvRows.push(row.join(','));
  }
  const csvData = csvRows.join('\n');

  downloadFile(jsonData, `maksab-ads-${formatDate()}.json`, 'application/json');
  setTimeout(() => {
    downloadFile(csvData, `maksab-ads-${formatDate()}.csv`, 'text/csv');
  }, 500);

  showToast(`✅ تم تصدير ${ads.length} إعلان (JSON + CSV)`);
}

// ── Event Listeners ──────────────────────────────────

btnExtract.addEventListener('click', extractData);
btnBulkAds.addEventListener('click', collectBulkAds);
btnExport.addEventListener('click', exportLeads);
btnExportAds.addEventListener('click', exportAds);

// Init
init();
