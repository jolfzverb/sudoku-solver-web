import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';

export const Backtracking: Heuristic = {
  id: 'backtracking',
  displayName: 'Backtracking',
  difficulty: 'brute-force',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    let best = null as null | { row: number; col: number; count: number };
    for (const cell of grid.getAllCells()) {
      if (cell.value === null) {
        const count = cell.candidates.count();
        if (count === 0) return null;
        if (!best || count < best.count) {
          best = { row: cell.position.row, col: cell.position.col, count };
        }
      }
    }
    if (!best) return null;
    const cell = grid.getCell({ row: best.row, col: best.col });
    const digit = cell.candidates.values()[0];
    return {
      heuristicId: 'backtracking',
      description: `Guessing ${digit} in R${best.row + 1}C${best.col + 1} (${best.count} candidates)`,
      placements: [{ cell: cell.position, digit }],
      eliminations: [],
      highlights: [{ role: 'target', color: '#FFD700', cells: [cell.position], candidates: [{ cell: cell.position, digit }] }],
      snapshotBefore: grid.snapshot(),
    };
  },
};
