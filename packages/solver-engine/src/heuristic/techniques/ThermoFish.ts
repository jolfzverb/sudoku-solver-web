import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition, Region } from '../../model/types';
import { Constraint, Elimination } from '../../constraint/types';

/**
 * Thermo-Fish interaction heuristic.
 *
 * 1) Direct: X-Wing for D + thermo ordering per column → eliminate D+1
 *    from "early" cells (≤D), D-1 from "late" cells (≥D).
 *    Thermos may go in opposite directions; each column handled independently.
 *
 * 2) Derived: X-Wing for D + thermo predecessors forced to D-1 →
 *    D-1 is locked to specific cells in predecessor rows →
 *    eliminate D-1 from all other cells in those rows.
 *    (Symmetric for successors forced to D+1.)
 */

type ThermoOrderResult = 'a<b' | 'b<a' | null;

function thermoOrder(
  thermos: Constraint[],
  a: CellPosition,
  b: CellPosition,
): ThermoOrderResult {
  for (const thermo of thermos) {
    const path = thermo.affectedCells;
    let idxA = -1, idxB = -1;
    for (let i = 0; i < path.length; i++) {
      if (path[i].row === a.row && path[i].col === a.col) idxA = i;
      if (path[i].row === b.row && path[i].col === b.col) idxB = i;
    }
    if (idxA >= 0 && idxB >= 0 && idxA !== idxB) {
      return idxA < idxB ? 'a<b' : 'b<a';
    }
  }
  return null;
}

/** Find the cell immediately before `pos` on any thermo path. */
function thermoPredecessor(thermos: Constraint[], pos: CellPosition): CellPosition | null {
  for (const thermo of thermos) {
    const path = thermo.affectedCells;
    for (let i = 1; i < path.length; i++) {
      if (path[i].row === pos.row && path[i].col === pos.col) {
        return path[i - 1];
      }
    }
  }
  return null;
}

/** Find the cell immediately after `pos` on any thermo path. */
function thermoSuccessor(thermos: Constraint[], pos: CellPosition): CellPosition | null {
  for (const thermo of thermos) {
    const path = thermo.affectedCells;
    for (let i = 0; i < path.length - 1; i++) {
      if (path[i].row === pos.row && path[i].col === pos.col) {
        return path[i + 1];
      }
    }
  }
  return null;
}

export const ThermoFish: Heuristic = {
  id: 'thermo-fish',
  displayName: 'Thermo-Fish',
  difficulty: 'advanced',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const thermos = constraints.getConstraintsByType('thermo');
    if (thermos.length === 0) return null;

    const rows = grid.getRegions().filter(r => r.type === 'row');
    const cols = grid.getRegions().filter(r => r.type === 'column');

    for (let digit = 1; digit <= grid.size; digit++) {
      const result = findRowBased(grid, thermos, rows, digit);
      if (result) return result;

      const result2 = findColBased(grid, thermos, cols, digit);
      if (result2) return result2;
    }

    return null;
  },
};

// ── Row-based X-Wing detection ────────────────────────────────

function findRowBased(
  grid: Grid,
  thermos: Constraint[],
  rows: ReadonlyArray<Region>,
  digit: number,
): SolveStep | null {
  const rowCols: Array<{ rowIdx: number; cols: number[] }> = [];
  for (let r = 0; r < rows.length; r++) {
    const cs: number[] = [];
    for (const pos of rows[r].cells) {
      const cell = grid.getCell(pos);
      if (cell.value === null && cell.candidates.has(digit)) cs.push(pos.col);
    }
    if (cs.length === 2) rowCols.push({ rowIdx: r, cols: cs });
  }

  for (let i = 0; i < rowCols.length; i++) {
    for (let j = i + 1; j < rowCols.length; j++) {
      const a = rowCols[i], b = rowCols[j];
      if (a.cols[0] !== b.cols[0] || a.cols[1] !== b.cols[1]) continue;

      const r1 = a.rowIdx, r2 = b.rowIdx;
      const c1 = a.cols[0], c2 = a.cols[1];
      const xwCells: CellPosition[] = [
        { row: r1, col: c1 }, { row: r1, col: c2 },
        { row: r2, col: c1 }, { row: r2, col: c2 },
      ];

      // ── Part 1: direct elimination (D±1 at X-Wing cells) ──
      const ord1 = thermoOrder(thermos, { row: r1, col: c1 }, { row: r2, col: c1 });
      const ord2 = thermoOrder(thermos, { row: r1, col: c2 }, { row: r2, col: c2 });

      if (ord1 && ord2) {
        const elims: Elimination[] = [];
        addFishElims(grid, elims, digit,
          ord1 === 'a<b' ? r1 : r2, ord1 === 'a<b' ? r2 : r1, c1);
        addFishElims(grid, elims, digit,
          ord2 === 'a<b' ? r1 : r2, ord2 === 'a<b' ? r2 : r1, c2);

        if (elims.length > 0) {
          return makeStep(grid, digit, xwCells, elims,
            `direct: rows {${r1+1},${r2+1}} cols {${c1+1},${c2+1}}`);
        }
      }

      // ── Part 2: derived D-1 elimination via predecessors ──
      if (digit - 1 >= 1) {
        const step = derivedRowElims(grid, thermos, rows, digit, r1, r2, c1, c2, xwCells, 'predecessor');
        if (step) return step;
      }

      // ── Part 3: derived D+1 elimination via successors ──
      if (digit + 1 <= grid.size) {
        const step = derivedRowElims(grid, thermos, rows, digit, r1, r2, c1, c2, xwCells, 'successor');
        if (step) return step;
      }
    }
  }

  return null;
}

/**
 * For an X-Wing for D at (r1,c1),(r1,c2),(r2,c1),(r2,c2):
 * Find thermo predecessors (or successors) of the 4 X-Wing cells.
 * If for each X-Wing row the two neighbors land in the same "neighbor row",
 * and each neighbor is forced to D-1 (or D+1), then D-1 (or D+1) is locked
 * to those columns in the neighbor row. Eliminate from the rest of the row.
 */
function derivedRowElims(
  grid: Grid,
  thermos: Constraint[],
  rows: ReadonlyArray<Region>,
  digit: number,
  r1: number, r2: number, c1: number, c2: number,
  xwCells: CellPosition[],
  mode: 'predecessor' | 'successor',
): SolveStep | null {
  const neighborDigit = mode === 'predecessor' ? digit - 1 : digit + 1;
  const findNeighbor = mode === 'predecessor' ? thermoPredecessor : thermoSuccessor;

  // For each X-Wing cell, find thermo neighbor and check it's forced to neighborDigit
  const neighbors: Array<{ xwRow: number; xwCol: number; neighbor: CellPosition }> = [];

  for (const [r, c] of [[r1, c1], [r1, c2], [r2, c1], [r2, c2]]) {
    const nb = findNeighbor(thermos, { row: r, col: c });
    if (!nb) return null; // all 4 cells must have a thermo neighbor

    const nbCell = grid.getCell(nb);
    if (nbCell.value !== null) {
      if (nbCell.value !== neighborDigit) return null;
    } else {
      // Check: is neighborDigit the ONLY feasible candidate in the right direction?
      const feasible = mode === 'predecessor'
        ? nbCell.candidates.values().filter(d => d < digit)
        : nbCell.candidates.values().filter(d => d > digit);
      if (feasible.length !== 1 || feasible[0] !== neighborDigit) return null;
    }

    neighbors.push({ xwRow: r, xwCol: c, neighbor: nb });
  }

  // Group by X-Wing row: neighbors in the same X-Wing row should land in the same neighbor row
  const r1neighbors = neighbors.filter(n => n.xwRow === r1);
  const r2neighbors = neighbors.filter(n => n.xwRow === r2);

  const nbRow1 = r1neighbors[0].neighbor.row;
  const nbRow2 = r2neighbors[0].neighbor.row;
  if (r1neighbors[1].neighbor.row !== nbRow1) return null;
  if (r2neighbors[1].neighbor.row !== nbRow2) return null;

  // The neighbor columns
  const nbCols1 = new Set(r1neighbors.map(n => n.neighbor.col));
  const nbCols2 = new Set(r2neighbors.map(n => n.neighbor.col));

  // Eliminate neighborDigit from all other cells in neighbor rows
  const elims: Elimination[] = [];

  for (const pos of rows[nbRow1].cells) {
    if (nbCols1.has(pos.col)) continue;
    const cell = grid.getCell(pos);
    if (cell.value === null && cell.candidates.has(neighborDigit)) {
      elims.push({ cell: pos, digit: neighborDigit });
    }
  }
  for (const pos of rows[nbRow2].cells) {
    if (nbCols2.has(pos.col)) continue;
    const cell = grid.getCell(pos);
    if (cell.value === null && cell.candidates.has(neighborDigit)) {
      elims.push({ cell: pos, digit: neighborDigit });
    }
  }

  if (elims.length === 0) return null;

  const triggerCells = [
    ...xwCells,
    ...neighbors.map(n => n.neighbor),
  ];
  const nbLabel = mode === 'predecessor' ? 'predecessors' : 'successors';
  return makeStep(grid, digit, triggerCells, elims,
    `derived: X-Wing D=${digit} rows {${r1+1},${r2+1}}, `
    + `thermo ${nbLabel} lock D${mode === 'predecessor' ? '-' : '+'}1=${neighborDigit} `
    + `in rows {${nbRow1+1},${nbRow2+1}}`);
}

// ── Column-based X-Wing detection ─────────────────────────────

function findColBased(
  grid: Grid,
  thermos: Constraint[],
  cols: ReadonlyArray<Region>,
  digit: number,
): SolveStep | null {
  const colRows: Array<{ colIdx: number; rows: number[] }> = [];
  for (let c = 0; c < cols.length; c++) {
    const rs: number[] = [];
    for (const pos of cols[c].cells) {
      const cell = grid.getCell(pos);
      if (cell.value === null && cell.candidates.has(digit)) rs.push(pos.row);
    }
    if (rs.length === 2) colRows.push({ colIdx: c, rows: rs });
  }

  for (let i = 0; i < colRows.length; i++) {
    for (let j = i + 1; j < colRows.length; j++) {
      const a = colRows[i], b = colRows[j];
      if (a.rows[0] !== b.rows[0] || a.rows[1] !== b.rows[1]) continue;

      const c1 = a.colIdx, c2 = b.colIdx;
      const r1 = a.rows[0], r2 = a.rows[1];
      const xwCells: CellPosition[] = [
        { row: r1, col: c1 }, { row: r1, col: c2 },
        { row: r2, col: c1 }, { row: r2, col: c2 },
      ];

      // Direct elimination
      const ord1 = thermoOrder(thermos, { row: r1, col: c1 }, { row: r1, col: c2 });
      const ord2 = thermoOrder(thermos, { row: r2, col: c1 }, { row: r2, col: c2 });

      if (ord1 && ord2) {
        const elims: Elimination[] = [];
        addFishElimsCol(grid, elims, digit,
          ord1 === 'a<b' ? c1 : c2, ord1 === 'a<b' ? c2 : c1, r1);
        addFishElimsCol(grid, elims, digit,
          ord2 === 'a<b' ? c1 : c2, ord2 === 'a<b' ? c2 : c1, r2);

        if (elims.length > 0) {
          return makeStep(grid, digit, xwCells, elims,
            `direct: cols {${c1+1},${c2+1}} rows {${r1+1},${r2+1}}`);
        }
      }

      // Derived D-1 via predecessors
      if (digit - 1 >= 1) {
        const step = derivedColElims(grid, thermos, cols, digit, c1, c2, r1, r2, xwCells, 'predecessor');
        if (step) return step;
      }

      // Derived D+1 via successors
      if (digit + 1 <= grid.size) {
        const step = derivedColElims(grid, thermos, cols, digit, c1, c2, r1, r2, xwCells, 'successor');
        if (step) return step;
      }
    }
  }

  return null;
}

function derivedColElims(
  grid: Grid,
  thermos: Constraint[],
  cols: ReadonlyArray<Region>,
  digit: number,
  c1: number, c2: number, r1: number, r2: number,
  xwCells: CellPosition[],
  mode: 'predecessor' | 'successor',
): SolveStep | null {
  const neighborDigit = mode === 'predecessor' ? digit - 1 : digit + 1;
  const findNeighbor = mode === 'predecessor' ? thermoPredecessor : thermoSuccessor;

  const neighbors: Array<{ xwCol: number; neighbor: CellPosition }> = [];

  for (const [r, c] of [[r1, c1], [r1, c2], [r2, c1], [r2, c2]]) {
    const nb = findNeighbor(thermos, { row: r, col: c });
    if (!nb) return null;

    const nbCell = grid.getCell(nb);
    if (nbCell.value !== null) {
      if (nbCell.value !== neighborDigit) return null;
    } else {
      const feasible = mode === 'predecessor'
        ? nbCell.candidates.values().filter(d => d < digit)
        : nbCell.candidates.values().filter(d => d > digit);
      if (feasible.length !== 1 || feasible[0] !== neighborDigit) return null;
    }

    neighbors.push({ xwCol: c, neighbor: nb });
  }

  // Group by X-Wing col: neighbors should land in the same neighbor col
  const c1neighbors = neighbors.filter(n => n.xwCol === c1);
  const c2neighbors = neighbors.filter(n => n.xwCol === c2);

  const nbCol1 = c1neighbors[0].neighbor.col;
  const nbCol2 = c2neighbors[0].neighbor.col;
  if (c1neighbors[1].neighbor.col !== nbCol1) return null;
  if (c2neighbors[1].neighbor.col !== nbCol2) return null;

  const nbRows1 = new Set(c1neighbors.map(n => n.neighbor.row));
  const nbRows2 = new Set(c2neighbors.map(n => n.neighbor.row));

  const elims: Elimination[] = [];
  for (const pos of cols[nbCol1].cells) {
    if (nbRows1.has(pos.row)) continue;
    const cell = grid.getCell(pos);
    if (cell.value === null && cell.candidates.has(neighborDigit)) {
      elims.push({ cell: pos, digit: neighborDigit });
    }
  }
  for (const pos of cols[nbCol2].cells) {
    if (nbRows2.has(pos.row)) continue;
    const cell = grid.getCell(pos);
    if (cell.value === null && cell.candidates.has(neighborDigit)) {
      elims.push({ cell: pos, digit: neighborDigit });
    }
  }

  if (elims.length === 0) return null;

  const triggerCells = [...xwCells, ...neighbors.map(n => n.neighbor)];
  const nbLabel = mode === 'predecessor' ? 'predecessors' : 'successors';
  return makeStep(grid, digit, triggerCells, elims,
    `derived: X-Wing D=${digit} cols {${c1+1},${c2+1}}, `
    + `thermo ${nbLabel} lock D${mode === 'predecessor' ? '-' : '+'}1=${neighborDigit} `
    + `in cols {${nbCol1+1},${nbCol2+1}}`);
}

// ── Helpers ───────────────────────────────────────────────────

function addFishElims(
  grid: Grid, elims: Elimination[], digit: number,
  earlyRow: number, lateRow: number, col: number,
) {
  if (digit + 1 <= grid.size) {
    const cell = grid.getCell({ row: earlyRow, col });
    if (cell.value === null && cell.candidates.has(digit + 1))
      elims.push({ cell: { row: earlyRow, col }, digit: digit + 1 });
  }
  if (digit - 1 >= 1) {
    const cell = grid.getCell({ row: lateRow, col });
    if (cell.value === null && cell.candidates.has(digit - 1))
      elims.push({ cell: { row: lateRow, col }, digit: digit - 1 });
  }
}

function addFishElimsCol(
  grid: Grid, elims: Elimination[], digit: number,
  earlyCol: number, lateCol: number, row: number,
) {
  if (digit + 1 <= grid.size) {
    const cell = grid.getCell({ row, col: earlyCol });
    if (cell.value === null && cell.candidates.has(digit + 1))
      elims.push({ cell: { row, col: earlyCol }, digit: digit + 1 });
  }
  if (digit - 1 >= 1) {
    const cell = grid.getCell({ row, col: lateCol });
    if (cell.value === null && cell.candidates.has(digit - 1))
      elims.push({ cell: { row, col: lateCol }, digit: digit - 1 });
  }
}

function makeStep(
  grid: Grid, digit: number,
  triggerCells: CellPosition[], elims: Elimination[],
  detail: string,
): SolveStep {
  return {
    heuristicId: 'thermo-fish',
    description: `Thermo X-Wing: ${detail}`,
    placements: [],
    eliminations: elims,
    highlights: [
      { role: 'trigger', color: '#4CAF50', cells: triggerCells,
        candidates: triggerCells.map(c => ({ cell: c, digit })) },
      { role: 'elimination', color: '#F44336',
        cells: elims.map(e => e.cell), candidates: elims },
    ],
    snapshotBefore: grid.snapshot(),
  };
}
