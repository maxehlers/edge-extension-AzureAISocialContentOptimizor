const DEFAULT_REPHRASE_PROMPT = [
  'You are a Social Media Manager at Microsoft.',
  'Please rewrite the following content to be more engaging and clickable for the expected target audience.',
  '',
  'Requirements:',
  "- Write in Microsoft's tone of voice: professional, empowering, and human.",
  '- Keep it short and punchy (max 4 sentences).',
  '- Add relevant emojis.',
  '- Add relevant hashtags.',
  '- Leave an empty line between paragraphs.',
  '- Return ONLY the final post text, no explanations.'
].join('\n');

const DEFAULT_WEBSITE_PROMPT = [
  'You are a Social Media Manager at Microsoft.',
  'Write a short, engaging social media post to promote the following webpage.',
  '',
  'Requirements:',
  "- Write in Microsoft's tone of voice: professional, empowering, and human.",
  '- Keep it short and punchy (max 4 sentences).',
  '- Include a clear call to action (e.g. "Read more", "Check it out", "Learn more").',
  '- Add relevant emojis.',
  '- Always include a link to the webpage.',
  '- Add relevant hashtags.',
  '- Leave an empty line between paragraphs.',
  '- Match the language of the page title.',
  '- Return ONLY the final post text, no explanations.'
].join('\n');

const DEFAULT_IMAGE_PROMPT = [
  'Create a square 1024x1024 promotional social media image in Microsoft Fluent 2 design style.',
  'Background: modern abstract gradient using Microsoft brand colors — deep #0078D4 blue through soft white or light gray.',
  'Display the following headline prominently in the center in large, bold white sans-serif lettering: "{headline}"',
  'Add subtle geometric shapes or flowing lines typical of Microsoft design language.',
  'Include a Microsoft blue (#0078D4) gradient accent bar along the bottom edge.',
  'Professional, clean, modern corporate technology aesthetic.'
].join('\n');

document.getElementById('settingsForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const apiKey = document.getElementById('apiKey').value;
  const endpoint = document.getElementById('endpoint').value;
  const deployment = document.getElementById('deployment').value;
  const apiVersion = document.getElementById('apiVersion').value;
  const initialPrompt = document.getElementById('initialPrompt').value;
  const websitePrompt = document.getElementById('websitePrompt').value;
  const imageDeployment = document.getElementById('imageDeployment').value;
  const imagePrompt = document.getElementById('imagePrompt').value;

  chrome.storage.sync.set({ apiKey, endpoint, deployment, apiVersion, initialPrompt, websitePrompt, imageDeployment, imagePrompt }, () => {
    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toastText');
    toastText.textContent = '\u2713 Settings saved!';
    toast.style.display = 'block';
    setTimeout(() => {
      toast.style.display = 'none';
      window.close();
    }, 3000);
  });
});

// Load existing settings
chrome.storage.sync.get(['apiKey', 'endpoint', 'deployment', 'apiVersion', 'initialPrompt', 'websitePrompt', 'imageDeployment', 'imagePrompt'], (result) => {
  document.getElementById('apiKey').value = result.apiKey || '';
  document.getElementById('endpoint').value = result.endpoint || '';
  document.getElementById('deployment').value = result.deployment || '';
  document.getElementById('apiVersion').value = result.apiVersion || '2023-05-15';
  document.getElementById('initialPrompt').value = result.initialPrompt || DEFAULT_REPHRASE_PROMPT;
  document.getElementById('websitePrompt').value = result.websitePrompt || DEFAULT_WEBSITE_PROMPT;
  document.getElementById('imageDeployment').value = result.imageDeployment || '';
  document.getElementById('imagePrompt').value = result.imagePrompt || DEFAULT_IMAGE_PROMPT;
});