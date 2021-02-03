import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { ACL } from '../../util/Vocabularies';
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
  public constructor(converter: RepresentationConverter, suffix = '.acl') {
    super(converter, suffix, ACL.accessControl);
  }

  public canDeleteRoot(): boolean {
    return false;
  }
}
