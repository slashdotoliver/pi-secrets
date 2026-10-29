import {EnvironmentVariableName, ExtensionConfiguration, PlaintextSecret, SecretName} from "./config/models.js";
import {keyringLookup} from "./secret-tool.js";


export class ExtensionState {
  private loadedPaths: Map<SecretName, EnvironmentVariableName> = new Map();
  private loadedSecrets: Map<EnvironmentVariableName, PlaintextSecret> = new Map();
  private loadedNormalEnvVars: Map<EnvironmentVariableName, string> = new Map();
  private originalEnv: Map<EnvironmentVariableName, string | undefined> = new Map();

  public loadSecretsAndVariables(config: ExtensionConfiguration, onError: (msg: string) => void): number {
    for (const [envVar, _] of Object.entries({...config.secrets, ...config.env})) {
      if (!this.originalEnv.has(envVar)) this.originalEnv.set(envVar, process.env[envVar]);
      this.clearSecretsAndVariables();
    }

    let count = 0;
    for (const [envVar, secretName] of Object.entries(config.secrets)) {
      if (this.addSecretToEnvironment(secretName, onError, envVar)) count++;
    }
    for (const [envVar, value] of Object.entries(config.env)) {
      this.addNormalVariableToEnvironment(envVar, onError, value);
    }
    return count;
  }

  public unloadSecretsAndVariables(): void {
    this.clearSecretsAndVariables();
    this.originalEnv.clear();
  }

  getLoadedPaths() {
    return this.loadedPaths;
  }

  getLoadedSecrets() {
    return this.loadedSecrets;
  }

  getLoadedNormalEnvVars() {
    return this.loadedNormalEnvVars;
  }

  private addNormalVariableToEnvironment(envVar: string, onError: (msg: string) => void, value: string) {
    if (this.loadedSecrets.has(envVar)) {
      onError(`environment variable ${envVar} is already loaded by a secret`);
      return;
    }
    process.env[envVar] = value;
    this.loadedNormalEnvVars.set(envVar, value);
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

  private clearSecretsAndVariables(): void {
    for (const [envVar] of [...this.loadedSecrets.keys(), ...this.loadedNormalEnvVars.keys()]) {
      const original = this.originalEnv.get(envVar);
      if (original === undefined)
        delete process.env[envVar];
      else
        process.env[envVar] = original;
    }
    this.loadedSecrets.clear();
    this.loadedNormalEnvVars.clear();
    this.loadedPaths.clear();
  }
}
