const BLOCK_STRATEGIES = {
  // Selector-based removal strategies
  REMOVE_BY_ID: (document, id) => {
    const element = document.getElementById(id);
    if (element) element.remove();
  },
  
  REMOVE_BY_CLASS: (document, className) => {
    const elements = document.getElementsByClassName(className);
    Array.from(elements).forEach(el => el.remove());
  },
  
  REMOVE_BY_SELECTOR: (document, selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  }
};

// Content script for DOM manipulation
function initAdBlocker() {
  // Example blocking strategies
  BLOCK_STRATEGIES.REMOVE_BY_CLASS(document, 'ad-container');
  BLOCK_STRATEGIES.REMOVE_BY_ID(document, 'banner-ad');
  BLOCK_STRATEGIES.REMOVE_BY_SELECTOR(document, 'div[data-ad="true"]');
}

// Inject content script
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  function: initAdBlocker
});
