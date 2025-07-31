import path from "path";
import fs from "fs/promises";
import { z } from "zod";
import os from "os";

export namespace Auth {
  export const Oauth = z.object({
    type: z.literal("oauth"),
    refresh: z.string(),
    access: z.string(),
    expires: z.number(),
  });

  export const Api = z.object({
    type: z.literal("api"),
    key: z.string(),
  });

  export const Info = z.discriminatedUnion("type", [Oauth, Api]);
  export type Info = z.infer<typeof Info>;

  const getAuthDir = () => {
    const homeDir = os.homedir();
    return path.join(homeDir, ".claude-code-router");
  };

  const getFilepath = () => path.join(getAuthDir(), "auth.json");

  export async function get(providerID: string) {
    const filepath = getFilepath();
    try {
      const content = await fs.readFile(filepath, "utf-8");
      const data = JSON.parse(content);
      return data[providerID] as Info | undefined;
    } catch {
      return undefined;
    }
  }

  export async function all(): Promise<Record<string, Info>> {
    const filepath = getFilepath();
    try {
      const content = await fs.readFile(filepath, "utf-8");
      return JSON.parse(content);
    } catch {
      return {};
    }
  }

  export async function set(key: string, info: Info) {
    const authDir = getAuthDir();
    const filepath = getFilepath();
    
    // Ensure auth directory exists
    try {
      await fs.mkdir(authDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const data = await all();
    await fs.writeFile(filepath, JSON.stringify({ ...data, [key]: info }, null, 2));
    
    // Set file permissions to be readable only by owner
    try {
      await fs.chmod(filepath, 0o600);
    } catch (error) {
      // Permissions might not be supported on all platforms
    }
  }

  export async function remove(key: string) {
    const filepath = getFilepath();
    const data = await all();
    delete data[key];
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    
    try {
      await fs.chmod(filepath, 0o600);
    } catch (error) {
      // Permissions might not be supported on all platforms
    }
  }
}
