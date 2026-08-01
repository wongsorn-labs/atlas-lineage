import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut } from 'lucide-react';
import type { Person, Relationship } from '@wongsorn-labs/atlas-lineage-shared';
import { computeFamilyTreeLayout, CARD_WIDTH, CARD_HEIGHT, MERGED_CARD_WIDTH, type PersonNode } from '@/lib/familyTreeLayout';
import { getAvatarColors, getInitials } from '@/lib/avatarStyle';
import { toBuddhistYear } from '@/lib/formatPartialDate';

const MARGIN = 48;
const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.5;

interface FamilyChartProps {
  persons: Person[];
  relationships: Relationship[];
  selectedPerson: Person | null;
  onSelectPerson: (person: Person | null) => void;
}

function PersonMark({
  node, isSelected, onSelect, buddhistEra, offsetX = 0,
}: {
  node: PersonNode;
  isSelected: boolean;
  onSelect: () => void;
  buddhistEra: boolean;
  offsetX?: number;
}) {
  const { person } = node;
  const { bg, fg } = getAvatarColors(person.name);
  const years = [person.birthYear, person.deathYear]
    .filter((y) => y != null)
    .map((y) => (buddhistEra ? toBuddhistYear(y) : y))
    .join('–');

  return (
    <g
      transform={`translate(${offsetX}, 0)`}
      onClick={onSelect}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={person.name}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
      }}
    >
      {isSelected && (
        <rect
          x={-6}
          y={-6}
          width={CARD_WIDTH + 12}
          height={CARD_HEIGHT + 12}
          rx={12}
          className="fill-(--gold-muted) stroke-(--border-gold)"
          strokeWidth={1.5}
        />
      )}
      <circle cx={CARD_WIDTH / 2} cy={26} r={22} fill={bg} />
      <text
        x={CARD_WIDTH / 2}
        y={26}
        textAnchor="middle"
        dominantBaseline="central"
        fill={fg}
        fontSize={13}
        fontWeight={700}
      >
        {getInitials(person.name)}
      </text>
      <text
        x={CARD_WIDTH / 2}
        y={62}
        textAnchor="middle"
        className="fill-(--text-primary)"
        fontSize={12}
        fontWeight={600}
        fontFamily="var(--font-display)"
      >
        {person.name.length > 18 ? `${person.name.slice(0, 17)}…` : person.name}
      </text>
      {years && (
        <text
          x={CARD_WIDTH / 2}
          y={76}
          textAnchor="middle"
          className="fill-(--text-muted)"
          fontSize={10}
        >
          {years}
        </text>
      )}
      <title>{person.name}</title>
    </g>
  );
}

export function FamilyChart({ persons, relationships, selectedPerson, onSelectPerson }: FamilyChartProps) {
  const { t, i18n } = useTranslation();
  const buddhistEra = i18n.language === 'th';
  const [zoom, setZoom] = useState(1);
  const layout = useMemo(() => computeFamilyTreeLayout(persons, relationships), [persons, relationships]);

  if (persons.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-(--bg-base) text-center px-6">
        <p className="text-sm text-(--text-muted)">{t('chart.empty')}</p>
      </div>
    );
  }

  const svgWidth = layout.width + MARGIN * 2;
  const svgHeight = layout.height + MARGIN * 2;

  // Merged partners share one x — a "center" lookup that widens to the
  // fused card's true midpoint keeps parent/child drop-lines anchored
  // correctly, and a plain id set keeps them out of the single-card pass.
  const mergedPersonIds = new Set(layout.mergedPairs.flatMap((pair) => [pair.a.person.id, pair.b.person.id]));
  const singleNodes = layout.nodes.filter((n) => !mergedPersonIds.has(n.person.id));
  const mergedCenterXById = new Map<number, number>();
  for (const pair of layout.mergedPairs) {
    const cx = pair.a.x + MERGED_CARD_WIDTH / 2;
    mergedCenterXById.set(pair.a.person.id, cx);
    mergedCenterXById.set(pair.b.person.id, cx);
  }
  const centerX = (node: PersonNode) => mergedCenterXById.get(node.person.id) ?? node.x + CARD_WIDTH / 2;
  const SEAM_OFFSET = MERGED_CARD_WIDTH - CARD_WIDTH;

  return (
    <div className="relative h-full w-full bg-(--bg-base)">
      <div className="absolute bottom-3 right-3 z-(--z-dropdown) flex flex-col gap-1">
        <button
          type="button"
          className="glass-card p-2 disabled:opacity-40"
          onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          disabled={zoom >= MAX_ZOOM}
          aria-label={t('chart.zoomIn')}
        >
          <ZoomIn className="h-4 w-4 text-(--text-primary)" />
        </button>
        <button
          type="button"
          className="glass-card p-2 disabled:opacity-40"
          onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          disabled={zoom <= MIN_ZOOM}
          aria-label={t('chart.zoomOut')}
        >
          <ZoomOut className="h-4 w-4 text-(--text-primary)" />
        </button>
      </div>

      <div className="absolute inset-0 overflow-auto">
      <div style={{ width: svgWidth * zoom, height: svgHeight * zoom, padding: 24 }}>
        <svg
          width={svgWidth * zoom}
          height={svgHeight * zoom}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-label={t('chart.ariaLabel')}
        >
          <g transform={`translate(${MARGIN}, ${MARGIN})`}>
            {layout.parentGroupLinks.map((link, i) => {
              const parentXs = link.parents.map(centerX);
              const parentAnchorX = parentXs.reduce((a, b) => a + b, 0) / parentXs.length;
              const parentY = Math.max(...link.parents.map((p) => p.y)) + CARD_HEIGHT;
              const childY = Math.min(...link.children.map((c) => c.y));
              const busY = parentY + (childY - parentY) / 2;
              const childXs = link.children.map(centerX);
              const busMinX = Math.min(parentAnchorX, ...childXs);
              const busMaxX = Math.max(parentAnchorX, ...childXs);

              return (
                <g key={`parent-group-${i}`} className="stroke-(--border-gold)" fill="none" strokeWidth={1.5}>
                  <line x1={parentAnchorX} y1={parentY} x2={parentAnchorX} y2={busY} />
                  <line x1={busMinX} y1={busY} x2={busMaxX} y2={busY} />
                  {link.children.map((child) => (
                    <line
                      key={child.person.id}
                      x1={centerX(child)}
                      y1={busY}
                      x2={centerX(child)}
                      y2={child.y}
                    />
                  ))}
                </g>
              );
            })}

            {layout.partnerLinks.map((link, i) => {
              const y = link.a.y + CARD_HEIGHT / 2;
              const x1 = link.a.x + CARD_WIDTH;
              const x2 = link.b.x;
              const midX = (x1 + x2) / 2;
              return (
                <g key={`partner-${i}`}>
                  <line x1={x1} y1={y} x2={x2} y2={y} className="stroke-(--coral)" strokeWidth={1.5} />
                  <circle cx={midX} cy={y} r={4} className="fill-(--coral)" />
                </g>
              );
            })}

            {layout.mergedPairs.map((pair) => {
              const aSelected = selectedPerson?.id === pair.a.person.id;
              const bSelected = selectedPerson?.id === pair.b.person.id;
              return (
                <g key={`merged-${pair.a.person.id}-${pair.b.person.id}`} transform={`translate(${pair.a.x}, ${pair.a.y})`}>
                  <circle
                    cx={CARD_WIDTH + SEAM_OFFSET / 2}
                    cy={CARD_HEIGHT / 2}
                    r={4}
                    className="fill-(--coral)"
                  />
                  <PersonMark
                    node={pair.a}
                    isSelected={aSelected}
                    onSelect={() => onSelectPerson(aSelected ? null : pair.a.person)}
                    buddhistEra={buddhistEra}
                  />
                  <PersonMark
                    node={pair.b}
                    isSelected={bSelected}
                    onSelect={() => onSelectPerson(bSelected ? null : pair.b.person)}
                    buddhistEra={buddhistEra}
                    offsetX={SEAM_OFFSET}
                  />
                </g>
              );
            })}

            {singleNodes.map((node) => {
              const isSelected = selectedPerson?.id === node.person.id;
              return (
                <g key={node.person.id} transform={`translate(${node.x}, ${node.y})`}>
                  <PersonMark
                    node={node}
                    isSelected={isSelected}
                    onSelect={() => onSelectPerson(isSelected ? null : node.person)}
                    buddhistEra={buddhistEra}
                  />
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      </div>
    </div>
  );
}
