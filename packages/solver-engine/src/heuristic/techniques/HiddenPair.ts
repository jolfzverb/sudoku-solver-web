import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

export const HiddenPair: Heuristic = {
  id: 'hidden-pair',
  displayName: 'Hidden Pair',
  difficulty: 'intermediate',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    for (const region of grid.getRegions()) {
      const empty = region.cells
        .map(pos => ({ pos, cell: grid.getCell(pos) }))
        .filter(({ cell }) => cell.value === null);

      for (let d1 = 1; d1 <= grid.size; d1++) {
        for (let d2 = d1 + 1; d2 <= grid.size; d2++) {
          const with1: CellPosition[] = [];
          const with2: CellPosition[] = [];
          for (const { pos, cell } of empty) {
            if (cell.candidates.has(d1)) with1.push(pos);
            if (cell.candidates.has(d2)) with2.push(pos);
          }
          if (with1.length !== 2 || with2.length !== 2) continue;
          if (with1[0].row !== with2[0].row || with1[0].col !== with2[0].col) continue;
          if (with1[1].row !== with2[1].row || with1[1].col !== with2[1].col) continue;

          const elims: Elimination[] = [];
          for (const pos of with1) {
            const cell = grid.getCell(pos);
            for (const d of cell.candidates.values()) {
              if (d !== d1 && d !== d2) elims.push({ cell: pos, digit: d });
            }
          }
          if (elims.length > 0) {
            return {
              heuristicId: 'hidden-pair',
              description: `Hidden Pair {${d1},${d2}} in R${with1[0].row + 1}C${with1[0].col + 1}, R${with1[1].row + 1}C${with1[1].col + 1}`,
              placements: [], eliminations: elims,
              highlights: [
                { role: 'trigger', color: '#4CAF50', cells: [with1[0], with1[1]],
                  candidates: [{ cell: with1[0], digit: d1 }, { cell: with1[0], digit: d2 }, { cell: with1[1], digit: d1 }, { cell: with1[1], digit: d2 }] },
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
