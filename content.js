// Advanced ad blocking strategies
const AdBlocker = {
  // Selectors for common ad elements
  adSelectors: [
    'div[class*="ad"]',
    'div[id*="advertisement"]', 
    '.banner-ad',
    '[data-ad-type]',
    'iframe[src*="ads"]'
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
    this.removeAds();
    this.blockIntrusiveContent();
    
    // Optional: Use MutationObserver for dynamically loaded content
    const observer = new MutationObserver(() => {
      this.removeAds();
      this.blockIntrusiveContent();
    });

    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
  }
};

// Run on page load
AdBlocker.init();
