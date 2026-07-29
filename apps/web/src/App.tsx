import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Map as MapIcon, Menu, Network } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FamilyChart } from './components/FamilyChart';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { usePersons } from './hooks/usePersons';
import { useRelationships } from './hooks/useRelationships';
import { useAuth } from './contexts/AuthContext';
import { useTree } from './contexts/TreeContext';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

export default function App() {
  const { user, isLoading: authLoading } = useAuth();
  const { currentTreeId, isLoading: treesLoading } = useTree();
  const personsQuery = usePersons(currentTreeId);
  const relationshipsQuery = useRelationships(currentTreeId);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'chart'>('map');
  const { t } = useTranslation();

  const persons = personsQuery.data ?? [];
  const relationships = relationshipsQuery.data ?? [];
  const isLoading = personsQuery.isLoading || relationshipsQuery.isLoading;
  const hasError = personsQuery.isError || relationshipsQuery.isError;

  useEffect(() => {
    if (!selectedPerson) return;
    const nextSelected = persons.find((person) => person.id === selectedPerson.id) ?? null;
    if (nextSelected !== selectedPerson) setSelectedPerson(nextSelected);
  }, [persons, selectedPerson]);

  if (window.location.pathname === '/auth/callback') {
    return <AuthCallbackPage />;
  }

  if (authLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-(--bg-base) text-(--text-muted)">
        <div className="flex items-center gap-2 text-sm" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (!user) return <LoginPage />;

  if (treesLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-(--bg-base) text-(--text-muted)">
        <div className="flex items-center gap-2 text-sm" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('app.loading')}
        </div>
      </div>
    );
  }

  if (currentTreeId == null) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-(--bg-base) px-6">
        <div className="glass-card flex max-w-sm flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-(--color-error)" />
          <h1 className="font-display text-lg font-semibold text-(--text-primary)">{t('tree.noTreeTitle')}</h1>
          <p className="text-sm text-(--text-secondary)">{t('tree.noTreeBody')}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-(--bg-base) text-(--text-muted)">
        <div className="flex items-center gap-2 text-sm" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('app.loading')}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-dvh w-screen items-center justify-center bg-(--bg-base) px-6">
        <div className="glass-card flex max-w-sm flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-(--color-error)" />
          <h1 className="font-display text-lg font-semibold text-(--text-primary)">{t('app.errorTitle')}</h1>
          <p className="text-sm text-(--text-secondary)">{t('app.errorBody')}</p>
          <div className="flex gap-2">
            {personsQuery.isError && (
              <button type="button" className="btn-primary" onClick={() => void personsQuery.refetch()}>
                {t('app.retryPeople')}
              </button>
            )}
            {relationshipsQuery.isError && (
              <button type="button" className="btn-secondary" onClick={() => void relationshipsQuery.refetch()}>
                {t('app.retryRelationships')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-(--bg-base)">
      <Sidebar
        persons={persons}
        selectedPerson={selectedPerson}
        onSelectPerson={setSelectedPerson}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-(--z-overlay) bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <main className="flex-1 relative">
        <button
          type="button"
          className="absolute top-3 right-3 z-(--z-dropdown) glass-card p-2 md:hidden"
          onClick={() => setSidebarOpen(true)}
          aria-label={t('sidebar.openMenu')}
        >
          <Menu className="h-5 w-5 text-(--text-primary)" />
        </button>

        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-(--z-dropdown) glass-card flex items-center gap-1 p-1">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'map' ? 'bg-(--gold) text-(--text-primary)' : 'text-(--text-muted) hover:text-(--text-primary)'
            }`}
            aria-pressed={viewMode === 'map'}
          >
            <MapIcon className="h-3.5 w-3.5" />
            {t('chart.mapView')}
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'chart' ? 'bg-(--gold) text-(--text-primary)' : 'text-(--text-muted) hover:text-(--text-primary)'
            }`}
            aria-pressed={viewMode === 'chart'}
          >
            <Network className="h-3.5 w-3.5" />
            {t('chart.chartView')}
          </button>
        </div>

        {viewMode === 'map' ? (
          <MapView
            persons={persons}
            relationships={relationships}
            selectedPerson={selectedPerson}
            onSelectPerson={setSelectedPerson}
          />
        ) : (
          <FamilyChart
            persons={persons}
            relationships={relationships}
            selectedPerson={selectedPerson}
            onSelectPerson={setSelectedPerson}
          />
        )}
      </main>
    </div>
  );
}
