import type { AuxiliaryManager } from '../ldp/auxiliary/AuxiliaryManager';
import type { Patch } from '../ldp/http/Patch';
import type { Representation } from '../ldp/representation/Representation';
import type { RepresentationPreferences } from '../ldp/representation/RepresentationPreferences';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import type { ExpiringResourceLocker } from '../util/locking/ExpiringResourceLocker';
import type { Conditions } from './Conditions';
import { LockingResourceStore } from './LockingResourceStore';
import type { ResourceStore } from './ResourceStore';

/**
 * A {@link LockingResourceStore} that makes sure the locks are applied to the associated resource
 * when the input is an auxiliary resource.
 * The request itself remains unchanged and is still executed on the auxiliary resource.
 */
export class AuxiliaryLockingStore extends LockingResourceStore {
  private readonly manager: AuxiliaryManager;

  public constructor(source: ResourceStore, locks: ExpiringResourceLocker, manager: AuxiliaryManager) {
    super(source, locks);
    this.manager = manager;
  }

  public async getRepresentation(identifier: ResourceIdentifier, preferences: RepresentationPreferences,
    conditions?: Conditions): Promise<Representation> {
    return this.lockedRepresentationRun(this.getLockIdentifier(identifier),
      async(): Promise<Representation> => this.source.getRepresentation(identifier, preferences, conditions));
  }

  public async addResource(container: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<ResourceIdentifier> {
    return this.locks.withWriteLock(this.getLockIdentifier(container),
      async(): Promise<ResourceIdentifier> => this.source.addResource(container, representation, conditions));
  }

  public async setRepresentation(identifier: ResourceIdentifier, representation: Representation,
    conditions?: Conditions): Promise<void> {
    return this.locks.withWriteLock(this.getLockIdentifier(identifier),
      async(): Promise<void> => this.source.setRepresentation(identifier, representation, conditions));
  }

  public async deleteResource(identifier: ResourceIdentifier, conditions?: Conditions): Promise<void> {
    return this.locks.withWriteLock(this.getLockIdentifier(identifier),
      async(): Promise<void> => this.source.deleteResource(identifier, conditions));
  }

  public async modifyResource(identifier: ResourceIdentifier, patch: Patch, conditions?: Conditions): Promise<void> {
    return this.locks.withWriteLock(this.getLockIdentifier(identifier),
      async(): Promise<void> => this.source.modifyResource(identifier, patch, conditions));
  }

  protected getLockIdentifier(identifier: ResourceIdentifier): ResourceIdentifier {
    return this.manager.isAuxiliaryIdentifier(identifier) ?
      this.manager.getAssociatedIdentifier(identifier) :
      identifier;
  }
}
