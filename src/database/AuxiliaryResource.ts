export class AuxiliaryResource {
  public id: BigInt;
  public resourceId: BigInt;
  public relation: string;
  public content: string;
  public contentType: string;
  public createdAt: Date;
  public updatedAt: Date;

  public constructor(id: BigInt, resourceId: BigInt, relation: string,
    content: string, contentType: string, createdAt: Date, updatedAt: Date) {
    this.id = id;
    this.resourceId = resourceId;
    this.relation = relation;
    this.content = content;
    this.contentType = contentType;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
