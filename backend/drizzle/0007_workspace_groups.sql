CREATE TABLE IF NOT EXISTS "workspace_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "name" varchar(256) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_groups" ADD CONSTRAINT "workspace_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_groups_user_name_idx" ON "workspace_groups" ("user_id", "name");
--> statement-breakpoint
INSERT INTO "workspace_groups" ("user_id", "name")
SELECT DISTINCT "user_id", "group_name"
FROM "workspaces"
WHERE "group_name" IS NOT NULL
ON CONFLICT DO NOTHING;
