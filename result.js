let originalText = '';

const processStateEl = document.getElementById('processState');
const optimizationSectionEl = document.getElementById('optimizationSection');
const optimizationCardsEl = document.getElementById('optimizationCards');

function setProcessState(text) {
  if (processStateEl) {
    processStateEl.textContent = text;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setResult') {
    originalText = request.text;
    document.getElementById('resultDisplay').textContent = request.text;
    processStateEl.classList.remove('loading');
    processStateEl.style.display = 'none';
    loadOptimizations(request.text);
  } else if (request.action === 'setError') {
    document.getElementById('errorText').textContent = 'Error: ' + request.error;
    document.getElementById('errorMsg').style.display = 'block';
    processStateEl.classList.remove('loading');
    setProcessState('An error occurred.');
  } else if (request.action === 'setLoading') {
    processStateEl.classList.add('loading');
    setProcessState(request.text);
    document.getElementById('resultDisplay').textContent = '';
  }
});

processStateEl.classList.add('loading');
setProcessState('Processing selection… waiting for AI response.');

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      if (!response) {
        reject(new Error('No response from background.'));
        return;
      }
      resolve(response);
    });
  });
}

function setOptimizationButtonsDisabled(disabled) {
  const buttons = optimizationCardsEl.querySelectorAll('button.optimization-card');
  buttons.forEach((button) => {
    button.disabled = disabled;
  });
}

function getIconForSuggestion(suggestion) {
  const text = (suggestion || '').toLowerCase();
  const scissorsKeywords = ['short', 'shorter', 'kurz', 'kürzer', 'compact', 'reduce', 'trim'];
  const ctaKeywords = ['call to action', 'cta', 'klick', 'action', 'button', 'persuad'];
  const emojiKeywords = ['emoji', 'emojis', 'tone', 'friendly', 'casual', 'personalize'];
  const briefcaseKeywords = ['professional', 'business', 'executive', 'formal', 'corporate'];
  const sparkleKeywords = ['clear', 'clarity', 'simplify', 'simple', 'improve', 'enhance'];

  if (scissorsKeywords.some((kw) => text.includes(kw))) {
    return ['<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="6" cy="7" r="3"/><circle cx="18" cy="7" r="3"/><line x1="9" y1="5" x2="15" y2="9"/><line x1="9" y1="9" x2="15" y2="5"/></svg>', 'Shorten'];
  }
  if (ctaKeywords.some((kw) => text.includes(kw))) {
    return ['<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5 12h14M12 5l7 7-7 7"/></svg>', 'Call to Action'];
  }
  if (emojiKeywords.some((kw) => text.includes(kw))) {
    return ['<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><path d="M8 14c.5 1.5 1.7 2 4 2s3.5-.5 4-2"/></svg>', 'Tone'];
  }
  if (briefcaseKeywords.some((kw) => text.includes(kw))) {
    return ['<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20 6H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H4V8h16v12z"/><line x1="9" y1="6" x2="9" y2="4" stroke="currentColor"/><line x1="15" y1="6" x2="15" y2="4" stroke="currentColor"/></svg>', 'Professional'];
  }
  if (sparkleKeywords.some((kw) => text.includes(kw))) {
    return ['<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>', 'Clarity'];
  }
  return ['<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>', 'Optimize'];
}

function toggleOptimizationLoading(show) {
  const loadingEl = document.getElementById('optimizationLoading');
  if (loadingEl) {
    if (show) {
      loadingEl.classList.add('active');
    } else {
      loadingEl.classList.remove('active');
    }
  }
}

async function loadOptimizations(text) {
  optimizationSectionEl.style.display = 'block';
  toggleOptimizationLoading(true);
  optimizationCardsEl.textContent = '';

  try {
    const response = await sendRuntimeMessage({ action: 'getOptimizations', text });
    if (!response.ok || !Array.isArray(response.suggestions)) {
      throw new Error(response.error || 'Could not load optimizations.');
    }

    response.suggestions.slice(0, 4).forEach((suggestion) => {
      const button = document.createElement('button');
      button.className = 'optimization-card';
      button.type = 'button';
      
      const [iconSvg, label] = getIconForSuggestion(suggestion);
      
      const iconSpan = document.createElement('span');
      iconSpan.innerHTML = iconSvg;
      
      const textSpan = document.createElement('span');
      textSpan.textContent = suggestion;
      
      button.appendChild(iconSpan);
      button.appendChild(textSpan);
      button.addEventListener('click', () => applyOptimization(suggestion));
      optimizationCardsEl.appendChild(button);
    });

    toggleOptimizationLoading(false);
  } catch (error) {
    console.warn('Failed to load optimizations:', error);
    toggleOptimizationLoading(false);
  }
}

async function applyOptimization(instruction) {
  if (!originalText || !instruction) return;

  try {
    setOptimizationButtonsDisabled(true);
    toggleOptimizationLoading(true);
    processStateEl.classList.add('loading');
    setProcessState(`Applying: ${instruction}`);

    const response = await sendRuntimeMessage({
      action: 'applyOptimization',
      text: originalText,
      instruction
    });

    if (!response.ok || !response.text) {
      throw new Error(response.error || 'Could not apply optimization.');
    }

    originalText = response.text;
    document.getElementById('resultDisplay').textContent = response.text;
    processStateEl.classList.remove('loading');
    setProcessState('Optimization applied.');
    await loadOptimizations(response.text);
  } catch (error) {
    processStateEl.classList.remove('loading');
    setProcessState('An error occurred.');
    toggleOptimizationLoading(false);
    showModal(`Optimization failed: ${error.message}`);
  } finally {
    setOptimizationButtonsDisabled(false);
  }
}

function stripMarkdown(markdown) {
  let text = markdown;
  // Remove code blocks and inline code
  text = text.replace(/```[\s\S]*?```/g, '');
  text = text.replace(/`([^`]+)`/g, '$1');
  // Remove bold and italic markers
  text = text.replace(/\*\*(.*?)\*\*/g, '$1');
  text = text.replace(/\*(.*?)\*/g, '$1');
  text = text.replace(/__(.*?)__/g, '$1');
  text = text.replace(/_(.*?)_/g, '$1');
  // Remove headings, lists, blockquotes, links, images
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/^[*-+]\s+/gm, '');
  text = text.replace(/^>\s+/gm, '');
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  // Remove remaining markdown chars
  text = text.replace(/\*|`|~|>/g, '');
  return text.trim();
}

const modal = document.getElementById('modal');
const modalText = document.getElementById('modalText');

function showModal(message) {
  if (modal && modalText) {
    modalText.textContent = message;
    modal.style.display = 'block';
    setTimeout(hideModal, 3000);
  }
}

function hideModal() {
  if (modal) modal.style.display = 'none';
}

document.getElementById('copyBtn').addEventListener('click', () => {
  const plainText = stripMarkdown(originalText);
  navigator.clipboard.writeText(plainText).then(() => {
    showModal('Copied to clipboard!');
  }).catch((err) => {
    console.error('Copy failed:', err);
    showModal('Copy failed: ' + err.message);
  });
});

document.getElementById('copyCloseBtn').addEventListener('click', () => {
  const plainText = stripMarkdown(originalText);
  navigator.clipboard.writeText(plainText).then(() => {
    showModal('Copied to clipboard! Closing tab...');
    // Close the tab after a brief delay to show the modal
    setTimeout(() => {
      window.close();
    }, 1000);
  }).catch((err) => {
    console.error('Copy failed:', err);
    showModal('Copy failed: ' + err.message);
  });
});

document.getElementById('openSettingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

