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

// Helper function to check if URL is accessible
function isValidUrl(url) {
  return url && !url.startsWith('chrome://') && 
    !url.startsWith('chrome-extension://') && 
    !url.startsWith('chrome-search://');
}

// Simple hash function to generate a unique rule ID from the domain
function hashCode(str) {
  return Array.from(str).reduce((hash, char) => (hash << 5) - hash + char.charCodeAt(0), 0);
};

// Generate a unique rule ID for each domain
function getRuleIdForDomain(domain) {
  return parseInt(Math.abs(hashCode(domain))) + 1;
};
// Create a pause rule for the domain
function createPauseRule(domain) {
  return {
    id: getRuleIdForDomain(domain),
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: `||${domain}`,
      resourceTypes: ["main_frame"]
    }
  };
};

// Update the context menu title dynamically
function updateContextMenu(tab) {
  if (!tab || !tab.url) return;

  const url = new URL(tab.url);
  const domain = url.hostname;

  chrome.storage.sync.get("pausedSites", ({ pausedSites = [] }) => {
    const isPaused = pausedSites.includes(domain);

    // Update the context menu title
    chrome.contextMenus.update("togglePause", {
      title: isPaused ? `Resume on ${domain}` : `Pause on ${domain}`
    });
  });
}

function initAdBlocker() {
  const domain = window.location.hostname;

  const observer = new MutationObserver((mutations) => {
    chrome.storage.sync.get("pausedSites", ({ pausedSites = [] }) => {
      const isPaused = pausedSites.includes(domain);

      if (!isPaused) {
        BLOCK_STRATEGIES.REMOVE_BY_CLASS('ad-container');
        BLOCK_STRATEGIES.REMOVE_BY_ID('banner-ad');
        BLOCK_STRATEGIES.REMOVE_BY_ID('ad');
        BLOCK_STRATEGIES.REMOVE_BY_SELECTOR('div[data-ad="true"]');

        // Start observing
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    });

    window.addEventListener('unload', () => {
      observer.disconnect();
    });
  });
}

// Add network-level blocking rules
chrome.declarativeNetRequest.updateDynamicRules({
  removeRuleIds: [1], // Remove rule ID 1 if it exists
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
    chrome.tabs.get(tabId, (tab) => {
      if (!isValidUrl(tab.url)) {
        console.log('Skipping chrome:// or other restricted URL');
        return;
      }

      try {
        chrome.scripting.executeScript({
          target: { tabId: tabId },
          func: initAdBlocker
        });
  
        updateContextMenu(tab);
      } catch(err) {
        console.error('Error while sending message to tab', err);
      }
    });
  }
});

// Initialize the context menu
chrome.runtime.onInstalled.addListener(async () => {  
  chrome.contextMenus.create({
    id: "togglePause",
    title: "Pause on this site",
    contexts: ["page", "action"] // Attach menu to the extension's toolbar icon
  });

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      updateContextMenu(tab);
    }
  } catch (err) {
    console.log('No active tab yet');
  }
});

// Listen for tab updates and update the menu
chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, updateContextMenu);
});

// Handle menu item clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.menuItemId === "togglePause" || !tab || !isValidUrl(tab.url)) return;

  try {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const { pausedSites = [] } = await chrome.storage.sync.get("pausedSites");
    const isPaused = pausedSites.includes(domain);

    if (isPaused) {
      // Remove the domain from paused sites
      const updatedSites = pausedSites.filter(site => site !== domain);
      await chrome.storage.sync.set({ pausedSites: updatedSites });

      // Remove DNR rules for this domain
      const ruleId = getRuleIdForDomain(domain);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId]
      }).then(() => {
        console.log(`Removed rule ID: ${ruleId}`);
      }).catch(error => console.error("Error removing rule:", error));;

      console.log(`${domain} resumed. Updated sites:`, updatedSites);
    } else {
      // Add the domain to paused sites
      const updatedSites = [...pausedSites, domain];
      chrome.storage.sync.set({ pausedSites: updatedSites });

      // Add a blocking rule for this domain
      const rule = createPauseRule(domain);
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [rule]
      }).then(() => {
        console.log(`Removed rule ID: ${ruleId}`);
      }).catch(error => console.error("Error removing rule:", error));

      console.log(`${domain} paused. Updated sites:`, updatedSites);
    }

    chrome.tabs.reload(tab.id);

    // Update the context menu title after toggling
    setTimeout(() => {
      updateContextMenu(tab);
    }, 200);
  } catch(err) {
    console.error('Error while toggling pause', err);
  }
});
