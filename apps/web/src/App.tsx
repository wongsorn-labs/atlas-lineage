import { useState } from 'react';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { usePersons } from './hooks/usePersons';
import { useRelationships } from './hooks/useRelationships';
import type { Person } from '@atlas/shared';

export default function App() {
  const { data: persons = [] } = usePersons();
  const { data: relationships = [] } = useRelationships();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

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
