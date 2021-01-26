import type { AuxiliaryManager } from '../../../src/ldp/auxiliary/AuxiliaryManager';
import type { ResourceIdentifier } from '../../../src/ldp/representation/ResourceIdentifier';
import { AuxiliaryLockingStore } from '../../../src/storage/AuxiliaryLockingStore';
import type { ResourceStore } from '../../../src/storage/ResourceStore';
import type { ExpiringResourceLocker } from '../../../src/util/locking/ExpiringResourceLocker';

function emptyFunc(): void {
  // Empty
}

describe('An AuxiliaryLockingStore', (): void => {
  const auxiliaryId = { path: 'http://test.com/foo.dummy' };
  const associatedId = { path: 'http://test.com/foo' };
  const data = { data: 'data!' } as any;
  let source: ResourceStore;
  let locker: ExpiringResourceLocker;
  let manager: AuxiliaryManager;
  let store: AuxiliaryLockingStore;

  beforeEach(async(): Promise<void> => {
    source = {
      getRepresentation: jest.fn(),
      addResource: jest.fn(),
      setRepresentation: jest.fn(),
      deleteResource: jest.fn(),
      modifyResource: jest.fn(),
    };

    locker = {
      withReadLock: jest.fn((id, whileLocked): any => whileLocked(emptyFunc)),
      withWriteLock: jest.fn((id, whileLocked): any => whileLocked(emptyFunc)),
    };

    manager = {
      isAuxiliaryIdentifier: jest.fn((id: ResourceIdentifier): any => id.path.endsWith('.dummy')),
      getAssociatedIdentifier: jest.fn((id: ResourceIdentifier): any => ({ path: id.path.slice(0, -6) })),
    } as any;

    store = new AuxiliaryLockingStore(source, locker, manager);

    (store as any).lockedRepresentationRun = jest.fn((id, whileLocked): any => whileLocked(emptyFunc));
  });

  it('calls the lock with the correct identifier for addResource.', async(): Promise<void> => {
    await expect(store.addResource(associatedId, data)).resolves.toBeUndefined();
    expect(source.addResource).toHaveBeenLastCalledWith(associatedId, data, undefined);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect((locker.withWriteLock as jest.Mock).mock.calls[0][0]).toEqual(associatedId);

    await expect(store.addResource(auxiliaryId, data)).resolves.toBeUndefined();
    expect(source.addResource).toHaveBeenLastCalledWith(auxiliaryId, data, undefined);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(2);
    expect((locker.withWriteLock as jest.Mock).mock.calls[1][0]).toEqual(associatedId);
  });

  it('calls the lock with the correct identifier for setRepresentation.', async(): Promise<void> => {
    await expect(store.setRepresentation(associatedId, data)).resolves.toBeUndefined();
    expect(source.setRepresentation).toHaveBeenLastCalledWith(associatedId, data, undefined);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect((locker.withWriteLock as jest.Mock).mock.calls[0][0]).toEqual(associatedId);

    await expect(store.setRepresentation(auxiliaryId, data)).resolves.toBeUndefined();
    expect(source.setRepresentation).toHaveBeenLastCalledWith(auxiliaryId, data, undefined);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(2);
    expect((locker.withWriteLock as jest.Mock).mock.calls[1][0]).toEqual(associatedId);
  });

  it('calls the lock with the correct identifier for deleteResource.', async(): Promise<void> => {
    await expect(store.deleteResource(associatedId)).resolves.toBeUndefined();
    expect(source.deleteResource).toHaveBeenLastCalledWith(associatedId, undefined);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect((locker.withWriteLock as jest.Mock).mock.calls[0][0]).toEqual(associatedId);

    await expect(store.deleteResource(auxiliaryId)).resolves.toBeUndefined();
    expect(source.deleteResource).toHaveBeenLastCalledWith(auxiliaryId, undefined);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(2);
    expect((locker.withWriteLock as jest.Mock).mock.calls[1][0]).toEqual(associatedId);
  });

  it('calls the lock with the correct identifier for modifyResource.', async(): Promise<void> => {
    await expect(store.modifyResource(associatedId, data)).resolves.toBeUndefined();
    expect(source.modifyResource).toHaveBeenLastCalledWith(associatedId, data, undefined);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(1);
    expect((locker.withWriteLock as jest.Mock).mock.calls[0][0]).toEqual(associatedId);

    await expect(store.modifyResource(auxiliaryId, data)).resolves.toBeUndefined();
    expect(source.modifyResource).toHaveBeenLastCalledWith(auxiliaryId, data, undefined);
    expect(locker.withWriteLock).toHaveBeenCalledTimes(2);
    expect((locker.withWriteLock as jest.Mock).mock.calls[1][0]).toEqual(associatedId);
  });

  it('calls lockedRepresentationRun the correct identifier for getRepresentation.', async(): Promise<void> => {
    await expect(store.getRepresentation(associatedId, data)).resolves.toBeUndefined();
    expect(source.getRepresentation).toHaveBeenLastCalledWith(associatedId, data, undefined);
    expect((store as any).lockedRepresentationRun).toHaveBeenCalledTimes(1);
    expect(((store as any).lockedRepresentationRun as jest.Mock).mock.calls[0][0]).toEqual(associatedId);

    await expect(store.getRepresentation(auxiliaryId, data)).resolves.toBeUndefined();
    expect(source.getRepresentation).toHaveBeenLastCalledWith(auxiliaryId, data, undefined);
    expect((store as any).lockedRepresentationRun).toHaveBeenCalledTimes(2);
    expect(((store as any).lockedRepresentationRun as jest.Mock).mock.calls[1][0]).toEqual(associatedId);
  });
});
