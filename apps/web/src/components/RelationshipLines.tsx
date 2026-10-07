import { Polyline } from 'react-leaflet';
import type { Person, Relationship, RelationshipType } from '@wongsorn-labs/atlas-lineage-shared';

const COLORS: Record<RelationshipType, string> = {
  parent: '#4E9432',
  child: '#9F6532',
  sibling: '#B98A00',
  spouse: '#196632',
  partner: '#2E2821',
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
        if (
          a?.birthLat == null ||
          a.birthLng == null ||
          b?.birthLat == null ||
          b.birthLng == null
        ) {
          return null;
        }
        return (
          <Polyline
            key={rel.id}
            positions={[
              [a.birthLat, a.birthLng],
              [b.birthLat, b.birthLng],
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
