# Social Media AI Copy Optimizer

A Microsoft Edge browser extension that uses Azure AI Foundry to optimize selected text for better social media engagement. Select any text, right-click, and get AI-optimized copy in a clean popup window — ready to copy to your clipboard.

## Features

- **Right-click optimization** — Select any text on any page and choose *📎 Optimize copy with AI* from the context menu
- **Popup result window** — Shows a dedicated Fluent 2-styled popup with the AI-optimized result
- **Copy to clipboard** — One-click copy or copy-and-close buttons
- **Markdown stripping** — AI responses are automatically cleaned of all markdown formatting
- **Customizable AI prompt** — Tailor the instructions to your audience, tone, and language
- **Fluent 2 design** — Result and settings windows follow Microsoft's Fluent 2 / Reimagine design system

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

1. Select any text on a webpage
2. Right-click → **📎 Optimize copy with AI**
3. A popup window opens showing a loading spinner while the AI processes
4. Once ready, click **Copy to Clipboard** or **Copy & Close**

## Technical Details

### Architecture

| File | Role |
|---|---|
| `background.js` | Service worker — context menu, Azure AI API calls, popup window management |
| `content.js` | Content script — ping responder for dynamic injection detection |
| `result.html/js` | Popup result window UI |
| `settings.html/js` | Configuration UI |
| `popup.html` | Extension toolbar popup |

### Permissions

| Permission | Purpose |
|---|---|
| `contextMenus` | Right-click menu entry |
| `tabs` | Messaging with the result popup tab |
| `storage` | Persisting settings and API credentials |
| `activeTab` | Access to the currently active tab |
| `scripting` | Dynamic content script injection as fallback |
| `windows` | Creating the result popup window |

### API Integration

Calls the Azure OpenAI Chat Completions REST API:
```
POST {endpoint}/openai/deployments/{deployment}/chat/completions?api-version={version}
```
The configured prompt and selected text are sent as a single user message. The response is stripped of all markdown formatting before display.

## Security & Privacy

- API credentials are stored in Edge's built-in encrypted sync storage (`chrome.storage.sync`)
- Selected text is sent only to your own Azure OpenAI endpoint — no third-party services
- No text is logged or persisted by the extension
- All API calls are made directly from the browser over HTTPS

- **Context menu not appearing**: Ensure text is properly selected
- **API errors**: Check your Azure credentials and endpoint configuration
- **No response**: Verify your internet connection and Azure service status

### Error Messages
- **"API settings not configured"**: Complete the settings setup
- **"API call failed"**: Check API key, endpoint, and deployment name
- **"No text selected"**: Make sure to highlight text before right-clicking

### Debug Mode
Enable browser developer tools to see console logs for detailed error information.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with Azure AI Foundry
- Powered by OpenAI's GPT models
- Designed for Microsoft Edge

## 📞 Support

For issues, questions, or feature requests:
- Create an issue on GitHub
- Check the troubleshooting section
- Review Azure AI documentation for API-related questions

---

**Made with ❤️ for content creators and social media professionals**