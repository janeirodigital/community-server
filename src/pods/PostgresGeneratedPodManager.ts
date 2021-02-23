import type { Database } from '../database/Database';
import type { ResourceIdentifier } from '../ldp/representation/ResourceIdentifier';
import { getLoggerFor } from '../logging/LogUtil';
import type { ResourceStore } from '../storage/ResourceStore';
import { containsResource } from '../storage/StoreUtil';
import { ConflictHttpError } from '../util/errors/ConflictHttpError';
import { InternalServerError } from '../util/errors/InternalServerError';
import type { Agent } from './agent/Agent';
import type { IdentifierGenerator } from './generate/IdentifierGenerator';
import type { ResourcesGenerator } from './generate/ResourcesGenerator';
import type { PodManager } from './PodManager';

/**
 * Pod manager that uses an {@link IdentifierGenerator} and {@link ResourcesGenerator}
 * to create the default resources and identifier for a new pod.
 */
export class PostgresGeneratedPodManager implements PodManager {
  protected readonly logger = getLoggerFor(this);

  private readonly store: ResourceStore;
  private readonly idGenerator: IdentifierGenerator;
  private readonly resourcesGenerator: ResourcesGenerator;
  private readonly database: Database;

  public constructor(store: ResourceStore, idGenerator: IdentifierGenerator, resourcesGenerator: ResourcesGenerator,
    database: Database) {
    this.store = store;
    this.idGenerator = idGenerator;
    this.resourcesGenerator = resourcesGenerator;
    this.database = database;
  }

  /**
   * Creates a new pod, pre-populating it with the resources created by the data generator.
   * Pod identifiers are created based on the identifier generator.
   * Will throw an error if the given identifier already has a resource.
   */
  public async createPod(agent: Agent): Promise<ResourceIdentifier> {
    const podIdentifier = this.idGenerator.generate(agent.login);
    this.logger.info(`Creating pod ${podIdentifier.path}`);
    if (await containsResource(this.store, podIdentifier)) {
      throw new ConflictHttpError(`There already is a resource at ${podIdentifier.path}`);
    }

    await this.database.queryHelper(`INSERT INTO public.web_identity (identity_url) VALUES ($1) ON CONFLICT DO NOTHING`,
      [ agent.webId ]);
    const webIdentityIdResult = await this.database.queryHelper(`SELECT id FROM public.web_identity WHERE 
    identity_url = $1`, [ agent.webId ]);
    if (webIdentityIdResult.rowCount !== 1) {
      throw new InternalServerError('Unable to retrieve web_identity record');
    }
    const webIdentityId = webIdentityIdResult.rows[0].id;

    await this.database.queryHelper(`INSERT INTO public.pod (web_identity_id, username, created_at) VALUES ($1, $2, 
    now())`, [ webIdentityId, agent.login ]);

    const result = await this.database.queryHelper('SELECT id::int8 FROM public.pod WHERE username = $1;',
      [ agent.login ]);

    if (result.rowCount === 1) {
      await this.database.queryHelper(`SELECT public.create_pod_tables($1)`, [ result.rows[0].id ]);
    }

    const resources = this.resourcesGenerator.generate(podIdentifier, agent);
    let count = 0;
    for await (const { identifier, representation } of resources) {
      await this.store.setRepresentation(identifier, representation);
      count += 1;
    }
    this.logger.info(`Added ${count} resources to ${podIdentifier.path}`);
    return podIdentifier;
  }
}
