import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Constraint, Elimination } from '../../constraint/types';

/**
 * Constraint Claiming heuristic.
 *
 * When a constraint with guaranteed distinct values (thermo, cage) has K cells
 * outside a box, all on the same line (row/column), those K values must appear
 * in the box. They cannot go in:
 *   1. Box cells on the same line (Sudoku uniqueness)
 *   2. Box cells that are part of the same constraint (constraint uniqueness)
 *
 * If the remaining "available" cells in the box equals K, they form a locked
 * set — only the external cells' candidate values can go there.
 * Eliminate from available cells any candidate NOT in the union of external
 * cells' candidates.
 */

/** Constraint types that guarantee all-distinct values among their cells. */
const DISTINCT_TYPES = new Set(['thermo', 'cage-sum']);

export const ConstraintClaiming: Heuristic = {
  id: 'constraint-claiming',
  displayName: 'Constraint Claiming',
  difficulty: 'advanced',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const boxRegions = grid.getRegions().filter(r => r.type === 'box');

    for (const constraint of constraints.getAll()) {
      if (!DISTINCT_TYPES.has(constraint.type)) continue;

      for (const box of boxRegions) {
        const step = analyzeConstraintBox(grid, constraint, box.cells);
        if (step) return step;
      }
    }

    return null;
  },
};

function analyzeConstraintBox(
  grid: Grid,
  constraint: Constraint,
  boxCells: ReadonlyArray<CellPosition>,
): SolveStep | null {
  const boxSet = new Set(boxCells.map(p => `${p.row},${p.col}`));
  const constraintCells = constraint.affectedCells;

  const internal: CellPosition[] = [];
  const external: CellPosition[] = [];

  for (const pos of constraintCells) {
    const key = `${pos.row},${pos.col}`;
    if (boxSet.has(key)) {
      internal.push(pos);
    } else {
      external.push(pos);
    }
  }

  if (external.length === 0 || internal.length === 0) return null;

  // Group external cells by shared line with box
  const boxRows = new Set(boxCells.map(p => p.row));
  const boxCols = new Set(boxCells.map(p => p.col));

  // Group by row
  const byRow = new Map<number, CellPosition[]>();
  for (const pos of external) {
    if (boxRows.has(pos.row)) {
      if (!byRow.has(pos.row)) byRow.set(pos.row, []);
      byRow.get(pos.row)!.push(pos);
    }
  }

  // Group by column
  const byCol = new Map<number, CellPosition[]>();
  for (const pos of external) {
    if (boxCols.has(pos.col)) {
      if (!byCol.has(pos.col)) byCol.set(pos.col, []);
      byCol.get(pos.col)!.push(pos);
    }
  }

  // Merge same-line groups: multiple rows/cols can contribute together
  // if all their external cells share the same line type.
  // But the standard case is: all external on ONE line.
  // We also try combining all row-sharing externals and all col-sharing externals.

  const internalSet = new Set(internal.map(p => `${p.row},${p.col}`));

  // Try each individual row group
  for (const [row, group] of byRow) {
    const lineSet = new Set(boxCells.filter(p => p.row === row).map(p => `${p.row},${p.col}`));
    const step = tryLockedSet(grid, constraint, group, boxCells, lineSet, internalSet, 'row', row);
    if (step) return step;
  }

  // Try each individual column group
  for (const [col, group] of byCol) {
    const lineSet = new Set(boxCells.filter(p => p.col === col).map(p => `${p.row},${p.col}`));
    const step = tryLockedSet(grid, constraint, group, boxCells, lineSet, internalSet, 'col', col);
    if (step) return step;
  }

  // Try combining ALL row-sharing externals
  if (byRow.size > 1) {
    const allRowExt: CellPosition[] = [];
    const allRowLineSet = new Set<string>();
    for (const [row, group] of byRow) {
      allRowExt.push(...group);
      for (const p of boxCells) {
        if (p.row === row) allRowLineSet.add(`${p.row},${p.col}`);
      }
    }
    const step = tryLockedSet(grid, constraint, allRowExt, boxCells, allRowLineSet, internalSet, 'rows', -1);
    if (step) return step;
  }

  // Try combining ALL col-sharing externals
  if (byCol.size > 1) {
    const allColExt: CellPosition[] = [];
    const allColLineSet = new Set<string>();
    for (const [col, group] of byCol) {
      allColExt.push(...group);
      for (const p of boxCells) {
        if (p.col === col) allColLineSet.add(`${p.row},${p.col}`);
      }
    }
    const step = tryLockedSet(grid, constraint, allColExt, boxCells, allColLineSet, internalSet, 'cols', -1);
    if (step) return step;
  }

  return null;
}

function tryLockedSet(
  grid: Grid,
  constraint: Constraint,
  externalGroup: CellPosition[],
  boxCells: ReadonlyArray<CellPosition>,
  lineCellsInBox: Set<string>,
  internalSet: Set<string>,
  lineType: string,
  lineIndex: number,
): SolveStep | null {
  const k = externalGroup.length;

  // Available = box cells NOT on the shared line AND NOT internal constraint cells
  const available: CellPosition[] = [];
  for (const p of boxCells) {
    const key = `${p.row},${p.col}`;
    if (lineCellsInBox.has(key)) continue;
    if (internalSet.has(key)) continue;
    available.push(p);
  }

  if (available.length !== k) return null;

  // Compute possible values: union of external cells' candidates
  const possibleValues = new Set<number>();
  for (const pos of externalGroup) {
    const cell = grid.getCell(pos);
    if (cell.value !== null) {
      possibleValues.add(cell.value);
    } else {
      for (const d of cell.candidates.values()) {
        possibleValues.add(d);
      }
    }
  }

  // Generate eliminations: remove from available cells any candidate NOT in possibleValues
  const elims: Elimination[] = [];
  for (const pos of available) {
    const cell = grid.getCell(pos);
    if (cell.value !== null) continue;
    for (const d of cell.candidates.values()) {
      if (!possibleValues.has(d)) {
        elims.push({ cell: pos, digit: d });
      }
    }
  }

  if (elims.length === 0) return null;

  const lineDesc = lineType === 'rows' || lineType === 'cols'
    ? `multiple ${lineType}`
    : `${lineType} ${lineIndex + 1}`;

  return {
    heuristicId: 'constraint-claiming',
    description: `Constraint Claiming: ${constraint.type} ${constraint.id} — `
      + `${k} external cells on ${lineDesc} lock ${k} cells in box, `
      + `possible values {${[...possibleValues].sort((a, b) => a - b).join(',')}}`,
    placements: [],
    eliminations: elims,
    highlights: [
      { role: 'trigger', color: '#4CAF50', cells: [...externalGroup] },
      { role: 'target', color: '#FF9800', cells: available },
      { role: 'elimination', color: '#F44336',
        cells: elims.map(e => e.cell), candidates: elims },
    ],
    snapshotBefore: grid.snapshot(),
  };
}
