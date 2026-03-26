# Social Media AI Copy Optimizer

A Microsoft Edge browser extension that uses **Azure AI Foundry** to optimize selected text for social media, generate full promotional posts for any webpage you visit, and create **AI-generated 1080×1080 promotional images** — all from the right-click context menu.

## Features

### Text Generation
- **📎 Rephrase with Azure AI Foundry** — Select any text, right-click, and get an AI-optimized social media post in a Fluent 2 popup window
- **🦄 Create Social Media Copy for this Website** — Right-click anywhere on a page to generate a promotional post using the page's actual content (no selection required)
- **Dynamic popup title** — Each result gets an AI-generated 3–5 word headline summarizing the post
- **Markdown stripping** — AI responses are automatically cleaned of all markdown formatting

### AI-Powered Optimization Suggestions
- After each result, the AI suggests **4 follow-up optimizations** (e.g. "Make this shorter", "Add a stronger CTA")
- Suggestions appear as clickable cards with **semantic icons** below the result text
- Clicking a card rewrites the result accordingly and generates 4 fresh suggestions

### Image Generation
- **Create Image** button appears after a website copy is generated
- Calls **gpt-image-1** via Azure AI Foundry to create a **1024×1024 promotional image**
- If the webpage has an Open Graph (`og:image`) image, it is used as the background — otherwise a Microsoft-branded gradient is generated
- **Regenerate** button to create a new version without leaving the popup
- **Download PNG** saves the image directly to disk

### Design & UX
- **Fluent 2 / Microsoft Reimagine** design system throughout
- Icon-only copy button in the top-right corner of the result card — visible only after content loads
- **Yellow warning toast** for API errors (5 s auto-dismiss)
- **Green toast** for copy confirmation (3 s auto-dismiss)
- **Settings saved toast** on save

### Fully Customizable Prompts
All three AI prompts are editable in Settings:
- **Rephrase Prompt** — used by "Rephrase with AI"
- **Website Copy Prompt** — used by "Create Social Media Copy for this Website"
- **Image Prompt** — used by gpt-image-1; supports `{headline}` placeholder

---

## Prerequisites

- Microsoft Edge (version 88 or later)
- An **Azure AI Foundry** resource with:
  - A deployed **text model** (e.g. GPT-4o) for copy generation
  - A deployed **gpt-image-1** model for image generation (optional)
- Your resource's **API Key** and **Endpoint URL**

---

## Installation

1. Clone or download this repository
2. Open Edge and navigate to `edge://extensions/`
3. Enable **Developer Mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the extension folder
5. The Settings page opens automatically on first install

---

## Configuration

Open Settings via the extension toolbar icon or `edge://extensions/` → Details → Extension options.

### Connection _(shared by all AI functions)_

| Field | Description | Where to find it |
|---|---|---|
| **API Key** | Your Azure OpenAI resource key | Azure Portal → your resource → *Keys and Endpoint* |
| **Endpoint** | Base URL of your resource | Azure Portal → *Keys and Endpoint*, e.g. `https://<resource>.openai.azure.com` |

### Text Generation

| Field | Description |
|---|---|
| **Deployment Name** | Name of your GPT-4o (or similar) deployment in [Azure AI Foundry](https://oai.azure.com) |
| **API Version** | Use `2024-02-01` or later for GPT-4o. See [API reference](https://learn.microsoft.com/azure/ai-services/openai/reference) |
| **Rephrase Prompt** | Instructions for the "Rephrase with AI" action. Selected text is appended automatically |
| **Website Copy Prompt** | Instructions for "Create Social Media Copy for this Website". Page title, URL, and content are appended automatically |

### Image Generation

| Field | Description |
|---|---|
| **Image Deployment Name** | Name of your `gpt-image-1` deployment. Leave blank to hide the Create Image button |
| **Image Prompt** | Instructions for the promotional image. Use `{headline}` where the article headline should appear |

---

## Usage

### Rephrase selected text
1. Select any text on a webpage
2. Right-click → **📎 Rephrase with Azure AI Foundry**
3. A popup opens showing the AI-optimized post
4. Use the 4 suggestion cards below for further refinements
5. Click the copy icon (top-right of the result card) to copy to clipboard

### Generate a post for a whole webpage
1. Navigate to any webpage
2. Right-click anywhere (optionally select a quote to include)
3. Choose **🦄 Create Social Media Copy for this Website**
4. The extension extracts the page content and sends it to Azure AI
5. Result appears in the popup — click **Create Image** to generate a matching visual

### Generate a promotional image
1. After a website copy has been generated, click **Create Image**
2. The extension attempts to use the page's OG image as background; falls back to a generated gradient
3. Once generated, click **Download PNG** to save it or **Regenerate** for a new version

---

## Technical Details

### Architecture

| File | Role |
|---|---|
| `background.js` | Service worker — context menus, all Azure AI API calls, popup management |
| `content.js` | Content script — ping responder for dynamic injection detection |
| `result.html/js` | Popup result window — text result, optimization cards, image preview |
| `settings.html/js` | Configuration UI |
| `popup.html` | Extension toolbar popup |

### API calls per interaction

| Function | Purpose | Model | `max_completion_tokens` |
|---|---|---|---|
| `callAzureAI` | Rephrase selected text | GPT-4o | 800 |
| `callAzureAIForWebsite` | Generate post for full page | GPT-4o | 1200 |
| `getOptimizationSuggestions` | 4 follow-up suggestion labels | GPT-4o | 300 |
| `applyOptimizationInstruction` | Apply a selected suggestion | GPT-4o | 800 |
| `generateTitle` | 3–5 word popup headline | GPT-4o | 60 |
| `generatePromotionalImage` | 1024×1024 promotional image | gpt-image-1 | — |

### Image generation flow

1. `chrome.scripting.executeScript` extracts `og:image` from the source tab and fetches it as a base64 data URL — all within the page context to avoid CORS issues
2. The base64 image is stored in `chrome.storage.session` keyed by result tab ID
3. On "Create Image", the background service worker retrieves it and calls:
   - `POST {endpoint}/openai/v1/images/edits` (multipart, with OG image) if available
   - `POST {endpoint}/openai/v1/images/generations` (JSON) as fallback
4. Response is `b64_json`, returned as a `data:image/png;base64,...` URL to the popup

### Permissions

| Permission | Purpose |
|---|---|
| `contextMenus` | Right-click menu entries |
| `tabs` | Messaging with the result popup tab |
| `storage` | Settings, credentials, and session OG image cache |
| `activeTab` | Access to the currently active tab |
| `scripting` | Extract page `innerText` and `og:image`; dynamic content script injection |
| `windows` | Creating the result popup window |

---

## Security & Privacy

- API credentials are stored in Edge's encrypted sync storage (`chrome.storage.sync`)
- Selected text, page content, and OG images are sent **only to your own Azure OpenAI endpoint** — no third-party services
- OG images are fetched from within the page context; the extension never makes cross-origin image requests directly
- No data is logged or persisted beyond the current session
- All API calls are made over HTTPS