# Social Media AI Copy Optimizer

An Edge extension for creating social-ready copy from selected text or full webpages with Azure OpenAI. It can also generate matching promotional images and alt text from the same workflow.

## ✨ Current Features

### 📝 Copy generation
- Right-click selected text and run `📎Rephrase with Azure AI Foundry`
- Right-click any webpage and run `🦄 Create Social Media Copy for this Website`
- Uses your Azure OpenAI text deployment to generate short, social-ready copy
- Strips markdown from model output before displaying the result
- Generates a short AI title for the popup window

### 🔁 Follow-up optimizations
- After text is generated, the result window loads 4 follow-up optimization suggestions
- Each suggestion can rewrite the current result in one click
- Suggestions refresh after every rewrite

### 🖼️ Promotional image generation
- Website-copy results can generate a 1024x1024 promotional image
- Uses your `gpt-image-1` deployment if configured
- Reuses the page domain in the image text
- Tries to use the page's `og:image` as the visual background when available
- Falls back to a generated Fluent-style background if no OG image is available
- Supports regenerate and direct PNG download

### ♿ Alt text generation
- Generates alt text for the created image with your text model
- Shows the alt text inline in the result window
- Includes a one-click copy action for the generated alt text

### ⚙️ Configurable prompts
- Rephrase prompt is editable in Settings
- Website copy prompt is editable in Settings
- Image prompt is editable in Settings
- Image prompt supports `{headline}` and `{domain}` placeholders

### 🎨 Result window experience
- Separate popup window for results
- One-click copy button for generated text
- Loading states for text, optimizations, image generation, and alt text
- Warning toast for API errors and success toast for copy/save actions

## ✅ What You Need Before Installing

You need:

- Microsoft Edge
- An Azure subscription
- An Azure OpenAI-compatible resource with an API key and endpoint
- One deployed text model for copy generation and alt text
- Optionally, one deployed `gpt-image-1` model for image generation

Important:

- This extension uses the same API key and endpoint for both text and image generation
- The only extra value for images is the image deployment name

## 🚀 Step-by-Step Installation For New Users

### 1. Create or open your Azure resource

1. Open the Azure Portal at `https://portal.azure.com`
2. Create or open your Azure OpenAI resource
3. Wait until the resource is deployed successfully

If you already have a working Azure OpenAI resource, you can reuse it.

### 2. Find your API key and endpoint in Azure Portal

1. In the Azure Portal, open your Azure OpenAI resource
2. In the left navigation, open `Resource Management` -> `Keys and Endpoint`
3. Copy one of the keys from `KEY 1` or `KEY 2`
4. Copy the `Endpoint`

You will paste these into the extension settings later.

Example endpoint format:

```text
https://your-resource-name.openai.azure.com
```

### 3. Create your model deployments in Azure AI Foundry

1. Open Azure AI Foundry at `https://ai.azure.com`
2. Open the project or resource that is connected to your Azure OpenAI resource
3. Go to `Deployments`
4. Create a text model deployment for copy generation
5. Optionally create a `gpt-image-1` deployment for image generation

Recommended setup:

- Text deployment: `gpt-4o` or another chat-capable model you already use successfully
- Image deployment: `gpt-image-1`

Important:

- The extension needs the deployment name, not just the model name
- The deployment name is whatever you chose when creating the deployment in Azure AI Foundry

### 4. Find the deployment names in Azure AI Foundry

1. In Azure AI Foundry, open `Deployments`
2. Locate your text deployment
3. Copy the deployment name exactly as shown
4. If you created an image deployment, copy that deployment name too

You will use:

- `Deployment Name` for text generation
- `Image Deployment Name` for `gpt-image-1`

### 5. Download or open this extension locally

1. Download this repository or clone it locally
2. Keep the folder contents unzipped and unchanged

### 6. Load the extension in Microsoft Edge

1. Open Edge
2. Navigate to `edge://extensions/`
3. Turn on `Developer mode` in the top-right corner
4. Click `Load unpacked`
5. Select this project folder

On first install, the extension opens the Settings page automatically if required values are missing.

### 7. Fill in the extension settings

Open the Settings page and fill in these fields:

| Field | What to enter | Where to find it |
|---|---|---|
| API Key | One valid resource key | Azure Portal -> your Azure OpenAI resource -> `Keys and Endpoint` |
| Endpoint | Your Azure OpenAI endpoint | Azure Portal -> your Azure OpenAI resource -> `Keys and Endpoint` |
| Deployment Name | Your text model deployment name | Azure AI Foundry -> `Deployments` |
| API Version | A supported Azure OpenAI API version | Use `2024-02-01` or later for GPT-4o |
| Rephrase Prompt | Optional custom rewrite instructions | Set directly in the extension |
| Website Copy Prompt | Optional custom website-post instructions | Set directly in the extension |
| Image Deployment Name | Your `gpt-image-1` deployment name | Azure AI Foundry -> `Deployments` |
| Image Prompt | Optional custom image instructions | Set directly in the extension |

Then click `Save Settings`.

## 🧭 Where To Find Each Value

### Azure Portal

Use Azure Portal for:

- API Key
- Endpoint

Path:

`Azure Portal -> Your Azure OpenAI resource -> Keys and Endpoint`

### Azure AI Foundry

Use Azure AI Foundry for:

- Text deployment name
- Image deployment name

Path:

`Azure AI Foundry -> Your project/resource -> Deployments`

## ▶️ How To Use The Extension

### Rephrase selected text

1. Open any webpage
2. Select the text you want to rewrite
3. Right-click the selection
4. Click `📎Rephrase with Azure AI Foundry`
5. Wait for the result popup to appear
6. Copy the result or apply one of the optimization cards

### Create copy for an entire webpage

1. Open the webpage you want to promote
2. Right-click anywhere on the page
3. Click `🦄 Create Social Media Copy for this Website`
4. Wait for the popup result
5. Copy the text, refine it with optimization cards, or generate an image

Optional:

- If you highlight text before using the website action, the extension can include that selected text as a quote in the generated post

### Generate an image

1. Generate website copy first
2. In the result popup, click `Create Image`
3. Wait for the image to render
4. Use `Regenerate` to try again or `Download PNG` to save it
5. Click `Show Alt text` if you also want accessibility text

## 🛠️ Settings Overview

### Connection

- `API Key`: Shared by all extension features
- `Endpoint`: Shared by all extension features

### Text Generation

- `Deployment Name`: Used for rephrasing, website copy, optimization suggestions, optimization rewrites, popup title generation, and alt text generation
- `API Version`: Used for text API calls
- `Rephrase Prompt`: Custom instructions for selected-text rewrites
- `Website Copy Prompt`: Custom instructions for webpage-based post creation

### Image Generation

- `Image Deployment Name`: Enables image generation when filled in
- `Image Prompt`: Template for the promotional image request

If `Image Deployment Name` is left blank, the image workflow is effectively unavailable.

## 🧱 Project Files

| File | Purpose |
|---|---|
| `background.js` | Context menus, Azure API calls, popup window handling |
| `content.js` | Content script messaging and selection metadata support |
| `result.html` | Result popup UI |
| `result.js` | Result popup interactions and follow-up actions |
| `settings.html` | Settings UI |
| `settings.js` | Settings persistence |
| `popup.html` | Small toolbar popup |

## 🔐 Privacy And Data Flow

- API credentials are stored in `chrome.storage.sync`
- Selected text and page content are sent to your configured Azure endpoint
- Generated image requests are sent to the same Azure endpoint using your configured API key
- If a page exposes an `og:image`, the extension may fetch it and use it as image-generation input
- No additional third-party AI service is used by the extension

## 🧪 Troubleshooting

### The Settings page opens every time

Make sure these fields are saved:

- API Key
- Endpoint
- Deployment Name

### The image button does not work

Check these items:

- `Image Deployment Name` is filled in
- The deployment really points to `gpt-image-1`
- The API key belongs to the same Azure resource you are using for the endpoint

### The model returns errors

Check these items:

- The endpoint has no typo
- The deployment name is exact
- The API version is compatible with your text model
- Your Azure resource has access to the model you deployed

### I am not sure which portal to use

Use:

- Azure Portal for keys and endpoint
- Azure AI Foundry for deployments