export type EnvironmentVariableName = string;
export type SecretName = string;
export type PlaintextSecret = string;

export interface SecretsConfig {
    "secrets": Record<EnvironmentVariableName, SecretName>;
}
