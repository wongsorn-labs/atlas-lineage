import { render, screen } from '@testing-library/react';
import { RelationshipLines } from './RelationshipLines';
import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';

vi.mock('react-leaflet', () => ({
  Polyline: ({ positions }: { positions: number[][] }) => (
    <div data-testid="relationship-line" data-positions={JSON.stringify(positions)} />
  ),
}));

const makePerson = (
  id: number,
  birthLat: number | null,
  birthLng: number | null,
): Person => ({
  id,
  name: `Person ${id}`,
  birthYear: null,
  deathYear: null,
  birthLat,
  birthLng,
  birthPlace: null,
  notes: null,
  createdAt: '',
  updatedAt: '',
});

const relationship: Relationship = {
  id: 1,
  personId: 1,
  relatedPersonId: 2,
  type: 'parent',
  createdAt: '',
};

describe('RelationshipLines', () => {
  it('renders a relationship line when either coordinate is zero', () => {
    render(
      <RelationshipLines
        persons={[makePerson(1, 0, 100), makePerson(2, 13, 0)]}
        relationships={[relationship]}
      />,
    );

    expect(screen.getByTestId('relationship-line')).toHaveAttribute(
      'data-positions',
      '[[0,100],[13,0]]',
    );
  });

  it('skips relationship lines when either endpoint is missing a coordinate', () => {
    render(
      <RelationshipLines
        persons={[makePerson(1, 0, null), makePerson(2, 13, 0)]}
        relationships={[relationship]}
      />,
    );

    expect(screen.queryByTestId('relationship-line')).not.toBeInTheDocument();
  });
});
