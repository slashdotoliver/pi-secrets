import {EnvironmentVariableName, PlaintextSecret, SecretName, SecretsConfig} from "./config/models.js";
import {keyringLookup} from "./secret-tool.js";

export interface ExtensionState {
  loadedSecrets: Map<EnvironmentVariableName, PlaintextSecret>;
  loadedPaths: Map<SecretName, EnvironmentVariableName>;
  originalEnv: Map<EnvironmentVariableName, string | undefined>;
}


export class State implements ExtensionState {
  loadedPaths: Map<SecretName, EnvironmentVariableName> = new Map();
  loadedSecrets: Map<EnvironmentVariableName, PlaintextSecret> = new Map();
  originalEnv: Map<EnvironmentVariableName, string | undefined> = new Map();

  public loadSecrets(config: SecretsConfig, onError: (msg: string) => void): number {
    for (const [envVar, _] of Object.entries(config.secrets)) {
      if (!this.originalEnv.has(envVar)) {
        this.originalEnv.set(envVar, process.env[envVar]);
      }

      this.clearSecrets();
    }

    let count = 0;
    for (const [envVar, secretName] of Object.entries(config.secrets)) {
      if (this.addSecretToEnvironment(secretName, onError, envVar)) count++;
    }
    return count;
  }

  private addSecretToEnvironment(secretName: string, onError: (msg: string) => void, envVar: string): boolean {
    try {
      const secret = keyringLookup(secretName);

      if (!secret) {
        onError(`empty secret value with name: ${secretName}`);
        return false;
      }

      process.env[envVar] = secret;
      this.loadedSecrets.set(envVar, secret);
      this.loadedPaths.set(secretName, envVar);

    } catch (err) {
      onError(`failed to read secret "${secretName}": ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
    return true;
  }

  private clearSecrets(): void {
    for (const [envVar] of this.loadedSecrets) {
      const original = this.originalEnv.get(envVar);
      if (original === undefined) {
        delete process.env[envVar];
      } else {
        process.env[envVar] = original;
      }
    }
    this.loadedSecrets.clear();
    this.loadedPaths.clear();
  }

  public unloadSecrets(): void {
    this.clearSecrets();
    this.originalEnv.clear();
  }
}
