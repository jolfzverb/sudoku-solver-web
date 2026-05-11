import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';

export interface Elimination {
  readonly cell: CellPosition;
  readonly digit: number;
}

export interface Violation {
  readonly constraintId: string;
  readonly message: string;
  readonly cells: ReadonlyArray<CellPosition>;
}

export interface Constraint {
  readonly id: string;
  readonly type: string;
  readonly affectedCells: ReadonlyArray<CellPosition>;
  validate(grid: Grid): Violation[];
  getDirectEliminations(grid: Grid): Elimination[];
}

/**
 * Sum-constraint generalisation.
 *
 * Asserts `Σ(sign_i · digit_i) = targetSum` over `signedCells`, with pairwise
 * distinctness only on indices listed in `distinctEdges`. Used to unify
 * user-declared killer cages (`CageSumConstraint`) and constraints derived
 * by heuristics (e.g. innies/outies virtuals).
 *
 * A `CageSumConstraint` is the special case where all signs are `+1` and
 * every pair of indices is in `distinctEdges` (a single full clique).
 * `isPureKillerCage()` accepts both `+1`-everywhere and `-1`-everywhere as
 * "pure killer cage" because they are equivalent under sign flip.
 */
export interface SumConstraint extends Constraint {
  readonly signedCells: ReadonlyArray<{ pos: CellPosition; sign: 1 | -1 }>;
  readonly targetSum: number;
  readonly distinctEdges: ReadonlyArray<readonly [number, number]>;
  isPureKillerCage(): boolean;
}
