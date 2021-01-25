import type { NamedNode } from 'rdf-js';
import type { PermissionSet } from '../permissions/PermissionSet';
import type { Representation } from '../representation/Representation';
import type { ResourceIdentifier } from '../representation/ResourceIdentifier';

/**
 * A manager for handling one or more types of auxiliary resources.
 * References to "an auxiliary resource" implicitly imply a specific type of auxiliary resources
 * supported by this manager.
 */
export interface AuxiliaryManager {
  /**
   * Returns the identifier of the auxiliary resource corresponding to the given resource.
   * This does not guarantee that this auxiliary resource exists.
   * @param identifier - The ResourceIdentifier of which we need the corresponding auxiliary resource.
   *
   * @returns The ResourceIdentifier of the corresponding auxiliary resource.
   */
  getAuxiliaryIdentifier: (identifier: ResourceIdentifier) => ResourceIdentifier;

  /**
   * Checks if the input identifier corresponds to an auxiliary resource.
   * This does not check if that auxiliary resource exists,
   * only if the identifier indicates that there could be an auxiliary resource there.
   * @param identifier - Identifier to check.
   *
   * @returns true if the input identifier points to an auxiliary resource.
   */
  isAuxiliaryIdentifier: (identifier: ResourceIdentifier) => boolean;

  /**
   * Returns the identifier of the resource which this auxiliary resource is referencing to.
   * This does not guarantee that this resource exists.
   * @param identifier - Identifier of the auxiliary resource.
   *
   * @returns The ResourceIdentifier of the corresponding resource.
   */
  getAssociatedIdentifier: (identifier: ResourceIdentifier) => ResourceIdentifier;

  /**
   * Returns the permissions that are needed on the associated resource
   * to execute the given permissions on the auxiliary resource.
   * Some auxiliary resource require different permissions than associated resources.
   * E.g., when accessing an acl resource, the control permission is needed instead.
   * In case no changes are required the input object should be returned.
   *
   * Solid, §4.3.1: "Access to different types of auxiliary resources require varying levels of authorization,
   * which MUST be specified as part of the definition for a given auxiliary resource type."
   * https://solid.github.io/specification/protocol#auxiliary-resources-server
   *
   * @param identifier - Identifier of the auxiliary resource.
   * @param permissions - Permissions required if this was an associated resource.
   *
   * @returns The permissions required on the associated resource to execute these actions on an auxiliary resource.
   */
  getRequiredPermissions: (identifier: ResourceIdentifier, permissions: PermissionSet) => PermissionSet;

  /**
   * Returns an identifier corresponding to the type of auxiliary resource.
   *
   * Used for:
   * Solid, §4.3.1: "For any defined auxiliary resource available for a given Solid resource, all representations of
   * that resource MUST include an HTTP Link header pointing to the location of each auxiliary resource."
   * https://solid.github.io/specification/protocol#auxiliary-resources-server
   *
   * @param identifier - Identifier of the auxiliary resource.
   *
   * @returns A named node corresponding to the type.
   */
  getType: (identifier: ResourceIdentifier) => NamedNode;

  /**
   * Validates if the representation contains valid data for an auxiliary resource.
   * Should throw an error in case the data is invalid.
   * @param identifier - Identifier of the auxiliary resource.
   * @param representation - Representation of the auxiliary resource.
   */
  validate: (identifier: ResourceIdentifier, representation: Representation) => Promise<void>;
}
