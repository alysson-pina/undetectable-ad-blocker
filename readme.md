# Undetectable Ad Blocker

## 📌 Overview
Undetectable Ad Blocker is a lightweight and privacy-focused browser extension designed to block intrusive ads while remaining undetectable by ad-blocker detection scripts.

## 🚀 Features
- Blocks ads using **declarativeNetRequest** for efficiency
- Removes intrusive elements dynamically
- Provides a context menu to **pause ad blocking** on specific sites
- Uses **MutationObserver** to block dynamically loaded ads
- Supports **Chrome Manifest V3** for enhanced security

## 🛠️ Installation

### Load as an Unpacked Extension
1. Open **Google Chrome**.
2. Go to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the project folder.

## 🔧 How It Works
### **Content Script** (`content.js`)
- Scans and removes ads based on predefined selectors.
- Uses **MutationObserver** to block dynamically loaded ads.

### **Background Service Worker** (`background.js`)
- Handles communication between tabs and content scripts.
- Manages the **pause functionality** for specific domains.
- Updates the **context menu** dynamically.

## 📝 Usage
### Pause Ad Blocking on a Website
1. Right-click on the page or the extension icon.
2. Click **"Pause on this site"**.
3. The site will be added to the pause list and ads will not be blocked.

### Resume Ad Blocking
1. Right-click on the page or extension icon.
2. Click **"Resume on this site"**.
3. Ads will be blocked again.

## 📤 Publishing the Extension
1. Zip the extension files (excluding `node_modules` if any).
2. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard).
3. Click **Add a new item**.
4. Upload the `.zip` file.
5. Fill in required details and submit for review.

## 🐞 Debugging
- Open **Developer Tools** (`F12` or `Ctrl + Shift + I`).
- Navigate to the **Extensions** tab (`chrome://extensions/`).
- Find your extension and click **Inspect views > Service Worker**.
- Check for logs or errors in the **Console**.

## 📜 License
This project is licensed under the **MIT License**. Feel free to use and modify it!
