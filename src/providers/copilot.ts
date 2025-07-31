import { Auth } from "../auth";
import { AuthCopilot } from "../auth/copilot";

export namespace CopilotProvider {
  export async function getAuthHeaders(): Promise<Record<string, string> | null> {
    const info = await Auth.get("github-copilot");
    if (!info || info.type !== "oauth") return null;

    // Check if access token is still valid
    if (!info.access || info.expires < Date.now()) {
      // Refresh the token
      const tokens = await AuthCopilot.access(info.refresh);
      if (!tokens) {
        console.warn("GitHub Copilot authentication expired. Please run 'ccr auth login' to re-authenticate.");
        return null;
      }
      
      // Update stored credentials
      await Auth.set("github-copilot", {
        type: "oauth",
        ...tokens,
      });
      
      return {
        ...AuthCopilot.HEADERS,
        Authorization: `Bearer ${tokens.access}`,
        "Openai-Intent": "conversation-edits",
      };
    }

    return {
      ...AuthCopilot.HEADERS,
      Authorization: `Bearer ${info.access}`,
      "Openai-Intent": "conversation-edits",
    };
  }

  export async function isAuthenticated(): Promise<boolean> {
    const headers = await getAuthHeaders();
    return headers !== null;
  }
}
