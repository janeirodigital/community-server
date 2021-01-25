import type { NamedNode } from 'rdf-js';
import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { SOLID } from '../../util/Vocabularies';
import type { PermissionSet } from '../permissions/PermissionSet';
import { SuffixAuxiliaryManager } from './SuffixAuxiliaryManager';

/**
 * Generates acl URIs by adding an .acl file extension.
 * Also updates the permissions to require the control permission.
 *
 * Solid, §4.3.3: "A given Solid resource MUST NOT be directly associated with more than one ACL auxiliary resource.
 * A given ACL auxiliary resource MUST NOT be directly associated with more than one Solid resource."
 * https://solid.github.io/specification/protocol#auxiliary-resources-reserved
 */
export class UrlBasedAclManager extends SuffixAuxiliaryManager {
  public constructor(converter: RepresentationConverter) {
    super('.acl', converter);
  }

  public getType(): NamedNode {
    return SOLID.terms.AccessControlListResource;
  }

  public getRequiredPermissions(): PermissionSet {
    // Solid, §4.3.3: "To discover, read, create, or modify an ACL auxiliary resource, an acl:agent MUST have
    // acl:Control privileges per the ACL inheritance algorithm on the resource directly associated with it."
    // https://solid.github.io/specification/protocol#auxiliary-resources-reserved
    return {
      read: false,
      write: false,
      append: false,
      control: true,
    };
  }
}
