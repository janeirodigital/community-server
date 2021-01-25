import { namedNode } from '@rdfjs/data-model';
import type { NamedNode } from 'rdf-js';
import type { AuxiliaryManager } from '../../../../src/ldp/auxiliary/AuxiliaryManager';
import { CompositeAuxiliaryManager } from '../../../../src/ldp/auxiliary/CompositeAuxiliaryManager';
import type { PermissionSet } from '../../../../src/ldp/permissions/PermissionSet';
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

  public getRequiredPermissions(identifier: ResourceIdentifier): PermissionSet {
    return {
      read: identifier.path.endsWith('1'),
      write: identifier.path.endsWith('2'),
      append: true,
      control: false,
    };
  }

  public getType(): NamedNode {
    return namedNode(this.suffix);
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

  it('#getRequiredPermissions returns the base id if a match is found.', async(): Promise<void> => {
    expect(manager.getRequiredPermissions(dummy1Id, {} as any)).toEqual(sources[0].getRequiredPermissions(dummy1Id));
    expect(manager.getRequiredPermissions(dummy2Id, {} as any)).toEqual(sources[1].getRequiredPermissions(dummy2Id));
    expect((): any => manager.getRequiredPermissions(dummy3Id, {} as any)).toThrow(NotImplementedHttpError);
  });

  it('#getType returns a type if a match is found.', async(): Promise<void> => {
    expect(manager.getType(dummy1Id)).toEqual(sources[0].getType());
    expect(manager.getType(dummy2Id)).toEqual(sources[1].getType());
    expect((): any => manager.getType(dummy3Id)).toThrow(NotImplementedHttpError);
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
