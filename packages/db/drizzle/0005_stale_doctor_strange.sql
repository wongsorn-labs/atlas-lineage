DO $$ BEGIN
 CREATE TYPE "public"."gender" AS ENUM('male', 'female', 'unspecified');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "persons" ADD COLUMN "gender" "gender";