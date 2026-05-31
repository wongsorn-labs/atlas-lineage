import { useEffect, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { usePersons } from './hooks/usePersons';
import { useRelationships } from './hooks/useRelationships';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

export default function App() {
  const personsQuery = usePersons();
  const relationshipsQuery = useRelationships();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const { t } = useTranslation();

  const persons = personsQuery.data ?? [];
  const relationships = relationshipsQuery.data ?? [];
  const isLoading = personsQuery.isLoading || relationshipsQuery.isLoading;
  const hasError = personsQuery.isError || relationshipsQuery.isError;

  useEffect(() => {
    if (!selectedPerson) return;
    const nextSelected = persons.find((person) => person.id === selectedPerson.id) ?? null;
    if (nextSelected !== selectedPerson) {
      setSelectedPerson(nextSelected);
    }
  }, [persons, selectedPerson]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="flex items-center gap-2 text-sm" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('app.loading')}
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 px-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <h1 className="text-base font-semibold text-slate-900">{t('app.errorTitle')}</h1>
          <p className="text-sm text-slate-600">{t('app.errorBody')}</p>
          <div className="flex gap-2">
            {personsQuery.isError && (
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                onClick={() => void personsQuery.refetch()}
              >
                {t('app.retryPeople')}
              </button>
            )}
            {relationshipsQuery.isError && (
              <button
                type="button"
                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                onClick={() => void relationshipsQuery.refetch()}
              >
                {t('app.retryRelationships')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        persons={persons}
        selectedPerson={selectedPerson}
        onSelectPerson={setSelectedPerson}
      />
      <main className="flex-1 relative">
        <MapView
          persons={persons}
          relationships={relationships}
          selectedPerson={selectedPerson}
          onSelectPerson={setSelectedPerson}
        />
      </main>
    </div>
  );
}
