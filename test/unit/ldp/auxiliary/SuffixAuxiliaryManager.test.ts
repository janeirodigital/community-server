import { namedNode } from '@rdfjs/data-model';
import type { NamedNode } from 'rdf-js';
import { SuffixAuxiliaryManager } from '../../../../src/ldp/auxiliary/SuffixAuxiliaryManager';
import { BasicRepresentation } from '../../../../src/ldp/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { readableToString } from '../../../../src/util/StreamUtil';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';
import 'jest-rdf';

const suffix = '.dummy';

class DummyManager extends SuffixAuxiliaryManager {
  public constructor(converter: RepresentationConverter) {
    super(suffix, converter);
  }

  public getType(): NamedNode {
    return namedNode('dummy');
  }
}

describe('A SuffixAuxiliaryManager', (): void => {
  let manager: SuffixAuxiliaryManager;
  let converter: RepresentationConverter;
  const associatedId: ResourceIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryId: ResourceIdentifier = { path: 'http://test.com/foo.dummy' };

  beforeEach(async(): Promise<void> => {
    converter = new StaticAsyncHandler<any>(true, null);
    manager = new DummyManager(converter);
  });

  it('creates new identifiers by appending the suffix.', async(): Promise<void> => {
    expect(manager.getAuxiliaryIdentifier(associatedId)).toEqual(auxiliaryId);
  });

  it('checks the suffix to determine if an identifier is auxiliary.', async(): Promise<void> => {
    expect(manager.isAuxiliaryIdentifier(associatedId)).toBe(false);
    expect(manager.isAuxiliaryIdentifier(auxiliaryId)).toBe(true);
  });

  it('errors when trying to get the associated id from a non-auxiliary identifier.', async(): Promise<void> => {
    expect((): any => manager.getAssociatedIdentifier(associatedId)).toThrow(InternalServerError);
  });

  it('removes the suffix to create the associated identifier.', async(): Promise<void> => {
    expect(manager.getAssociatedIdentifier(auxiliaryId)).toEqual(associatedId);
  });

  it('does not change the input permissions.', async(): Promise<void> => {
    const permissions = {
      read: true,
      write: true,
      append: true,
      control: false,
    };
    expect(manager.getRequiredPermissions(auxiliaryId, permissions)).toEqual(permissions);
  });

  it('validates data by running it through a converter.', async(): Promise<void> => {
    converter.handleSafe = jest.fn().mockResolvedValue(new BasicRepresentation('transformedData', 'wrongType'));
    const representation = new BasicRepresentation('data', 'content-type');
    const quads = representation.metadata.quads();
    await expect(manager.validate(auxiliaryId, representation)).resolves.toBeUndefined();
    // Make sure the data can still be streamed
    await expect(readableToString(representation.data)).resolves.toBe('data');
    // Make sure the metadata was not changed
    expect(quads).toBeRdfIsomorphic(representation.metadata.quads());
  });

  it('throws an error when validating invalid data.', async(): Promise<void> => {
    converter.handleSafe = jest.fn().mockRejectedValue(new Error('bad data!'));
    const representation = new BasicRepresentation('data', 'content-type');
    await expect(manager.validate(auxiliaryId, representation)).rejects.toThrow('bad data!');
    // Make sure the data on the readable has not been reset
    expect(representation.data.readableEnded).toBe(true);
  });
});
