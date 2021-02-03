import type { AuxiliaryManager } from '../../../../src/ldp/auxiliary/AuxiliaryManager';
import { CompositeAuxiliaryManager } from '../../../../src/ldp/auxiliary/CompositeAuxiliaryManager';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../../../src/ldp/representation/ResourceIdentifier';
import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

class SimpleSuffixManager implements AuxiliaryManager {
  private readonly suffix: string;

  public constructor(suffix: string) {
    this.suffix = suffix;
  }

  public getAuxiliaryIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}${this.suffix}` };
  }

  public isAuxiliaryIdentifier(identifier: ResourceIdentifier): boolean {
    return identifier.path.endsWith(this.suffix);
  }

  public getAssociatedIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: identifier.path.slice(0, -this.suffix.length) };
  }

  public canDeleteRoot(): boolean {
    return true;
  }

  public addMetadata(): void {
    // Empty fn
  }

  public async validate(): Promise<void> {
    // Always validates
  }
}

describe('A CompositeAuxiliaryManager', (): void => {
  let sources: SimpleSuffixManager[];
  let manager: CompositeAuxiliaryManager;
  const baseId = { path: 'http://test.com/foo' };
  const dummy1Id = { path: 'http://test.com/foo.dummy1' };
  const dummy2Id = { path: 'http://test.com/foo.dummy2' };
  const dummy3Id = { path: 'http://test.com/foo.dummy3' };

  beforeEach(async(): Promise<void> => {
    sources = [
      new SimpleSuffixManager('.dummy1'),
      new SimpleSuffixManager('.dummy2'),
    ];
    manager = new CompositeAuxiliaryManager(sources);
  });

  it('#getAuxiliaryIdentifier always errors.', async(): Promise<void> => {
    expect((): any => manager.getAuxiliaryIdentifier()).toThrow(InternalServerError);
  });

  it('#getAuxiliaryIdentifiers returns results of all sources.', async(): Promise<void> => {
    expect(manager.getAuxiliaryIdentifiers(baseId)).toEqual([ dummy1Id, dummy2Id ]);
  });

  it('#isAuxiliaryIdentifier returns true if there is at least 1 match.', async(): Promise<void> => {
    expect(manager.isAuxiliaryIdentifier(dummy1Id)).toBe(true);
    expect(manager.isAuxiliaryIdentifier(dummy2Id)).toBe(true);
    expect(manager.isAuxiliaryIdentifier(dummy3Id)).toBe(false);
  });

  it('#getAssociatedIdentifier returns the base id if a match is found.', async(): Promise<void> => {
    expect(manager.getAssociatedIdentifier(dummy1Id)).toEqual(baseId);
    expect(manager.getAssociatedIdentifier(dummy2Id)).toEqual(baseId);
    expect((): any => manager.getAssociatedIdentifier(dummy3Id)).toThrow(NotImplementedHttpError);
  });

  it('#addMetadata adds the metadata of all sources for the base identifier.', async(): Promise<void> => {
    sources[0].addMetadata = jest.fn();
    sources[1].addMetadata = jest.fn();
    const metadata = new RepresentationMetadata(baseId);
    expect(manager.addMetadata(baseId, metadata)).toBeUndefined();
    expect(sources[0].addMetadata).toHaveBeenCalledTimes(1);
    expect(sources[0].addMetadata).toHaveBeenLastCalledWith(baseId, metadata);
    expect(sources[1].addMetadata).toHaveBeenCalledTimes(1);
    expect(sources[1].addMetadata).toHaveBeenLastCalledWith(baseId, metadata);
  });

  it('#addMetadata adds the metadata of the correct source for auxiliary identifiers.', async(): Promise<void> => {
    sources[0].addMetadata = jest.fn();
    sources[1].addMetadata = jest.fn();
    const metadata = new RepresentationMetadata(dummy2Id);
    expect(manager.addMetadata(dummy2Id, metadata)).toBeUndefined();
    expect(sources[0].addMetadata).toHaveBeenCalledTimes(0);
    expect(sources[1].addMetadata).toHaveBeenCalledTimes(1);
    expect(sources[1].addMetadata).toHaveBeenLastCalledWith(dummy2Id, metadata);
  });

  it('#canDeleteRoot returns the result of the correct source.', async(): Promise<void> => {
    sources[0].canDeleteRoot = jest.fn();
    sources[1].canDeleteRoot = jest.fn();
    manager.canDeleteRoot(dummy2Id);
    expect(sources[0].canDeleteRoot).toHaveBeenCalledTimes(0);
    expect(sources[1].canDeleteRoot).toHaveBeenCalledTimes(1);
    expect(sources[1].canDeleteRoot).toHaveBeenLastCalledWith(dummy2Id);
  });

  it('#validates using the correct validator.', async(): Promise<void> => {
    sources[0].validate = jest.fn();
    sources[1].validate = jest.fn();

    await expect(manager.validate(dummy1Id, null as any)).resolves.toBeUndefined();
    expect(sources[0].validate).toHaveBeenCalledTimes(1);
    expect(sources[1].validate).toHaveBeenCalledTimes(0);

    await expect(manager.validate(dummy2Id, null as any)).resolves.toBeUndefined();
    expect(sources[0].validate).toHaveBeenCalledTimes(1);
    expect(sources[1].validate).toHaveBeenCalledTimes(1);

    await expect(manager.validate(dummy3Id, null as any)).rejects.toThrow(NotImplementedHttpError);
  });
});
