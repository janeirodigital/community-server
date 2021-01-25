import { UrlBasedAclManager } from '../../../../src/ldp/auxiliary/UrlBasedAclManager';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { SOLID } from '../../../../src/util/Vocabularies';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('An UrlBasedAclManager', (): void => {
  let converter: RepresentationConverter;
  let manager: UrlBasedAclManager;

  beforeEach(async(): Promise<void> => {
    converter = new StaticAsyncHandler<any>(true, null);
    manager = new UrlBasedAclManager(converter);
  });

  it('#getType returns the type of an acl resource.', async(): Promise<void> => {
    expect(manager.getType()).toEqual(SOLID.terms.AccessControlListResource);
  });

  it('#getPermissions always returns a control PermissionSet.', async(): Promise<void> => {
    expect(manager.getRequiredPermissions()).toEqual({
      read: false,
      write: false,
      append: false,
      control: true,
    });
  });
});
