// content.js - Handle editable selections
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
  }
});