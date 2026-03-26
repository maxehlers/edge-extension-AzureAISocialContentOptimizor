// const DEFAULT_PROMPT = 'Du bist der Social Media Manager von Microsoft. Bitte formuliere dies so um, dass es zu mehr Engagement und Klicks für die Zielgruppe "Entscheidungsträger" führt. Halte Dich kurz, prägnant und bleibe in der bestehenden Sprache. Bitte gebe mir AUSSCHLIEßLICH den generierten Text zurück und keine Argumente, warum Du etwas gemacht hast. Füge ggfs. passende Emojis hinzu.';

const DEFAULT_PROMPT = [
    'You are a Social Media Manager at Microsoft.',
    'Please rewrite the following content to be more engaging and clickable for the expected target audience.',
    '',
    'Requirements:',
    '- Write in Microsoft\'s tone of voice: professional, empowering, and human.',
    '- Keep it short and punchy (max 4 sentences).',
    '- Add relevant emojis.',
    '- Add relevant hashtags.',
    '- Leave an empty line between paragraphs.',
    '- Return ONLY the final post text, no explanations.'
  ].join('\n');

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
      title: '📎Rephrase with Azure AI Foundry',
      contexts: ['selection', 'editable']
    });    chrome.contextMenus.create({
      id: 'create-website-copy',
      title: '🦄 Create Social Media Copy for this Website',
      contexts: ['all']
    });  });
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
      max_completion_tokens: 800
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
  if (!markdownResult.trim()) {
    const reason = data.choices?.[0]?.finish_reason || 'unknown';
    throw new Error(`The API returned an empty response (finish_reason: ${reason}). Try a different API version or check your deployment.`);
  }
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
      max_completion_tokens: 800
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
      max_completion_tokens: 800
    })
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }

  const data = await response.json();
  const markdownResult = data.choices?.[0]?.message?.content || '';
  if (!markdownResult.trim()) {
    const reason = data.choices?.[0]?.finish_reason || 'unknown';
    throw new Error(`The API returned an empty response (finish_reason: ${reason}). Try a different API version or check your deployment.`);
  }
  return stripMarkdown(markdownResult);
}

async function callAzureAIForWebsite(url, title, selectedText, pageContent) {
  const { apiKey, endpoint, deployment, apiVersion } = await chrome.storage.sync.get(['apiKey', 'endpoint', 'deployment', 'apiVersion']);
  if (!apiKey || !endpoint || !deployment) {
    throw new Error('API settings not configured');
  }

  const version = apiVersion || '2023-05-15';
  const apiUrl = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;

  const quoteSection = selectedText && selectedText.trim()
    ? `\n\nInclude the following selected text as a quote in the post:\n"${selectedText.trim()}"`
    : '';

  const contentSection = pageContent && pageContent.trim()
    ? `\n\nPage content (use this as source material):\n${pageContent.trim().slice(0, 4000)}`
    : '';

  const prompt = [
    'You are a Social Media Manager at Microsoft.',
    'Write a short, engaging social media post to promote the following webpage.',
    '',
    'Requirements:',
    '- Write in Microsoft\'s tone of voice: professional, empowering, and human.',
    '- Keep it short and punchy (max 4 sentences).',
    '- Include a clear call to action (e.g. "Read more", "Check it out", "Learn more").',
    '- Add relevant emojis.',
    '- Always include a link to the webpage.',
    '- Add relevant hashtags.',
    '- Leave an empty line between paragraphs.',
    '- Match the language of the page title.',
    '- Return ONLY the final post text, no explanations.' + quoteSection,
    '',
    `Page title: ${title || 'Unknown'}`,
    `Page URL: ${url || ''}` + contentSection
  ].join('\n');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: prompt }
      ],
      max_completion_tokens: 1200
    })
  });

  if (!response.ok) {
    let errorText = `API call failed: ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error) {
        errorText += ` - ${errJson.error.message || JSON.stringify(errJson.error)}`;
      }
    } catch (err) { /* ignore */ }
    throw new Error(errorText);
  }

  const data = await response.json();
  const markdownResult = data.choices?.[0]?.message?.content || '';
  if (!markdownResult.trim()) {
    const reason = data.choices?.[0]?.finish_reason || 'unknown';
    throw new Error(`The API returned an empty response (finish_reason: ${reason}). Try a different API version or check your deployment.`);
  }
  return stripMarkdown(markdownResult);
}

function buildImagePrompt(headline, hasBackground) {
  if (hasBackground) {
    return [
      'Create a square 1080x1080 promotional social media image in Microsoft Fluent 2 design style.',
      'Apply a semi-transparent dark overlay to soften the provided background image.',
      'Display the following text prominently in the center in large, bold white sans-serif lettering (Segoe UI style):',
      `"${headline}"`,
      'Add a Microsoft blue (#0078D4) gradient accent bar along the bottom edge.',
      "Keep the design professional, modern, and aligned with Microsoft's visual identity."
    ].join('\n');
  }
  return [
    'Create a square 1080x1080 promotional social media image in Microsoft Fluent 2 design style.',
    'Background: modern abstract gradient using Microsoft brand colors — deep #0078D4 blue through soft white or light gray.',
    'Display the following text prominently in the center in large, bold white sans-serif lettering:',
    `"${headline}"`,
    'Add subtle geometric shapes or flowing lines typical of Microsoft design language.',
    'Include a Microsoft blue (#0078D4) gradient accent bar along the bottom edge.',
    'Professional, clean, modern corporate technology aesthetic.'
  ].join('\n');
}

async function generatePromotionalImage(headline, ogImageB64) {
  const { apiKey, endpoint, imageDeployment } = await chrome.storage.sync.get(['apiKey', 'endpoint', 'imageDeployment']);
  if (!apiKey || !endpoint || !imageDeployment) {
    throw new Error('Image generation is not configured. Please open Settings and fill in the Image Deployment Name field, then save.');
  }

  // Strip trailing slash so URLs don't double-slash
  const base = endpoint.replace(/\/+$/, '');
  // gpt-image-1 uses the /openai/v1/ path with model in the body, no deployment path, no api-version
  const genUrl = `${base}/openai/v1/images/generations`;

  if (ogImageB64) {
    try {
      const bgResponse = await fetch(ogImageB64);
      if (bgResponse.ok) {
        const bgBlob = await bgResponse.blob();
        const editsUrl = `${base}/openai/v1/images/edits`;
        const formData = new FormData();
        formData.append('image', bgBlob, 'background.png');
        formData.append('prompt', buildImagePrompt(headline, true));
        formData.append('model', imageDeployment);
        formData.append('size', '1024x1024');
        const editResponse = await fetch(editsUrl, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}` },
          body: formData
        });
        if (editResponse.ok) {
          const data = await editResponse.json();
          const b64 = data.data?.[0]?.b64_json;
          if (b64) return `data:image/png;base64,${b64}`;
        }
      }
    } catch (e) {
      console.warn('Image edit with background failed, falling back to generation:', e);
    }
  }

  const response = await fetch(genUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: imageDeployment,
      prompt: buildImagePrompt(headline, false),
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png',
      output_compression: 100,
      n: 1
    })
  });

  if (!response.ok) {
    let errorText = `Image API call failed: ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errorText += ` - ${errJson.error.message || JSON.stringify(errJson.error)}`;
    } catch (e) { /* ignore */ }
    throw new Error(errorText);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('No image data returned from the API. Check that your Image Deployment Name is correct.');
  return `data:image/png;base64,${b64}`;
}

async function generateTitle(resultText) {
  try {
    const { apiKey, endpoint, deployment, apiVersion } = await chrome.storage.sync.get(['apiKey', 'endpoint', 'deployment', 'apiVersion']);
    if (!apiKey || !endpoint || !deployment) return null;

    const version = apiVersion || '2023-05-15';
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${version}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: `Write a short headline (3-5 words) that summarizes the purpose of this social media post. Return ONLY the headline, no punctuation at the end, no quotes.\n\nPOST:\n${resultText}`
        }],
        max_completion_tokens: 500
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '';
    return raw.trim().replace(/[\.!?"']$/g, '') || null;
  } catch (e) {
    return null;
  }
}

function openResultPopup() {
  return new Promise((resolve) => {
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
        if (!resultTab?.id) { resolve(null); return; }

        chrome.tabs.onUpdated.addListener(function listener(resultTabId, changeInfo) {
          if (resultTabId === resultTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(resultTab.id);
          }
        });
      }
    );
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
  if (!tab?.id) return;

  if (info.menuItemId === 'create-website-copy') {
    const resultTabId = await openResultPopup();
    if (!resultTabId) return;

    chrome.tabs.sendMessage(resultTabId, {
      action: 'setLoading',
      text: 'Generating social media copy for this page\u2026'
    });

    try {
      let pageContent = '';
      let ogImageB64 = '';
      let ogImageUrl = '';
      try {
        const [{ result: pageData }] = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: async () => {
            const innerText = (document.body?.innerText || '').slice(0, 8000);
            const ogSrc = document.querySelector('meta[property="og:image"]')?.content ||
                          document.querySelector('meta[name="og:image"]')?.content || '';
            let ogB64 = '';
            if (ogSrc) {
              try {
                const resp = await fetch(ogSrc);
                if (resp.ok) {
                  const blob = await resp.blob();
                  ogB64 = await new Promise((res) => {
                    const reader = new FileReader();
                    reader.onloadend = () => res(reader.result || '');
                    reader.readAsDataURL(blob);
                  });
                }
              } catch (e) { /* OG image unavailable, continue without */ }
            }
            return { innerText, ogSrc, ogB64 };
          }
        });
        pageContent = pageData?.innerText || '';
        ogImageUrl = pageData?.ogSrc || '';
        ogImageB64 = pageData?.ogB64 || '';
      } catch (e) {
        console.warn('Could not extract page content:', e);
      }

      if (ogImageB64 && resultTabId) {
        await chrome.storage.session.set({ [`ogImage_${resultTabId}`]: ogImageB64 });
      }

      const text = await callAzureAIForWebsite(
        tab.url || '',
        tab.title || '',
        info.selectionText || '',
        pageContent
      );
      const imageHeadline = (info.selectionText || '').trim() || tab.title || '';
      const title = await generateTitle(text);
      if (title) chrome.tabs.sendMessage(resultTabId, { action: 'setTitle', title });
      chrome.tabs.sendMessage(resultTabId, {
        action: 'setResult',
        text,
        pageUrl: tab.url || '',
        imageHeadline,
        ogImageUrl
      });
    } catch (error) {
      chrome.tabs.sendMessage(resultTabId, { action: 'setError', error: error.message });
    }
    return;
  }

  if (info.menuItemId === 'optimize-copy') {
    if (!info.selectionText || !info.selectionText.trim()) {
      console.warn('No non-empty text selected for AI optimization.');
      return;
    }

    const resultTabId = await openResultPopup();
    if (!resultTabId) return;

    chrome.tabs.sendMessage(resultTabId, { action: 'setLoading', text: 'Processing your text with AI...' });

    try {
      const optimizedText = await callAzureAI(info.selectionText);
      const title = await generateTitle(optimizedText);
      if (title) chrome.tabs.sendMessage(resultTabId, { action: 'setTitle', title });
      chrome.tabs.sendMessage(resultTabId, { action: 'setResult', text: optimizedText });
    } catch (error) {
      chrome.tabs.sendMessage(resultTabId, { action: 'setError', error: error.message });
    }
  }
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

  if (request.action === 'generateImage') {
    (async () => {
      try {
        const tabId = sender.tab?.id;
        let ogImageB64 = '';
        if (tabId) {
          const sessionData = await chrome.storage.session.get([`ogImage_${tabId}`]);
          ogImageB64 = sessionData[`ogImage_${tabId}`] || '';
        }
        const imageDataUrl = await generatePromotionalImage(request.headline || '', ogImageB64);
        sendResponse({ ok: true, imageDataUrl });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || String(error) });
      }
    })();
    return true;
  }
});

