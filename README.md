# Social Media AI Copy Optimizer

A Microsoft Edge browser extension that uses Azure AI Foundry to optimize selected text for better social media engagement — and to generate social media posts for any webpage you visit.

## Features

### Core
- **📎 Optimize copy with AI** — Select any text, right-click, and get an AI-optimized social media post in a Fluent 2 popup window
- **🌐 Create Social Media Copy for this Website** — Right-click anywhere on a page (no selection needed) to generate a promotion post using the page's actual content
- **Dynamic popup title** — Each result gets an AI-generated 3–5 word headline summarizing the generated post
- **Copy to clipboard** — One-click copy or copy-and-close buttons
- **Markdown stripping** — AI responses are automatically cleaned of all markdown formatting

### AI-Powered Optimization Suggestions
- After each result, the AI suggests **4 follow-up optimizations** (e.g. "Make this shorter", "Add a stronger CTA")
- Suggestions are shown as clickable cards with **semantic icons** below the result
- Clicking a card rewrites the result accordingly and generates 4 fresh suggestions
- A loading indicator is shown while suggestions are fetching

### Design & UX
- **Fluent 2 / Microsoft Reimagine** design system throughout (result popup + settings)
- **Yellow warning toast** for API errors — auto-dismisses after 5 seconds
- **Green toast** for copy confirmation — auto-dismisses after 3 seconds
- **Settings saved toast** — replaces browser alert on save

### Configuration
- **Customizable AI prompt** — tailor tone, language, and audience in settings
- Settings page with descriptive help text and links for every field
- Centered, Fluent 2-styled settings layout

## Prerequisites

- Microsoft Edge (version 88 or later)
- An **Azure AI Foundry** resource with a deployed language model (e.g. GPT-4o)
- Your resource's **API Key**, **Endpoint URL**, **Deployment Name**, and **API Version**

## Installation

1. Clone or download this repository
2. Open Edge and navigate to `edge://extensions/`
3. Enable **Developer Mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the extension folder
5. Open the extension settings and enter your Azure credentials (see below)

## Configuration

Open Settings via the extension toolbar icon or the automatically opened settings page on first install.

| Field | Description | Where to find it |
|---|---|---|
| **API Key** | Your Azure OpenAI resource key | Azure Portal → your OpenAI resource → *Keys and Endpoint* |
| **Endpoint** | Base URL of your resource | Azure Portal → *Keys and Endpoint*, e.g. `https://<resource>.openai.azure.com` |
| **Deployment Name** | Name of your model deployment | [Azure AI Foundry](https://oai.azure.com) → Deployments |
| **API Version** | REST API version | Use `2024-02-01` or later for GPT-4o. See [API reference](https://learn.microsoft.com/azure/ai-services/openai/reference) |
| **AI Prompt** | System instructions prepended to your selected text | Customize freely — selected text is appended automatically |

Settings are saved with a toast confirmation and stored securely in Edge's sync storage.

## Usage

### Optimize selected text
1. Select any text on a webpage
2. Right-click → **📎 Optimize copy with AI**
3. A popup opens with a loading spinner while the AI processes
4. Once ready, click **Copy to Clipboard** or **Copy & Close**
5. Use the 4 suggestion cards below the result for further refinements

### Generate a post for a whole webpage
1. Navigate to any webpage
2. Right-click anywhere (optionally select a quote to include)
3. Choose **🌐 Create Social Media Copy for this Website**
4. The extension extracts the page content and sends it to Azure AI — no crawling needed
5. Result appears in the same popup window

## Technical Details

### Architecture

| File | Role |
|---|---|
| `background.js` | Service worker — context menus, all Azure AI API calls, popup window management |
| `content.js` | Content script — ping responder for dynamic injection detection |
| `result.html/js` | Popup result window with optimization suggestion cards |
| `settings.html/js` | Configuration UI |
| `popup.html` | Extension toolbar popup |

### API calls made per interaction

| Call | Purpose | `max_completion_tokens` |
|---|---|---|
| `callAzureAI` | Optimize selected text | 800 |
| `callAzureAIForWebsite` | Generate post for full page | 1200 |
| `getOptimizationSuggestions` | Fetch 4 follow-up suggestions | 300 |
| `applyOptimizationInstruction` | Apply a selected suggestion | 800 |
| `generateTitle` | Generate 3–5 word popup headline | 60 |

### Permissions

| Permission | Purpose |
|---|---|
| `contextMenus` | Right-click menu entries |
| `tabs` | Messaging with the result popup tab |
| `storage` | Persisting settings and API credentials |
| `activeTab` | Access to the currently active tab |
| `scripting` | Extracting page `innerText` for website copy; dynamic content script injection |
| `windows` | Creating the result popup window |

### API Integration

Calls the Azure OpenAI Chat Completions REST API:
```
POST {endpoint}/openai/deployments/{deployment}/chat/completions?api-version={version}
```
All calls use `max_completion_tokens` (compatible with `2024-02-01`+). Responses are stripped of markdown before display. Empty responses trigger a descriptive error toast showing the `finish_reason`.

## Security & Privacy

- API credentials are stored in Edge's built-in encrypted sync storage (`chrome.storage.sync`)
- Selected text and page content are sent only to your own Azure OpenAI endpoint — no third-party services
- No text is logged or persisted by the extension
- All API calls are made directly from the browser over HTTPS