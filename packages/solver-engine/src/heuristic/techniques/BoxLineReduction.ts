import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

export const BoxLineReduction: Heuristic = {
  id: 'box-line-reduction',
  displayName: 'Box/Line Reduction',
  difficulty: 'intermediate',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    const lines = grid.getRegions().filter(r => r.type === 'row' || r.type === 'column');

    for (const line of lines) {
      for (let digit = 1; digit <= grid.size; digit++) {
        const cells: CellPosition[] = [];
        for (const pos of line.cells) {
          const c = grid.getCell(pos);
          if (c.value === null && c.candidates.has(digit)) cells.push(pos);
        }
        if (cells.length < 2) continue;

        const firstBoxes = grid.getRegionsFor(cells[0]).filter(r => r.type === 'box');
        if (firstBoxes.length === 0) continue;
        const box = firstBoxes[0];
        if (!cells.every(pos => grid.getRegionsFor(pos).some(r => r.id === box.id))) continue;

        const elims: Elimination[] = [];
        for (const pos of box.cells) {
          if (cells.some(p => p.row === pos.row && p.col === pos.col)) continue;
          const c = grid.getCell(pos);
          if (c.value === null && c.candidates.has(digit)) elims.push({ cell: pos, digit });
        }
        if (elims.length > 0) {
          return {
            heuristicId: 'box-line-reduction',
            description: `Box/Line: ${digit} in ${line.id} confined to ${box.id}`,
            placements: [], eliminations: elims,
            highlights: [
              { role: 'region', color: '#90CAF9', cells: [...line.cells] },
              { role: 'trigger', color: '#4CAF50', cells, candidates: cells.map(c => ({ cell: c, digit })) },
              { role: 'elimination', color: '#F44336', cells: elims.map(e => e.cell), candidates: elims },
            ],
            snapshotBefore: grid.snapshot(),
          };
        }
      }
    }
    return null;
  },
};
