let imageHeadline = '';
let imageDomain = '';

const resultDisplayEl = document.getElementById('resultDisplay');
const processStateEl = document.getElementById('processState');
const optimizationSectionEl = document.getElementById('optimizationSection');
const optimizationCardsEl = document.getElementById('optimizationCards');
const translateSectionEl = document.getElementById('translateSection');
const translateSelectEl = document.getElementById('translateSelect');

function setProcessState(text) {
  if (processStateEl) {
    processStateEl.textContent = text;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setResult') {
    resultDisplayEl.value = request.text;
    document.getElementById('resultEditor').style.display = '';
    setTextProcessing(false);
    processStateEl.classList.remove('loading');
    processStateEl.style.display = 'none';
    const copyBtn = document.getElementById('copyBtn');
    if (copyBtn) copyBtn.style.display = '';
    loadOptimizations(request.text);
    if (translateSectionEl) translateSectionEl.style.display = 'block';
    if (translateSelectEl) translateSelectEl.value = '';
    if (request.pageUrl) {
      imageHeadline = request.imageHeadline || '';
      try { imageDomain = new URL(request.pageUrl).hostname.replace(/^www\./, ''); } catch (e) { imageDomain = ''; }
      chrome.storage.sync.get(['imageDeployment'], (result) => {
        if (result.imageDeployment && result.imageDeployment.trim()) {
          const createImageBtn = document.getElementById('createImageBtn');
          if (createImageBtn) createImageBtn.style.display = '';
          const imageSection = document.getElementById('imageSection');
          if (imageSection) imageSection.style.display = '';
        }
      });
    }
  } else if (request.action === 'setError') {
    setTextProcessing(false);
    processStateEl.classList.remove('loading');
    processStateEl.style.display = 'none';
    showWarningToast('⚠\uFE0F ' + request.error);
    setProcessState('An error occurred.');
  } else if (request.action === 'setLoading') {
    setTextProcessing(true);
    processStateEl.classList.add('loading');
    setProcessState(request.text);
    resultDisplayEl.value = '';
  } else if (request.action === 'setTitle') {
    const titleEl = document.querySelector('.app-title');
    if (titleEl) titleEl.textContent = request.title;
    document.title = request.title;
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

function setTextProcessing(processing) {
  resultDisplayEl.readOnly = processing;
  setOptimizationButtonsDisabled(processing);
  if (translateSelectEl) translateSelectEl.disabled = processing;
}

function getPostText() {
  const text = resultDisplayEl.value;
  if (!text.trim()) {
    throw new Error('Please enter some post text first.');
  }
  return text;
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
      button.disabled = resultDisplayEl.readOnly;
      
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
  if (!instruction || resultDisplayEl.readOnly) return;

  try {
    const text = getPostText();
    setTextProcessing(true);
    toggleOptimizationLoading(true);
    processStateEl.classList.add('loading');
    processStateEl.style.display = '';
    setProcessState(`Applying: ${instruction}`);

    const response = await sendRuntimeMessage({
      action: 'applyOptimization',
      text,
      instruction
    });

    if (!response.ok || !response.text) {
      throw new Error(response.error || 'Could not apply optimization.');
    }

    resultDisplayEl.value = response.text;
    processStateEl.classList.remove('loading');
    setProcessState('Optimization applied.');
    await loadOptimizations(response.text);
  } catch (error) {
    processStateEl.classList.remove('loading');
    setProcessState('An error occurred.');
    toggleOptimizationLoading(false);
    showWarningToast('⚠\uFE0F ' + error.message);
  } finally {
    setTextProcessing(false);
  }
}

const modal = document.getElementById('modal');
const modalText = document.getElementById('modalText');

function showModal(message) {
  if (modal && modalText) {
    modal.classList.remove('warning');
    modalText.textContent = message;
    modal.style.display = 'block';
    setTimeout(hideModal, 3000);
  }
}

function showWarningToast(message) {
  if (modal && modalText) {
    modal.classList.add('warning');
    modalText.textContent = message;
    modal.style.display = 'block';
    setTimeout(hideModal, 5000);
  }
}

function hideModal() {
  if (modal) modal.style.display = 'none';
}

document.getElementById('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(getPostText());
    showModal('Copied to clipboard!');
  } catch (err) {
    console.error('Copy failed:', err);
    showWarningToast('Copy failed: ' + err.message);
  }
});

document.getElementById('openSettingsBtn').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

async function createImage() {
  if (!imageHeadline) return;

  const imageSection = document.getElementById('imageSection');
  const imageLoadingEl = document.getElementById('imageLoading');
  const imagePreviewWrap = document.getElementById('imagePreviewWrap');
  const createImageBtn = document.getElementById('createImageBtn');
  const generatedImg = document.getElementById('generatedImage');

  if (imageSection) imageSection.style.display = 'block';
  if (imageLoadingEl) imageLoadingEl.classList.add('active');
  if (imagePreviewWrap) imagePreviewWrap.style.display = 'none';
  if (createImageBtn) createImageBtn.style.display = 'none';

  try {
    const response = await sendRuntimeMessage({ action: 'generateImage', headline: imageHeadline, domain: imageDomain });
    if (response?.debug) console.log('[promo image] debug:', response.debug);
    if (!response.ok || !response.imageDataUrl) {
      throw new Error(response.error || 'Image generation failed.');
    }
    if (generatedImg) generatedImg.src = response.imageDataUrl;
    if (imageLoadingEl) imageLoadingEl.classList.remove('active');
    if (imagePreviewWrap) imagePreviewWrap.style.display = 'block';
    const createBtn = document.getElementById('createImageBtn');
    if (createBtn) createBtn.style.display = 'none';
    // Reset alt text section for the new image
    const showAltBtn = document.getElementById('showAltTextBtn');
    const altLoadingEl = document.getElementById('altTextLoading');
    const altResultEl = document.getElementById('altTextResult');
    if (showAltBtn) { showAltBtn.style.display = ''; showAltBtn.disabled = false; showAltBtn.classList.remove('open'); }
    if (altLoadingEl) altLoadingEl.style.display = 'none';
    if (altResultEl) altResultEl.style.display = 'none';
  } catch (error) {
    if (imageLoadingEl) imageLoadingEl.classList.remove('active');
    if (imageSection) imageSection.style.display = 'none';
    if (createImageBtn) createImageBtn.style.display = '';
    showWarningToast('\u26A0\uFE0F ' + error.message);
  } finally {
    if (createImageBtn) createImageBtn.disabled = false;
  }
}

document.getElementById('createImageBtn')?.addEventListener('click', createImage);

document.getElementById('regenerateImageBtn')?.addEventListener('click', createImage);

document.getElementById('downloadImageBtn')?.addEventListener('click', () => {
  const img = document.getElementById('generatedImage');
  if (!img?.src || !img.src.startsWith('data:')) return;
  const a = document.createElement('a');
  a.href = img.src;
  a.download = 'promotional-image.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

document.getElementById('showAltTextBtn')?.addEventListener('click', async () => {
  const img = document.getElementById('generatedImage');
  if (!img?.src || !img.src.startsWith('data:')) return;

  const showAltBtn = document.getElementById('showAltTextBtn');
  const altLoadingEl = document.getElementById('altTextLoading');
  const altResultEl = document.getElementById('altTextResult');
  const altContentEl = document.getElementById('altTextContent');

  // If already open, toggle closed
  if (showAltBtn?.classList.contains('open')) {
    showAltBtn.classList.remove('open');
    if (altResultEl) altResultEl.style.display = 'none';
    return;
  }

  // If alt text already loaded, just re-show it
  if (altContentEl?.textContent) {
    showAltBtn?.classList.add('open');
    if (altResultEl) altResultEl.style.display = 'flex';
    return;
  }

  if (showAltBtn) showAltBtn.disabled = true;
  if (altLoadingEl) altLoadingEl.style.display = 'block';

  try {
    const response = await sendRuntimeMessage({ action: 'getAltText', imageDataUrl: img.src });
    if (!response.ok || !response.altText) throw new Error(response.error || 'Could not generate alt text.');
    if (altContentEl) altContentEl.textContent = response.altText;
    showAltBtn?.classList.add('open');
    if (altResultEl) altResultEl.style.display = 'flex';
  } catch (error) {
    if (showAltBtn) { showAltBtn.disabled = false; }
    showWarningToast('\u26A0\uFE0F ' + error.message);
  } finally {
    if (altLoadingEl) altLoadingEl.style.display = 'none';
    if (showAltBtn) showAltBtn.disabled = false;
  }
});

document.getElementById('copyAltTextBtn')?.addEventListener('click', () => {
  const altContentEl = document.getElementById('altTextContent');
  const text = altContentEl?.textContent || '';
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => showModal('Alt text copied!'));
});

translateSelectEl?.addEventListener('change', async (event) => {
  const language = event.target.value;
  if (!language || resultDisplayEl.readOnly) return;

  try {
    const text = getPostText();
    setTextProcessing(true);
    processStateEl.classList.add('loading');
    processStateEl.style.display = '';
    setProcessState(`Translating into ${language}…`);

    const response = await sendRuntimeMessage({
      action: 'translateText',
      text,
      language
    });

    if (!response.ok || !response.text) {
      throw new Error(response.error || 'Could not translate text.');
    }

    resultDisplayEl.value = response.text;
    processStateEl.classList.remove('loading');
    setProcessState(`Translated into ${language}.`);
    await loadOptimizations(response.text);
  } catch (error) {
    processStateEl.classList.remove('loading');
    setProcessState('An error occurred.');
    showWarningToast('⚠\uFE0F ' + error.message);
  } finally {
    setTextProcessing(false);
  }
});
