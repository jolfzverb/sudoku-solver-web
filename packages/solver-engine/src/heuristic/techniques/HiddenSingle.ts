import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { formatRegion } from '../utils';

export const HiddenSingle: Heuristic = {
  id: 'hidden-single',
  displayName: 'Hidden Single',
  difficulty: 'basic',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    for (const region of grid.getRegions()) {
      for (let digit = 1; digit <= grid.size; digit++) {
        const possibleCells: CellPosition[] = [];
        let alreadyPlaced = false;
        for (const pos of region.cells) {
          const cell = grid.getCell(pos);
          if (cell.value === digit) { alreadyPlaced = true; break; }
          if (cell.value === null && cell.candidates.has(digit)) possibleCells.push(pos);
        }
        if (alreadyPlaced || possibleCells.length !== 1) continue;
        const target = possibleCells[0];
        return {
          heuristicId: 'hidden-single',
          description: `${digit} can only go in R${target.row + 1}C${target.col + 1} in ${formatRegion(region.id)}`,
          placements: [{ cell: target, digit }],
          eliminations: [],
          highlights: [
            { role: 'region', color: '#90CAF9', cells: [...region.cells] },
            { role: 'trigger', color: '#4CAF50', cells: [target], candidates: [{ cell: target, digit }] },
          ],
          snapshotBefore: grid.snapshot(),
        };
      }
    }
    return null;
  },
};
