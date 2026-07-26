import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { COUNTRY_MAP_DEFAULTS } from '../lib/countries';

export function SettingsDialog() {
  const { user, updateDefaultCountry } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = async (value: string | null) => {
    setIsSaving(true);
    try {
      await updateDefaultCountry(value === '__world' || value === null ? null : value);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<button type="button" className="btn-ghost p-1.5" aria-label="Settings" data-testid="settings-button" />}
      >
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="default-country">Default map country</Label>
          <Select
            value={user?.defaultCountry ?? '__world'}
            onValueChange={(value) => void handleChange(value)}
            disabled={isSaving}
          >
            <SelectTrigger id="default-country" data-testid="default-country-select">
              <SelectValue>
                {(value: string | null) =>
                  value === '__world' || !value
                    ? 'World'
                    : COUNTRY_MAP_DEFAULTS.find((c) => c.code === value)?.name ?? value}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__world">World</SelectItem>
              {COUNTRY_MAP_DEFAULTS.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-(--text-muted) mt-1">
            Map opens centered here whenever you sign in.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
