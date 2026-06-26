# Auto Refresh & Click
An intuitive, lightweight Chrome extension built to automate page monitoring and button interactions. It executes true browser reloads at customizable intervals, scans for targets, highlights matches visually, plays audio notifications, and runs automated click sequences. Optimized for RaterHub.

<img width="300" height="459" alt="image" src="https://github.com/user-attachments/assets/658d774a-6836-4b3d-9f88-c9473260a935" />


## Features

- **Real Page Reloads:** Performs true browser refreshes (via `chrome.tabs.reload`) rather than background DOM injections. This guarantees that elements load with their associated JavaScript event handlers intact.
  - **Quick Reload:** Uses cached resources where appropriate for speed.
  - **Full Reload:** Bypasses the cache entirely to ensure fresh content.
- **Smart Target Detection:** Scans for buttons, anchors, inputs, or standard text elements matching user-defined terms. Supports both exact-string matching and substring containment.
- **Visual Highlighting:** Wraps discovered target text inside a translucent yellow background node without disrupting the surrounding HTML architecture.
- **Audio Notifications:** Get alerted the moment a task appears with a built-in sound engine. You can easily adjust the volume level directly in the extension settings to match your workspace.
- **Work Protection:** Automatically stops monitoring immediately if a target is found (optional) or if a genuine user click is detected anywhere on the page. This prevents unexpected refresh loops while you are actively working.
- **RaterHub Optimization:** This extension was made with RaterHub users in mind. It features built-in routing safeguards that automatically block the extension from running on active task windows, settings, and task history views (`/task/show`, `/personalized_task_history`, etc.) to prevent data loss or unwanted page navigation.

## Installation
1.  Download this repository as a ZIP to a permanent local directory on your computer.
2.  Extract the folder from the ZIP.
3.  Open Google Chrome (or another Chromium browser like Edge or Brave) and navigate to `chrome://extensions`.
4.  Turn on the Developer mode toggle switch in the upper right corner.
5.  Click the "Load unpacked" button located in the top left corner.
6.  Select the local folder containing these project files.

## Settings & Usage
Click the extension icon in your browser toolbar to open the control panel:
- **Enabled:** The main toggle to pause or resume monitoring. This also serves as a manual reset switch to resume page refreshes after the script has been paused by a manual on-page click.
- **Check Interval:** The number of seconds the script waits between page refreshes.
- **Refresh Type:** Choose between Quick Reload (faster) or Full Reload (bypasses cache).
- **Button Text** to Look For: The specific word or phrase the script searches for on the page.
Button Text Match Mode:
- **Contains text:** Triggers on partial phrase matches.
- **Exact match:** Requires an exact string equivalence.
- **Run Only On:** Restricts where the extension is allowed to run. Options include matching a specific URL string, exact page matching, or running across any page on the domain.

## Technical Notes  
- **Autoplay and Sound Policies**  
Modern browsers restrict audio generation until a user interacts with the page. To ensure the sound triggers reliably without manual intervention, click the lock icon in the address bar for your target site, go to Site Settings, and change the Sound permission to Allow.

- **Window and Tab Focus**  
When a target element matches your criteria, the content script tells the background service worker to bring the active tab to the foreground and request window focus. This provides immediate visibility if the browser is hidden behind other system applications.
