#!/usr/bin/env node

// Simple test to verify auto-fill functionality
import { AuthManager } from "../src/utils/authManager.js";
import { Auth } from "../src/auth/index.js";

async function testAutoFill() {
  console.log("Testing auto-fill functionality...\n");
  
  // Mock providers config
  const testProviders = [
    {
      name: "github-copilot",
      api_base_url: "https://api.githubcopilot.com/chat/completions",
      api_key: "",
      models: ["gpt-4"],
      transformer: "openai"
    },
    {
      name: "deepseek",
      api_base_url: "https://api.deepseek.com/chat/completions", 
      api_key: "sk-test-key",
      models: ["deepseek-chat"],
      transformer: "openai"
    }
  ];
  
  console.log("Original providers config:");
  console.log(JSON.stringify(testProviders, null, 2));
  
  // Check if GitHub Copilot auth exists
  const authInfo = await Auth.get("github-copilot");
  if (!authInfo) {
    console.log("\n❌ No GitHub Copilot authentication found.");
    console.log("Please run 'ccr auth login' first to test auto-fill functionality.");
    return;
  }
  
  console.log("\n✅ Found GitHub Copilot authentication");
  console.log(`Auth type: ${authInfo.type}`);
  
  // Test auto-fill
  const filledProviders = await AuthManager.fillProviderAuth(testProviders);
  
  console.log("\nProviders config after auto-fill:");
  console.log(JSON.stringify(filledProviders, null, 2));
  
  // Check if GitHub Copilot api_key was filled
  const copilotProvider = filledProviders.find(p => p.name === "github-copilot");
  if (copilotProvider && copilotProvider.api_key && copilotProvider.api_key.length > 0 && copilotProvider.api_key !== "") {
    console.log("\n✅ Auto-fill successful! GitHub Copilot API key has been populated.");
    console.log(`API key length: ${copilotProvider.api_key.length} characters`);
    console.log(`API key preview: ${copilotProvider.api_key.substring(0, 20)}...`);
  } else {
    console.log("\n❌ Auto-fill failed. GitHub Copilot API key was not populated.");
  }
}

testAutoFill().catch(console.error);
