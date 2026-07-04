BEGIN;

-- Backfill any persons left without a tree assignment to the default tree
UPDATE persons SET tree_id = 1 WHERE tree_id IS NULL;

ALTER TABLE "persons" ALTER COLUMN "tree_id" SET NOT NULL;

-- Add tree_id to relationships, backfilled from the tree of the linked person
ALTER TABLE "relationships" ADD COLUMN "tree_id" integer;

UPDATE relationships r
SET tree_id = p.tree_id
FROM persons p
WHERE p.id = r.person_id;

ALTER TABLE "relationships" ALTER COLUMN "tree_id" SET NOT NULL;

DO $$ BEGIN
 ALTER TABLE "relationships" ADD CONSTRAINT "relationships_tree_id_family_trees_id_fk" FOREIGN KEY ("tree_id") REFERENCES "public"."family_trees"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

COMMIT;
