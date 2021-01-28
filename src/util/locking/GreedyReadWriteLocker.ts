import { BasicRepresentation } from '../../ldp/representation/BasicRepresentation';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import type { ResourceStore } from '../../storage/ResourceStore';
import { ForbiddenHttpError } from '../errors/ForbiddenHttpError';
import { NotFoundHttpError } from '../errors/NotFoundHttpError';
import { readableToString } from '../StreamUtil';
import type { ReadWriteLocker } from './ReadWriteLocker';
import type { ResourceLocker } from './ResourceLocker';

export interface GreedyReadWriteSuffixes {
  count: string;
  read: string;
  write: string;
}

/**
 * A {@link ReadWriteLocker} that allows for multiple simultaneous read operations.
 * Write operations will be blocked as long as read operations are not finished.
 * New read operations are allowed while this is going on, which will cause write operations to wait longer.
 */
export class GreedyReadWriteLocker implements ReadWriteLocker {
  private readonly locker: ResourceLocker;
  private readonly store: ResourceStore;
  private readonly suffixes: GreedyReadWriteSuffixes;

  public constructor(locker: ResourceLocker, store: ResourceStore, suffixes: GreedyReadWriteSuffixes = {
    count: 'count',
    read: 'read',
    write: 'write',
  }) {
    this.locker = locker;
    this.store = store;
    this.suffixes = suffixes;
  }

  public async withReadLock<T>(identifier: ResourceIdentifier, whileLocked: () => (Promise<T> | T)): Promise<T> {
    await this.preReadSetup(identifier);
    try {
      return await whileLocked();
    } finally {
      await this.postReadCleanup(identifier);
    }
  }

  public async withWriteLock<T>(identifier: ResourceIdentifier, whileLocked: () => (Promise<T> | T)): Promise<T> {
    if (identifier.path.endsWith(`.${this.suffixes.count}`)) {
      throw new ForbiddenHttpError('This resource is used for internal purposes.');
    }
    const write = this.getWriteLockIdentifier(identifier);
    await this.locker.lock(write);
    try {
      return await whileLocked();
    } finally {
      await this.locker.unlock(write);
    }
  }

  private getCountIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}.${this.suffixes.count}` };
  }

  private getReadLockIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}.${this.suffixes.read}` };
  }

  private getWriteLockIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return { path: `${identifier.path}.${this.suffixes.write}` };
  }

  private async preReadSetup(identifier: ResourceIdentifier): Promise<void> {
    await this.withInternalReadLock(identifier, async(): Promise<void> => {
      const count = await this.modifyCount(identifier, +1);
      if (count === 1) {
        const write = this.getWriteLockIdentifier(identifier);
        await this.locker.lock(write);
      }
    });
  }

  private async postReadCleanup(identifier: ResourceIdentifier): Promise<void> {
    await this.withInternalReadLock(identifier, async(): Promise<void> => {
      const count = await this.modifyCount(identifier, -1);
      if (count === 0) {
        const write = this.getWriteLockIdentifier(identifier);
        await this.locker.unlock(write);
      }
    });
  }

  private async withInternalReadLock<T>(identifier: ResourceIdentifier, whileLocked: () => (Promise<T> | T)):
  Promise<T> {
    const read = this.getReadLockIdentifier(identifier);
    await this.locker.lock(read);
    try {
      return await whileLocked();
    } finally {
      await this.locker.unlock(read);
    }
  }

  private async modifyCount(identifier: ResourceIdentifier, mod: number): Promise<number> {
    let number = 0;
    const countIdentifier = this.getCountIdentifier(identifier);
    try {
      const representation = await this.store.getRepresentation(countIdentifier, { type: { 'text/plain': 1 }});
      number = Number.parseInt(await readableToString(representation.data), 10);
    } catch (error: unknown) {
      if (!NotFoundHttpError.isInstance(error)) {
        throw error;
      }
    }
    number += mod;
    if (number === 0) {
      // Make sure there are no remaining resources once all locks are released
      await this.store.deleteResource(countIdentifier);
    } else {
      const updated = new BasicRepresentation(`${number}`, countIdentifier, 'text/plain');
      await this.store.setRepresentation(countIdentifier, updated);
    }
    return number;
  }
}
