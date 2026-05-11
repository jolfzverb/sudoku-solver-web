import { Grid } from '../model/Grid';
import { ConstraintSet } from '../constraint/ConstraintSet';
import { CageSumConstraint } from '../constraint/CageSumConstraint';
import { VirtualSumConstraint } from '../constraint/VirtualSumConstraint';
import { CellPosition, Region } from '../model/types';
import { formatRegion } from './utils';

/**
 * Build & cache virtual sum constraints derived by the innies/outies
 * analysis. Geometry is fixed for a given `ConstraintSet`, so the
 * (expensive) subset search runs at most once per set and the result is
 * reused on every solver iteration and by every heuristic that wants it.
 *
 * Heuristics consume the result by filtering with `isPureKillerCage()`
 * when they need killer-cage semantics.
 */

const MAX_DELTA = 3;
const MAX_CAGES_IN_SUBSET = 12;
const MAX_VIRTUAL_CAGES = 200;

const cache = new WeakMap<ConstraintSet, VirtualSumConstraint[]>();

export function getVirtualCages(grid: Grid, constraints: ConstraintSet): VirtualSumConstraint[] {
  let v = cache.get(constraints);
  if (!v) {
    v = buildVirtualCages(grid, constraints);
    cache.set(constraints, v);
  }
  return v;
}

interface CageInfo {
  cage: CageSumConstraint;
  internalKeys: string[];
  internal: CellPosition[];
  external: CellPosition[];
}

function buildVirtualCages(grid: Grid, constraints: ConstraintSet): VirtualSumConstraint[] {
  const cages = constraints.getConstraintsByType('cage-sum') as CageSumConstraint[];
  if (cages.length === 0) return [];

  const regions = grid.getRegions().filter(r =>
    r.type === 'row' || r.type === 'column' || r.type === 'box',
  );

  const byType = new Map<string, Region[]>();
  for (const r of regions) {
    if (!byType.has(r.type)) byType.set(r.type, []);
    byType.get(r.type)!.push(r);
  }

  const targets: Region[][] = [];
  for (const r of regions) targets.push([r]);
  for (const list of byType.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) targets.push([list[i], list[j]]);
    }
  }

  const gridSize = grid.size;
  const regionSum = (gridSize * (gridSize + 1)) / 2;
  const results: VirtualSumConstraint[] = [];
  const seen = new Set<string>();
  let idCounter = 0;

  for (const targetRegions of targets) {
    if (results.length >= MAX_VIRTUAL_CAGES) break;

    const targetCellKeys = new Set<string>();
    for (const r of targetRegions) for (const c of r.cells) {
      targetCellKeys.add(`${c.row},${c.col}`);
    }
    const targetSum = regionSum * targetRegions.length;

    const candidates: CageInfo[] = [];
    for (const cage of cages) {
      const internal: CellPosition[] = [];
      const internalKeys: string[] = [];
      const external: CellPosition[] = [];
      for (const p of cage.affectedCells) {
        const key = `${p.row},${p.col}`;
        if (targetCellKeys.has(key)) {
          internal.push(p);
          internalKeys.push(key);
        } else {
          external.push(p);
        }
      }
      if (internal.length > 0) candidates.push({ cage, internal, internalKeys, external });
    }

    if (candidates.length === 0) continue;

    enumerate(
      0, [], 0, new Set<string>(), 0,
      candidates, targetCellKeys, targetSum, targetRegions, grid,
      results, seen, () => `vc-${idCounter++}`,
    );
  }

  results.sort((a, b) => {
    if (a.signedCells.length !== b.signedCells.length) {
      return a.signedCells.length - b.signedCells.length;
    }
    return Math.abs(a.targetSum) - Math.abs(b.targetSum);
  });

  return results.slice(0, MAX_VIRTUAL_CAGES);
}

function enumerate(
  startIdx: number,
  selected: number[],
  totalSum: number,
  covered: Set<string>,
  externalCount: number,
  candidates: CageInfo[],
  targetCellKeys: Set<string>,
  targetSum: number,
  targetRegions: Region[],
  grid: Grid,
  results: VirtualSumConstraint[],
  seen: Set<string>,
  nextId: () => string,
): void {
  const missingCount = targetCellKeys.size - covered.size;
  const delta = externalCount + missingCount;

  if (selected.length > 0 && delta > 0 && delta <= MAX_DELTA) {
    emit(selected, totalSum, covered, candidates, targetCellKeys, targetSum, targetRegions, grid, results, seen, nextId);
  }

  if (selected.length >= MAX_CAGES_IN_SUBSET) return;
  if (results.length >= MAX_VIRTUAL_CAGES) return;
  if (externalCount > MAX_DELTA) return;

  for (let i = startIdx; i < candidates.length; i++) {
    const c = candidates[i];

    let overlap = false;
    for (const key of c.internalKeys) {
      if (covered.has(key)) { overlap = true; break; }
    }
    if (overlap) continue;

    const newExternal = externalCount + c.external.length;
    if (newExternal > MAX_DELTA) continue;

    selected.push(i);
    for (const key of c.internalKeys) covered.add(key);
    enumerate(
      i + 1, selected, totalSum + c.cage.targetSum, covered, newExternal,
      candidates, targetCellKeys, targetSum, targetRegions, grid,
      results, seen, nextId,
    );
    selected.pop();
    for (const key of c.internalKeys) covered.delete(key);
  }
}

function emit(
  selected: number[],
  totalSum: number,
  covered: Set<string>,
  candidates: CageInfo[],
  targetCellKeys: Set<string>,
  targetSum: number,
  targetRegions: Region[],
  grid: Grid,
  results: VirtualSumConstraint[],
  seen: Set<string>,
  nextId: () => string,
): void {
  const outies: CellPosition[] = [];
  for (const idx of selected) for (const p of candidates[idx].external) outies.push(p);
  const innies: CellPosition[] = [];
  for (const key of targetCellKeys) {
    if (!covered.has(key)) {
      const [r, c] = key.split(',').map(Number);
      innies.push({ row: r, col: c });
    }
  }
  if (outies.length + innies.length === 0) return;

  const delta = totalSum - targetSum;

  let signedCells: { pos: CellPosition; sign: 1 | -1 }[];
  let normalisedSum: number;
  if (innies.length === 0) {
    signedCells = outies.map(p => ({ pos: p, sign: 1 as const }));
    normalisedSum = delta;
  } else if (outies.length === 0) {
    signedCells = innies.map(p => ({ pos: p, sign: 1 as const }));
    normalisedSum = -delta;
  } else {
    signedCells = [
      ...outies.map(p => ({ pos: p, sign: 1 as const })),
      ...innies.map(p => ({ pos: p, sign: -1 as const })),
    ];
    normalisedSum = delta;
  }

  const distinctEdges: [number, number][] = [];
  for (let i = 0; i < signedCells.length; i++) {
    for (let j = i + 1; j < signedCells.length; j++) {
      if (cellsShareRegion(grid, signedCells[i].pos, signedCells[j].pos)) {
        distinctEdges.push([i, j]);
      }
    }
  }

  const signature = signedCells
    .map(sc => `${sc.pos.row},${sc.pos.col}:${sc.sign}`)
    .sort()
    .join('|') + `=${normalisedSum}`;
  if (seen.has(signature)) return;
  seen.add(signature);

  const regionLabel = targetRegions.map(r => formatRegion(r.id)).join('+');
  const cageIds = selected.map(i => candidates[i].cage.id).join(',');
  const description =
    `cages {${cageIds}} on ${regionLabel} `
    + `(σ=${totalSum}, sum(T)=${targetSum}, δ=${delta})`;

  results.push(new VirtualSumConstraint(
    nextId(), signedCells, normalisedSum, distinctEdges, description,
  ));
}

function cellsShareRegion(grid: Grid, a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  for (const region of grid.getRegionsFor(a)) {
    for (const c of region.cells) if (c.row === b.row && c.col === b.col) return true;
  }
  return false;
}
