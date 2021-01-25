import type { NamedNode } from 'rdf-js';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { guardedStreamFrom, readableToString } from '../../util/StreamUtil';
import type { PermissionSet } from '../permissions/PermissionSet';
import { BasicRepresentation } from '../representation/BasicRepresentation';
import type { Representation } from '../representation/Representation';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import type { AuxiliaryManager } from './AuxiliaryManager';

/**
 * Helper class that uses a suffix to determine if a resource is an auxiliary resource or not.
 * Simple string matching is used, so the dot needs to be included if needed, e.g. ".acl".
 *
 * Also does validation by verifying if the data is parsed without errors by the given converter.
 */
export abstract class SuffixAuxiliaryManager implements AuxiliaryManager {
  protected readonly suffix: string;
  protected readonly converter: RepresentationConverter;

  protected constructor(suffix: string, converter: RepresentationConverter) {
    this.suffix = suffix;
    this.converter = converter;
  }

  public getAuxiliaryIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}${this.suffix}` };
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return identifier.path.endsWith(this.suffix);
  }

  public getAssociatedIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    if (!this.isAuxiliaryIdentifier(identifier)) {
      throw new InternalServerError(`${identifier.path} does not end on ${this.suffix} so no conversion is possible.`);
    }
    return { path: identifier.path.slice(0, -this.suffix.length) };
  }

  public getRequiredPermissions(identifier: ResourceIdentifier, permissions: PermissionSet): PermissionSet {
    return permissions;
  }

  public abstract getType(identifier: ResourceIdentifier): NamedNode;

  public async validate(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    // Read data in memory first so it does not get lost
    const data = await readableToString(representation.data);
    const preferences = { type: { [INTERNAL_QUADS]: 1 }};

    // Creating new representation since converter might edit metadata
    const dummyRepresentation = new BasicRepresentation(data, identifier, representation.metadata.contentType);
    const result = await this.converter.handleSafe({ identifier, representation: dummyRepresentation, preferences });
    // Drain stream to make sure data was parsed correctly
    await new Promise((resolve, reject): void => {
      result.data.on('data', (): void => {
        // Drain the data
      });
      result.data.on('error', reject);
      result.data.on('end', resolve);
      result.data.on('close', resolve);
    });

    // Stream has been drained so need to create new stream
    representation.data = guardedStreamFrom([ data ]);
  }
}
