import type { AuxiliaryManager } from '../ldp/auxiliary/AuxiliaryManager';
import { getLoggerFor } from '../logging/LogUtil';
import { NotImplementedHttpError } from '../util/errors/NotImplementedHttpError';
import type { AuthorizerArgs } from './Authorizer';
import { Authorizer } from './Authorizer';

/**
 * An authorizer for auxiliary resources.
 * Calls the source authorizer with potentially updated permissions
 * and the associated resource identifier.
 */
export class AuxiliaryAuthorizer extends Authorizer {
  protected readonly logger = getLoggerFor(this);

  private readonly authorizer: Authorizer;
  private readonly manager: AuxiliaryManager;

  public constructor(authorizer: Authorizer, manager: AuxiliaryManager) {
    super();
    this.authorizer = authorizer;
    this.manager = manager;
  }

  public async canHandle(input: AuthorizerArgs): Promise<void> {
    const newArgs = this.getSafeAssociatedArgs(input);
    return this.authorizer.canHandle(newArgs);
  }

  public async handle(input: AuthorizerArgs): Promise<void> {
    const newArgs = this.getAssociatedArgs(input);
    this.logger.debug(`Redirecting auth request for ${input.identifier.path} to ${newArgs.identifier.path}`);
    return this.authorizer.handle(newArgs);
  }

  public async handleSafe(input: AuthorizerArgs): Promise<void> {
    const newArgs = this.getSafeAssociatedArgs(input);
    this.logger.debug(`Redirecting auth request for ${input.identifier.path} to ${newArgs.identifier.path}`);
    return this.authorizer.handleSafe(newArgs);
  }

  private getSafeAssociatedArgs(input: AuthorizerArgs): AuthorizerArgs {
    if (!this.manager.isAuxiliaryIdentifier(input.identifier)) {
      throw new NotImplementedHttpError('AuxiliaryAuthorizer only supports auxiliary resources.');
    }
    return this.getAssociatedArgs(input);
  }

  private getAssociatedArgs(input: AuthorizerArgs): AuthorizerArgs {
    return {
      credentials: input.credentials,
      identifier: this.manager.getAssociatedIdentifier(input.identifier),
      permissions: this.manager.getRequiredPermissions(input.identifier, input.permissions),
    };
  }
}
