import {execFileSync} from "node:child_process";

export const SECRET_BIN = "secret-tool";

export function hasSecretTool(): boolean {
  try {
    execFileSync("which", [SECRET_BIN], {stdio: "ignore"});
    return true;
  } catch {
    return false;
  }
}

function execSecretTool(args: string[]) {
  const stdout = execFileSync(SECRET_BIN, args, {
    encoding: "utf8", timeout: 10_000, stdio: ["ignore", "pipe", "pipe"]
  });
  return stdout.trim();
}

function execSecretToolWithInput(args: string[], input: string) {
  const stdout = execFileSync(SECRET_BIN, args, {
    encoding: "utf8", timeout: 10_000, stdio: ["pipe", "pipe", "pipe"], input: input
  });
  return stdout.trim();
}

// Executes: secret-tool lookup name <secretName>
export function keyringLookup(secretName: string): string {
  return execSecretTool(["lookup", "name", secretName]);
}

export function secretExists(secretName: string): boolean {
  try {
    if (keyringLookup(secretName)) return true;
  } catch {
  }
  return false;
}

// Executes: secret-tool store --label <label> name <secretName>
export function keyringStore(label: string, secretName: string, secretValue: string): string {
  return execSecretToolWithInput(["store", "--label", label, "name", secretName], secretValue);
}
