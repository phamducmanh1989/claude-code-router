import { Auth } from "../auth";
import { AuthCopilot } from "../auth/copilot"; 
import { AuthManager } from "../utils/authManager";
import * as prompts from "@clack/prompts";
import open from "open";
import path from "path";
import os from "os";

interface UI {
  empty(): void;
  CancelledError: new (message?: string) => Error;
  Style: {
    TEXT_DIM: string;
  };
}

class CancelledError extends Error {
  constructor(message?: string) {
    super(message || "Operation cancelled");
    this.name = "CancelledError";
  }
}

const UI: UI = {
  empty: () => console.log(),
  CancelledError,
  Style: {
    TEXT_DIM: "\x1b[2m"
  }
};

export async function handleAuthCommand(command: string) {
  switch (command) {
    case "list":
    case "ls":
      await listCredentials();
      break;
    case "login":
      await loginCommand();
      break;
    case "logout":
      await logoutCommand();
      break;
    case "status":
      await statusCommand();
      break;
    case "refresh":
      await refreshCommand();
      break;
    default:
      console.log(`
Usage: ccr auth [command]

Commands:
  list, ls     List stored credentials
  login        Log in to a provider
  logout       Log out from a provider
  status       Check authentication status
  refresh      Refresh expired tokens
  
Example:
  ccr auth login
  ccr auth list
  ccr auth status
`);
  }
}

async function listCredentials() {
  UI.empty();
  const homeDir = os.homedir();
  const authPath = path.join(homeDir, ".claude-code-router", "auth.json");
  const displayPath = authPath.startsWith(homeDir) ? authPath.replace(homeDir, "~") : authPath;
  
  prompts.intro(`Credentials ${UI.Style.TEXT_DIM}${displayPath}`);
  
  const results = await Auth.all().then((x) => Object.entries(x));
  
  for (const [providerID, result] of results) {
    prompts.log.info(`${providerID} ${UI.Style.TEXT_DIM}${result.type}`);
  }
  
  prompts.outro(`${results.length} credentials`);
}

async function loginCommand() {
  UI.empty();
  prompts.intro("Add credential");
  
  const provider = await prompts.select({
    message: "Select provider",
    options: [
      {
        label: "GitHub Copilot",
        value: "github-copilot",
        hint: "recommended"
      },
      {
        value: "other",
        label: "Other",
      },
    ],
  });

  if (prompts.isCancel(provider)) throw new UI.CancelledError();

  if (provider === "other") {
    const customProvider = await prompts.text({
      message: "Enter provider id",
      validate: (x) => (x.match(/^[0-9a-z-]+$/) ? undefined : "a-z, 0-9 and hyphens only"),
    });
    if (prompts.isCancel(customProvider)) throw new UI.CancelledError();
    
    const key = await prompts.password({
      message: "Enter your API key",
      validate: (x) => (x.length > 0 ? undefined : "Required"),
    });
    if (prompts.isCancel(key)) throw new UI.CancelledError();
    
    await Auth.set(customProvider, {
      type: "api",
      key,
    });

    prompts.outro("Done");
    return;
  }

  if (provider === "github-copilot") {
    await new Promise((resolve) => setTimeout(resolve, 10));
    const deviceInfo = await AuthCopilot.authorize();

    prompts.note(`Please visit: ${deviceInfo.verification}\nEnter code: ${deviceInfo.user}`);

    const spinner = prompts.spinner();
    spinner.start("Waiting for authorization...");

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, deviceInfo.interval * 1000));
      const response = await AuthCopilot.poll(deviceInfo.device);
      if (response.status === "pending") continue;
      if (response.status === "success" && response.refresh && response.access !== undefined && response.expires !== undefined) {
        await Auth.set("github-copilot", {
          type: "oauth",
          refresh: response.refresh,
          access: response.access,
          expires: response.expires,
        });
        spinner.stop("Login successful");
        break;
      }
      if (response.status === "failed") {
        spinner.stop("Failed to authorize", 1);
        break;
      }
    }

    prompts.outro("Done");
    return;
  }
}

async function logoutCommand() {
  UI.empty();
  const credentials = await Auth.all().then((x) => Object.entries(x));
  prompts.intro("Remove credential");
  
  if (credentials.length === 0) {
    prompts.log.error("No credentials found");
    return;
  }
  
  const providerID = await prompts.select({
    message: "Select provider",
    options: credentials.map(([key, value]) => ({
      label: `${key} ${UI.Style.TEXT_DIM}(${value.type})`,
      value: key,
    })),
  });
  
  if (prompts.isCancel(providerID)) throw new UI.CancelledError();
  
  await Auth.remove(providerID);
  prompts.outro("Logout successful");
}

async function statusCommand() {
  UI.empty();
  prompts.intro("Authentication Status");
  
  const results = await Auth.all().then((x) => Object.entries(x));
  
  if (results.length === 0) {
    prompts.log.warn("No stored credentials");
    prompts.outro("No authentication found");
    return;
  }
  
  for (const [providerID, result] of results) {
    if (providerID === "github-copilot" && result.type === "oauth") {
      const isExpired = result.expires < Date.now();
      const needsReauth = await AuthManager.needsReauth();
      
      if (needsReauth) {
        prompts.log.error(`${providerID}: Authentication expired - please run 'ccr auth login'`);
      } else if (isExpired) {
        prompts.log.warn(`${providerID}: Token expired but refresh token is valid`);
      } else {
        const expiresIn = Math.round((result.expires - Date.now()) / 1000 / 60);
        prompts.log.success(`${providerID}: Active (expires in ${expiresIn} minutes)`);
      }
    } else {
      prompts.log.info(`${providerID}: ${result.type}`);
    }
  }
  
  prompts.outro("Status check complete");
}

async function refreshCommand() {
  UI.empty();
  prompts.intro("Refreshing Tokens");
  
  const info = await Auth.get("github-copilot");
  if (!info || info.type !== "oauth") {
    prompts.log.error("No GitHub Copilot authentication found");
    prompts.outro("Please run 'ccr auth login' first");
    return;
  }
  
  const spinner = prompts.spinner();
  spinner.start("Refreshing GitHub Copilot token...");
  
  const success = await AuthManager.refreshTokenIfNeeded();
  
  if (success) {
    spinner.stop("Token refreshed successfully");
  } else {
    spinner.stop("Failed to refresh token", 1);
    prompts.log.error("Re-authentication required. Please run 'ccr auth login'");
  }
  
  prompts.outro("Refresh complete");
}
