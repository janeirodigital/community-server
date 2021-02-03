import { UrlBasedAclManager } from '../../../../src/ldp/auxiliary/UrlBasedAclManager';
import { RepresentationMetadata } from '../../../../src/ldp/representation/RepresentationMetadata';
import type { RepresentationConverter } from '../../../../src/storage/conversion/RepresentationConverter';
import { ACL } from '../../../../src/util/Vocabularies';
import { StaticAsyncHandler } from '../../../util/StaticAsyncHandler';

describe('An UrlBasedAclManager', (): void => {
  let converter: RepresentationConverter;
  let manager: UrlBasedAclManager;
  const baseId = { path: 'http://test.com/foo' };
  const auxId = { path: 'http://test.com/foo.acl' };

  beforeEach(async(): Promise<void> => {
    converter = new StaticAsyncHandler<any>(true, null);
    manager = new UrlBasedAclManager(converter);
  });

  it('is a suffix manager with a specific suffix and link.', async(): Promise<void> => {
    const metadata = new RepresentationMetadata(baseId);
    expect(manager.getAuxiliaryIdentifier(baseId)).toEqual(auxId);
    expect(manager.isAuxiliaryIdentifier(auxId)).toBe(true);
    expect(manager.getAssociatedIdentifier(auxId)).toEqual(baseId);
    expect(manager.addMetadata(baseId, metadata)).toBeUndefined();
    expect(metadata.quads()).toHaveLength(1);
    expect(metadata.get(ACL.terms.accessControl)?.value).toBe(auxId.path);
  });

  it('returns true on canDeleteRoot.', async(): Promise<void> => {
    expect(manager.canDeleteRoot()).toEqual(false);
  });
});
