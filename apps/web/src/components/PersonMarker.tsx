import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Person } from '@wongsorn-labs/atlas-lineage-shared';

const goldIcon = L.divIcon({
  className: 'atlas-marker',
  html: '<div class="atlas-marker-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  popupAnchor: [0, -12],
});

const goldIconSelected = L.divIcon({
  className: 'atlas-marker atlas-marker--selected',
  html: '<div class="atlas-marker-dot"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -14],
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
      icon={isSelected ? goldIconSelected : goldIcon}
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
