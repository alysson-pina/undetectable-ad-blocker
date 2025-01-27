chrome.runtime.onInstalled.addListener(() => {
  console.log('Undetectable Ad Blocker installed');
});

// Listen for content script injection from other parts of the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'injectContentScript') {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      func: initAdBlocker
    });
  }
});

// Initialize Ad Blocker for Content Script
function initAdBlocker() {
  const BLOCK_STRATEGIES = {
    REMOVE_BY_ID: (id) => {
      const element = document.getElementById(id);
      if (element) element.remove();
    },

    REMOVE_BY_CLASS: (className) => {
      const elements = document.getElementsByClassName(className);
      Array.from(elements).forEach(el => el.remove());
    },

    REMOVE_BY_SELECTOR: (selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    }
  };

  // Example blocking strategies
  BLOCK_STRATEGIES.REMOVE_BY_CLASS('ad-container');
  BLOCK_STRATEGIES.REMOVE_BY_ID('banner-ad');
  BLOCK_STRATEGIES.REMOVE_BY_ID('ad');
  BLOCK_STRATEGIES.REMOVE_BY_SELECTOR('div[data-ad="true"]');
}

// Add network-level blocking rules
chrome.declarativeNetRequest.updateDynamicRules({
  addRules: [
    {
      id: 1, // Unique ID for the rule
      action: { type: 'block' },
      condition: {
        urlFilter: '*://*.ads.example.com/*',
        resourceTypes: ['main_frame', 'sub_frame', 'script', 'image', 'stylesheet', 'object', 'xmlhttprequest']
      }
    }
  ]
});

// Listen for tab updates and send a message to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, { action: 'injectContentScript' });
  }
});
