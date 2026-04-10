import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

export const PointingPair: Heuristic = {
  id: 'pointing-pair',
  displayName: 'Pointing Pair',
  difficulty: 'intermediate',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    const boxes = grid.getRegions().filter(r => r.type === 'box');
    const rows = grid.getRegions().filter(r => r.type === 'row');
    const cols = grid.getRegions().filter(r => r.type === 'column');

    for (const box of boxes) {
      for (let digit = 1; digit <= grid.size; digit++) {
        const cells: CellPosition[] = [];
        for (const pos of box.cells) {
          const c = grid.getCell(pos);
          if (c.value === null && c.candidates.has(digit)) cells.push(pos);
        }
        if (cells.length < 2) continue;

        // All same row?
        if (cells.every(p => p.row === cells[0].row)) {
          const row = rows.find(r => r.cells[0].row === cells[0].row);
          if (!row) continue;
          const elims: Elimination[] = [];
          for (const pos of row.cells) {
            if (cells.some(p => p.row === pos.row && p.col === pos.col)) continue;
            const c = grid.getCell(pos);
            if (c.value === null && c.candidates.has(digit)) elims.push({ cell: pos, digit });
          }
          if (elims.length > 0) {
            return {
              heuristicId: 'pointing-pair',
              description: `Pointing: ${digit} in ${box.id} confined to row ${cells[0].row + 1}`,
              placements: [], eliminations: elims,
              highlights: [
                { role: 'region', color: '#90CAF9', cells: [...box.cells] },
                { role: 'trigger', color: '#4CAF50', cells, candidates: cells.map(c => ({ cell: c, digit })) },
                { role: 'elimination', color: '#F44336', cells: elims.map(e => e.cell), candidates: elims },
              ],
              snapshotBefore: grid.snapshot(),
            };
          }
        }

        // All same col?
        if (cells.every(p => p.col === cells[0].col)) {
          const col = cols.find(r => r.cells[0].col === cells[0].col);
          if (!col) continue;
          const elims: Elimination[] = [];
          for (const pos of col.cells) {
            if (cells.some(p => p.row === pos.row && p.col === pos.col)) continue;
            const c = grid.getCell(pos);
            if (c.value === null && c.candidates.has(digit)) elims.push({ cell: pos, digit });
          }
          if (elims.length > 0) {
            return {
              heuristicId: 'pointing-pair',
              description: `Pointing: ${digit} in ${box.id} confined to col ${cells[0].col + 1}`,
              placements: [], eliminations: elims,
              highlights: [
                { role: 'region', color: '#90CAF9', cells: [...box.cells] },
                { role: 'trigger', color: '#4CAF50', cells, candidates: cells.map(c => ({ cell: c, digit })) },
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
