-- Insert default family tree (owner set later when first user claims it)
INSERT INTO family_trees (id, name, description, owner_id, created_at, updated_at)
VALUES (1, 'Family', 'Default family tree', NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Backfill all existing persons without a tree to tree_id=1
UPDATE persons SET tree_id = 1 WHERE tree_id IS NULL;
