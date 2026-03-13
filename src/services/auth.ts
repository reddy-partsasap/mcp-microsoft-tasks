import { execFile } from "node:child_process";
import { platform } from "node:os";

interface AzToken {
  accessToken: string;
  expiresOn: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a Graph API access token from Azure CLI.
 * Caches the token until 2 minutes before expiry.
 */
export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const result = await runAzCommand([
    "account",
    "get-access-token",
    "--resource",
    "https://graph.microsoft.com",
    "--output",
    "json",
  ]);

  const parsed: AzToken = JSON.parse(result);
  const expiresAt = new Date(parsed.expiresOn).getTime() - 120_000; // 2 min buffer

  cachedToken = { token: parsed.accessToken, expiresAt };
  return cachedToken.token;
}

function runAzCommand(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const isWindows = platform() === "win32";
    const cmd = isWindows ? "az.cmd" : "az";

    execFile(cmd, args, { timeout: 15_000 }, (error, stdout, stderr) => {
      if (error) {
        const msg = stderr?.includes("az login")
          ? "Azure CLI is not logged in. Run `az login` first, then retry."
          : stderr?.includes("not found") || stderr?.includes("not recognized")
            ? "Azure CLI (`az`) is not installed or not on PATH. Install it from https://aka.ms/installazurecli and run `az login`."
            : `Azure CLI error: ${stderr || error.message}`;
        reject(new Error(msg));
        return;
      }
      resolve(stdout);
    });
  });
}
