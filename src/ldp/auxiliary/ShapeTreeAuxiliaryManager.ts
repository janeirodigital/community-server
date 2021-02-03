import type { RepresentationConverter } from '../../storage/conversion/RepresentationConverter';
import { SHAPETREE } from '../../util/Vocabularies';
import { SuffixAuxiliaryManager } from './SuffixAuxiliaryManager';

export class ShapeTreeAuxiliaryManager extends SuffixAuxiliaryManager {
  public constructor(converter: RepresentationConverter, suffix = '.shapetree') {
    super(converter, suffix, SHAPETREE.ShapeTree);
  }

  public canDeleteRoot(): boolean {
    return false;
  }
}
