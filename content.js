// content.js

function getXPath(el) {
  if (!el || el === document.body) return '/html/body';
  const parts = [];
  let node = el;
  while (node && node.nodeType === Node.ELEMENT_NODE && node !== document.documentElement) {
    let index = 1;
    let sibling = node.previousSibling;
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === node.nodeName) index++;
      sibling = sibling.previousSibling;
    }
    parts.unshift(`${node.nodeName.toLowerCase()}[${index}]`);
    node = node.parentNode;
  }
  return '/' + parts.join('/');
}

function resolveXPath(xpath) {
  try {
    const result = document.evaluate(
      xpath, document, null,
      XPathResult.FIRST_ORDERED_NODE_TYPE, null
    );
    return result.singleNodeValue;
  } catch (e) {
    return null;
  }
}

function captureSelectionMeta() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

  const range = selection.getRangeAt(0);
  const startContainer = range.startContainer;
  const endContainer = range.endContainer;

  // Textarea / input case
  const activeEl = document.activeElement;
  if (
    activeEl &&
    (activeEl.tagName === 'TEXTAREA' ||
      (activeEl.tagName === 'INPUT' && ['text', 'search', 'url', 'tel', 'password'].includes(activeEl.type)))
  ) {
    if (activeEl.selectionStart !== activeEl.selectionEnd) {
      return {
        type: 'field',
        xpath: getXPath(activeEl),
        selectionStart: activeEl.selectionStart,
        selectionEnd: activeEl.selectionEnd,
        selectedText: activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd)
      };
    }
  }

  // DOM text node case
  const startEl = startContainer.nodeType === Node.TEXT_NODE ? startContainer.parentElement : startContainer;
  const startXPath = getXPath(startEl);
  const endEl = endContainer.nodeType === Node.TEXT_NODE ? endContainer.parentElement : endContainer;
  const endXPath = getXPath(endEl);

  return {
    type: 'range',
    startXPath,
    startOffset: range.startOffset,
    endXPath,
    endOffset: range.endOffset,
    selectedText: selection.toString()
  };
}

function replaceFromMeta(meta, replacementText) {
  if (!meta || !replacementText) return false;

  if (meta.type === 'field') {
    const el = resolveXPath(meta.xpath);
    if (el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
      const before = el.value.slice(0, meta.selectionStart);
      const after = el.value.slice(meta.selectionEnd);
      el.value = before + replacementText + after;
      el.selectionStart = el.selectionEnd = meta.selectionStart + replacementText.length;
      // Dispatch input event so frameworks detect the change
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    // Fallback: text search in active field
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'INPUT')) {
      const idx = activeEl.value.indexOf(meta.selectedText);
      if (idx !== -1) {
        activeEl.value = activeEl.value.slice(0, idx) + replacementText + activeEl.value.slice(idx + meta.selectedText.length);
        activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }
    return false;
  }

  if (meta.type === 'range') {
    const startEl = resolveXPath(meta.startXPath);
    const endEl = resolveXPath(meta.endXPath);

    if (startEl && endEl) {
      try {
        const range = document.createRange();

        // Locate exact text nodes
        const findTextNode = (el, targetOffset) => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
          let remaining = targetOffset;
          while (walker.nextNode()) {
            const node = walker.currentNode;
            if (remaining <= node.nodeValue.length) return { node, offset: remaining };
            remaining -= node.nodeValue.length;
          }
          // Fallback: first text node
          const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
          if (tw.nextNode()) return { node: tw.currentNode, offset: 0 };
          return null;
        };

        const start = startEl.nodeType === Node.TEXT_NODE
          ? { node: startEl, offset: meta.startOffset }
          : findTextNode(startEl, meta.startOffset);
        const end = endEl.nodeType === Node.TEXT_NODE
          ? { node: endEl, offset: meta.endOffset }
          : findTextNode(endEl, meta.endOffset);

        if (start && end) {
          range.setStart(start.node, Math.min(start.offset, start.node.nodeValue.length));
          range.setEnd(end.node, Math.min(end.offset, end.node.nodeValue.length));
          range.deleteContents();
          range.insertNode(document.createTextNode(replacementText));
          return true;
        }
      } catch (e) {
        console.warn('Precise range replacement failed, falling back to text search:', e);
      }
    }

    // Fallback: text search in DOM
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const idx = node.nodeValue.indexOf(meta.selectedText);
      if (idx !== -1) {
        node.nodeValue = node.nodeValue.slice(0, idx) + replacementText + node.nodeValue.slice(idx + meta.selectedText.length);
        return true;
      }
    }
    return false;
  }

  return false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ alive: true });
    return;
  }

  if (request.action === 'captureSelectionMeta') {
    const meta = captureSelectionMeta();
    sendResponse({ ok: !!meta, meta });
    return;
  }

  if (request.action === 'replaceStoredSelection') {
    const success = replaceFromMeta(request.meta, request.replacementText);
    if (success) {
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false, error: 'Replacement failed — original selection no longer found.' });
    }
    return;
  }

  sendResponse({ ok: true });
});