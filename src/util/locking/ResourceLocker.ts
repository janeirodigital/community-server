import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';

/**
 * An interface for classes that only have 1 way to lock interfaces.
 * In general this should only be used by components implementing the {@link ReadWriteLocker} interface.
 * Other components that require locking of resources should use that interface.
 */
export interface ResourceLocker {
  lock: (identifier: ResourceIdentifier) => Promise<void>;
  unlock: (identifier: ResourceIdentifier) => Promise<void>;
}
