const DEFAULT_PROMPT = 'Du bist der Social Media Manager von Microsoft. Bitte formuliere dies so um, dass es zu mehr Engagement und Klicks für die Zielgruppe "Entscheidungsträger" führt. Halte Dich kurz, prägnant und bleibe in der bestehenden Sprache. Füge ggfs. passende Emojis hinzu.';

async function getPrompt() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['initialPrompt'], (result) => {
      resolve(result.initialPrompt ? result.initialPrompt.trim() : DEFAULT_PROMPT);
    });
  });
}

// This event handler runs when the extension is installed or updated; it sets up the context menu and checks for required settings.
function createContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'optimize-copy',
      title: '📎Optimize copy with AI',
      contexts: ['selection', 'editable']
    });
  });
}

chrome.runtime.onInstalled.addListener(() => {
  createContextMenu();

  // Check if settings are set
  chrome.storage.sync.get(['apiKey', 'endpoint', 'deployment'], (result) => {
    if (!result.apiKey || !result.endpoint || !result.deployment) {
      chrome.tabs.create({ url: chrome.runtime.getURL('settings.html') });
    }
  });
});

chrome.runtime.onStartup.addListener(() => {
  createContextMenu();
});

// Ensure menu is available even when the worker is reloaded
createContextMenu();

function stripMarkdown(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') return '';

  let text = markdownText;

  // Code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // Headers
  text = text.replace(/^\s*#{1,6}\s+/gm, '');

  // Blockquotes
  text = text.replace(/^\s*>\s?/gm, '');

  // Lists
  text = text.replace(/^\s*([-*+]\s+|\d+\.\s+)/gm, '');

  // Bold / Italic
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/_(.*?)_/g, '$1');

  // Links: [text](url) -> text
  text = text.replace(/!\[([^\]]*)\]\([^\)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\([^\)]*\)/g, '$1');

  // Remove images that may remain
  text = text.replace(/!\[[^\]]*\]\([^\)]*\)/g, '');

  // Remove horizontal rules
  text = text.replace(/^\s*([-_*]){3,}\s*$/gm, '');

  // Convert markdown line breaks and extra spaces
  text = text.replace(/\r\n|\r/g, '\n');
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

async function callAzureAI(text) {
  const { apiKey, endpoint, deployment, apiVersion } = await chrome.storage.sync.get(['apiKey', 'endpoint', 'deployment', 'apiVersion']);
  if (!apiKey || !endpoint || !deployment) {
    throw new Error('API settings not configured');
  }

  const prompt = await getPrompt();
  const version = apiVersion || '2023-05-15';
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: `${prompt}\n\n${text}` }
      ],
      max_tokens: 500
    })
  });

  if (!response.ok) {
    let errorText = `API call failed: ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error) {
        errorText += ` - ${errJson.error.message || JSON.stringify(errJson.error)}`;
      }
    } catch (err) {
      // ignore JSON parse errors
    }
    throw new Error(errorText);
  }

  const data = await response.json();
  const markdownResult = data.choices?.[0]?.message?.content || '';
  return stripMarkdown(markdownResult);

}

function checkEditableSelection(tabId) {
  return new Promise((resolve) => {
    // Very short timeout - if content script doesn't respond quickly, assume not editable
    const timeout = setTimeout(() => {
      resolve(false);
    }, 200); // 200ms timeout

    try {
      chrome.tabs.sendMessage(tabId, { action: 'checkEditable' }, (response) => {
        clearTimeout(timeout);
        if (chrome.runtime.lastError || !response) {
          resolve(false);
        } else {
          resolve(response.isEditable === true);
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      resolve(false);
    }
  });
}

async function ensureContentScript(tabId) {
  const checkAlive = () => new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError || !response?.alive) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });

  let alive = await checkAlive();
  if (alive) return true;

  // Try to inject content script dynamically if not already present.
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
    alive = await checkAlive();
    return alive;
  } catch (err) {
    console.warn('Could not inject content script dynamically:', err);
    return false;
  }
}

function safeSendMessage(tabId, message) {
  try {
    // Fire-and-forget: no callback to avoid "message port closed" warnings
    chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    // If tab cannot receive, fail silently to avoid breakage
    console.warn('Error sending message:', error);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) {
    console.warn('No text selected for AI optimization.');
    return;
  }

  if (!tab?.id) return;

  const isEditable = await checkEditableSelection(tab.id);

  if (isEditable) {
    try {
      const loadingId = Date.now().toString();

      safeSendMessage(tab.id, {
        action: 'showLoading',
        loadingId: loadingId,
        text: 'Loading...',
        selectedText: info.selectionText
      });

      const optimizedText = await callAzureAI(info.selectionText);

      safeSendMessage(tab.id, {
        action: 'replaceResult',
        loadingId: loadingId,
        text: optimizedText
      });
    } catch (error) {
      console.error('Error optimizing text:', error);
      const errorId = Date.now().toString();
      safeSendMessage(tab.id, {
        action: 'showLoading',
        loadingId: errorId,
        text: 'Error: ' + error.message
      });
    }
  } else {
    chrome.tabs.create({ url: chrome.runtime.getURL('result.html') }, (newTab) => {
      chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.sendMessage(tabId, { action: 'setLoading', text: 'Processing your text with AI...' });
          chrome.tabs.onUpdated.removeListener(listener);

          (async () => {
            try {
              const optimizedText = await callAzureAI(info.selectionText);
              chrome.tabs.sendMessage(tabId, { action: 'setResult', text: optimizedText });
            } catch (error) {
              chrome.tabs.sendMessage(tabId, { action: 'setError', error: error.message });
            }
          })();
        }
      });
    });
  }
});
``