const DEFAULT_PROMPT = 'Du bist der Social Media Manager von Microsoft. Bitte formuliere dies so um, dass es zu mehr Engagement und Klicks für die Zielgruppe "Entscheidungsträger" führt. Halte Dich kurz, prägnant und bleibe in der bestehenden Sprache. Bitte gebe mir AUSSCHLIEßLICH den generierten Text zurück und keine Argumente, warum Du etwas gemacht hast. Füge ggfs. passende Emojis hinzu.';

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
        { role: 'user', content: `Use these instructions:\n${prompt}\n\n This is the social media post to be transformed:\n ${text}` }
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

function parseOptimizationSuggestions(rawText) {
  const lines = (rawText || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);

  const unique = [];
  for (const line of lines) {
    if (!unique.includes(line)) unique.push(line);
    if (unique.length === 4) break;
  }

  const fallback = [
    'Make this post shorter.',
    'Make the headline more attention-grabbing.',
    'Add a stronger call to action.',
    'Add relevant emojis.'
  ];

  while (unique.length < 4) {
    unique.push(fallback[unique.length]);
  }

  return unique.slice(0, 4);
}

async function getOptimizationSuggestions(currentText) {
  const { apiKey, endpoint, deployment, apiVersion } = await chrome.storage.sync.get(['apiKey', 'endpoint', 'deployment', 'apiVersion']);
  if (!apiKey || !endpoint || !deployment) {
    throw new Error('API settings not configured');
  }

  const version = apiVersion || '2023-05-15';
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;

  const prompt = [
    'You are helping optimize social-media copy.',
    'Given the text below, return exactly 4 short optimization actions.',
    'Each action must be a standalone instruction (max 8 words).',
    'Return plain text only, one action per line, no numbering.'
  ].join('\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: `${prompt}\n\nTEXT:\n${currentText}` }
      ],
      max_tokens: 180
    })
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  const data = await response.json();
  const suggestionText = stripMarkdown(data.choices?.[0]?.message?.content || '');
  return parseOptimizationSuggestions(suggestionText);
}

async function applyOptimizationInstruction(currentText, instruction) {
  const { apiKey, endpoint, deployment, apiVersion } = await chrome.storage.sync.get(['apiKey', 'endpoint', 'deployment', 'apiVersion']);
  if (!apiKey || !endpoint || !deployment) {
    throw new Error('API settings not configured');
  }

  const version = apiVersion || '2023-05-15';
  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;

  const prompt = [
    'Rewrite the text according to this instruction:',
    instruction,
    '',
    'Rules:',
    '- Keep the original language.',
    '- Return only the final rewritten text.',
    '- No explanation.'
  ].join('\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: `${prompt}\n\nTEXT:\n${currentText}` }
      ],
      max_tokens: 500
    })
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  const data = await response.json();
  const markdownResult = data.choices?.[0]?.message?.content || '';
  return stripMarkdown(markdownResult);
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
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      const messageText = chrome.runtime.lastError.message || '';
      if (
        !messageText.includes('The message port closed before a response was received') &&
        !messageText.includes('Receiving end does not exist')
      ) {
        console.warn('safeSendMessage failed:', messageText);
      }
    }
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText || !info.selectionText.trim()) {
    console.warn('No non-empty text selected for AI optimization.');
    return;
  }

  if (!tab?.id) return;

  chrome.windows.create(
    {
      url: chrome.runtime.getURL('result.html'),
      type: 'popup',
      width: 520,
      height: 720,
      focused: true
    },
    (newWindow) => {
      const resultTab = newWindow?.tabs?.[0];
      if (!resultTab?.id) {
        return;
      }

      chrome.tabs.onUpdated.addListener(function listener(resultTabId, changeInfo) {
        if (resultTabId === resultTab.id && changeInfo.status === 'complete') {
          chrome.tabs.sendMessage(resultTabId, { action: 'setLoading', text: 'Processing your text with AI...' });
          chrome.tabs.onUpdated.removeListener(listener);

          (async () => {
            try {
              const optimizedText = await callAzureAI(info.selectionText);
              chrome.tabs.sendMessage(resultTabId, { action: 'setResult', text: optimizedText });
            } catch (error) {
              chrome.tabs.sendMessage(resultTabId, { action: 'setError', error: error.message });
            }
          })();
        }
      });
    }
  );
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getOptimizations') {
    (async () => {
      try {
        const suggestions = await getOptimizationSuggestions(request.text || '');
        sendResponse({ ok: true, suggestions });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || String(error) });
      }
    })();
    return true;
  }

  if (request.action === 'applyOptimization') {
    (async () => {
      try {
        const text = await applyOptimizationInstruction(request.text || '', request.instruction || '');
        sendResponse({ ok: true, text });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || String(error) });
      }
    })();
    return true;
  }
});

