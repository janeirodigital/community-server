/* eslint-disable space-before-function-paren */
// eslint-disable-next-line unicorn/filename-case
'use strict';

// eslint-disable-next-line no-var,no-implicit-globals
var dbm;
// eslint-disable-next-line no-var,no-implicit-globals
var type;
// eslint-disable-next-line no-var,no-implicit-globals
var seed;

/**
  * We receive the dbmigrate dependency from dbmigrate initially.
  * This enables us to not have to rely on NODE_PATH.
  */
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function(db) {
  db.runSql(`CREATE OR REPLACE FUNCTION create_pod_tables(pod_id bigint)
              RETURNS void
              LANGUAGE plpgsql
              AS $function$
                BEGIN
                        
                  EXECUTE format('
                    CREATE TABLE IF NOT EXISTS %I (
                      id BIGSERIAL PRIMARY KEY,
                      resource_id BIGINT NOT NULL,
                      relation VARCHAR(255) NOT NULL,
                      content TEXT NOT NULL,
                      created_at timestamptz NOT NULL,
                      updated_at timestamptz
                    )', 'auxiliary_resource_' || pod_id);

                  EXECUTE format('
                    CREATE TABLE IF NOT EXISTS %I (
                      id BIGSERIAL PRIMARY KEY,
                      name VARCHAR(1024) NOT NULL,
                      container boolean NOT NULL,
                      nonrdf boolean NOT NULL,
                      parent_resource_id BIGINT,
                      content TEXT,
                      content_type VARCHAR(255) NOT NULL,
                      created_at timestamptz NOT NULL,
                      updated_at timestamptz
                    )', 'resource_' || pod_id);

                  EXECUTE format('
                    CREATE TABLE IF NOT EXISTS %I (
                      id BIGSERIAL PRIMARY KEY,
                      resource_id bigint NOT NULL,
                      binary_content bytea NOT NULL,
                      content_type varchar(255) NOT NULL,
                      content_length bigint NOT NULL,
                      created_at timestamptz NOT NULL,
                      updated_at timestamptz
                    )', 'binary_resource_' || pod_id);

                  EXECUTE format('
                    ALTER TABLE auxiliary_resource_%s ADD CONSTRAINT fk_auxiliary_resource_resource_%s FOREIGN KEY
                      ("resource_id") REFERENCES resource_%s ("id") ON DELETE CASCADE;', pod_id, pod_id, pod_id);

                  EXECUTE format('
                    ALTER TABLE binary_resource_%s ADD CONSTRAINT fk_binary_resource_resource_%s FOREIGN KEY
                      ("resource_id") REFERENCES resource_%s ("id") ON DELETE CASCADE;', pod_id, pod_id, pod_id);

                END
              $function$;
              
              CREATE TABLE pod (
                id bigint NOT NULL,
                web_identity_id bigint NOT NULL,
                username character varying(255) NOT NULL,
                created_at timestamp with time zone NOT NULL,
                updated_at timestamp with time zone
              );

              CREATE SEQUENCE pod_id_seq
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;
                  
              CREATE TABLE web_identity (
                id bigint NOT NULL,
                identity_url character varying(1024) NOT NULL
              );
              
              CREATE SEQUENCE web_identity_id_seq
                START WITH 1
                INCREMENT BY 1
                NO MINVALUE
                NO MAXVALUE
                CACHE 1;
                
              ALTER TABLE ONLY pod ALTER COLUMN id SET DEFAULT nextval('pod_id_seq'::regclass);
              
              ALTER TABLE ONLY web_identity ALTER COLUMN id SET DEFAULT 
                nextval('web_identity_id_seq'::regclass);

              ALTER TABLE ONLY pod ADD CONSTRAINT pod_pkey PRIMARY KEY (id);
              
              ALTER TABLE ONLY pod ADD CONSTRAINT pod_username_key UNIQUE (username);
              
              ALTER TABLE ONLY web_identity ADD CONSTRAINT web_identity_identity_url_key UNIQUE (identity_url);
              
              ALTER TABLE ONLY web_identity ADD CONSTRAINT web_identity_pkey PRIMARY KEY (id);
              
              ALTER TABLE ONLY pod ADD CONSTRAINT fk_pod_web_identity_1 FOREIGN KEY (web_identity_id) 
                REFERENCES web_identity(id);   
                
              INSERT INTO web_identity (identity_url) VALUES ('root');
              
              INSERT INTO pod (web_identity_id, username, created_at) VALUES 
                ((SELECT id FROM web_identity where identity_url = 'root'), 'root', now());
                
              SELECT create_pod_tables((SELECT id FROM pod WHERE username = 'root'));
              `);
  return null;
};

exports.down = function(db) {
  return null;
};

exports._meta = {
  version: 1,
};
