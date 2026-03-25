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
  } else if (request.action === 'ping') {
    sendResponse({ alive: true });
  } else if (request.action === 'showLoading') {
    const loadingText = request.text;

    function isTextField(el) {
      return el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && ['text', 'search', 'url', 'tel', 'password'].includes(el.type)));
    }

    const activeEl = document.activeElement;
    let inserted = false;

    if (isTextField(activeEl) && activeEl.selectionStart != null && activeEl.selectionEnd != null && activeEl.selectionStart < activeEl.selectionEnd) {
      const start = activeEl.selectionStart;
      const end = activeEl.selectionEnd;
      const before = activeEl.value.slice(0, start);
      const after = activeEl.value.slice(end);
      activeEl.value = before + loadingText + after;

      window.aiLoadingElements = window.aiLoadingElements || {};
      window.aiLoadingElements[request.loadingId] = {
        type: 'field',
        element: activeEl,
        start,
        placeholderLength: loadingText.length,
        before,
        after
      };

      // Move caret to end of loading placeholder
      activeEl.selectionStart = activeEl.selectionEnd = start + loadingText.length;
      inserted = true;
    }

    if (!inserted) {
      const loadingNode = document.createTextNode(loadingText);
      const selection = window.getSelection();

      if (selection.rangeCount > 0 && !selection.isCollapsed) {
        try {
          const range = selection.getRangeAt(0);
          range.deleteContents();
          range.insertNode(loadingNode);
          inserted = true;
        } catch (err) {
          inserted = false;
        }
      }

      if (!inserted && request.selectedText) {
        function replaceFirstTextOccurrence(text, node) {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
          while (walker.nextNode()) {
            const current = walker.currentNode;
            const index = current.nodeValue.indexOf(text);
            if (index !== -1) {
              const before = document.createTextNode(current.nodeValue.slice(0, index));
              const after = document.createTextNode(current.nodeValue.slice(index + text.length));
              const parent = current.parentNode;

              parent.insertBefore(before, current);
              parent.insertBefore(node, current);
              parent.insertBefore(after, current);
              parent.removeChild(current);
              return true;
            }
          }
          return false;
        }

        inserted = replaceFirstTextOccurrence(request.selectedText, loadingNode);
      }

      if (!inserted) {
        document.body.appendChild(loadingNode);
      }

      window.aiLoadingElements = window.aiLoadingElements || {};
      window.aiLoadingElements[request.loadingId] = loadingNode;
    }
  } else if (request.action === 'replaceResult') {
    const loadingInfo = window.aiLoadingElements && window.aiLoadingElements[request.loadingId];

    if (loadingInfo && loadingInfo.type === 'field' && loadingInfo.element) {
      const field = loadingInfo.element;
      // Rebuild value using original boundaries
      const before = field.value.slice(0, loadingInfo.start);
      const after = field.value.slice(loadingInfo.start + loadingInfo.placeholderLength);
      field.value = before + request.text + after;
      field.selectionStart = field.selectionEnd = before.length + request.text.length;

      delete window.aiLoadingElements[request.loadingId];
      return;
    }

    if (loadingInfo && loadingInfo.nodeType === Node.TEXT_NODE) {
      const resultNode = document.createTextNode(request.text);
      if (loadingInfo.parentNode) {
        loadingInfo.parentNode.replaceChild(resultNode, loadingInfo);
      }
      delete window.aiLoadingElements[request.loadingId];
      return;
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const current = walker.currentNode;
      if (current.nodeValue === 'Loading...') {
        const resultNode = document.createTextNode(request.text);
        current.parentNode.replaceChild(resultNode, current);
        break;
      }
    }
  }
});