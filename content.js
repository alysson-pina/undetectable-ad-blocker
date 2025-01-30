// Advanced ad blocking strategies
const AdBlocker = {
  // Selectors for common ad elements
  adSelectors: [
    'div[class^="ad"]',
    'div[id*="advertisement"]', 
    'div[id*="google_ads"]', 
    '.banner-ad',
    '[data-ad-type]',
    'iframe[src*="ads"]',
    '#ad',
    '#google_ads_iframe_',
    '[id^="ad-"]',
    '[id^="bnr"]',
    'div[class="videoAdUi"]',
     'div[class="fc-dialog-container"]',
     'div[class="mobiliarioAdblock"]',

    // Attribute-based selectors
    '[data-ad="true"]',
    '[aria-label="Sponsored Ad"]',
    
    // Specific complex selectors for Amazon-like ads
    'div[style*="width:100%;height:100%"] > div[class="creative-container"]'
  ],

  // Remove ad elements
  removeAds() {
    this.adSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        try {
          // Hide and then remove to prevent layout shifts
          el.style.visibility = 'hidden';
          el.style.height = '0px';
          el.remove();
        } catch (error) {
          console.warn('Ad removal failed:', error);
        }
      });
    });
  },

  // Block intrusive elements
  blockIntrusiveContent() {
    const intrusiveSelectors = [
      'div[class*="popup"]',
      'div[class*="modal"]',
      '[data-tracking]'
    ];

    intrusiveSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  },

  // Initialize blocking
  init() {
    chrome.storage.sync.get("pausedSites", ({ pausedSites = [] }) => {
      const currentDomain = window.location.hostname;
  
      if (pausedSites.includes(currentDomain)) {
        console.log(`AdBlocker paused on ${currentDomain}`);
        return;
      }
  
      console.log(`AdBlocker active on ${currentDomain}`);
  
      // Ensure DOM is fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setupObserver());
      } else {
        this.setupObserver();
      }
    });
  },

  setupObserver() {
    this.removeAds();
    this.blockIntrusiveContent();
    
    // dynamically listen for new content being appended to the DOM
    const observer = new MutationObserver(() => {
      this.removeAds();
      this.blockIntrusiveContent();
    });

    // Ensure document.body exists before observing
    if (document.body) {
      observer.observe(document.body, { 
        childList: true, 
        subtree: true 
      });
    } else {
      console.warn('document.body is not available.');
    }
  }
};

// Run on page load
chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
  const currentDomain = window.location.hostname;

  if (whitelist.includes(currentDomain)) {
    console.log(`Ad blocking skipped on ${currentDomain} (whitelisted)`);
    return;
  }

  AdBlocker.init(); // Run ad blocker if not whitelisted
  window.addEventListener('load', () => AdBlocker.init());
});

