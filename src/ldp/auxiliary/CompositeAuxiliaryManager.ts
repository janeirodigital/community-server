import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../util/errors/NotImplementedHttpError';
import type { Representation } from '../representation/Representation';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
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

  /**
   * Returns the auxiliary identifiers of the given associated identifier corresponding to all stored AuxiliaryManagers.
   * @param identifier - The associated identifier.
   */
  public getAuxiliaryIdentifiers(identifier: ResourceIdentifier): ResourceIdentifier[] {
    return this.sources.map((source): ResourceIdentifier => source.getAuxiliaryIdentifier(identifier));
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return this.sources.some((source): boolean => source.isAuxiliaryIdentifier(identifier));
  }

  public getAssociatedIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    const source = this.getMatchingSource(identifier);
    return source.getAssociatedIdentifier(identifier);
  }

  public addMetadata(identifier: ResourceIdentifier, metadata: RepresentationMetadata): void {
    // Make sure unrelated auxiliary managers don't add metadata to another auxiliary resource
    const match = this.sources.find((source): boolean => source.isAuxiliaryIdentifier(identifier));
    if (match) {
      match.addMetadata(identifier, metadata);
    } else {
      for (const source of this.sources) {
        source.addMetadata(identifier, metadata);
      }
    }
  }

  public canDeleteRoot(identifier: ResourceIdentifier): boolean {
    const source = this.getMatchingSource(identifier);
    return source.canDeleteRoot(identifier);
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
