import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';

export const NakedSingle: Heuristic = {
  id: 'naked-single',
  displayName: 'Naked Single',
  difficulty: 'basic',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    for (const cell of grid.getAllCells()) {
      if (cell.value === null && cell.candidates.count() === 1) {
        const digit = cell.candidates.values()[0];
        return {
          heuristicId: 'naked-single',
          description: `R${cell.position.row + 1}C${cell.position.col + 1} has only one candidate: ${digit}`,
          placements: [{ cell: cell.position, digit }],
          eliminations: [],
          highlights: [{
            role: 'trigger', color: '#4CAF50',
            cells: [cell.position],
            candidates: [{ cell: cell.position, digit }],
          }],
          snapshotBefore: grid.snapshot(),
        };
      }
    }
    return null;
  },
};
