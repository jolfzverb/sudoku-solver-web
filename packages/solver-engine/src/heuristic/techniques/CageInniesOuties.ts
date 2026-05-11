import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { getVirtualCages } from '../VirtualCageRegistry';

/**
 * Cage Innies/Outies (45-rule generalisation).
 *
 * Sees virtual sum constraints built by `VirtualCageRegistry` and applies
 * each one's `getDirectEliminations` to the current grid state. The
 * registry handles the expensive geometry analysis once and caches the
 * result for the lifetime of the `ConstraintSet`; this heuristic just walks
 * the cached list every iteration.
 *
 * Other cage heuristics opt into the same virtuals (filtered by
 * `isPureKillerCage()`) for their own deductions — see e.g.
 * `CageLockedCandidates`.
 */

export const CageInniesOuties: Heuristic = {
  id: 'cage-innies-outies',
  displayName: 'Cage Innies/Outies',
  difficulty: 'advanced',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const virtuals = getVirtualCages(grid, constraints);

    for (const v of virtuals) {
      const raw = v.getDirectEliminations(grid);
      if (raw.length === 0) continue;
      const actual = raw.filter(e => {
        const cell = grid.getCell(e.cell);
        return cell.value === null && cell.candidates.has(e.digit);
      });
      if (actual.length === 0) continue;

      return {
        heuristicId: 'cage-innies-outies',
        description: `Innies/Outies: ${v.source}`,
        placements: [],
        eliminations: actual,
        highlights: [
          { role: 'trigger', color: '#4CAF50', cells: [...v.affectedCells] },
          {
            role: 'elimination', color: '#F44336',
            cells: actual.map(e => e.cell), candidates: actual,
          },
        ],
        snapshotBefore: grid.snapshot(),
      };
    }

    return null;
  },
};
