import { Readable } from 'stream';
import { DataFactory } from 'n3';
import type { Quad } from 'rdf-js';
import rdfParser from 'rdf-parse';
import { AuxiliaryResource } from '../../database/AuxiliaryResource';
import type { Database } from '../../database/Database';
import { Resource } from '../../database/Resource';
import { AdvancedResourceIdentifier } from '../../ldp/representation/AdvancedResourceIdentifier';
import type { Representation } from '../../ldp/representation/Representation';
import { RepresentationMetadata } from '../../ldp/representation/RepresentationMetadata';
import type { ResourceIdentifier } from '../../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../../logging/LogUtil';
import { InternalServerError } from '../../util/errors/InternalServerError';
import { NotFoundHttpError } from '../../util/errors/NotFoundHttpError';
import { UnsupportedMediaTypeHttpError } from '../../util/errors/UnsupportedMediaTypeHttpError';
import type { Guarded } from '../../util/GuardedStream';
import { guardStream } from '../../util/GuardedStream';
import type { IdentifierStrategy } from '../../util/identifiers/IdentifierStrategy';
import { serializeQuads } from '../../util/QuadUtil';
import { generateContainmentQuads } from '../../util/ResourceUtil';
import { CONTENT_TYPE, LDP, RDF } from '../../util/Vocabularies';
import type { DataAccessor } from './DataAccessor';
const logger = getLoggerFor('PostgresDataAccessor');

export class PostgresDataAccessor implements DataAccessor {
  private readonly identifierStrategy: IdentifierStrategy;
  private readonly database: Database;
  private readonly schema: string;

  public constructor(identifierStrategy: IdentifierStrategy, database: Database, schema: string) {
    this.identifierStrategy = identifierStrategy;
    this.database = database;
    this.schema = schema;

    this.database.connect();
  }

  public async canHandle(representation: Representation): Promise<void> {
    if (!representation.binary) {
      throw new UnsupportedMediaTypeHttpError('Only binary data is supported.');
    }
  }

  public async deleteResource(identifier: ResourceIdentifier): Promise<void> {
    logger.debug(`In deleteResource for ${identifier.path}`);
    const auxIdentifier = new AdvancedResourceIdentifier(identifier);
    const podId = await this.getPodIdFromResourceIdentifier(auxIdentifier.username);

    const resourceId = await this.getResourceIdByName(podId, auxIdentifier.resourcePath);
    if (resourceId === null) {
      throw new NotFoundHttpError();
    }

    if (!auxIdentifier.isAuxiliary) {
      await this.database.queryHelper(`DELETE FROM ${this.schema}.resource_${podId} WHERE id = $1`,
        [ resourceId ]);
    } else {
      await this.database.queryHelper(`DELETE FROM ${this.schema}.auxiliary_resource_${podId} WHERE resource_id = 
      $1 AND relation = $2`, [ resourceId, auxIdentifier.auxiliaryRelation ]);
    }

    return Promise.resolve();
  }

  public async getData(identifier: ResourceIdentifier): Promise<Guarded<Readable>> {
    const auxIdentifier = new AdvancedResourceIdentifier(identifier);
    logger.debug(`In getData for ${identifier.path}`);
    const podId = await this.getPodIdFromResourceIdentifier(auxIdentifier.username);

    const resource = await this.getResourceByName(podId, auxIdentifier.resourcePath);

    if (auxIdentifier.isAuxiliary) {
      const auxResource = await this.getAuxiliaryResource(podId, resource.id, auxIdentifier.auxiliaryRelation);
      return guardStream(Readable.from(auxResource.content));
    }
    if (resource.nonRdf) {
      const readableInstanceStream = new Readable({
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        read() {
          this.push(resource.binaryContent);
          this.push(null);
        },
      });
      return guardStream(Readable.from(readableInstanceStream));
    }
    return guardStream(Readable.from(resource.content));
  }

  public async getMetadata(identifier: ResourceIdentifier): Promise<RepresentationMetadata> {
    const auxIdentifier = new AdvancedResourceIdentifier(identifier);
    logger.debug(`In getMetadata for ${identifier.path}`);
    const podId = await this.getPodIdFromResourceIdentifier(auxIdentifier.username);

    const resource = await this.getResourceByName(podId, auxIdentifier.resourcePath);

    const metadata = new RepresentationMetadata(identifier);

    if (auxIdentifier.isAuxiliary) {
      const auxResource = await this.getAuxiliaryResource(podId, resource.id, auxIdentifier.auxiliaryRelation);
      metadata.set(CONTENT_TYPE, auxResource.contentType);
      metadata.add(RDF.type, LDP.terms.Resource);
      metadata.add(RDF.type, LDP.terms.RDFSource);
    } else {
      metadata.add(CONTENT_TYPE, resource.contentType);
      metadata.add(RDF.type, LDP.terms.Resource);
      if (resource.container) {
        metadata.add(RDF.type, LDP.terms.Container);
        metadata.add(RDF.type, LDP.terms.BasicContainer);
        metadata.add(RDF.type, LDP.terms.RDFSource);
        metadata.addQuads(await this.getChildMetadataQuads(podId, resource));
      } else if (resource.nonRdf) {
        metadata.add(RDF.type, LDP.terms.NonRDFSource);
      } else {
        metadata.add(RDF.type, LDP.terms.RDFSource);
      }
    }
    return metadata;
  }

  public async writeContainer(identifier: ResourceIdentifier, metadata: RepresentationMetadata): Promise<void> {
    const auxIdentifier = new AdvancedResourceIdentifier(identifier);
    logger.debug(`In writeContainer for ${identifier.path}`);

    const podId = await this.getPodIdFromResourceIdentifier(auxIdentifier.username);

    const resourceId = await this.getResourceIdByName(podId, auxIdentifier.resourcePath);

    const parentResourceId = await this.getResourceIdByName(podId, auxIdentifier.parentResourcePath);

    const quadString = await PostgresDataAccessor.streamToString(serializeQuads(metadata.quads()));
    const quadStream = guardStream(Readable.from(quadString));
    if (resourceId === null) {
      // Create resource with container = true
      await this.createResource(podId, auxIdentifier.resourcePath, true, parentResourceId, quadStream, metadata);
    } else {
      // Update existing resource record
      await this.database.queryHelper(`UPDATE ${this.schema}.resource_${podId} SET content = $1, updated_at = now()
       WHERE id = $2`, [ quadString, resourceId ]);
    }

    return Promise.resolve();
  }

  public async writeDocument(identifier: ResourceIdentifier, data: Guarded<Readable>, metadata: RepresentationMetadata):
  Promise<void> {
    const auxIdentifier = new AdvancedResourceIdentifier(identifier);
    logger.debug(`In writeDocument for ${identifier.path}`);
    const podId = await this.getPodIdFromResourceIdentifier(auxIdentifier.username);

    const resourceId = await this.getResourceIdByName(podId, auxIdentifier.resourcePath);

    if (auxIdentifier.isAuxiliary && resourceId !== null) {
      await this.writeAuxiliaryResource(podId, auxIdentifier, resourceId, data, metadata);
    } else {
      const parentResourceId = await this.getResourceIdByName(podId, auxIdentifier.parentResourcePath);

      if (resourceId === null) {
        // Create resource with container = false
        await this.createResource(podId, auxIdentifier.resourcePath, false, parentResourceId, data, metadata);
      } else {
        // Update existing resource record
        await this.database.queryHelper(`UPDATE ${this.schema}.resource_${podId} SET content = $1, updated_at = 
        now() WHERE id = $2`, [ PostgresDataAccessor.streamToString(data), resourceId ]);
      }
    }

    return Promise.resolve();
  }

  private async writeAuxiliaryResource(podId: BigInt, auxIdentifier: AdvancedResourceIdentifier, resourceId: BigInt,
    data: Guarded<Readable>, metadata: RepresentationMetadata): Promise<void> {
    // eslint-disable-next-line max-len
    const existingAuxResourceId = await this.getAuxiliaryResourceIdByResourceAndRelation(podId, resourceId, auxIdentifier.auxiliaryRelation);

    if (existingAuxResourceId === null) {
      // Create aux resource
      await this.createAuxResource(podId, resourceId, auxIdentifier.auxiliaryRelation, data, metadata);
    } else {
      // Update existing aux resource
      await this.updateAuxResource(podId, existingAuxResourceId, data);
    }
  }

  private async getPodIdFromResourceIdentifier(username: string): Promise<BigInt> {
    logger.debug(`Looking up Pod Id for username ${username}`);

    const result = await this.database.queryHelper(`SELECT id::int8 FROM ${this.schema}.pod WHERE username = $1;`,
      [ username ]);

    if (result.rowCount === 1) {
      return BigInt(result.rows[0].id);
    }
    throw new NotFoundHttpError();
  }

  private static async streamToString(stream: Readable): Promise<string> {
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  }

  private static async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private async getResourceByName(podId: BigInt, resourceName: string): Promise<Resource> {
    const existingResourceResult = await this.database.queryHelper(`SELECT id, name, container, nonrdf, 
    parent_resource_id as parentresourceid, content, content_type as contenttype, created_at as createdat,
    updated_at as updatedat FROM ${this.schema}.resource_${podId} WHERE name = $1`, [ resourceName ]);

    if (existingResourceResult.rowCount === 0) {
      throw new NotFoundHttpError();
    } else if (existingResourceResult.rowCount > 1) {
      throw new InternalServerError('More than one record found for resource');
    }

    const resource = new Resource(existingResourceResult.rows[0].id,
      existingResourceResult.rows[0].name,
      existingResourceResult.rows[0].container,
      existingResourceResult.rows[0].nonrdf,
      existingResourceResult.rows[0].parentresourceid,
      existingResourceResult.rows[0].content,
      existingResourceResult.rows[0].contenttype,
      existingResourceResult.rows[0].createdat,
      existingResourceResult.rows[0].updatedat);

    if (resource.nonRdf) {
      const binaryResult = await this.database.queryHelper(`SELECT binary_content as binarycontent FROM 
      ${this.schema}.binary_resource_${podId} WHERE resource_id = $1`, [ resource.id ]);

      if (binaryResult.rowCount === 0) {
        logger.warn(`Expected a binary resource to be present for resource id: ${resource.id}`);
      } else if (binaryResult.rowCount > 1) {
        logger.warn(`Expected only one binary resource to be present for resource id: ${resource.id} 
        but found multiple`);
      }

      resource.binaryContent = binaryResult.rows[0].binarycontent;
    }

    return resource;
  }

  private async getAuxiliaryResource(podId: BigInt, resourceId: BigInt, linkRelation: string):
  Promise<AuxiliaryResource> {
    const existingAuxResourceResult = await this.database.queryHelper(`SELECT id, resource_id as resourceid, 
    relation, content, content_type as contenttype, created_at as createdat, updated_at as updatedat FROM 
    ${this.schema}.auxiliary_resource_${podId} WHERE resource_id = $1 AND relation = $2`, [ resourceId, linkRelation ]);

    if (existingAuxResourceResult.rowCount === 0) {
      throw new NotFoundHttpError();
    } else if (existingAuxResourceResult.rowCount > 1) {
      throw new InternalServerError('More than one record found for resource');
    }

    return new AuxiliaryResource(existingAuxResourceResult.rows[0].id,
      existingAuxResourceResult.rows[0].resourceId,
      existingAuxResourceResult.rows[0].relation,
      existingAuxResourceResult.rows[0].content,
      existingAuxResourceResult.rows[0].contenttype,
      existingAuxResourceResult.rows[0].createdat,
      existingAuxResourceResult.rows[0].updatedat);
  }

  private async getResourceIdByName(podId: BigInt, resourceName: string): Promise<BigInt|null> {
    const existingResourceIdResult = await this.database.queryHelper(`SELECT id FROM 
    ${this.schema}.resource_${podId} WHERE name = $1;`, [ resourceName ]);
    if (existingResourceIdResult.rowCount === 0) {
      return null;
    }
    return existingResourceIdResult.rows[0].id;
  }

  private async getAuxiliaryResourceIdByResourceAndRelation(podId: BigInt, resourceId: BigInt, relation: string):
  Promise<BigInt|null> {
    const existingResourceIdResult = await this.database.queryHelper(`SELECT id FROM 
    ${this.schema}.auxiliary_resource_${podId} WHERE resource_id = $1 AND relation = $2;`, [ resourceId, relation ]);
    if (existingResourceIdResult.rowCount === 0) {
      return null;
    }
    return existingResourceIdResult.rows[0].id;
  }

  private async createResource(podId: BigInt, resourceName: string, isContainer: boolean,
    parentResourceId: BigInt|null, content: Guarded<Readable>, metadata: RepresentationMetadata): Promise<void> {
    let stringContent = '';

    if (metadata.contentType === undefined) {
      metadata.contentType = 'text/turtle';
    }

    const rdfContentTypes = await rdfParser.getContentTypes();
    const isRdf = rdfContentTypes.includes(metadata.contentType);

    if (isRdf) {
      stringContent = await PostgresDataAccessor.streamToString(content as Readable);
      await this.database.queryHelper(`INSERT INTO ${this.schema}.resource_${podId} (name, container, nonrdf,
      parent_resource_id, content, content_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [ resourceName, isContainer, false, parentResourceId, stringContent, metadata.contentType ]);
    } else {
      const buffer = await PostgresDataAccessor.streamToBuffer(content as Readable);
      // Insert the resource record
      await this.database.queryHelper(`INSERT INTO ${this.schema}.resource_${podId} (name, container, nonrdf,
      parent_resource_id, content, content_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [ resourceName, isContainer, true, parentResourceId, null, metadata.contentType ]);

      // Retrieve the resource id
      const resourceId = await this.getResourceIdByName(podId, resourceName);

      // Insert the binary record
      await this.database.queryHelper(`INSERT INTO ${this.schema}.binary_resource_${podId} (resource_id, 
      binary_content, content_type, content_length, created_at) VALUES ($1, $2, $3, $4, now())`,
      [ resourceId, buffer, metadata.contentType, 0 ]);
    }
  }

  private async createAuxResource(podId: BigInt, resourceId: BigInt, relation: string, content: Guarded<Readable>,
    metadata: RepresentationMetadata): Promise<void> {
    const stringContent = await PostgresDataAccessor.streamToString(content as Readable);

    if (metadata.contentType === undefined) {
      metadata.contentType = 'text/turtle';
    }

    await this.database.queryHelper(`INSERT INTO ${this.schema}.auxiliary_resource_${podId} (resource_id, relation, 
    content, content_type, created_at) VALUES ($1, $2, $3, $4, now())`,
    [ resourceId, relation, stringContent, metadata.contentType ]);
  }

  private async updateAuxResource(podId: BigInt, auxResourceId: BigInt, content: Guarded<Readable>): Promise<void> {
    const stringContent = await PostgresDataAccessor.streamToString(content as Readable);
    await this.database.queryHelper(`UPDATE ${this.schema}.auxiliary_resource_${podId} SET content = $1, updated_at
    = now() WHERE id = $2`, [ stringContent, auxResourceId ]);
  }

  /**
   * Generate all containment related triples for a container.
   * These include the actual containment triples
   *
   * @param podId - The ID of Pod in question
   * @param resource - the resource that the child elements are being retrieved for
   */
  private async getChildMetadataQuads(podId: BigInt, resource: Resource): Promise<Quad[]> {
    const childURIs: string[] = [];

    const childResourceResults = await this.database.queryHelper(`SELECT name FROM ${this.schema}.resource_${podId}
     WHERE parent_resource_id = $1`, [ resource.id ]);

    // For every child in the container we want to generate specific metadata
    for (const resultRow of childResourceResults.rows) {
      childURIs.push(resultRow.name);
    }

    // Generate containment metadata
    return generateContainmentQuads(
      DataFactory.namedNode(resource.name), childURIs,
    );
  }
}
