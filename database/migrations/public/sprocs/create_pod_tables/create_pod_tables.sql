CREATE OR REPLACE FUNCTION create_pod_tables(pod_id bigint)
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
                      content_type VARCHAR(255) NOT NULL,
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
