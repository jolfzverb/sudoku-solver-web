import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';

export const ConstraintElimination: Heuristic = {
  id: 'constraint-elimination',
  displayName: 'Constraint Elimination',
  difficulty: 'basic',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const all = constraints.getAllDirectEliminations(grid);
    const actual = all.filter(e => {
      const cell = grid.getCell(e.cell);
      return cell.value === null && cell.candidates.has(e.digit);
    });
    if (actual.length === 0) return null;
    return {
      heuristicId: 'constraint-elimination',
      description: `Eliminating ${actual.length} candidate(s) from constraints`,
      placements: [],
      eliminations: actual,
      highlights: [{
        role: 'elimination', color: '#F44336',
        cells: actual.map(e => e.cell),
        candidates: actual,
      }],
      snapshotBefore: grid.snapshot(),
    };
  },
};
