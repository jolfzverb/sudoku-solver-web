# Constraint System

## Overview

The constraint system is the core abstraction that makes variant support possible. Every puzzle rule — "each row has unique digits", "this cage sums to 15", "values increase along this thermometer" — is modeled as a `Constraint` object.

The solver and heuristics **never know which variant they're solving**. They only see a grid and a set of constraints. This is what makes the system extensible.

## Constraint Interface

```ts
// constraint/Constraint.ts
interface Constraint {
  readonly id: string;
  readonly type: string;                           // e.g. 'row-unique', 'cage-sum', 'thermo'
  readonly affectedCells: ReadonlyArray<CellPosition>;

  /** Check which cells/candidates violate this constraint.
   *  Used for validation highlighting in the UI. */
  validate(grid: Grid): ReadonlyArray<Violation>;

  /** Return candidate eliminations directly implied by this constraint.
   *  Used by constraint-aware heuristics and initial propagation. */
  getDirectEliminations(grid: Grid): ReadonlyArray<Elimination>;
}

interface Violation {
  readonly constraint: Constraint;
  readonly cells: ReadonlyArray<CellPosition>;
  readonly message: string;     // e.g. "Duplicate 5 in row 3"
}

interface Elimination {
  readonly cell: CellPosition;
  readonly digit: number;
  readonly reason: string;      // e.g. "5 already placed in row 3"
}
```

## ConstraintSet

```ts
// constraint/ConstraintSet.ts
interface ConstraintSet {
  readonly constraints: ReadonlyArray<Constraint>;

  add(constraint: Constraint): void;
  remove(id: string): void;

  getConstraintsFor(pos: CellPosition): ReadonlyArray<Constraint>;
  getConstraintsByType(type: string): ReadonlyArray<Constraint>;

  validateAll(grid: Grid): ReadonlyArray<Violation>;
}
```

`ConstraintSet` manages all active constraints for a puzzle. It provides:
- **Lookup by cell:** "Which constraints affect cell R3C5?" — used by heuristics to find relevant constraints.
- **Lookup by type:** "Give me all `cage-sum` constraints" — used by variant-specific heuristics.
- **Bulk validation:** Check all constraints at once.

Internally, `ConstraintSet` maintains an index `Map<CellPosition, Constraint[]>` for fast lookup.

## Built-in Constraint Types

### RegionConstraint (uniqueness)

The most common constraint: "all cells in this region must contain distinct values."

Used for: rows, columns, boxes, diagonals, jigsaw regions.

```ts
class RegionConstraint implements Constraint {
  type = 'region-unique';
  // validate: checks for duplicate values in the region
  // getDirectEliminations: if cell X has value 5, eliminate 5 from all peers in the region
}
```

**Key insight:** Rows, columns, standard boxes, diagonals, and jigsaw regions all use the same `RegionConstraint`. The only difference is which cells belong to the region. This means **all standard heuristics (naked singles, hidden pairs, X-Wing, etc.) work automatically** on diagonals and jigsaw regions.

### CageSumConstraint (Killer)

"The digits in these cells must sum to N, using distinct digits."

```ts
class CageSumConstraint implements Constraint {
  type = 'cage-sum';
  readonly sum: number;
  // getDirectEliminations: enumerate valid digit combinations for the cage,
  //   eliminate candidates that don't appear in any valid combination
}
```

### ThermometerConstraint

"Values must strictly increase along this path."

```ts
class ThermometerConstraint implements Constraint {
  type = 'thermo';
  // The path is stored as an ordered list of CellPositions.
  // getDirectEliminations: cell at position i in a thermo of length L
  //   in a size-N grid can only hold values [i+1 .. N-L+i+1]
}
```

### ArrowSumConstraint

"The value in the circle cell(s) equals the sum of values along the shaft."

```ts
class ArrowSumConstraint implements Constraint {
  type = 'arrow-sum';
  readonly circleCells: ReadonlyArray<CellPosition>;  // usually 1-2 cells forming the number
  readonly shaftCells: ReadonlyArray<CellPosition>;
  // getDirectEliminations: based on min/max possible sums of the shaft
}
```

### DiagonalConstraint

Just a `RegionConstraint` for the main diagonal(s). The `DiagonalVariant` creates two `RegionConstraint` instances — one for each diagonal.

## How Variants Create Constraints

See [Adding a Variant](adding-a-variant.md) for a full tutorial.

The flow:

1. User selects a variant (e.g., "Killer") and provides extra data (cage definitions).
2. `VariantDefinition.buildRegions(size)` creates the standard regions (rows, columns, boxes).
3. `VariantDefinition.buildConstraints(grid, extraData)` creates:
   - One `RegionConstraint` per row, column, and box (standard).
   - One `CageSumConstraint` per cage (variant-specific).
4. All constraints are added to `ConstraintSet`.

## Composability

Variants can be combined. A "Killer + Diagonal" puzzle:
- `KillerVariant` produces `RegionConstraint`s (rows/cols/boxes) + `CageSumConstraint`s.
- `DiagonalVariant` produces two additional `RegionConstraint`s (diagonals).
- `ConstraintSet` is the union of both.

The solver doesn't care — it just iterates over the constraint set.

## Validation vs. Elimination

Two distinct roles:

- **`validate(grid)`**: "Is the grid currently consistent?" Returns violations (e.g., "duplicate 5 in row 3"). Used by the UI to highlight errors in real time as the user enters digits.

- **`getDirectEliminations(grid)`**: "What candidates can we rule out right now based on this constraint alone?" Used by the solver during initial propagation and by constraint-aware heuristics. For a `RegionConstraint`, this eliminates a digit from peers when it's placed. For a `CageSumConstraint`, this enumerates valid combinations and eliminates impossible digits.
