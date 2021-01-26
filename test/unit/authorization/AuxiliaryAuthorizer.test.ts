import type { Authorizer } from '../../../src/authorization/Authorizer';
import { AuxiliaryAuthorizer } from '../../../src/authorization/AuxiliaryAuthorizer';
import type { AuxiliaryManager } from '../../../src/ldp/auxiliary/AuxiliaryManager';
import type { PermissionSet } from '../../../src/ldp/permissions/PermissionSet';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import { NotImplementedHttpError } from '../../../src/util/errors/NotImplementedHttpError';

describe('An AuxiliaryAuthorizer', (): void => {
  const suffix = '.dummy';
  const credentials = {};
  const associatedIdentifier = { path: 'http://test.com/foo' };
  const auxiliaryIdentifier = { path: 'http://test.com/foo.dummy' };
  let permissions: PermissionSet;
  let updatedPermissions: PermissionSet;
  let source: Authorizer;
  let manager: AuxiliaryManager;
  let authorizer: AuxiliaryAuthorizer;

  beforeEach(async(): Promise<void> => {
    permissions = {
      read: true,
      write: true,
      append: true,
      control: false,
    };
    updatedPermissions = {
      read: false,
      write: false,
      append: false,
      control: true,
    };

    source = {
      canHandle: jest.fn(),
      handle: jest.fn(),
      handleSafe: jest.fn(),
    };

    manager = {
      isAuxiliaryIdentifier: jest.fn((identifier: ResourceIdentifier): boolean => identifier.path.endsWith(suffix)),
      getAssociatedIdentifier: jest.fn((identifier: ResourceIdentifier): ResourceIdentifier =>
        ({ path: identifier.path.slice(0, -suffix.length) })),
      getRequiredPermissions: jest.fn().mockReturnValue(updatedPermissions),
    } as any;
    authorizer = new AuxiliaryAuthorizer(source, manager);
  });

  it('can handle auxiliary resources if the source supports the associated resource.', async(): Promise<void> => {
    await expect(authorizer.canHandle({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .resolves.toBeUndefined();
    expect(source.canHandle).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, permissions: updatedPermissions },
    );
    await expect(authorizer.canHandle({ identifier: associatedIdentifier, credentials, permissions }))
      .rejects.toThrow(NotImplementedHttpError);
    source.canHandle = jest.fn().mockRejectedValue(new Error('no source support'));
    await expect(authorizer.canHandle({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .rejects.toThrow('no source support');
  });

  it('handles resources by sending the updated parameters to the source.', async(): Promise<void> => {
    await expect(authorizer.handle({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .resolves.toBeUndefined();
    expect(source.handle).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, permissions: updatedPermissions },
    );
    // Safety checks are not present when calling `handle`
    await expect(authorizer.handle({ identifier: associatedIdentifier, credentials, permissions }))
      .resolves.toBeUndefined();
    expect(source.handle).toHaveBeenLastCalledWith(
      { identifier: { path: 'http://test.c' }, credentials, permissions: updatedPermissions },
    );
  });

  it('combines both checking and handling when calling handleSafe.', async(): Promise<void> => {
    await expect(authorizer.handleSafe({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .resolves.toBeUndefined();
    expect(source.handleSafe).toHaveBeenLastCalledWith(
      { identifier: associatedIdentifier, credentials, permissions: updatedPermissions },
    );
    await expect(authorizer.handleSafe({ identifier: associatedIdentifier, credentials, permissions }))
      .rejects.toThrow(NotImplementedHttpError);
    source.handleSafe = jest.fn().mockRejectedValue(new Error('no source support'));
    await expect(authorizer.handleSafe({ identifier: auxiliaryIdentifier, credentials, permissions }))
      .rejects.toThrow('no source support');
  });
});
