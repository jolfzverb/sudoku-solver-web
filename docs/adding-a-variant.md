# Adding a New Sudoku Variant

This tutorial walks through adding a new variant to the solver. We'll use **Diagonal Sudoku** as a simple example, then discuss more complex variants.

## Step 1: Define the Constraint

If your variant introduces a new rule type, create a constraint class.

**File:** `packages/solver-engine/src/constraint/DiagonalConstraint.ts`

For Diagonal Sudoku, the rule is "each main diagonal must contain unique digits." This is identical to the existing `RegionConstraint` — just applied to diagonal cells. So we can reuse `RegionConstraint` directly.

For a truly new rule (like Killer's cage sums), you'd implement the `Constraint` interface:

```ts
import { Constraint, Elimination, Violation } from './Constraint';
import { Grid } from '../model/Grid';
import { CellPosition } from '../model/Cell';

class MyNewConstraint implements Constraint {
  readonly id: string;
  readonly type = 'my-rule';
  readonly affectedCells: ReadonlyArray<CellPosition>;

  validate(grid: Grid): Violation[] {
    // Check if current grid state violates this rule
  }

  getDirectEliminations(grid: Grid): Elimination[] {
    // What candidates can be immediately ruled out?
  }
}
```

## Step 2: Define the Variant

Create a `VariantDefinition` that builds regions and constraints.

**File:** `packages/solver-engine/src/variant/DiagonalVariant.ts`

```ts
import { VariantDefinition, VariantExtraData } from './Variant';
import { Region } from '../model/Region';
import { Grid } from '../model/Grid';
import { Constraint } from '../constraint/Constraint';
import { RegionConstraint } from '../constraint/RegionConstraint';

const DiagonalVariant: VariantDefinition = {
  name: 'diagonal',
  displayName: 'Diagonal Sudoku',
  description: 'Classic rules plus both main diagonals must contain unique digits.',
  supportedSizes: [9],

  buildRegions(size: number): Region[] {
    // Standard rows, columns, boxes (inherited from classic)
    // PLUS two diagonal regions:
    const mainDiag: Region = {
      id: 'diagonal-main',
      type: 'diagonal',
      cells: Array.from({ length: size }, (_, i) => ({ row: i, col: i })),
    };
    const antiDiag: Region = {
      id: 'diagonal-anti',
      type: 'diagonal',
      cells: Array.from({ length: size }, (_, i) => ({ row: i, col: size - 1 - i })),
    };
    return [mainDiag, antiDiag];
  },

  buildConstraints(grid: Grid, _extraData?: VariantExtraData): Constraint[] {
    // One RegionConstraint per diagonal region
    return grid.spec.regions
      .filter(r => r.type === 'diagonal')
      .map(r => new RegionConstraint(r));
  },

  applicableHeuristics(): string[] {
    // All standard heuristics work on diagonal regions automatically
    return [];
  },
};
```

## Step 3: Register the Variant

Add it to the `VariantRegistry`.

**File:** `packages/solver-engine/src/variant/VariantRegistry.ts`

```ts
registry.register(DiagonalVariant);
```

## Step 4: (Optional) Add Variant-Specific Heuristics

If your variant needs specialized heuristics, implement the `Heuristic` interface:

```ts
const myHeuristic: Heuristic = {
  id: 'cage-combination-elimination',
  displayName: 'Cage Combination Elimination',
  difficulty: 'basic',
  requiresConstraintTypes: ['cage-sum'],

  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null {
    // Scan cage-sum constraints
    // Find eliminations based on impossible combinations
    // Return SolveStep or null
  },
};
```

Register it in `HeuristicRegistry`.

## Step 5: (Optional) Add UI Support

For variants with visual elements (cages, thermos, arrows), add rendering to the grid:

1. **`ConstraintOverlay`** — draw the visual (dashed cage outlines, thermo lines, arrow shapes).
2. **`ConstraintEditor`** — let users draw/define the constraint interactively.

For Diagonal Sudoku, the overlay would draw subtle diagonal lines across the grid.

## Variant Composition

Variants are designed to compose. When multiple variants are active:

1. Each variant's `buildRegions()` is called. Regions are merged.
2. Each variant's `buildConstraints()` is called. Constraints are merged into one `ConstraintSet`.
3. The solver processes the unified constraint set.

Example: "Killer + Diagonal" produces:
- Standard row/col/box `RegionConstraint`s (from Killer's base)
- `CageSumConstraint`s (from Killer)
- Two diagonal `RegionConstraint`s (from Diagonal)

All standard heuristics automatically work on the diagonal regions because they operate on `RegionConstraint` generically.

## Checklist

- [ ] Constraint class (if new rule type)
- [ ] `VariantDefinition` implementation
- [ ] Register in `VariantRegistry`
- [ ] Variant-specific heuristics (if needed)
- [ ] Register heuristics in `HeuristicRegistry`
- [ ] UI overlay rendering (if visual elements)
- [ ] UI editor (if user needs to define constraints)
- [ ] Test fixtures (sample puzzles)
- [ ] Tests for constraint validation and elimination
