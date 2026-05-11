import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { SumConstraint, Violation, Elimination } from './types';
import { enumerateSumAssignments } from './SumEnumeration';
import { CageComboSet, computePureKillerCageCombos } from './CageComboSet';

/**
 * A signed-sum constraint derived by a heuristic (typically innies/outies).
 *
 * Differs from user `CageSumConstraint` only in `type` and that the cell
 * signs and distinctness cliques can be heterogeneous. Existing heuristics
 * that want to consume virtuals should gate on `isPureKillerCage()`.
 */
export class VirtualSumConstraint implements SumConstraint {
  readonly id: string;
  readonly type = 'virtual-sum';
  readonly signedCells: ReadonlyArray<{ pos: CellPosition; sign: 1 | -1 }>;
  readonly targetSum: number;
  readonly distinctEdges: ReadonlyArray<readonly [number, number]>;
  readonly affectedCells: ReadonlyArray<CellPosition>;
  readonly source: string;

  constructor(
    id: string,
    signedCells: ReadonlyArray<{ pos: CellPosition; sign: 1 | -1 }>,
    targetSum: number,
    distinctEdges: ReadonlyArray<readonly [number, number]>,
    source: string,
  ) {
    this.id = id;
    this.signedCells = signedCells;
    this.targetSum = targetSum;
    this.distinctEdges = distinctEdges;
    this.affectedCells = signedCells.map(sc => sc.pos);
    this.source = source;
  }

  /**
   * True iff this virtual reduces to a user-style killer cage: uniform sign
   * (all +1 or all -1; the latter is equivalent under `targetSum → -targetSum`)
   * and a full pairwise distinctness clique.
   */
  isPureKillerCage(): boolean {
    if (this.signedCells.length === 0) return false;
    const firstSign = this.signedCells[0].sign;
    for (const sc of this.signedCells) if (sc.sign !== firstSign) return false;
    const n = this.signedCells.length;
    const expected = (n * (n - 1)) / 2;
    const seen = new Set<string>();
    for (const [a, b] of this.distinctEdges) {
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      seen.add(`${lo},${hi}`);
    }
    return seen.size === expected;
  }

  validate(grid: Grid): Violation[] {
    let sum = 0;
    for (const sc of this.signedCells) {
      const cell = grid.getCell(sc.pos);
      if (cell.value === null) return [];
      sum += sc.sign * cell.value;
    }
    if (sum !== this.targetSum) {
      return [{
        constraintId: this.id,
        message: `Derived sum mismatch (${this.source}): expected ${this.targetSum}, got ${sum}`,
        cells: [...this.affectedCells],
      }];
    }
    return [];
  }

  /**
   * Pure-killer-cage combo computation. Only meaningful when
   * `isPureKillerCage()` is true; throws otherwise. Sign is normalised so
   * the returned combos are in positive-sum convention regardless of the
   * underlying cell signs.
   */
  computeCombos(grid: Grid): {
    placedDigits: Set<number>;
    emptyCells: Array<{ pos: CellPosition; candidates: number[] }>;
    combos: CageComboSet;
  } {
    if (!this.isPureKillerCage()) {
      throw new Error(`computeCombos is only defined for pure killer cages; ${this.id} is not.`);
    }
    const sign = this.signedCells[0].sign;
    const cells = this.signedCells.map(sc => sc.pos);
    const effectiveTarget = sign === 1 ? this.targetSum : -this.targetSum;
    return computePureKillerCageCombos(cells, effectiveTarget, grid);
  }

  getDirectEliminations(grid: Grid): Elimination[] {
    const result = enumerateSumAssignments(grid, this.signedCells, this.targetSum, this.distinctEdges);
    if (!result.feasible) return [];

    const elims: Elimination[] = [];
    for (let i = 0; i < this.signedCells.length; i++) {
      const cell = grid.getCell(this.signedCells[i].pos);
      if (cell.value !== null) continue;
      const allowed = result.allowedPerCell[i];
      for (const d of cell.candidates.values()) {
        if (!allowed.has(d)) elims.push({ cell: this.signedCells[i].pos, digit: d });
      }
    }
    return elims;
  }
}
