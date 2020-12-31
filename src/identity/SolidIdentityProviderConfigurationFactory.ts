import type { SolidIdentityProviderConfiguration } from './SolidIdentityProviderConfiguration';

export abstract class SolidIdentityProviderConfigurationFactory {
  abstract createConfiguration(): SolidIdentityProviderConfiguration;
}