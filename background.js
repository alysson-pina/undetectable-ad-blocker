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

  chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
    const isPaused = whitelist.includes(domain);

    // Update the context menu title
    chrome.contextMenus.update("toggleWhitelist", {
      title: isPaused ? `Resume on ${domain}` : `Pause on ${domain}`
    });
  });
}

function initAdBlocker() {
  const domain = window.location.hostname;

  const observer = new MutationObserver((mutations) => {
    chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
      const isWhiteListed = whitelist.includes(domain);

      if (!isWhiteListed) {
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
  chrome.storage.sync.get("whitelist", ({ whitelist = [] }) => {
    const defaultSites = ["mail.google.com"];
    const updatedWhitelist = [...new Set([...whitelist, ...defaultSites])];

    chrome.storage.sync.set({ whitelist: updatedWhitelist }, () => {
      console.log("Whitelist initialized with:", updatedWhitelist);
    });
  });

  chrome.contextMenus.create({
    id: "toggleWhitelist",
    title: "Add this site to whitelist",
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
  if (!info.menuItemId === "toggleWhitelist" || !tab || !isValidUrl(tab.url)) return;

  try {
    const url = new URL(tab.url);
    const domain = url.hostname;
    const { whitelist = [] } = await chrome.storage.sync.get("whitelist");
    const isWhiteListed = whitelist.includes(domain);

    if (isWhiteListed) {
      // Remove the domain from paused sites
      const updatedSites = whitelist.filter(site => site !== domain);
      await chrome.storage.sync.set({ whitelist: updatedSites });

      // Remove DNR rules for this domain
      const ruleId = getRuleIdForDomain(domain);
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId]
      }).then(() => {
        console.log(`Removed rule ID: ${ruleId}`);
      }).catch(error => console.error("Error removing rule:", error));;

      console.log(`${domain} removed from whitelist. Updated sites:`, updatedSites);
    } else {
      // Add the domain to paused sites
      const updatedSites = [...whitelist, domain];
      chrome.storage.sync.set({ whitelist: updatedSites });

      // Add a blocking rule for this domain
      const rule = createPauseRule(domain);
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [rule]
      }).then(() => {
        console.log(`Removed rule ID: ${ruleId}`);
      }).catch(error => console.error("Error removing rule:", error));

      console.log(`${domain} added to the whitelist. Updated sites:`, updatedSites);
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
