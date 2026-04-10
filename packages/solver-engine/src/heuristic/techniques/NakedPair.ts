import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { Elimination } from '../../constraint/types';

export const NakedPair: Heuristic = {
  id: 'naked-pair',
  displayName: 'Naked Pair',
  difficulty: 'intermediate',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    for (const region of grid.getRegions()) {
      const empty = region.cells
        .map(pos => ({ pos, cell: grid.getCell(pos) }))
        .filter(({ cell }) => cell.value === null);

      for (let i = 0; i < empty.length; i++) {
        if (empty[i].cell.candidates.count() !== 2) continue;
        for (let j = i + 1; j < empty.length; j++) {
          if (!empty[i].cell.candidates.equals(empty[j].cell.candidates)) continue;
          const digits = empty[i].cell.candidates.values();
          const elims: Elimination[] = [];
          for (const { pos, cell } of empty) {
            if (pos === empty[i].pos || pos === empty[j].pos) continue;
            for (const d of digits) {
              if (cell.candidates.has(d)) elims.push({ cell: pos, digit: d });
            }
          }
          if (elims.length > 0) {
            return {
              heuristicId: 'naked-pair',
              description: `Naked Pair {${digits.join(',')}} in R${empty[i].pos.row + 1}C${empty[i].pos.col + 1}, R${empty[j].pos.row + 1}C${empty[j].pos.col + 1}`,
              placements: [], eliminations: elims,
              highlights: [
                { role: 'trigger', color: '#4CAF50', cells: [empty[i].pos, empty[j].pos],
                  candidates: digits.flatMap(d => [{ cell: empty[i].pos, digit: d }, { cell: empty[j].pos, digit: d }]) },
                { role: 'elimination', color: '#F44336', cells: elims.map(e => e.cell), candidates: elims },
              ],
              snapshotBefore: grid.snapshot(),
            };
          }
        }
      }
    }
    return null;
  },
};
