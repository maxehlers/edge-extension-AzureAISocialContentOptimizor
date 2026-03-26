document.getElementById('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = document.getElementById('apiKey').value;
  const endpoint = document.getElementById('endpoint').value;
  const deployment = document.getElementById('deployment').value;
  const apiVersion = document.getElementById('apiVersion').value;
  const initialPrompt = document.getElementById('initialPrompt').value;

  chrome.storage.sync.set({ apiKey, endpoint, deployment, apiVersion, initialPrompt }, () => {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    toastText.textContent = '✓ Settings saved!';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
      window.close();
    }, 3000);
  });
});

// Load existing settings
chrome.storage.sync.get(['apiKey', 'endpoint', 'deployment', 'apiVersion', 'initialPrompt'], (result) => {
  document.getElementById('apiKey').value = result.apiKey || '';
  document.getElementById('endpoint').value = result.endpoint || '';
  document.getElementById('deployment').value = result.deployment || '';
  document.getElementById('apiVersion').value = result.apiVersion || '2023-05-15';
  document.getElementById('initialPrompt').value = result.initialPrompt || 'Du bist der Social Media Manager von Microsoft. Bitte formuliere dies so um, dass es zu mehr Engagement und Klicks für die Zielgruppe "Entscheidungsträger" führt. Halte Dich kurz, prägnant und bleibe in der bestehenden Sprache. Füge ggfs. passende Emojis hinzu.';
});