import type { AuxiliaryManager } from '../../../../src/ldp/auxiliary/AuxiliaryManager';
import { AclPermissionsExtractor } from '../../../../src/ldp/permissions/AclPermissionsExtractor';
import { NotImplementedHttpError } from '../../../../src/util/errors/NotImplementedHttpError';

describe('An AclPermissionsExtractor', (): void => {
  let extractor: AclPermissionsExtractor;

  beforeEach(async(): Promise<void> => {
    const aclManager = {
      isAuxiliaryIdentifier: (id): boolean => id.path.endsWith('.acl'),
    } as AuxiliaryManager;
    extractor = new AclPermissionsExtractor(aclManager);
  });

  it('can only handle acl files.', async(): Promise<void> => {
    await expect(extractor.canHandle({ target: { path: 'http://test.com/foo' }} as any))
      .rejects.toThrow(NotImplementedHttpError);
    await expect(extractor.canHandle({ target: { path: 'http://test.com/foo.acl' }} as any))
      .resolves.toBeUndefined();
  });

  it('returns control permissions.', async(): Promise<void> => {
    await expect(extractor.handle()).resolves.toEqual({
      read: false,
      write: false,
      append: false,
      control: true,
    });
  });
});
