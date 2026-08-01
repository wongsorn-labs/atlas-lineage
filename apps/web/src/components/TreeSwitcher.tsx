import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useTree } from '../contexts/TreeContext';
import { CreateTreeDialog } from './CreateTreeDialog';
import { EditTreeDialog } from './EditTreeDialog';
import { InviteMemberDialog } from './InviteMemberDialog';
import { TrashDialog } from './TrashDialog';
import { LinkPersonDialog } from './LinkPersonDialog';

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
          <SelectValue placeholder={t('tree.selectLabel')}>
            {(value: string | null) => trees.find((tree) => String(tree.id) === value)?.name ?? t('tree.selectLabel')}
          </SelectValue>
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
      {currentTree && <EditTreeDialog tree={currentTree} />}
      {currentTree && <InviteMemberDialog tree={currentTree} />}
      {currentTree && <LinkPersonDialog tree={currentTree} />}
      <TrashDialog />
    </div>
  );
}
