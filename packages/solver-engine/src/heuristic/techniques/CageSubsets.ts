import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { CageSumConstraint } from '../../constraint/CageSumConstraint';
import { Heuristic, SolveStep } from '../types';
import { CellPosition } from '../../model/types';
import { Elimination } from '../../constraint/types';

/**
 * Cage Subsets heuristic (Naked/Hidden pairs/triples/quads within a cage).
 *
 * A killer cage guarantees distinct values among its cells, making it a
 * "virtual region" where naked/hidden subset logic applies — even when
 * the cage cells span different rows, columns, and boxes.
 *
 * IMPORTANT: uses combo-aware per-cell candidates. For each combo, all
 * permutations (assignments of digits to cells) are checked. A digit D
 * is valid for cell C only if some feasible (combo, assignment) gives C=D.
 * This prevents false subsets from infeasible combos.
 *
 * Naked subset: N cells whose combined effective candidates have exactly N values
 *   → eliminate those values from other cage cells.
 *
 * Hidden subset: N values that appear in exactly N cells (by effective candidates)
 *   → eliminate other candidates from those cells.
 */

export const CageSubsets: Heuristic = {
  id: 'cage-subsets',
  displayName: 'Cage Subsets',
  difficulty: 'intermediate',

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    const cages = constraints.getConstraintsByType('cage-sum') as CageSumConstraint[];

    for (const cage of cages) {
      const step = analyzeCage(grid, cage);
      if (step) return step;
    }

    return null;
  },
};

interface CageCell {
  pos: CellPosition;
  candidates: number[];
  effectiveCandidates: number[];
}

function analyzeCage(grid: Grid, cage: CageSumConstraint): SolveStep | null {
  const { combos } = cage.computeCombos(grid);
  if (combos.isEmpty()) return null;

  const emptyCells: CageCell[] = [];
  for (const pos of cage.affectedCells) {
    const cell = grid.getCell(pos);
    if (cell.value === null) {
      emptyCells.push({ pos, candidates: cell.candidates.values(), effectiveCandidates: [] });
    }
  }

  if (emptyCells.length < 3) return null;

  // Compute per-cell effective candidates by checking all (combo, assignment) pairs
  computeEffective(emptyCells, combos.getCombos());

  // First: direct elimination from effective candidates (combo-assignment analysis)
  const directElims: Elimination[] = [];
  for (const ec of emptyCells) {
    const effSet = new Set(ec.effectiveCandidates);
    for (const d of ec.candidates) {
      if (!effSet.has(d)) {
        directElims.push({ cell: ec.pos, digit: d });
      }
    }
  }
  if (directElims.length > 0) {
    return buildStep(cage, 'Combo Assignment', directElims, emptyCells, new Set(), grid);
  }

  // Naked subsets on effective candidates
  for (let size = 2; size <= Math.min(emptyCells.length - 1, 4); size++) {
    const step = findNakedSubset(grid, cage, emptyCells, size);
    if (step) return step;
  }

  // Hidden subsets on effective candidates
  for (let size = 2; size <= Math.min(emptyCells.length - 1, 4); size++) {
    const step = findHiddenSubset(grid, cage, emptyCells, size);
    if (step) return step;
  }

  return null;
}

/**
 * For each (combo, permutation), check if the assignment is feasible
 * (each cell gets a digit from its candidates). Record per-cell valid digits.
 */
function computeEffective(
  emptyCells: CageCell[],
  combos: ReadonlyArray<ReadonlyArray<number>>,
): void {
  const n = emptyCells.length;
  const perCell: Set<number>[] = emptyCells.map(() => new Set());

  for (const combo of combos) {
    // Try all permutations of combo digits assigned to cells
    permute(combo as number[], 0, (perm) => {
      // Check feasibility: each cell gets a digit in its candidates
      for (let i = 0; i < n; i++) {
        if (!emptyCells[i].candidates.includes(perm[i])) return;
      }
      // Valid assignment — record
      for (let i = 0; i < n; i++) {
        perCell[i].add(perm[i]);
      }
    });
  }

  for (let i = 0; i < n; i++) {
    emptyCells[i].effectiveCandidates = [...perCell[i]].sort((a, b) => a - b);
  }
}

/** Enumerate all permutations of arr, calling cb for each. */
function permute(arr: number[], start: number, cb: (perm: number[]) => void): void {
  if (start === arr.length) {
    cb(arr);
    return;
  }
  for (let i = start; i < arr.length; i++) {
    [arr[start], arr[i]] = [arr[i], arr[start]];
    permute(arr, start + 1, cb);
    [arr[start], arr[i]] = [arr[i], arr[start]];
  }
}

function findNakedSubset(
  grid: Grid,
  cage: CageSumConstraint,
  emptyCells: CageCell[],
  size: number,
): SolveStep | null {
  const combos = combinations(emptyCells.length, size);

  for (const indices of combos) {
    const union = new Set<number>();
    for (const i of indices) {
      for (const d of emptyCells[i].effectiveCandidates) union.add(d);
    }

    if (union.size !== size) continue;

    const subsetCells = new Set(indices);
    const elims: Elimination[] = [];

    for (let i = 0; i < emptyCells.length; i++) {
      if (subsetCells.has(i)) continue;
      for (const d of emptyCells[i].effectiveCandidates) {
        if (union.has(d)) {
          elims.push({ cell: emptyCells[i].pos, digit: d });
        }
      }
    }

    if (elims.length === 0) continue;

    const subsetLabel = size === 2 ? 'Naked Pair' : size === 3 ? 'Naked Triple' : 'Naked Quad';
    return buildStep(cage, `${subsetLabel} {${[...union].sort((a, b) => a - b).join(',')}}`, elims, emptyCells, new Set(indices), grid);
  }

  return null;
}

function findHiddenSubset(
  grid: Grid,
  cage: CageSumConstraint,
  emptyCells: CageCell[],
  size: number,
): SolveStep | null {
  const allDigits = new Set<number>();
  for (const cell of emptyCells) {
    for (const d of cell.effectiveCandidates) allDigits.add(d);
  }

  const digitList = [...allDigits].sort((a, b) => a - b);
  if (digitList.length < size) return null;

  const digitCombos = combinations(digitList.length, size);

  for (const digitIndices of digitCombos) {
    const digits = new Set(digitIndices.map(i => digitList[i]));

    const cellIndices: number[] = [];
    for (let i = 0; i < emptyCells.length; i++) {
      if (emptyCells[i].effectiveCandidates.some(d => digits.has(d))) {
        cellIndices.push(i);
      }
    }

    if (cellIndices.length !== size) continue;

    const elims: Elimination[] = [];
    for (const i of cellIndices) {
      for (const d of emptyCells[i].candidates) {
        if (!digits.has(d)) {
          elims.push({ cell: emptyCells[i].pos, digit: d });
        }
      }
    }

    if (elims.length === 0) continue;

    const subsetLabel = size === 2 ? 'Hidden Pair' : size === 3 ? 'Hidden Triple' : 'Hidden Quad';
    return buildStep(cage, `${subsetLabel} {${[...digits].sort((a, b) => a - b).join(',')}}`, elims, emptyCells, new Set(cellIndices), grid);
  }

  return null;
}

function buildStep(
  cage: CageSumConstraint,
  label: string,
  elims: Elimination[],
  emptyCells: CageCell[],
  triggerIndices: Set<number>,
  grid: Grid,
): SolveStep {
  const fmt = (p: CellPosition) => `R${p.row + 1}C${p.col + 1}`;
  const triggerCells = triggerIndices.size > 0
    ? [...triggerIndices].map(i => emptyCells[i].pos)
    : emptyCells.map(c => c.pos);

  return {
    heuristicId: 'cage-subsets',
    description:
      `Cage Subsets: ${label} at [${triggerCells.map(fmt).join(',')}] `
      + `in cage sum=${cage.targetSum}`,
    placements: [],
    eliminations: elims,
    highlights: [
      { role: 'trigger', color: '#4CAF50', cells: triggerCells },
      { role: 'elimination', color: '#F44336',
        cells: elims.map(e => e.cell), candidates: elims },
    ],
    snapshotBefore: grid.snapshot(),
  };
}

/** Generate all k-element index combinations from 0..n-1. */
function combinations(n: number, k: number): number[][] {
  const result: number[][] = [];
  function recurse(start: number, current: number[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i <= n - (k - current.length); i++) {
      current.push(i);
      recurse(i + 1, current);
      current.pop();
    }
  }
  recurse(0, []);
  return result;
}
