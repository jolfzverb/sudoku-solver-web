import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { SumConstraint, Violation, Elimination } from './types';
import { CageComboSet, computePureKillerCageCombos } from './CageComboSet';

export class CageSumConstraint implements SumConstraint {
  readonly id: string;
  readonly type = 'cage-sum';
  readonly affectedCells: ReadonlyArray<CellPosition>;
  readonly targetSum: number;
  readonly signedCells: ReadonlyArray<{ pos: CellPosition; sign: 1 | -1 }>;
  readonly distinctEdges: ReadonlyArray<readonly [number, number]>;

  constructor(id: string, cells: CellPosition[], targetSum: number) {
    this.id = id;
    this.affectedCells = cells;
    this.targetSum = targetSum;
    this.signedCells = cells.map(p => ({ pos: p, sign: 1 as const }));
    const edges: [number, number][] = [];
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) edges.push([i, j]);
    }
    this.distinctEdges = edges;
  }

  /**
   * A `CageSumConstraint` is constructed with all signs `+1` and a full
   * clique, which is the canonical "pure killer cage" — return `true`.
   * The `SumConstraint` predicate also accepts all-`-1` (equivalent under
   * sign flip); both forms are honoured by consumers via this method.
   */
  isPureKillerCage(): boolean {
    return true;
  }

  validate(grid: Grid): Violation[] {
    const values: number[] = [];
    let allFilled = true;
    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) {
        values.push(cell.value);
      } else {
        allFilled = false;
      }
    }
    const violations: Violation[] = [];
    const seen = new Set<number>();
    for (const v of values) {
      if (seen.has(v)) {
        violations.push({ constraintId: this.id, message: `Duplicate digit ${v} in cage`, cells: [...this.affectedCells] });
        break;
      }
      seen.add(v);
    }
    if (allFilled) {
      const sum = values.reduce((a, b) => a + b, 0);
      if (sum !== this.targetSum) {
        violations.push({ constraintId: this.id, message: `Cage sum is ${sum}, expected ${this.targetSum}`, cells: [...this.affectedCells] });
      }
    }
    return violations;
  }

  /**
   * Compute current valid combos for the cage based on grid state.
   * Returns placed digits, empty cell info, and the combo set.
   */
  computeCombos(grid: Grid): {
    placedDigits: Set<number>;
    emptyCells: Array<{ pos: CellPosition; candidates: number[] }>;
    combos: CageComboSet;
  } {
    return computePureKillerCageCombos(this.affectedCells, this.targetSum, grid);
  }

  getDirectEliminations(grid: Grid): Elimination[] {
    const eliminations: Elimination[] = [];
    const { placedDigits, emptyCells, combos } = this.computeCombos(grid);

    if (emptyCells.length === 0) return eliminations;

    // Eliminate placed digits from empty cells (cage uniqueness)
    for (const { pos, candidates } of emptyCells) {
      for (const d of candidates) {
        if (placedDigits.has(d)) {
          eliminations.push({ cell: pos, digit: d });
        }
      }
    }

    // Eliminate candidates not in any valid combination
    const validDigits = combos.getValidDigits();
    for (const { pos, candidates } of emptyCells) {
      for (const d of candidates) {
        if (!placedDigits.has(d) && !validDigits.has(d)) {
          eliminations.push({ cell: pos, digit: d });
        }
      }
    }

    return eliminations;
  }
}
