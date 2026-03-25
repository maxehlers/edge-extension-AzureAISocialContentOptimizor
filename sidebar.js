const frame = document.getElementById('copilotFrame');
const spinner = document.getElementById('spinner');

frame.addEventListener('load', () => {
  spinner.style.display = 'none';
  chrome.runtime.sendMessage({ action: 'sidebarReady' }, (response) => {
    if (response && response.status === 'ok') {
      console.log('Sidebar ready and Copilot tab was opened.');
    } else {
      console.warn('Sidebar ready: no selection or tab error:', response);
    }
  });
});
