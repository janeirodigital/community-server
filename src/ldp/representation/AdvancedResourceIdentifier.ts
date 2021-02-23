import { URL } from 'url';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { ensureTrailingSlash } from '../../util/PathUtil';
import type { ResourceIdentifier } from './ResourceIdentifier';

const logger = getLoggerFor('AdvancedResourceIdentifier');

export class AdvancedResourceIdentifier implements ResourceIdentifier {
  // Full path (including host)
  public readonly path: string;
  public readonly parentPath: string;
  // Resource path (starting with /)
  public readonly resourcePath: string;
  public readonly parentResourcePath: string;
  public isAuxiliary = false;
  public auxiliaryRelation: string;
  public readonly username: string;
  private readonly knownSuffixes = [ '.acl', '.meta', '.shapetree' ];

  public constructor(identifier: ResourceIdentifier) {
    this.path = identifier.path;
    const resourceUrl = new URL(this.path);
    // Trailing slash is necessary for URL library
    const parentUrl = new URL('..', ensureTrailingSlash(identifier.path));
    this.parentPath = parentUrl.href;

    this.resourcePath = resourceUrl.pathname;
    this.parentResourcePath = parentUrl.pathname;
    this.auxiliaryRelation = '';

    const fullPathMinusLeadingSlash = this.resourcePath.slice(1);
    const pathParts = fullPathMinusLeadingSlash.split('/');

    if (pathParts.length > 0) {
      if (pathParts[0] === '' || pathParts[0].startsWith('.')) {
        this.username = 'root';
      } else {
        this.username = pathParts[0];
      }
    } else {
      logger.error(`Unable to determine pod user from path ${fullPathMinusLeadingSlash}`);
      throw new InternalServerError(`Unable to determine pod user from path ${fullPathMinusLeadingSlash}`);
    }

    for (const auxSuffix of this.knownSuffixes) {
      if (this.path.endsWith(auxSuffix)) {
        this.auxiliaryRelation = auxSuffix.replace('.', '');
        this.isAuxiliary = true;
        this.resourcePath = this.resourcePath.replace(auxSuffix, '');
      }
    }
  }
}
