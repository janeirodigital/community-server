import arrayifyStream from 'arrayify-stream';
import { DataFactory } from 'n3';
import type { NamedNode } from 'rdf-js';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { INTERNAL_QUADS } from '../../util/ContentTypes';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { guardedStreamFrom } from '../../util/StreamUtil';
import { BasicRepresentation } from '../representation/BasicRepresentation';
import type { Representation } from '../representation/Representation';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';
import type { AuxiliaryManager } from './AuxiliaryManager';
import namedNode = DataFactory.namedNode;

/**
 * Helper class that uses a suffix to determine if a resource is an auxiliary resource or not.
 * Simple string matching is used, so the dot needs to be included if needed, e.g. ".acl".
 *
 * In case the `link` parameter is provided, the `addMetadata` function will add a link to the auxiliary resource
 * when called on the associated resource. Specifically: <associatedId> <link> <auxiliaryId> will be added.
 *
 * Also does validation by verifying if the data is parsed without errors by the given converter.
 */
export class SuffixAuxiliaryManager implements AuxiliaryManager {
  protected readonly converter: RepresentationConverter;
  protected readonly suffix: string;
  protected readonly link?: NamedNode;

  public constructor(converter: RepresentationConverter, suffix: string, link?: string) {
    this.converter = converter;
    this.suffix = suffix;
    if (typeof link === 'string') {
      this.link = namedNode(link);
    }
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

  public canDeleteRoot(): boolean {
    return true;
  }

  public addMetadata(identifier: ResourceIdentifier, metadata: RepresentationMetadata): void {
    if (this.link && !this.isAuxiliaryIdentifier(identifier)) {
      metadata.add(this.link, namedNode(this.getAuxiliaryIdentifier(identifier).path));
    }
  }

  public async validate(identifier: ResourceIdentifier, representation: Representation): Promise<void> {
    // Read data in memory first so it does not get lost
    const data = await arrayifyStream(representation.data);
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
    representation.data = guardedStreamFrom(data);
  }
}
