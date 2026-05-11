import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';

export interface SumEnumerationResult {
  /**
   * For each input cell (same index as `signedCells`), the set of digits
   * that cell may take across all satisfying assignments. Placed cells get
   * a singleton set with their fixed value.
   */
  readonly allowedPerCell: ReadonlyArray<Set<number>>;
  readonly feasible: boolean;
}

/**
 * Enumerate all digit assignments to `signedCells` such that:
 *
 *     Σ(sign · digit) = targetSum
 *
 * Only empty cells are variables; placed cells contribute their fixed value
 * to the running sum. `distinctEdges` enforces pairwise distinctness between
 * the listed cell-index pairs (covers both empty/empty and empty/placed; in
 * the latter case the empty cell simply loses that digit from its
 * candidates).
 *
 * Returns per-cell allowed digits across all valid assignments. If no
 * assignment exists, `feasible = false` and every empty cell's allowed set
 * is empty.
 *
 * Cost is bounded by `Π |empty cell candidates|` with strong sum-range
 * pruning. For typical innie/outie cells (≤ 4 with candidate sets ≤ 9),
 * this is sub-millisecond.
 */
export function enumerateSumAssignments(
  grid: Grid,
  signedCells: ReadonlyArray<{ pos: CellPosition; sign: 1 | -1 }>,
  targetSum: number,
  distinctEdges: ReadonlyArray<readonly [number, number]>,
): SumEnumerationResult {
  const n = signedCells.length;

  const placedValue: (number | null)[] = signedCells.map(({ pos }) => grid.getCell(pos).value);

  let placedContribution = 0;
  const emptyOriginalIndices: number[] = [];
  for (let i = 0; i < n; i++) {
    if (placedValue[i] !== null) {
      placedContribution += signedCells[i].sign * (placedValue[i] as number);
    } else {
      emptyOriginalIndices.push(i);
    }
  }
  const remaining = targetSum - placedContribution;

  // Per-cell distinctness adjacency (in original indices)
  const distinctAdj: Set<number>[] = signedCells.map(() => new Set<number>());
  for (const [a, b] of distinctEdges) {
    distinctAdj[a].add(b);
    distinctAdj[b].add(a);
  }

  // Empty cell candidates (filtered against placed peers via distinctEdges)
  const emptyOrdinalOf = new Map<number, number>();
  emptyOriginalIndices.forEach((origIdx, k) => emptyOrdinalOf.set(origIdx, k));

  const candidatesPerEmpty: number[][] = emptyOriginalIndices.map(origIdx => {
    const base = grid.getCell(signedCells[origIdx].pos).candidates.values();
    const forbidden = new Set<number>();
    for (const adj of distinctAdj[origIdx]) {
      if (placedValue[adj] !== null) forbidden.add(placedValue[adj] as number);
    }
    return base.filter(d => !forbidden.has(d)).sort((x, y) => x - y);
  });

  const allowedEmpty: Set<number>[] = emptyOriginalIndices.map(() => new Set<number>());

  // No empty cells: trivially satisfied iff placed sum already equals target
  if (emptyOriginalIndices.length === 0) {
    const allowedFull: Set<number>[] = signedCells.map((_, i) =>
      placedValue[i] !== null ? new Set([placedValue[i] as number]) : new Set(),
    );
    return { allowedPerCell: allowedFull, feasible: remaining === 0 };
  }

  // Range pruning helpers per empty position
  const minContrib = new Array<number>(emptyOriginalIndices.length);
  const maxContrib = new Array<number>(emptyOriginalIndices.length);
  for (let k = 0; k < emptyOriginalIndices.length; k++) {
    const cands = candidatesPerEmpty[k];
    if (cands.length === 0) {
      // Infeasible — no valid candidate left
      return {
        allowedPerCell: signedCells.map((_, i) =>
          placedValue[i] !== null ? new Set([placedValue[i] as number]) : new Set(),
        ),
        feasible: false,
      };
    }
    const sign = signedCells[emptyOriginalIndices[k]].sign;
    const lo = sign * cands[0];
    const hi = sign * cands[cands.length - 1];
    minContrib[k] = Math.min(lo, hi);
    maxContrib[k] = Math.max(lo, hi);
  }

  // Suffix min/max for pruning
  const minSuffix = new Array<number>(emptyOriginalIndices.length + 1);
  const maxSuffix = new Array<number>(emptyOriginalIndices.length + 1);
  minSuffix[emptyOriginalIndices.length] = 0;
  maxSuffix[emptyOriginalIndices.length] = 0;
  for (let k = emptyOriginalIndices.length - 1; k >= 0; k--) {
    minSuffix[k] = minSuffix[k + 1] + minContrib[k];
    maxSuffix[k] = maxSuffix[k + 1] + maxContrib[k];
  }

  const assignment = new Array<number>(emptyOriginalIndices.length);
  let feasible = false;

  function backtrack(pos: number, currentSum: number): void {
    if (pos === emptyOriginalIndices.length) {
      if (currentSum === remaining) {
        feasible = true;
        for (let k = 0; k < emptyOriginalIndices.length; k++) allowedEmpty[k].add(assignment[k]);
      }
      return;
    }

    const origIdx = emptyOriginalIndices[pos];
    const sign = signedCells[origIdx].sign;

    for (const d of candidatesPerEmpty[pos]) {
      const newSum = currentSum + sign * d;

      if (newSum + minSuffix[pos + 1] > remaining) {
        // For sign = +1 and ascending candidates, larger d only increases — could break.
        // For sign = -1, larger d decreases. Skip with continue/break depending on sign.
        if (sign === 1) break;
        else continue;
      }
      if (newSum + maxSuffix[pos + 1] < remaining) {
        if (sign === 1) continue;
        else break;
      }

      // Distinctness vs earlier empty positions
      let conflict = false;
      for (const adj of distinctAdj[origIdx]) {
        const adjOrdinal = emptyOrdinalOf.get(adj);
        if (adjOrdinal !== undefined && adjOrdinal < pos && assignment[adjOrdinal] === d) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      assignment[pos] = d;
      backtrack(pos + 1, newSum);
    }
  }

  backtrack(0, 0);

  const allowedFull: Set<number>[] = signedCells.map((_, i) =>
    placedValue[i] !== null ? new Set([placedValue[i] as number]) : new Set(),
  );
  for (let k = 0; k < emptyOriginalIndices.length; k++) {
    allowedFull[emptyOriginalIndices[k]] = allowedEmpty[k];
  }

  return { allowedPerCell: allowedFull, feasible };
}
