DO $$ BEGIN
 CREATE TYPE "public"."field_value_type" AS ENUM('text', 'number', 'date', 'longtext');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."field_visibility" AS ENUM('members', 'restricted');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "field_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"tree_id" integer NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"value_type" "field_value_type" DEFAULT 'text' NOT NULL,
	"visibility" "field_visibility" DEFAULT 'members' NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "nickname" text;--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "attributes" text;--> statement-breakpoint
ALTER TABLE "relationships" ADD COLUMN "side" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_tree_id_family_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."family_trees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_definitions" ADD CONSTRAINT "field_definitions_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_definitions_tree_key_uidx" ON "field_definitions" USING btree ("tree_id","key");