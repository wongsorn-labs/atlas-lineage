import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PersonMarker } from './PersonMarker';
import { RelationshipLines } from './RelationshipLines';
import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';

// Fix Leaflet default marker icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
});

interface MapViewProps {
  persons: Person[];
  relationships: Relationship[];
  selectedPerson: Person | null;
  onSelectPerson: (p: Person | null) => void;
}

export function MapView({ persons, relationships, selectedPerson, onSelectPerson }: MapViewProps) {
  const mappable = persons.filter((p) => p.birthLat != null && p.birthLng != null);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className="h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <RelationshipLines persons={mappable} relationships={relationships} />
      {mappable.map((person) => (
        <PersonMarker
          key={person.id}
          person={person}
          isSelected={selectedPerson?.id === person.id}
          onSelect={onSelectPerson}
        />
      ))}
    </MapContainer>
  );
}
