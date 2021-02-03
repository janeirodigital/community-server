import type { Representation } from '../representation/Representation';
import type { RepresentationMetadata } from '../representation/RepresentationMetadata';
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
   * Whether this auxiliary resource can be deleted when it's in a root storage container.
   * @param identifier - Identifier of the auxiliary resource.
   */
  canDeleteRoot: (identifier: ResourceIdentifier) => boolean;

  /**
   * Adds metadata related to this auxiliary resource,
   * in case this is required for this type of auxiliary resource.
   * The metadata that is added depends on the given identifier being an auxiliary or associated resource:
   * the metadata will be used to link to the other one, and potentially add extra typing info.
   *
   * Used for:
   * Solid, §4.3.1: "For any defined auxiliary resource available for a given Solid resource, all representations of
   * that resource MUST include an HTTP Link header pointing to the location of each auxiliary resource."
   * https://solid.github.io/specification/protocol#auxiliary-resources-server
   *
   * The above is an example of how that metadata would only be added in case the input is the associated identifier.
   *
   * @param identifier - Identifier of a resource.
   * @param metadata - Metadata to update.
   */
  addMetadata: (identifier: ResourceIdentifier, metadata: RepresentationMetadata) => void;

  /**
   * Validates if the representation contains valid data for an auxiliary resource.
   * Should throw an error in case the data is invalid.
   * @param identifier - Identifier of the auxiliary resource.
   * @param representation - Representation of the auxiliary resource.
   */
  validate: (identifier: ResourceIdentifier, representation: Representation) => Promise<void>;
}
