BEGIN;
CREATE SCHEMA IF NOT EXISTS boxing_center;
REVOKE ALL ON SCHEMA boxing_center FROM PUBLIC;
CREATE TABLE IF NOT EXISTS boxing_center.migrations(version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS boxing_center.state(id integer PRIMARY KEY CHECK(id=1),payload text NOT NULL,revision integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS boxing_center.users(id text PRIMARY KEY,email text NOT NULL UNIQUE CHECK(email=lower(email)),profile text NOT NULL,password text NOT NULL,role text NOT NULL CHECK(role IN ('coach','admin')),active integer NOT NULL DEFAULT 1 CHECK(active IN (0,1)));
CREATE TABLE IF NOT EXISTS boxing_center.sessions(token_hash text PRIMARY KEY,user_id text REFERENCES boxing_center.users(id),csrf text NOT NULL,expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS boxing_center.resets(token_hash text PRIMARY KEY,user_id text NOT NULL REFERENCES boxing_center.users(id),expires bigint NOT NULL);
CREATE TABLE IF NOT EXISTS boxing_center.assignments(course_id text PRIMARY KEY,coach_id text NOT NULL REFERENCES boxing_center.users(id),status text NOT NULL CHECK(status IN ('reserved','validated')));
CREATE TABLE IF NOT EXISTS boxing_center.declarations(id text PRIMARY KEY,coach_id text NOT NULL REFERENCES boxing_center.users(id),period text NOT NULL,UNIQUE(coach_id,period));
CREATE TABLE IF NOT EXISTS boxing_center.audit(rowid bigint GENERATED ALWAYS AS IDENTITY UNIQUE,id text PRIMARY KEY,payload text NOT NULL);
CREATE OR REPLACE FUNCTION boxing_center.protect_audit() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'Journal immuable'; END $$;
DROP TRIGGER IF EXISTS audit_immutable ON boxing_center.audit;
CREATE TRIGGER audit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON boxing_center.audit FOR EACH STATEMENT EXECUTE FUNCTION boxing_center.protect_audit();
CREATE TABLE IF NOT EXISTS boxing_center.outbox(rowid bigint GENERATED ALWAYS AS IDENTITY UNIQUE,id text PRIMARY KEY,decl_id text,owner_id text REFERENCES boxing_center.users(id),recipient text NOT NULL,payload text NOT NULL,status text NOT NULL DEFAULT 'pending',attempts integer NOT NULL DEFAULT 0,next_at bigint NOT NULL DEFAULT 0,message_id text,last_error text,expires bigint,sending_at bigint);
CREATE TABLE IF NOT EXISTS boxing_center.limits(key text PRIMARY KEY,count integer NOT NULL,expires bigint NOT NULL);
CREATE INDEX IF NOT EXISTS bc_session_expiry ON boxing_center.sessions(expires);
CREATE INDEX IF NOT EXISTS bc_reset_expiry ON boxing_center.resets(expires);
CREATE INDEX IF NOT EXISTS bc_outbox_due ON boxing_center.outbox(status,next_at,rowid);
CREATE INDEX IF NOT EXISTS bc_limit_expiry ON boxing_center.limits(expires);
-- No browser/Data API grants. Access goes through the authenticated server API.
DO $$ DECLARE item text; role_name text; BEGIN
  FOREACH item IN ARRAY ARRAY['migrations','state','users','sessions','resets','assignments','declarations','audit','outbox','limits'] LOOP
    EXECUTE format('ALTER TABLE boxing_center.%I ENABLE ROW LEVEL SECURITY',item);
    EXECUTE format('REVOKE ALL ON boxing_center.%I FROM PUBLIC',item);
  END LOOP;
  FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
    IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
      EXECUTE format('REVOKE ALL ON SCHEMA boxing_center FROM %I',role_name);
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA boxing_center FROM %I',role_name);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA boxing_center FROM %I',role_name);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA boxing_center FROM %I',role_name);
    END IF;
  END LOOP;
END $$;
INSERT INTO boxing_center.migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
COMMIT;
