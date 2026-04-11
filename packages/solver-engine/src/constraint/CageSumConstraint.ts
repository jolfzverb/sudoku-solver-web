import { CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint, Violation, Elimination } from './types';
import { CageComboSet } from './CageComboSet';

export class CageSumConstraint implements Constraint {
  readonly id: string;
  readonly type = 'cage-sum';
  readonly affectedCells: ReadonlyArray<CellPosition>;
  readonly targetSum: number;

  constructor(id: string, cells: CellPosition[], targetSum: number) {
    this.id = id;
    this.affectedCells = cells;
    this.targetSum = targetSum;
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
    const placedDigits = new Set<number>();
    let placedSum = 0;
    const emptyCells: Array<{ pos: CellPosition; candidates: number[] }> = [];

    for (const pos of this.affectedCells) {
      const cell = grid.getCell(pos);
      if (cell.value !== null) {
        placedDigits.add(cell.value);
        placedSum += cell.value;
      } else {
        emptyCells.push({ pos, candidates: cell.candidates.values() });
      }
    }

    if (emptyCells.length === 0) {
      return { placedDigits, emptyCells, combos: new CageComboSet([]) };
    }

    const candidateUnion = new Set<number>();
    for (const { candidates } of emptyCells) {
      for (const d of candidates) {
        if (!placedDigits.has(d)) candidateUnion.add(d);
      }
    }

    const available: number[] = [];
    for (let d = 1; d <= grid.size; d++) {
      if (candidateUnion.has(d)) available.push(d);
    }

    const combos = CageComboSet.compute(available, emptyCells.length, this.targetSum - placedSum);
    return { placedDigits, emptyCells, combos };
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
