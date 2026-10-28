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


// Executes: secret-tool lookup name <secretName>
export function keyringLookup(secretName: string): string {
  const stdout = execFileSync(SECRET_BIN, ["lookup", "name", secretName], {
    encoding: "utf-8", timeout: 10_000, stdio: ["ignore", "pipe", "pipe"],
  });
  return stdout.trim();
}
