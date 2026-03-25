// content.js - Handle text selections and replacements
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkEditable') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;

      // Check if in editable element
      const isEditable = element.closest('input, textarea, [contenteditable="true"]') !== null;

      if (isEditable) {
        const selectedText = selection.toString();
        // Copy to clipboard as backup
        navigator.clipboard.writeText(selectedText).then(() => {
          console.log('Selected text copied to clipboard as backup');
        }).catch(err => console.error('Failed to copy to clipboard:', err));

        // Store that it's editable
        chrome.storage.local.set({ editableTab: sender.tab.id, selectedText: selectedText });
        sendResponse({ isEditable: true });
      } else {
        sendResponse({ isEditable: false });
      }
    } else {
      sendResponse({ isEditable: false });
    }
  } else if (request.action === 'replaceSelection') {
    chrome.storage.local.get(['editableTab'], (result) => {
      if (result.editableTab === sender.tab.id) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(request.text));
          // Clear storage
          chrome.storage.local.remove(['editableTab', 'selectedText']);
        }
      }
    });
  } else if (request.action === 'showLoading') {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);

      // Create a temporary span element to hold the loading text
      const loadingSpan = document.createElement('span');
      loadingSpan.id = 'ai-loading-' + request.loadingId;
      loadingSpan.textContent = request.text;
      loadingSpan.style.cssText = 'background-color: #fff3cd; color: #856404; padding: 2px 4px; border-radius: 3px; font-style: italic;';

      // Replace the selection with the loading span
      range.deleteContents();
      range.insertNode(loadingSpan);

      // Store reference for later replacement
      window.aiLoadingElements = window.aiLoadingElements || {};
      window.aiLoadingElements[request.loadingId] = loadingSpan;
    }
  } else if (request.action === 'replaceResult') {
    // Find and replace the loading element with the result
    const loadingElement = window.aiLoadingElements && window.aiLoadingElements[request.loadingId];
    if (loadingElement) {
      loadingElement.textContent = request.text;
      loadingElement.style.cssText = 'background-color: #d4edda; color: #155724; padding: 2px 4px; border-radius: 3px;';

      // Remove from storage after a delay
      setTimeout(() => {
        if (window.aiLoadingElements) {
          delete window.aiLoadingElements[request.loadingId];
        }
      }, 3000);
    }
  }
});