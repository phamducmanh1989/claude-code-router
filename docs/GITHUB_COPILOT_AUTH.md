# GitHub Copilot Authentication

The claude-code-router now supports GitHub Copilot authentication, allowing you to use GitHub Copilot as a provider without manually managing API keys.

## Setup

### 1. Authenticate with GitHub Copilot

```bash
ccr auth login
```

Select "GitHub Copilot" from the options and follow the device flow:
1. Visit the GitHub device authorization page
2. Enter the provided code
3. Authorize the application
4. The authentication will complete automatically

### 2. Check authentication status

```bash
ccr auth status
```

This shows the current status of all stored credentials, including token expiration times.

### 3. Refresh expired tokens

```bash
ccr auth refresh
```

Manually refresh GitHub Copilot tokens before they expire.

### 4. List stored credentials

```bash
ccr auth list
```

### 5. Remove credentials

```bash
ccr auth logout
```

## Configuration

Once authenticated, you can configure GitHub Copilot as a provider in your `config.json`:

```json
{
  "Providers": [
    {
      "name": "github-copilot",
      "api_base_url": "https://api.githubcopilot.com/chat/completions",
      "api_key": "", 
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "transformer": "openai"
    }
  ],
  "Router": {
    "default": "github-copilot,gpt-4"
  }
}
```

**Note**: The `api_key` field can be left empty for GitHub Copilot providers. The system will automatically fill the API key from stored authentication credentials.

## Features

- **Automatic token refresh**: The system automatically refreshes expired tokens
- **Proactive refresh**: Tokens are refreshed 5 minutes before expiration
- **Periodic refresh**: Background token refresh every 30 minutes while server is running
- **Manual refresh**: Use `ccr auth refresh` to manually refresh tokens
- **Status monitoring**: Use `ccr auth status` to check token expiration times
- **Secure storage**: Credentials are stored securely in `~/.claude-code-router/auth.json`
- **Provider integration**: Seamlessly integrates with the existing provider system
- **Error handling**: Clear error messages when authentication is required or expired
- **Auto cleanup**: Expired refresh tokens are automatically removed

## Usage in Router

You can reference GitHub Copilot in your router configuration:

```javascript
// custom-router.js
module.exports = async function router(req, config) {
  const userMessage = req.body.messages.find((m) => m.role === "user")?.content;
  
  if (userMessage && userMessage.includes("code review")) {
    return "github-copilot,gpt-4";
  }
  
  return null; // Use default router
};
```

## Troubleshooting

### Authentication Expired
Check status first:
```bash
ccr auth status
```

If tokens are expired, try refreshing:
```bash
ccr auth refresh
```

If refresh fails, re-authenticate:
```bash
ccr auth login
```

### Token Refresh Issues
The system automatically refreshes tokens, but if issues persist:
1. Check status: `ccr auth status`
2. Try manual refresh: `ccr auth refresh` 
3. If still failing, log out and log back in:
   ```bash
   ccr auth logout
   ccr auth login
   ```

### Checking Authentication Status
```bash
ccr auth status
```
This will show:
- Active tokens with expiration times
- Expired tokens that can be refreshed
- Invalid tokens that need re-authentication
