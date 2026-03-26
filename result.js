let originalText = '';

const processStateEl = document.getElementById('processState');

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
    setProcessState('The response is ready.');
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

