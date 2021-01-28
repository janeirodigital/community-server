import { InternalServerError } from '../../../../src/util/errors/InternalServerError';
import { SingleThreadedResourceLocker } from '../../../../src/util/locking/SingleThreadedResourceLocker';

describe('A SingleThreadedResourceLocker', (): void => {
  let locker: SingleThreadedResourceLocker;
  const identifier = { path: 'http://test.com/foo' };
  beforeEach(async(): Promise<void> => {
    locker = new SingleThreadedResourceLocker();
  });

  it('can lock and unlock a resource.', async(): Promise<void> => {
    await expect(locker.lock(identifier)).resolves.toBeUndefined();
    await expect(locker.unlock(identifier)).resolves.toBeUndefined();
  });

  it('can lock a resource again after it was unlocked.', async(): Promise<void> => {
    await expect(locker.lock(identifier)).resolves.toBeUndefined();
    await expect(locker.unlock(identifier)).resolves.toBeUndefined();
    await expect(locker.lock(identifier)).resolves.toBeUndefined();
  });

  it('errors when unlocking a resource that was not locked.', async(): Promise<void> => {
    await expect(locker.lock(identifier)).resolves.toBeUndefined();
    await expect(locker.unlock(identifier)).resolves.toBeUndefined();
    await expect(locker.unlock(identifier)).rejects.toThrow(InternalServerError);
  });

  /* eslint-disable jest/valid-expect-in-promise */
  it('blocks lock acquisition until they are released.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.lock(identifier);
    const lock2 = locker.lock(identifier);
    const lock3 = locker.lock(identifier);

    // Note the different order of calls
    const prom2 = lock2.then(async(): Promise<void> => {
      results.push(2);
      return locker.unlock(identifier);
    });
    const prom3 = lock3.then(async(): Promise<void> => {
      results.push(3);
      return locker.unlock(identifier);
    });
    const prom1 = lock1.then(async(): Promise<void> => {
      results.push(1);
      return locker.unlock(identifier);
    });
    await Promise.all([ prom2, prom3, prom1 ]);
    expect(results).toEqual([ 1, 2, 3 ]);
  });

  it('can acquire different keys simultaneously.', async(): Promise<void> => {
    const results: number[] = [];
    const lock1 = locker.lock({ path: 'path1' });
    const lock2 = locker.lock({ path: 'path2' });
    const lock3 = locker.lock({ path: 'path3' });
    await lock2.then(async(): Promise<void> => {
      results.push(2);
      return locker.unlock({ path: 'path2' });
    });
    await lock3.then(async(): Promise<void> => {
      results.push(3);
      return locker.unlock({ path: 'path3' });
    });
    await lock1.then(async(): Promise<void> => {
      results.push(1);
      return locker.unlock({ path: 'path1' });
    });
    expect(results).toEqual([ 2, 3, 1 ]);
  });
});
