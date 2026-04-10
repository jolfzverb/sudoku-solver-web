import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

export const HiddenTriple: Heuristic = {
  id: 'hidden-triple',
  displayName: 'Hidden Triple',
  difficulty: 'intermediate',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    for (const region of grid.getRegions()) {
      const empty = region.cells
        .map(pos => ({ pos, cell: grid.getCell(pos) }))
        .filter(({ cell }) => cell.value === null);

      if (empty.length < 3) continue;

      // For each digit, collect the cells that contain it as a candidate
      const digitCells = new Map<number, CellPosition[]>();
      for (let d = 1; d <= grid.size; d++) {
        const cells: CellPosition[] = [];
        for (const { pos, cell } of empty) {
          if (cell.candidates.has(d)) cells.push(pos);
        }
        // Only consider digits appearing in 2 or 3 cells
        if (cells.length >= 2 && cells.length <= 3) {
          digitCells.set(d, cells);
        }
      }

      const digits = Array.from(digitCells.keys());
      if (digits.length < 3) continue;

      for (let i = 0; i < digits.length; i++) {
        for (let j = i + 1; j < digits.length; j++) {
          for (let k = j + 1; k < digits.length; k++) {
            const d1 = digits[i], d2 = digits[j], d3 = digits[k];
            const cells1 = digitCells.get(d1)!;
            const cells2 = digitCells.get(d2)!;
            const cells3 = digitCells.get(d3)!;

            // Union of all cells containing any of the three digits
            const unionSet = new Map<string, CellPosition>();
            for (const c of cells1) unionSet.set(`${c.row},${c.col}`, c);
            for (const c of cells2) unionSet.set(`${c.row},${c.col}`, c);
            for (const c of cells3) unionSet.set(`${c.row},${c.col}`, c);

            if (unionSet.size !== 3) continue;

            const tripleCells = Array.from(unionSet.values());

            // Check: eliminate all other candidates from these 3 cells
            const elims: Elimination[] = [];
            for (const pos of tripleCells) {
              const cell = grid.getCell(pos);
              for (const d of cell.candidates.values()) {
                if (d !== d1 && d !== d2 && d !== d3) {
                  elims.push({ cell: pos, digit: d });
                }
              }
            }

            if (elims.length > 0) {
              const cellLabels = tripleCells.map(c => `R${c.row + 1}C${c.col + 1}`).join(', ');
              return {
                heuristicId: 'hidden-triple',
                description: `Hidden Triple {${d1},${d2},${d3}} in ${cellLabels}`,
                placements: [],
                eliminations: elims,
                highlights: [
                  {
                    role: 'trigger',
                    color: '#4CAF50',
                    cells: tripleCells,
                    candidates: tripleCells.flatMap(c =>
                      [d1, d2, d3]
                        .filter(d => grid.getCell(c).candidates.has(d))
                        .map(d => ({ cell: c, digit: d }))
                    ),
                  },
                  {
                    role: 'elimination',
                    color: '#F44336',
                    cells: elims.map(e => e.cell),
                    candidates: elims,
                  },
                ],
                snapshotBefore: grid.snapshot(),
              };
            }
          }
        }
      }
    }
    return null;
  },
};
