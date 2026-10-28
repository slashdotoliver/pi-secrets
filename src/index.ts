import type {ExtensionAPI} from "@earendil-works/pi-coding-agent";
import {readConfig} from "./config/parser.js";
import {hasSecretTool, SECRET_BIN} from "./secret-tool.js"
import {SecretsConfig} from "./config/models.js";
import {State} from "./state.js";

const EXTENSION_NAME = "pi-secrets";


function registerLoadEnvironmentVariables(pi: ExtensionAPI, config: SecretsConfig, appState: State) {
  pi.on("session_start", async (_event, ctx) => {
    const secretsLoadedCount = appState.loadSecrets(config, (msg) => {
      ctx.ui.notify(`[${EXTENSION_NAME}] ${msg}`, "error");
    });

    if (secretsLoadedCount > 0) {
      ctx.ui.notify(`[${EXTENSION_NAME}]:Loaded ${secretsLoadedCount} API key(s) with ${SECRET_BIN}`, "info");
    } else if (Object.keys(config.secrets).length > 0) {
      ctx.ui.setStatus(EXTENSION_NAME, `${EXTENSION_NAME}: load failed`);
      ctx.ui.notify(`[${EXTENSION_NAME}]: failed to load secrets — check settings", "error`);
    } else {
      ctx.ui.setStatus(EXTENSION_NAME, `${EXTENSION_NAME}: no mappings`);
    }
  });
  pi.on("session_shutdown", async (_event, _ctx) => {
    appState.unloadSecrets();
  });
}

export default function (pi: ExtensionAPI) {
  const config = readConfig();
  const appState = new State();

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
}
