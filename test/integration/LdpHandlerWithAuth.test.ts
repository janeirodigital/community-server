import { createReadStream, promises as fsPromises } from 'fs';
import type { HttpHandler, Initializer, ResourceStore } from '../../src/';
import {
  LDP,
  BasicRepresentation,
  joinFilePath,
  ensureTrailingSlash,
  isSystemError,
} from '../../src/';
import { AclHelper, ResourceHelper } from '../util/TestHelpers';
import { BASE, getTestFolder, createFolder, removeFolder, instantiateFromConfig } from './Config';

const rootFilePath = getTestFolder('full-config-acl');
const stores: [string, any][] = [
  [ 'in-memory storage', {
    storeUrn: 'urn:solid-server:default:MemoryResourceStore',
    setup: jest.fn(),
    teardown: jest.fn(),
  }],
  [ 'on-disk storage', {
    storeUrn: 'urn:solid-server:default:FileResourceStore',
    setup: (): void => createFolder(rootFilePath),
    teardown: (): void => removeFolder(rootFilePath),
  }],
];

describe.each(stores)('An LDP handler with auth using %s', (name, { storeUrn, setup, teardown }): void => {
  let handler: HttpHandler;
  let aclHelper: AclHelper;
  let resourceHelper: ResourceHelper;
  let store: ResourceStore;

  beforeAll(async(): Promise<void> => {
    // Set up the internal store
    await setup();
    const variables: Record<string, any> = {
      'urn:solid-server:default:variable:baseUrl': BASE,
      'urn:solid-server:default:variable:rootFilePath': rootFilePath,
    };
    const internalStore = await instantiateFromConfig(
      storeUrn,
      'ldp-with-auth.json',
      variables,
    ) as ResourceStore;
    variables['urn:solid-server:default:variable:store'] = internalStore;

    // Create and initialize the HTTP handler and related components
    let initializer: Initializer;
    const instances = await instantiateFromConfig(
      'urn:solid-server:test:Instances',
      'ldp-with-auth.json',
      variables,
    ) as Record<string, any>;
    ({ handler, store, initializer } = instances);
    await initializer.handleSafe();

    // Create test helpers for manipulating the components
    aclHelper = new AclHelper(store, BASE);
    resourceHelper = new ResourceHelper(handler, BASE);

    // Write test resource
    await store.setRepresentation({ path: `${BASE}/permanent.txt` },
      new BasicRepresentation(createReadStream(joinFilePath(__dirname, '../assets/permanent.txt')), 'text/plain'));
  });

  afterAll(async(): Promise<void> => {
    await teardown();
  });

  it('can add a file to the store, read it and delete it if allowed.', async():
  Promise<void> => {
    // Set acl
    await aclHelper.setSimpleAcl({ read: true, write: true, append: true }, 'agent');

    // Create file
    let response = await resourceHelper.createResource(
      '../assets/testfile2.txt', 'testfile2.txt', 'text/plain',
    );
    const id = response._getHeaders().location;

    // Get file
    response = await resourceHelper.getResource(id);
    expect(response.statusCode).toBe(200);
    expect(response._getBuffer().toString()).toContain('TESTFILE2');
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<${id}.acl>; rel="acl"`);

    // DELETE file
    await resourceHelper.deleteResource(id);
    await resourceHelper.shouldNotExist(id);
  });

  it('can not add a file to the store if not allowed.', async():
  Promise<void> => {
    // Set acl
    await aclHelper.setSimpleAcl({ read: true, write: true, append: true }, 'authenticated');

    // Try to create file
    const response = await resourceHelper.createResource(
      '../assets/testfile2.txt', 'testfile2.txt', 'text/plain', true,
    );
    expect(response.statusCode).toBe(401);
  });

  it('can not add/delete, but only read files if allowed.', async():
  Promise<void> => {
    // Set acl
    await aclHelper.setSimpleAcl({ read: true, write: false, append: false }, 'agent');

    // Try to create file
    let response = await resourceHelper.createResource(
      '../assets/testfile2.txt', 'testfile2.txt', 'text/plain', true,
    );
    expect(response.statusCode).toBe(401);

    // GET permanent file
    response = await resourceHelper.getResource('http://test.com/permanent.txt');
    expect(response._getBuffer().toString()).toContain('TEST');
    expect(response.getHeaders().link).toContain(`<${LDP.Resource}>; rel="type"`);
    expect(response.getHeaders().link).toContain(`<http://test.com/permanent.txt.acl>; rel="acl"`);

    // Try to delete permanent file
    response = await resourceHelper.deleteResource('http://test.com/permanent.txt', true);
    expect(response.statusCode).toBe(401);
  });

  it('can add files but not write to them if append is allowed.', async(): Promise<void> => {
    // Set acl
    await aclHelper.setSimpleAcl({ read: true, write: false, append: true }, 'agent');

    // Add a file
    let response = await resourceHelper.createResource(
      '../assets/testfile2.txt', 'testfile2.txt', 'text/plain', true,
    );
    expect(response.statusCode).toBe(201);

    const id = response._getHeaders().location;
    response = await resourceHelper.performRequestWithBody(
      new URL(id),
      'PUT',
      { 'content-type': 'text/plain', 'transfer-encoding': 'chunked' },
      Buffer.from('data'),
    );
    expect(response.statusCode).toBe(401);
  });

  it('supports file paths with spaces.', async(): Promise<void> => {
    // Specific problem for file store, so only do this if the rootFilePath folder exists
    try {
      await fsPromises.lstat(rootFilePath);
    } catch (error: unknown) {
      if (isSystemError(error) && error.code === 'ENOENT') {
        return;
      }
      throw error;
    }
    // Correct identifier when there are spaces
    const identifier = { path: `${ensureTrailingSlash(BASE)}with%20spaces.txt` };

    // Set acl specifically for this identifier
    const acl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
<#authorization>
    a               acl:Authorization;
    acl:agentClass  foaf:Agent;
    acl:mode        acl:Read;
    acl:accessTo    <${identifier.path}>.`;

    // Prevent other access to make sure there is no hierarchy bug
    await aclHelper.setSimpleAcl({ read: false, write: false, append: false }, 'agent');

    // Write files manually to make sure there are actually spaces
    await fsPromises.writeFile(joinFilePath(rootFilePath, 'with spaces.txt.acl'), acl);
    await fsPromises.writeFile(joinFilePath(rootFilePath, 'with spaces.txt'), 'valid data');

    // GET file
    const response = await resourceHelper.getResource(identifier.path);
    expect(response._getBuffer().toString()).toContain('valid data');
  });

  it('supports acl files where the identifiers dont use our normalization.', async(): Promise<void> => {
    // Set acl to prevent accidental hierarchical assumptions
    await aclHelper.setSimpleAcl({ read: false, write: false, append: false }, 'agent');

    // Identifier with escaped character
    const identifier = { path: `${ensureTrailingSlash(BASE)}%26foo` };

    // Set acl where this identifier is not escaped (& instead of %26)
    const acl = `@prefix acl: <http://www.w3.org/ns/auth/acl#>.
@prefix foaf: <http://xmlns.com/foaf/0.1/>.
<#authorization>
    a               acl:Authorization;
    acl:agentClass  foaf:Agent;
    acl:mode        acl:Read;
    acl:accessTo    <${ensureTrailingSlash(BASE)}&foo>.`;

    // Prevent other access to make sure there is no hierarchy bug
    await aclHelper.setSimpleAcl({ read: false, write: false, append: false }, 'agent');

    // Write acl and resource directly to store
    await store.setRepresentation({ path: `${identifier.path}.acl` }, new BasicRepresentation(acl, 'text/turtle'));
    await store.setRepresentation({ path: `${identifier.path}` }, new BasicRepresentation('data', 'text/plain'));

    // GET file
    const response = await resourceHelper.getResource(identifier.path);
    expect(response.statusCode).toBe(200);
  });
});
