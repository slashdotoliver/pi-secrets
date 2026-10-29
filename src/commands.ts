import type {ExtensionAPI, ExtensionCommandContext} from "@earendil-works/pi-coding-agent";
import {keyringStore, secretExists} from "./secret-tool.js";
import {addSecretMapping, readConfig} from "./config/parser.js";
import {ExtensionState} from "./state.js";
import {EXTENSION_NAME, loadVariables} from "./index.js";

const COMMAND_NAMES = {
  reload: "secrets:reload", status: "secrets:status", help: "secrets:help", link: "secrets:link",
};

function buildReloadCommand(state: ExtensionState) {
  return {
    description: "Reload all configured secrets from the system keyring",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      state.unloadSecretsAndVariables();
      await loadVariables(state, readConfig())(undefined, ctx);
    },
  };
}

function buildStatusCommand(state: ExtensionState) {
  return {
    description: "Show loaded secrets and status with values redacted",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      let loadedPaths = state.getLoadedPaths();
      if (loadedPaths.size === 0) {
        ctx.ui.notify(`[${EXTENSION_NAME}]: no secrets loaded.`, "info");
        return;
      }
      const notifyContent: string[] = [];
      {
        const lines: string[] = [];
        for (const [secretName, envVar] of loadedPaths) {
          const secret = state.getLoadedSecrets().get(envVar) ?? "";
          const preview = secret.length > 8 ? `${secret.slice(0, 4)}...${secret.slice(-4)}` : "(short)";

          lines.push(`  secret-tool lookup name ${secretName} → $${envVar}=${preview}`);
        }
        notifyContent.push(`Loaded secrets:\n${lines.join("\n")}`);
      }
      {
        const lines: string[] = [];
        for (const [envVar, value] of state.getLoadedNormalEnvVars()) {
          lines.push(`  $${envVar}=${value}`);
        }
        notifyContent.push(`Loaded environment variables:\n${lines.join("\n")}`);
      }
      ctx.ui.notify(notifyContent.join("\n"), "info")
    },
  };
}

function buildLinkCommand() {
  return {
    description: "Link an environment variable to a system keyring secret",
    handler: async (args: string, ctx: ExtensionCommandContext) => {
      const tokens = args.trim().split(/\s+/).filter(Boolean);
      const [envVar, secretName, scopeArg] = tokens;

      if (!envVar || !secretName) {
        ctx.ui.notify(`Usage: /${COMMAND_NAMES.link} <ENV_VAR> <SECRET_NAME> [global|local]`, "error");
        return;
      }

      const scope = (scopeArg?.toLowerCase() ?? "") === "local" ? "local" : "global";
      if (!secretExists(secretName)) {
        ctx.ui.notify(`Secret '${secretName}' was not found in the system keyring.`, "warning");

        const confirmed = await ctx.ui.confirm("Enroll secret", "Do you want to enroll secret value too?");
        if (!confirmed) return;

        const defaultLabel = `Pi Coding Agent ${envVar ?? "API"} Key`;
        const rawLabel = await ctx.ui.input(`Label for the secret ${secretName}`, defaultLabel);

        const label = rawLabel?.trim();
        if (!label) {
          ctx.ui.notify("A label was not specified. Aborting storing key.", "warning");
          return;
        }

        const rawKey = await ctx.ui.input(`Secret (${secretName}) Key Value`, "");
        const secretValue = rawKey?.trim();

        if (!secretValue) {
          ctx.ui.notify("No secret value provided. Aborting storing key.", "warning");
          return;
        }

        try {
          keyringStore(label, secretName, secretValue);
          ctx.ui.notify(`Secret '${secretName}' enrolled successfully in keyring.`, "info");
        } catch (error) {
          ctx.ui.notify(`Failed to enroll secret in keyring: ${(error as Error).message}`, "error");
        }
      }

      try {
        addSecretMapping(envVar, secretName, scope);
        ctx.ui.notify(`Mapped '${envVar}' to '${secretName}' in ${scope} settings.`);
      } catch (error) {
        ctx.ui.notify(`Error saving secret mapping: ${(error as Error).message}`, "error");
      }
    }
  };
}

function buildHelpCommand() {
  return {
    description: "Display help and usage instructions for secret commands",
    handler: async (_args: string, ctx: ExtensionCommandContext) => {
      const helpText = [
        "Secrets extension commands:",
        `  /${COMMAND_NAMES.link} <ENV_VAR> <SECRET_NAME> [global|local] - map an env var to a keyring secret`,
        `  /${COMMAND_NAMES.reload} - re-read all secrets from system keyring`,
        `  /${COMMAND_NAMES.status} - display currently loaded keys`,
        `  /${COMMAND_NAMES.help} - show this help message`,
        "",
        "Configure mappings in settings.json (~/.pi/agent/settings.json or ./.pi/settings.json):",
        '  "secrets": {',
        '    "OPENAI_API_KEY": "openai/personal_key"',
        "  }",
      ].join("\n");

      ctx.ui.notify(helpText, "info");
    },
  };
}

export function registerCommands(pi: ExtensionAPI, state: ExtensionState) {
  pi.registerCommand(COMMAND_NAMES.reload, buildReloadCommand(state));
  pi.registerCommand(COMMAND_NAMES.status, buildStatusCommand(state));
  pi.registerCommand(COMMAND_NAMES.link, buildLinkCommand());
  pi.registerCommand(COMMAND_NAMES.help, buildHelpCommand());
}
