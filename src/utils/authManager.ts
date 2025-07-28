import { Auth } from "../auth";
import { AuthCopilot } from "../auth/copilot";

export namespace AuthManager {
  /**
   * Auto-fill API keys for providers that support authentication
   */
  export async function fillProviderAuth(providers: any[]): Promise<any[]> {
    const updatedProviders = [];
    
    for (const provider of providers) {
      const updatedProvider = { ...provider };
      
      // Handle GitHub Copilot authentication
      if (provider.name === "github-copilot" && 
          (provider.api_key === "authenticated" || !provider.api_key)) {
        const authToken = await getGitHubCopilotToken();
        if (authToken) {
          // Only update the api_key field, preserve all other config
          updatedProvider.api_key = authToken;
          console.log(`✅ GitHub Copilot authentication loaded`);
        } else {
          console.warn("⚠️ GitHub Copilot authentication not found. Please run 'ccr auth login'");
          // Set a placeholder to prevent provider registration failure
          updatedProvider.api_key = "AUTHENTICATION_REQUIRED";
        }
      }
      
      updatedProviders.push(updatedProvider);
    }
    
    return updatedProviders;
  }

  /**
   * Check if GitHub Copilot needs re-authentication
   */
  export async function needsReauth(): Promise<boolean> {
    const info = await Auth.get("github-copilot");
    if (!info || info.type !== "oauth") return true;
    
    // Try to refresh the token to see if the refresh token is still valid
    if (!info.access || info.expires < Date.now()) {
      const tokens = await AuthCopilot.access(info.refresh);
      return tokens === null;
    }
    
    return false;
  }

  /**
   * Proactively refresh GitHub Copilot token if it's about to expire
   */
  export async function refreshTokenIfNeeded(): Promise<boolean> {
    const info = await Auth.get("github-copilot");
    if (!info || info.type !== "oauth") return false;

    // Refresh if token expires in the next 5 minutes (300000 ms)
    const refreshThreshold = Date.now() + 300000;
    
    if (!info.access || info.expires < refreshThreshold) {
      console.log("Proactively refreshing GitHub Copilot token...");
      const tokens = await AuthCopilot.access(info.refresh);
      if (tokens) {
        await Auth.set("github-copilot", {
          type: "oauth",
          ...tokens,
        });
        console.log("✅ GitHub Copilot token refreshed proactively");
        return true;
      } else {
        console.warn("Failed to refresh GitHub Copilot token. Re-authentication may be needed.");
        return false;
      }
    }
    
    return true; // Token is still valid
  }
  
  /**
   * Get GitHub Copilot access token only
   */
  async function getGitHubCopilotToken(): Promise<string | null> {
    const info = await Auth.get("github-copilot");
    if (!info || info.type !== "oauth") {
      console.warn("GitHub Copilot authentication not found. Please run 'ccr auth login' to authenticate.");
      return null;
    }

    // Check if access token is still valid
    if (!info.access || info.expires < Date.now()) {
      console.log("GitHub Copilot token expired, refreshing...");
      
      // Refresh the token
      const tokens = await AuthCopilot.access(info.refresh);
      if (!tokens) {
        console.warn("GitHub Copilot refresh token expired. Please run 'ccr auth login' to re-authenticate.");
        // Clear the expired credentials
        await Auth.remove("github-copilot");
        return null;
      }
      
      console.log("✅ GitHub Copilot token refreshed successfully");
      
      // Update stored credentials
      await Auth.set("github-copilot", {
        type: "oauth",
        ...tokens,
      });
      
      return tokens.access;
    }

    return info.access;
  }
  
  /**
   * Get GitHub Copilot authentication headers (legacy function - kept for compatibility)
   */
  async function getGitHubCopilotAuth(): Promise<Record<string, string> | null> {
    const token = await getGitHubCopilotToken();
    if (!token) return null;

    return {
      ...AuthCopilot.HEADERS,
      Authorization: `Bearer ${token}`,
      "Openai-Intent": "conversation-edits",
    };
  }
}
