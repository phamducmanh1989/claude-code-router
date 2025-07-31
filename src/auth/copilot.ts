import { Auth } from "./index";

export namespace AuthCopilot {
  const CLIENT_ID = "Iv1.b507a08c87ecfe98";
  const DEVICE_CODE_URL = "https://github.com/login/device/code";
  const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
  const COPILOT_API_KEY_URL = "https://api.github.com/copilot_internal/v2/token";

  interface DeviceCodeResponse {
    device_code: string;
    user_code: string;
    verification_uri: string;
    expires_in: number;
    interval: number;
  }

  interface AccessTokenResponse {
    access_token?: string;
    error?: string;
    error_description?: string;
  }

  interface CopilotTokenResponse {
    token: string;
    expires_at: number;
    refresh_in: number;
    endpoints: {
      api: string;
    };
  }

  export async function authorize() {
    const deviceResponse = await fetch(DEVICE_CODE_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "GitHubCopilotChat/0.26.7",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        scope: "read:user",
      }),
    });
    const deviceData: DeviceCodeResponse = await deviceResponse.json();
    return {
      device: deviceData.device_code,
      user: deviceData.user_code,
      verification: deviceData.verification_uri,
      interval: deviceData.interval || 5,
      expiry: deviceData.expires_in,
    };
  }

  export async function poll(device_code: string) {
    const response = await fetch(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "GitHubCopilotChat/0.26.7",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        device_code,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!response.ok) return { status: "failed" as const };

    const data: AccessTokenResponse = await response.json();

    if (data.access_token) {
      return {
        status: "success" as const,
        refresh: data.access_token,
        access: "",
        expires: 0,
      };
    }

    if (data.error === "authorization_pending") return { status: "pending" as const };

    if (data.error) return { status: "failed" as const };

    return { status: "pending" as const };
  }

  export async function access(refresh: string) {
    const response = await fetch(COPILOT_API_KEY_URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${refresh}`,
        ...HEADERS,
      },
    });

    if (!response.ok) {
      // If the request fails, it might be due to an expired refresh token
      // In this case, we should return null to trigger re-authentication
      console.warn(`Failed to get Copilot token: ${response.status} ${response.statusText}`);
      return null;
    }

    const tokenData: CopilotTokenResponse = await response.json();

    return {
      refresh,
      access: tokenData.token,
      expires: tokenData.expires_at * 1000,
    };
  }

  export const HEADERS: Record<string, string> = {
    "User-Agent": "GitHubCopilotChat/0.26.7",
    "Editor-Version": "vscode/1.99.3",
    "Editor-Plugin-Version": "copilot-chat/0.26.7",
    "Copilot-Integration-Id": "vscode-chat"
  };
}
