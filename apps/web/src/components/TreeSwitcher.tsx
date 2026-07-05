import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useTree } from '../contexts/TreeContext';
import { CreateTreeDialog } from './CreateTreeDialog';
import { InviteMemberDialog } from './InviteMemberDialog';

export function TreeSwitcher() {
  const { t } = useTranslation();
  const { trees, currentTree, currentTreeId, setCurrentTreeId } = useTree();

  return (
    <div className="flex items-center gap-1.5">
      <Select
        value={currentTreeId != null ? String(currentTreeId) : undefined}
        onValueChange={(value) => setCurrentTreeId(Number(value))}
      >
        <SelectTrigger data-testid="tree-select" aria-label={t('tree.selectLabel')} className="h-8 text-xs">
          <SelectValue placeholder={t('tree.selectLabel')} />
        </SelectTrigger>
        <SelectContent>
          {trees.map((tree) => (
            <SelectItem key={tree.id} value={String(tree.id)}>
              {tree.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <CreateTreeDialog />
      {currentTree && <InviteMemberDialog tree={currentTree} />}
    </div>
  );
}
