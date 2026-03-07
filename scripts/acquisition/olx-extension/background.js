/**
 * Maksab Seller Discovery — Background Service Worker
 *
 * Handles badge updates and storage management.
 */

// Update badge count when leads change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.maksab_leads) {
    const leads = changes.maksab_leads.newValue || [];
    const count = leads.length;
    chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#1B7A3D' });
  }
});

// Set initial badge on install
chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get('maksab_leads');
  const leads = result.maksab_leads || [];
  if (leads.length > 0) {
    chrome.action.setBadgeText({ text: String(leads.length) });
    chrome.action.setBadgeBackgroundColor({ color: '#1B7A3D' });
  }
});
