import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { useDeleteFieldDefinition, useCreateFieldDefinition, useFieldDefinitions } from '../hooks/useFieldDefinitions';
import type { FieldValueType, FieldVisibility } from '@wongsorn-labs/atlas-lineage-shared';

interface FieldDefinitionsDialogProps {
  treeId: number | null;
  canEdit: boolean;
}

const VALUE_TYPES: FieldValueType[] = ['text', 'number', 'date', 'longtext'];

/** Group admins (tree owners) define the extra fields people in this group can have. */
export function FieldDefinitionsDialog({ treeId, canEdit }: FieldDefinitionsDialogProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: defs = [] } = useFieldDefinitions(treeId);
  const create = useCreateFieldDefinition(treeId);
  const remove = useDeleteFieldDefinition(treeId);
  const [label, setLabel] = useState('');
  const [category, setCategory] = useState('general');
  const [valueType, setValueType] = useState<FieldValueType>('text');
  const [visibility, setVisibility] = useState<FieldVisibility>('members');
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  const handleAdd = async () => {
    setError(null);
    if (!label.trim()) {
      setError(t('fields.labelRequired', 'กรอกชื่อฟิลด์'));
      return;
    }
    try {
      await create.mutateAsync({ label: label.trim(), category: category.trim() || 'general', valueType, visibility });
      setLabel('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="text-xs text-(--text-muted) underline underline-offset-2 hover:text-(--text-primary)">
        {t('fields.manage', 'ตั้งค่าฟิลด์ของกลุ่ม')}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('fields.title', 'ฟิลด์ของกลุ่ม')}</DialogTitle>
        </DialogHeader>

        <ul className="space-y-1 text-sm" data-testid="field-definition-list">
          {defs.length === 0 && <li className="text-(--text-muted)">{t('fields.empty', 'ยังไม่มีฟิลด์')}</li>}
          {defs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2 rounded border border-(--border) px-2 py-1">
              <span>
                {d.label} <span className="text-xs text-(--text-muted)">· {d.category} · {d.valueType}
                {d.visibility === 'restricted' ? ` · ${t('fields.restricted', 'จำกัดการเห็น')}` : ''}</span>
              </span>
              <button
                type="button"
                className="text-xs text-red-500"
                onClick={() => remove.mutate(d.id)}
              >
                {t('fields.delete', 'ลบ')}
              </button>
            </li>
          ))}
        </ul>

        <div className="space-y-2">
          <div>
            <Label htmlFor="field-label">{t('fields.label', 'ชื่อฟิลด์')}</Label>
            <Input id="field-label" data-testid="field-label-input" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="field-category">{t('fields.category', 'หมวด')}</Label>
            <Input id="field-category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="field-type">{t('fields.type', 'ประเภท')}</Label>
              <select id="field-type" className="h-8 w-full rounded-lg border border-(--border) bg-transparent px-2 text-sm"
                value={valueType} onChange={(e) => setValueType(e.target.value as FieldValueType)}>
                {VALUE_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="field-visibility">{t('fields.visibility', 'การมองเห็น')}</Label>
              <select id="field-visibility" className="h-8 w-full rounded-lg border border-(--border) bg-transparent px-2 text-sm"
                value={visibility} onChange={(e) => setVisibility(e.target.value as FieldVisibility)}>
                <option value="members">{t('fields.visibleToMembers', 'ทุกคนในกลุ่ม')}</option>
                <option value="restricted">{t('fields.visibleToEditors', 'เฉพาะผู้แก้ไข')}</option>
              </select>
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="button" onClick={handleAdd} disabled={create.isPending}>
            {t('fields.add', 'เพิ่มฟิลด์')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
