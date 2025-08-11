// Service Worker Registration Script
// This should be included in your index.html

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    registerServiceWorker();
    setupInstallPrompt();
    checkOnlineStatus();
  });
}

async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    
    console.log('Service Worker registered successfully:', registration);
    
    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60000); // Check every minute
    
    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New service worker available
          showUpdateNotification();
        }
      });
    });
    
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
}

// Show update notification when new version is available
function showUpdateNotification() {
  const updateBanner = document.createElement('div');
  updateBanner.className = 'update-banner';
  updateBanner.innerHTML = `
    <div class="update-content">
      <span>A new version of Learn Python is available!</span>
      <button onclick="updateApp()" class="update-btn">Update Now</button>
      <button onclick="dismissUpdate()" class="dismiss-btn">Later</button>
    </div>
  `;
  
  // Add styles for the update banner
  const style = document.createElement('style');
  style.textContent = `
    .update-banner {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #3776ab;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 10000;
      animation: slideUp 0.3s ease-out;
    }
    
    .update-content {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .update-btn, .dismiss-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .update-btn {
      background: white;
      color: #3776ab;
    }
    
    .dismiss-btn {
      background: transparent;
      color: white;
      border: 1px solid white;
    }
    
    @keyframes slideUp {
      from {
        transform: translateX(-50%) translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(updateBanner);
}

// Update the app by reloading
function updateApp() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

// Dismiss update notification
function dismissUpdate() {
  const banner = document.querySelector('.update-banner');
  if (banner) {
    banner.remove();
  }
}

// Setup install prompt for PWA
let deferredPrompt;

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show custom install button
    showInstallButton();
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    hideInstallButton();
    // Track installation
    if (typeof gtag !== 'undefined') {
      gtag('event', 'pwa_install', {
        'event_category': 'PWA',
        'event_label': 'Install'
      });
    }
  });
}

// Show custom install button
function showInstallButton() {
  // Check if already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return;
  }
  
  // Check if install button already exists
  if (document.querySelector('.install-prompt')) {
    return;
  }
  
  const installPrompt = document.createElement('div');
  installPrompt.className = 'install-prompt';
  installPrompt.innerHTML = `
    <div class="install-content">
      <div class="install-icon">📱</div>
      <div class="install-text">
        <strong>Install Learn Python</strong>
        <span>Add to your home screen for offline access</span>
      </div>
      <button onclick="installPWA()" class="install-btn">Install</button>
      <button onclick="hideInstallButton()" class="close-btn">✕</button>
    </div>
  `;
  
  // Add styles for install prompt
  const style = document.createElement('style');
  style.textContent = `
    .install-prompt {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      padding: 15px 20px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 90%;
      animation: slideDown 0.3s ease-out;
    }
    
    .install-content {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .install-icon {
      font-size: 32px;
    }
    
    .install-text {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .install-text strong {
      font-size: 16px;
      color: #333;
    }
    
    .install-text span {
      font-size: 14px;
      color: #666;
    }
    
    .install-btn {
      padding: 10px 20px;
      background: #3776ab;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
    }
    
    .close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #999;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    @keyframes slideDown {
      from {
        transform: translateX(-50%) translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    }
    
    @media (max-width: 480px) {
      .install-prompt {
        width: calc(100% - 40px);
        max-width: none;
      }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(installPrompt);
  
  // Auto-hide after 30 seconds
  setTimeout(() => {
    hideInstallButton();
  }, 30000);
}

// Install PWA when user clicks install button
async function installPWA() {
  if (!deferredPrompt) {
    return;
  }
  
  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  
  console.log(`User response to the install prompt: ${outcome}`);
  
  // Clear the deferred prompt
  deferredPrompt = null;
  
  // Hide install button
  hideInstallButton();
}

// Hide install button
function hideInstallButton() {
  const installPrompt = document.querySelector('.install-prompt');
  if (installPrompt) {
    installPrompt.style.animation = 'slideDown 0.3s ease-out reverse';
    setTimeout(() => {
      installPrompt.remove();
    }, 300);
  }
}

// Check online/offline status
function checkOnlineStatus() {
  function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    
    // Remove existing status indicator
    const existingIndicator = document.querySelector('.offline-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    if (!isOnline) {
      const indicator = document.createElement('div');
      indicator.className = 'offline-indicator';
      indicator.innerHTML = `
        <span>🔌 You're offline - Some features may be limited</span>
      `;
      
      // Add styles
      const style = document.createElement('style');
      style.textContent = `
        .offline-indicator {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #ff9800;
          color: white;
          padding: 8px;
          text-align: center;
          font-size: 14px;
          z-index: 9999;
          animation: slideDown 0.3s ease-out;
        }
      `;
      
      if (!document.querySelector('style[data-offline]')) {
        style.setAttribute('data-offline', 'true');
        document.head.appendChild(style);
      }
      
      document.body.appendChild(indicator);
    }
  }
  
  // Check initial status
  updateOnlineStatus();
  
  // Listen for online/offline events
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

// Clear all caches (useful for debugging)
function clearAllCaches() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    console.log('Cache clear request sent');
  }
}

// Export functions for use in other scripts
window.PWAManager = {
  installPWA,
  hideInstallButton,
  updateApp,
  dismissUpdate,
  clearAllCaches
};