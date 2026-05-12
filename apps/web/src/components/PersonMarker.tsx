import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

const selectedIcon = new L.Icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  popupAnchor: [0, -48],
  shadowSize: [48, 48],
});

interface PersonMarkerProps {
  person: Person;
  isSelected: boolean;
  onSelect: (p: Person) => void;
}

export function PersonMarker({ person, isSelected, onSelect }: PersonMarkerProps) {
  return (
    <Marker
      position={[person.birthLat!, person.birthLng!]}
      icon={isSelected ? selectedIcon : undefined}
      eventHandlers={{ click: () => onSelect(person) }}
    >
      <Popup>
        <strong>{person.name}</strong>
        {person.birthYear && <div>b. {person.birthYear}</div>}
        {person.birthPlace && <div>{person.birthPlace}</div>}
      </Popup>
    </Marker>
  );
}
