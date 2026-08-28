import { MapContainer, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PersonMarker } from './PersonMarker';
import { RelationshipLines } from './RelationshipLines';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { getCountryMapDefault } from '../lib/countries';
import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';

// CARTO now requires a (free) API key for its basemap tiles -- see
// https://carto.com/basemaps/apikey. Tiles fall back to CARTO's
// unauthenticated "API KEY REQUIRED" watermark when this is unset.
const cartoApiKey = import.meta.env.VITE_CARTO_API_KEY as string | undefined;

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
  const { theme } = useTheme();
  const { user } = useAuth();
  const tileStyle = theme === 'dark' ? 'dark_all' : 'light_all';
  const mapDefault = getCountryMapDefault(user?.defaultCountry);

  return (
    <MapContainer
      key={mapDefault.code}
      center={mapDefault.center}
      zoom={mapDefault.zoom}
      className="isolate h-full w-full"
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        key={tileStyle}
        url={`https://{s}.basemaps.cartocdn.com/${tileStyle}/{z}/{x}/{y}{r}.png${cartoApiKey ? `?key=${cartoApiKey}` : ''}`}
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
