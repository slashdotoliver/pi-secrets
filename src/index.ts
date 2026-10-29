import type {ExtensionAPI, ExtensionContext} from "@earendil-works/pi-coding-agent";
import {readConfig} from "./config/parser.js";
import {hasSecretTool, SECRET_BIN} from "./secret-tool.js"
import {ExtensionConfiguration} from "./config/models.js";
import {ExtensionState} from "./state.js";
import {registerCommands} from "./commands.js";

export const EXTENSION_NAME = "pi-secrets";

export function loadVariables(appState: ExtensionState, config: ExtensionConfiguration) {
  return async (_event: any, ctx: ExtensionContext) => {
    const secretsLoadedCount = appState.loadSecretsAndVariables(config, (msg: string) => {
      ctx.ui.notify(`[${EXTENSION_NAME}] ${msg}`, "error");
    });

    if (secretsLoadedCount > 0) {
      ctx.ui.notify(`[${EXTENSION_NAME}]: Loaded ${secretsLoadedCount} API key(s) with ${SECRET_BIN}`, "info");
    } else if (Object.keys(config.secrets).length > 0) {
      ctx.ui.setStatus(EXTENSION_NAME, `${EXTENSION_NAME}: load failed`);
      ctx.ui.notify(`[${EXTENSION_NAME}]: failed to load secrets — check settings", "error`);
    } else {
      ctx.ui.setStatus(EXTENSION_NAME, `${EXTENSION_NAME}: no mappings`);
    }
  };
}

function registerLoadEnvironmentVariables(pi: ExtensionAPI, config: ExtensionConfiguration, appState: ExtensionState) {
  pi.on("session_start", loadVariables(appState, config));
  pi.on("session_shutdown", async (_event, _ctx) => {
    appState.unloadSecretsAndVariables();
  });
}

export default function (pi: ExtensionAPI) {
  const config = readConfig();
  const appState = new ExtensionState();

  if (!hasSecretTool()) {
    pi.on("session_start", async (_event, ctx) => {
      ctx.ui.setStatus(EXTENSION_NAME, `${EXTENSION_NAME}: ${SECRET_BIN} missing`);
      ctx.ui.notify("secret-tool is missing. Please install libsecret-tools.", "error");
    });
    return;
  }
  if (Object.keys(config.secrets).length === 0) {
    pi.on("session_start", async (_event, ctx) => {
      ctx.ui.setStatus(EXTENSION_NAME, `${EXTENSION_NAME}: no mappings configured`);
    });
  }

  // TODO: register tool output redaction

  registerLoadEnvironmentVariables(pi, config, appState);
  registerCommands(pi, appState);
}
