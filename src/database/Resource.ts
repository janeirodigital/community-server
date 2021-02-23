export class Resource {
  public id: BigInt;
  public name: string;
  public container: boolean;
  public nonRdf: boolean;
  public parentResourceId: BigInt;
  public content: string;
  public contentType: string;
  public createdAt: Date;
  public updatedAt?: Date;
  public binaryContent: Buffer;

  public constructor(id: BigInt, name: string, container: boolean, nonRdf: boolean, parentResourceId: BigInt,
    content: string, contentType: string, createdAt: Date, updatedAt: Date) {
    this.id = id;
    this.name = name;
    this.container = container;
    this.nonRdf = nonRdf;
    this.parentResourceId = parentResourceId;
    this.content = content;
    this.contentType = contentType;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.binaryContent = Buffer.from('');
  }
}
