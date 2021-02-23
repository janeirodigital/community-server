/**
 * Agent metadata related to pod generation.
 */
export type Agent = {
  login: string;
  webId: string;
  name?: string;
  email?: string;
  // TODO (@joshdcollins) [2022-01-01]:-- these fields were added here because currently the Agent is the only
  // TODO (@joshdcollins) [2022-01-01]:-- source of values for resource generation.  So although these are not
  // TODO (@joshdcollins) [2022-01-01]:-- fields that actually part of the Agent's domain, they are entered
  // TODO (@joshdcollins) [2022-01-01]:-- here to ensure they can be included in generation
  issuer: string;
};
