import type { NamedNode } from 'rdf-js';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { PermissionSet } from '../permissions/PermissionSet';
import type { Representation } from '../representation/Representation';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import type { AuxiliaryManager } from './AuxiliaryManager';

/**
 * An {@link AuxiliaryManager} that combines multiple AuxiliaryManagers into one.
 * Uses `isAuxiliaryIdentifier` to know which manager to call for which call.
 */
export class CompositeAuxiliaryManager implements AuxiliaryManager {
  private readonly sources: AuxiliaryManager[];

  public constructor(sources: AuxiliaryManager[]) {
    this.sources = sources;
  }

  public getAuxiliaryIdentifier(): never {
    throw new InternalServerError('getAuxiliaryIdentifier should never be called on a CompositeAuxiliaryManager.');
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return this.sources.some((source): boolean => source.isAuxiliaryIdentifier(identifier));
  }

  public getAssociatedIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    const source = this.getMatchingSource(identifier);
    return source.getAssociatedIdentifier(identifier);
  }

  public getRequiredPermissions(identifier: ResourceIdentifier, permissions: PermissionSet): PermissionSet {
    const source = this.getMatchingSource(identifier);
    return source.getRequiredPermissions(identifier, permissions);
  }

  public getType(identifier: ResourceIdentifier): NamedNode {
    const source = this.getMatchingSource(identifier);
    return source.getType(identifier);
  }

  public async validate(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    const source = this.getMatchingSource(identifier);
    return source.validate(identifier, representation);
  }

  private getMatchingSource(identifier: ResourceIdentifier): AuxiliaryManager {
    const match = this.sources.find((source): boolean => source.isAuxiliaryIdentifier(identifier));
    if (!match) {
      throw new NotImplementedHttpError(`Could not find an AuxiliaryManager for ${identifier.path}`);
    }

    return match;
  }
}
