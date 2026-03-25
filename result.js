let originalText = '';

function simpleMarkdown(text) {
  // Escape HTML
  text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code
  text = text.replace(/`(.*?)`/g, '<code>$1</code>');
  // Links (simple)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Line breaks
  text = text.replace(/\n/g, '<br>');
  return text;
}

const processStateEl = document.getElementById('processState');

function setProcessState(text) {
  if (processStateEl) {
    processStateEl.textContent = text;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'setResult') {
    originalText = request.text;
    document.getElementById('resultDisplay').innerHTML = simpleMarkdown(request.text);
    setProcessState('The response is ready.');
  } else if (request.action === 'setError') {
    document.getElementById('errorText').textContent = 'Error: ' + request.error;
    document.getElementById('errorMsg').style.display = 'block';
    setProcessState('Fehler aufgetreten');
  } else if (request.action === 'setLoading') {
    setProcessState(request.text);
    document.getElementById('resultDisplay').innerHTML = '<div style="text-align: center; padding: 40px;"><div style="display: inline-block; width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #0078d4; border-radius: 50%; animation: spin 1s linear infinite;"></div><br><br><span style="color: #666;">Please wait...</span></div><style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>';
  }
});

setProcessState('Processing selection... waiting for AI response.');

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
const modalCloseBtn = document.getElementById('modalCloseBtn');

function showModal(message) {
  if (modal && modalText) {
    modalText.textContent = message;
    modal.style.display = 'block';
    // Auto-hide after 5 seconds
    setTimeout(() => {
      hideModal();
    }, 5000);
  }
}

function hideModal() {
  if (modal) {
    modal.style.display = 'none';
  }
}

if (modalCloseBtn) {
  modalCloseBtn.addEventListener('click', hideModal);
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