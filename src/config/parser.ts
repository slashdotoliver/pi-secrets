import {dirname, resolve} from "node:path";
import {homedir} from "node:os";
import {EnvironmentVariableName, ExtensionConfiguration, SecretName} from "./models.js";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";

const GLOBAL_SETTINGS_PATH = resolve(homedir(), ".pi/agent/settings.json");
const LOCAL_SETTINGS_PATH = resolve(process.cwd(), ".pi/settings.json");

type ConfigScope = "global" | "local";
type SettingsData = Partial<ExtensionConfiguration> & Record<string, unknown>;

export function readConfig(): ExtensionConfiguration {
  const globalConfig = parseSettings(GLOBAL_SETTINGS_PATH);
  const localConfig = parseSettings(LOCAL_SETTINGS_PATH);

  return {
    secrets: {
      ...(globalConfig?.secrets ?? {}), ...(localConfig?.secrets ?? {})
    },
    env: {
      ...(globalConfig?.env ?? {}), ...(localConfig?.env ?? {})
    }
  }
}

function parseSettings(filePath: string): Partial<ExtensionConfiguration> | null {
  try {
    if (!existsSync(filePath)) return null;
    const content = readFileSync(filePath, "utf-8");
    return JSON.parse(content) as ExtensionConfiguration;
  } catch {
    return null;
  }
}

export function addSecretMapping(envVar: EnvironmentVariableName, secretName: SecretName, scope: ConfigScope = "global"): void {
  const targetPath = scope === "global" ? GLOBAL_SETTINGS_PATH : LOCAL_SETTINGS_PATH;

  const dir = dirname(targetPath);
  if (!existsSync(dir)) mkdirSync(dir, {recursive: true});

  let fullConfig: SettingsData = {};
  if (existsSync(targetPath)) {
    try {
      const raw = readFileSync(targetPath, "utf-8").trim();
      fullConfig = raw ? (JSON.parse(raw) as SettingsData) : {secrets: {}};
    } catch (err) {
      throw new Error(`Failed to read ${targetPath}. Please ensure it contains valid JSON.`);
    }
  }

  if (!fullConfig.secrets || typeof fullConfig.secrets !== "object") fullConfig.secrets = {};
  fullConfig.secrets[envVar] = secretName;

  writeFileSync(targetPath, JSON.stringify(fullConfig, null, 2) + "\n", "utf-8");
}
