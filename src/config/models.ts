export type EnvironmentVariableName = string;
export type SecretName = string;
export type PlaintextSecret = string;

export interface ExtensionConfiguration {
  "secrets": Record<EnvironmentVariableName, SecretName>;
  "env": Record<EnvironmentVariableName, string>;
}
