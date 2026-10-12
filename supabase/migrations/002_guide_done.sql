BEGIN;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='boxing_center' AND table_name='users' AND column_name='guide_done') THEN
    ALTER TABLE boxing_center.users ADD COLUMN guide_done integer NOT NULL DEFAULT 0 CHECK(guide_done IN (0,1));
  END IF;
END $$;
INSERT INTO boxing_center.migrations(version) VALUES(2) ON CONFLICT DO NOTHING;
COMMIT;
