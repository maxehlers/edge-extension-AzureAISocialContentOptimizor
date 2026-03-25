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
  return data.choices?.[0]?.message?.content || '';

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

function safeSendMessage(tabId, message) {
  try {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        // Only log if it's not the common "port closed" error
        if (!chrome.runtime.lastError.message.includes('closed before a response')) {
          console.warn('sendMessage failed:', chrome.runtime.lastError.message);
        }
      }
    });
  } catch (error) {
    console.warn('Error sending message:', error);
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!info.selectionText) {
    // Show notification if no text is selected
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE2IDFINGMyLjkgMSAyIDEuOSAyIDN2MTRoMlYzSDE2VjF6TTE5IDVIOGM2LjkgNSA2IDUuOSA2IDd2MTRjMCAxLjEgLjkgMiAyIDJoMTFjMS4xIDAgMi0uOSAyLTJWNUMyMSAxOS4xIDIwLjEgMTkgMTkgMTl6TTE5IDIxSDhWN0gxOVYyMXoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPg==',
      title: 'No Text Selected',
      message: 'Please select some text before using the AI optimization feature.'
    });
    return;
  }

  if (!tab?.id) return;

  try {
    // Always replace in place: show loading first, then replace with result
    const loadingId = Date.now().toString(); // Unique ID for this operation

    // Show "Loading..." in place of selected text
    safeSendMessage(tab.id, {
      action: 'showLoading',
      loadingId: loadingId,
      text: 'Loading...'
    });

    // Process with AI in background
    const optimizedText = await callAzureAI(info.selectionText);

    // Replace loading text with result
    safeSendMessage(tab.id, {
      action: 'replaceResult',
      loadingId: loadingId,
      text: optimizedText
    });

  } catch (error) {
    console.error('Error optimizing text:', error);
    // Show error in place of selected text
    const errorId = Date.now().toString();
    safeSendMessage(tab.id, {
      action: 'showLoading',
      loadingId: errorId,
      text: 'Error: ' + error.message
    });
  }
});
``