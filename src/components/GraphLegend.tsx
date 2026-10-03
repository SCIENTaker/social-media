import { CATEGORY_COLORS, CATEGORY_LABELS } from '../lib/labels';
import type { RelationCategory } from '../lib/types';

export function GraphLegend() {
  return (
    <div className="legend">
      {(['collab', 'project', 'creation', 'declared'] as RelationCategory[]).map((c) => (
        <span key={c} className="legend-item">
          <svg width="28" height="10" aria-hidden>
            <line
              x1="0"
              y1="5"
              x2="28"
              y2="5"
              stroke={CATEGORY_COLORS[c]}
              strokeWidth={c === 'collab' || c === 'project' ? 4 : 2}
              strokeDasharray={c === 'creation' ? '5 3' : undefined}
            />
          </svg>
          {CATEGORY_LABELS[c]}
        </span>
      ))}
      <span className="legend-item">
        <span className="legend-frame" />
        {CATEGORY_LABELS.affiliation}(枠)
      </span>
      <span className="legend-item muted">線の太さ = 期間内の回数</span>
    </div>
  );
}
