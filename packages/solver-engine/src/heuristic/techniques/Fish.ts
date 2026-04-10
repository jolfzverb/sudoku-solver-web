import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep, DifficultyTier } from '../types';
import { CellPosition, Region } from '../../model/types';
import { Elimination } from '../../constraint/types';

/**
 * Generalized Fish technique (X-Wing, Swordfish, Jellyfish).
 *
 * For a digit D and N "base" rows: if D's candidate columns across those N rows
 * form a union of exactly N columns, then D can be eliminated from those columns
 * in all other rows. Works symmetrically for column-based fish.
 */
function createFish(
  fishSize: number,
  id: string,
  displayName: string,
  difficulty: DifficultyTier,
): Heuristic {
  return {
    id,
    displayName,
    difficulty,

    apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
      const rows = grid.getRegions().filter(r => r.type === 'row');
      const cols = grid.getRegions().filter(r => r.type === 'column');

      for (let digit = 1; digit <= grid.size; digit++) {
        // Row-based: base = rows, cover = columns
        const r = findFish(grid, digit, fishSize, rows, 'row', id);
        if (r) return r;
        // Column-based: base = columns, cover = rows
        const c = findFish(grid, digit, fishSize, cols, 'column', id);
        if (c) return c;
      }
      return null;
    },
  };
}

function findFish(
  grid: Grid,
  digit: number,
  fishSize: number,
  baseRegions: ReadonlyArray<Region>,
  baseType: 'row' | 'column',
  heuristicId: string,
): SolveStep | null {
  // For each base region, collect cross-indices where digit is a candidate
  const eligible: Array<{ regionIdx: number; crossIndices: number[] }> = [];

  for (let i = 0; i < baseRegions.length; i++) {
    const crossSet = new Set<number>();
    for (const pos of baseRegions[i].cells) {
      const cell = grid.getCell(pos);
      if (cell.value === null && cell.candidates.has(digit)) {
        crossSet.add(baseType === 'row' ? pos.col : pos.row);
      }
    }
    if (crossSet.size >= 2 && crossSet.size <= fishSize) {
      eligible.push({ regionIdx: i, crossIndices: Array.from(crossSet) });
    }
  }

  if (eligible.length < fishSize) return null;

  // Try all combinations of `fishSize` eligible base regions
  const combos = combinations(eligible, fishSize);
  for (const combo of combos) {
    const crossUnion = new Set<number>();
    for (const { crossIndices } of combo) {
      for (const idx of crossIndices) crossUnion.add(idx);
    }
    if (crossUnion.size !== fishSize) continue;

    // Found a fish pattern — compute eliminations
    const baseIndices = new Set(combo.map(c => c.regionIdx));
    const elims: Elimination[] = [];
    const triggerCells: CellPosition[] = [];

    // Collect trigger cells (digit candidates in selected base regions)
    for (const { regionIdx } of combo) {
      for (const pos of baseRegions[regionIdx].cells) {
        const cell = grid.getCell(pos);
        if (cell.value === null && cell.candidates.has(digit)) {
          triggerCells.push(pos);
        }
      }
    }

    // Eliminate digit from cross-lines in non-selected base regions
    for (const crossIdx of crossUnion) {
      for (let baseIdx = 0; baseIdx < baseRegions.length; baseIdx++) {
        if (baseIndices.has(baseIdx)) continue;
        for (const pos of baseRegions[baseIdx].cells) {
          const ci = baseType === 'row' ? pos.col : pos.row;
          if (ci !== crossIdx) continue;
          const cell = grid.getCell(pos);
          if (cell.value === null && cell.candidates.has(digit)) {
            elims.push({ cell: pos, digit });
          }
        }
      }
    }

    if (elims.length > 0) {
      const baseLabel = baseType === 'row' ? 'rows' : 'cols';
      const crossLabel = baseType === 'row' ? 'cols' : 'rows';
      const baseNums = combo.map(c => c.regionIdx + 1).join(',');
      const crossNums = Array.from(crossUnion).map(i => i + 1).join(',');

      return {
        heuristicId,
        description: `${heuristicId}: digit ${digit} in ${baseLabel} {${baseNums}} locked to ${crossLabel} {${crossNums}}`,
        placements: [],
        eliminations: elims,
        highlights: [
          {
            role: 'trigger',
            color: '#4CAF50',
            cells: triggerCells,
            candidates: triggerCells.map(c => ({ cell: c, digit })),
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

  return null;
}

/** Generate all k-element combinations from an array. */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const result: T[][] = [];
  function recurse(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    const remaining = k - current.length;
    for (let i = start; i <= arr.length - remaining; i++) {
      current.push(arr[i]);
      recurse(i + 1, current);
      current.pop();
    }
  }
  recurse(0, []);
  return result;
}

export const XWing = createFish(2, 'x-wing', 'X-Wing', 'intermediate');
export const Swordfish = createFish(3, 'swordfish', 'Swordfish', 'advanced');
export const Jellyfish = createFish(4, 'jellyfish', 'Jellyfish', 'advanced');
