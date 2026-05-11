import { Polyline } from 'react-leaflet';
import type { Person, Relationship, RelationshipType } from '@atlas/shared';

const COLORS: Record<RelationshipType, string> = {
  parent: '#16a34a',
  child: '#2563eb',
  sibling: '#ca8a04',
  spouse: '#db2777',
  partner: '#9333ea',
};

interface RelationshipLinesProps {
  persons: Person[];
  relationships: Relationship[];
}

export function RelationshipLines({ persons, relationships }: RelationshipLinesProps) {
  const index = new Map(persons.map((p) => [p.id, p]));

  return (
    <>
      {relationships.map((rel) => {
        const a = index.get(rel.personId);
        const b = index.get(rel.relatedPersonId);
        if (!a?.birthLat || !b?.birthLat) return null;
        return (
          <Polyline
            key={rel.id}
            positions={[
              [a.birthLat, a.birthLng!],
              [b.birthLat, b.birthLng!],
            ]}
            color={COLORS[rel.type]}
            weight={2}
            opacity={0.75}
          />
        );
      })}
    </>
  );
}
