# Social Media AI Copy Optimizer

A Microsoft Edge browser extension that uses Azure AI Foundry to optimize selected text for better social media engagement. Transform your content into more engaging, click-worthy copy with AI-powered suggestions.

## 🚀 Features

### Core Functionality
- **Right-click Optimization**: Select any text on any website and right-click to optimize it with AI
- **Smart Content Detection**: Automatically detects if the selected text is in an editable field (like text inputs, textareas, or contenteditable elements)
- **Dual Output Modes**:
  - **Direct Replacement**: For editable fields, the optimized text replaces the original selection instantly
  - **New Tab Display**: For non-editable content, results open in a dedicated tab with formatting options

### AI Integration
- **Azure AI Foundry Support**: Integrates with Azure OpenAI Service for powerful language models
- **Customizable Prompts**: Configure your own AI instructions for different optimization goals
- **Multiple Model Support**: Works with any Azure OpenAI deployment (GPT-3.5, GPT-4, etc.)

### User Experience
- **Loading Indicators**: Visual feedback during AI processing
- **Error Handling**: Comprehensive error messages and fallback options
- **Copy to Clipboard**: Easy copying of optimized results
- **Markdown Rendering**: Results display with proper formatting
- **Notifications**: Browser notifications for status updates

### Configuration
- **Settings Page**: Easy-to-use interface for API configuration
- **Secure Storage**: API keys stored securely using Chrome's sync storage
- **Custom Prompts**: Tailor the AI behavior to your specific needs

## 📋 Prerequisites

### Required
- **Microsoft Edge Browser** (version 88 or later)
- **Azure AI Foundry Account** with an active Azure OpenAI resource
- **API Access**: Valid API key, endpoint URL, and deployment name from Azure

### Azure Setup
1. Create an Azure AI Foundry resource in the Azure portal
2. Deploy a language model (GPT-3.5-turbo, GPT-4, etc.)
3. Note down your:
   - API Key
   - Endpoint URL (e.g., `https://your-resource.openai.azure.com`)
   - Deployment name
   - API version (default: `2023-05-15`)

## 🛠 Installation

### From Source
1. **Clone or Download** this repository
2. **Open Edge** and navigate to `edge://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the extension folder
5. **Configure Settings** (see Configuration section below)

### From Microsoft Edge Add-ons (Future)
Once published, you can install directly from the Edge Add-ons store.

## ⚙️ Configuration

1. **Access Settings**: Click the extension icon in the toolbar and select "Settings"
2. **Enter Azure Credentials**:
   - **API Key**: Your Azure OpenAI API key
   - **Endpoint**: Your Azure resource endpoint URL
   - **Deployment Name**: The name of your model deployment
   - **API Version**: Azure OpenAI API version (default: `2023-05-15`)
3. **Customize Prompt**: Modify the AI instructions to match your optimization goals
4. **Save Settings**: Click "Save Settings" to store your configuration

## 📖 Usage

### Basic Usage
1. **Select Text**: Highlight any text on any webpage
2. **Right-click**: Choose "📎Optimize copy with AI" from the context menu
3. **Wait for Processing**: The extension will show a loading notification
4. **View Results**:
   - If in an editable field: Text is replaced automatically
   - If in regular content: A new tab opens with the optimized version

### Advanced Usage
- **Custom Prompts**: Modify the AI prompt in settings for different content types (blog posts, tweets, LinkedIn updates, etc.)
- **Batch Processing**: Select multiple paragraphs or sections for comprehensive optimization
- **Copy & Close**: Use the "Copy & Close" button to copy results and close the tab in one click

## 🔧 Technical Details

### Architecture
- **Manifest V3**: Modern Chrome extension framework
- **Service Worker**: Background processing for API calls
- **Content Scripts**: DOM manipulation for text replacement
- **Storage API**: Secure credential management

### Permissions
- `contextMenus`: Right-click menu integration
- `tabs`: Result tab creation and management
- `storage`: Settings persistence
- `activeTab`: Current tab interaction
- `notifications`: User feedback

### API Integration
- RESTful calls to Azure OpenAI Chat Completions API
- Configurable API versions and endpoints
- Error handling for network issues and API limits

## 🎯 Use Cases

### Social Media Management
- **Twitter/X Posts**: Make tweets more engaging and clickable
- **LinkedIn Updates**: Optimize professional content for better reach
- **Facebook Posts**: Enhance community engagement
- **Instagram Captions**: Create more compelling descriptions

### Content Marketing
- **Blog Headlines**: Improve click-through rates
- **Email Subject Lines**: Boost open rates
- **Ad Copy**: Create more effective marketing text
- **Product Descriptions**: Make e-commerce content more persuasive

### Business Communication
- **Executive Summaries**: Make key points more impactful
- **Meeting Agendas**: Improve clarity and engagement
- **Internal Communications**: Enhance company-wide messaging

## 🔒 Security & Privacy

- **Local Processing**: All text processing happens locally in your browser
- **Secure Storage**: API credentials stored using browser's encrypted storage
- **No Data Retention**: Text is not stored or logged by the extension
- **Azure Compliance**: Leverages Azure's enterprise-grade security

## 🐛 Troubleshooting

### Common Issues
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