// Import type * as Knex from 'knex';
//
// export async function up(knex: Knex): Promise<any> {
//   await knex.raw(`CREATE TABLE "public"."web_identity" (
//                            "id" bigint NOT NULL,
//                            "identity_url" varchar(1024) NOT NULL,
//                            PRIMARY KEY ("id")
//                          );`);
//
//   await knex.raw(`CREATE TABLE "public"."pod" (
//                           "id" bigint NOT NULL,
//                           "web_identity_id" bigint NOT NULL,
//                           "username" varchar(255) NOT NULL,
//                           "created_at" timestamptz(255) NOT NULL,
//                           "updated_at" timestamptz,
//                           PRIMARY KEY ("id")
//                         );`);
//
//   await knex.raw(`ALTER TABLE "public"."pod" ADD CONSTRAINT "fk_pod_web_identity_1"
//                           FOREIGN KEY ("web_identity_id") REFERENCES "public"."web_identity" ("id");`);
//
//   await knex.raw(`CREATE OR REPLACE FUNCTION create_pod_tables(pod_id BIGINT) RETURNS VOID AS
//                         $func$
//                         BEGIN
//
//                         EXECUTE format('
//                           CREATE TABLE IF NOT EXISTS %I (
//                             id BIGINT PRIMARY KEY,
//                             resource_id BIGINT NOT NULL,
//                             relation VARCHAR(255) NOT NULL,
//                             content TEXT NOT NULL,
//                             created_at timestamptz NOT NULL,
//                             updated_at timestamptz
//                           )', 'auxiliary_resource_' || pod_id);
//
//                         EXECUTE format('
//                           CREATE TABLE IF NOT EXISTS %I (
//                             id BIGINT PRIMARY KEY,
//                             name VARCHAR(1024) NOT NULL,
//                             container boolean NOT NULL,
//                             nonrdf VARCHAR(255) NOT NULL,
//                             parent_resource_id BIGINT,
//                             content TEXT,
//                             created_at timestamptz NOT NULL,
//                             updated_at timestamptz
//                           )', 'resource_' || pod_id);
//
//                         EXECUTE format('
//                           CREATE TABLE IF NOT EXISTS %I (
//                             id BIGINT PRIMARY KEY,
//                             resource_id bigint NOT NULL,
//                             binary_content bytea NOT NULL,
//                             content_type varchar(255) NOT NULL,
//                             content_length bigint NOT NULL,
//                             created_at timestamptz NOT NULL,
//                             updated_at timestamptz
//                           )', 'binary_resource_' || pod_id);
//
//                         EXECUTE format('
//                        ALTER TABLE auxiliary_resource_%s ADD CONSTRAINT fk_auxiliary_resource_resource_%s FOREIGN KEY
//                             ("resource_id") REFERENCES resource_%s ("id");', pod_id, pod_id, pod_id);
//
//                         EXECUTE format('
//                           ALTER TABLE binary_resource_%s ADD CONSTRAINT fk_binary_resource_resource_%s FOREIGN KEY
//                             ("resource_id") REFERENCES resource_%s ("id");', pod_id, pod_id, pod_id);
//
//                         END
//                         $func$ LANGUAGE plpgsql;
//   `);
// }
//
// export async function down(knex: Knex): Promise<any> {
//   await knex.schema.dropTable('pod');
//   await knex.schema.dropTable('web_identity');
//   return knex.raw('DROP FUNCTION create_pod_tables;');
// }
