import {resolve} from "node:path";
import {homedir} from "node:os";
import {EnvironmentVariableName, SecretName, SecretsConfig} from "./models.js";
import {existsSync, readFileSync} from "node:fs";

const GLOBAL_SETTINGS_PATH = resolve(homedir(), ".pi/agent/settings.json");
const LOCAL_SETTINGS_PATH = resolve(process.cwd(), ".pi/settings.json");

export function readConfig(): SecretsConfig {
  const globalConfig = parseSettings(GLOBAL_SETTINGS_PATH);
  const localConfig = parseSettings(LOCAL_SETTINGS_PATH);

  const mergedMappings: Record<EnvironmentVariableName, SecretName> = {
    ...(globalConfig?.secrets ?? {}), ...(localConfig?.secrets ?? {}),
  };

  return {
    secrets: mergedMappings,
  };
}

function parseSettings(filePath: string): SecretsConfig | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as SecretsConfig;
  } catch {
    return null;
  }
}
