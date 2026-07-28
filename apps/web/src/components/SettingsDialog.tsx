import { useState } from 'react';
import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { COUNTRY_MAP_DEFAULTS } from '../lib/countries';

export function SettingsDialog() {
  const { t, i18n } = useTranslation();
  const { user, updateDefaultCountry } = useAuth();
  const { theme, setTheme } = useTheme();
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
        render={<button type="button" className="btn-ghost p-1.5" aria-label={t('settings.settingsAria')} data-testid="settings-button" />}
      >
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{t('settings.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="default-country">{t('settings.defaultCountry')}</Label>
            <Select
              value={user?.defaultCountry ?? '__world'}
              onValueChange={(value) => void handleChange(value)}
              disabled={isSaving}
            >
              <SelectTrigger id="default-country" data-testid="default-country-select">
                <SelectValue>
                  {(value: string | null) =>
                    value === '__world' || !value
                      ? t('settings.world')
                      : COUNTRY_MAP_DEFAULTS.find((c) => c.code === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__world">{t('settings.world')}</SelectItem>
                {COUNTRY_MAP_DEFAULTS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--text-muted) mt-1">{t('settings.defaultCountryHelp')}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="language">{t('settings.language')}</Label>
            <Select
              value={i18n.language}
              onValueChange={(value) => value && void i18n.changeLanguage(value)}
            >
              <SelectTrigger id="language" data-testid="language-select">
                <SelectValue>
                  {(value: string | null) =>
                    value === 'th' ? t('settings.languageThai') : t('settings.languageEnglish')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t('settings.languageEnglish')}</SelectItem>
                <SelectItem value="th">{t('settings.languageThai')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-(--text-muted) mt-1">{t('settings.languageHelp')}</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="theme">{t('settings.theme')}</Label>
            <Select
              value={theme}
              onValueChange={(value) => value && setTheme(value === 'dark' ? 'dark' : 'light')}
            >
              <SelectTrigger id="theme" data-testid="theme-select">
                <SelectValue>
                  {(value: string | null) =>
                    value === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('settings.themeLight')}</SelectItem>
                <SelectItem value="dark">{t('settings.themeDark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
