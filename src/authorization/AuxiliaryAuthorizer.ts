import type { AuxiliaryManager } from '../ldp/auxiliary/AuxiliaryManager';
import { getLoggerFor } from '../logging/LogUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { AuthorizerArgs } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * An authorizer for auxiliary resources such as acl or shape resources.
 * The access permissions of an auxiliary resource depend on those of the resource it is associated with.
 * This authorizer calls the source authorizer with the identifier of the associated resource.
 */
export class AuxiliaryAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  private readonly resourceAuthorizer: Authorizer;
  private readonly manager: AuxiliaryManager;

  public constructor(resourceAuthorizer: Authorizer, manager: AuxiliaryManager) {
    super();
    this.resourceAuthorizer = resourceAuthorizer;
    this.manager = manager;
  }

  public async canHandle(auxiliaryAuth: AuthorizerArgs): Promise<void> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    return this.resourceAuthorizer.canHandle(resourceAuth);
  }

  public async handle(auxiliaryAuth: AuthorizerArgs): Promise<void> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    this.logger.debug(`Checking auth request for ${auxiliaryAuth.identifier.path} on ${resourceAuth.identifier.path}`);
    return this.resourceAuthorizer.handle(resourceAuth);
  }

  public async handleSafe(auxiliaryAuth: AuthorizerArgs): Promise<void> {
    const resourceAuth = this.getRequiredAuthorization(auxiliaryAuth);
    this.logger.debug(`Checking auth request for ${auxiliaryAuth.identifier.path} to ${resourceAuth.identifier.path}`);
    return this.resourceAuthorizer.handleSafe(resourceAuth);
  }

  private getRequiredAuthorization(auxiliaryAuth: AuthorizerArgs): AuthorizerArgs {
    if (!this.manager.isAuxiliaryIdentifier(auxiliaryAuth.identifier)) {
      throw new NotImplementedHttpError('AuxiliaryAuthorizer only supports auxiliary resources.');
    }
    return {
      ...auxiliaryAuth,
      identifier: this.manager.getAssociatedIdentifier(auxiliaryAuth.identifier),
    };
  }
}
