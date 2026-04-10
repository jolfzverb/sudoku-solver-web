# Heuristics Guide

## Overview

A heuristic is a logical technique that a human solver would use. Each heuristic is a pluggable unit that:

1. Examines the grid and constraints.
2. Finds a pattern (e.g., "only one candidate left in R3C5").
3. Returns a `SolveStep` describing what changed (or `null` if no pattern found).

Heuristics **never mutate the grid**. They return a description of changes. The solver applies them.

## Heuristic Interface

```ts
// heuristic/Heuristic.ts
interface Heuristic {
  readonly id: string;                // 'naked-single', 'x-wing', etc.
  readonly displayName: string;       // 'Naked Single', 'X-Wing', etc.
  readonly difficulty: DifficultyTier;
  readonly requiresConstraintTypes?: ReadonlyArray<string>;

  /**
   * Attempt to apply this heuristic.
   * Return null if no progress.
   * Return a SolveStep if progress was made.
   * MUST NOT mutate the grid.
   */
  apply(grid: Grid, constraints: ConstraintSet): SolveStep | null;
}

type DifficultyTier = 'basic' | 'intermediate' | 'advanced' | 'expert' | 'brute-force';
```

### The `apply()` Contract

- **Input:** A read-only view of the grid and constraints.
- **Output:** A `SolveStep` describing placements and/or eliminations, or `null`.
- **Side effects:** None. The heuristic must not modify any cell value or candidate.
- **Determinism:** Given the same grid state, `apply()` must return the same result.
- **Single step:** Return the first pattern found, not all of them. The pipeline will call the heuristic again after applying the step.

### The `requiresConstraintTypes` Field

Optional. If set, the pipeline only calls this heuristic when the constraint set contains at least one constraint of the specified type(s). For example, a cage-sum elimination heuristic sets `requiresConstraintTypes: ['cage-sum']` — it's skipped for classic puzzles.

## SolveStep

```ts
interface SolveStep {
  readonly heuristicId: string;
  readonly description: string;       // "Naked Single: R3C5 = 7"

  readonly placements: ReadonlyArray<{
    cell: CellPosition;
    digit: number;
  }>;

  readonly eliminations: ReadonlyArray<{
    cell: CellPosition;
    digit: number;
  }>;

  readonly highlights: ReadonlyArray<HighlightGroup>;
  readonly snapshotBefore: GridSnapshot;
}
```

### HighlightGroup

Used by the UI to visually explain the reasoning:

```ts
interface HighlightGroup {
  readonly role: string;    // 'trigger', 'target', 'elimination', 'region'
  readonly color: string;   // suggested color, e.g. '#4CAF50'
  readonly cells: ReadonlyArray<CellPosition>;
  readonly candidates?: ReadonlyArray<{ cell: CellPosition; digit: number }>;
}
```

Roles:
- `'trigger'` — the cells/candidates that form the pattern (e.g., the naked pair).
- `'target'` — the cell where a value is placed.
- `'elimination'` — the cells/candidates being eliminated.
- `'region'` — the region(s) involved in the reasoning.

## Difficulty Tiers

| Tier | Heuristics |
|------|-----------|
| `basic` | Naked Single, Hidden Single, Constraint Direct Eliminations |
| `intermediate` | Naked Pair, Hidden Pair, Pointing Pair, Box/Line Reduction, Naked Triple, Hidden Triple |
| `advanced` | Naked Quad, Hidden Quad, X-Wing, Swordfish, Jellyfish |
| `expert` | XY-Wing, XYZ-Wing, Simple Coloring, Advanced Coloring |
| `brute-force` | Backtracking |

The puzzle's overall difficulty is determined by the highest tier used to solve it.

## Planned Heuristics

| ID | Display Name | Tier | Description |
|----|-------------|------|-------------|
| `naked-single` | Naked Single | basic | Cell has only one candidate left |
| `hidden-single` | Hidden Single | basic | Digit can only go in one cell within a region |
| `constraint-elimination` | Constraint Elimination | basic | Direct eliminations from constraints (cage sums, thermo bounds) |
| `naked-pair` | Naked Pair | intermediate | Two cells in a region share the same two candidates |
| `naked-triple` | Naked Triple | intermediate | Three cells in a region share three candidates |
| `naked-quad` | Naked Quad | advanced | Four cells in a region share four candidates |
| `hidden-pair` | Hidden Pair | intermediate | Two digits restricted to the same two cells in a region |
| `hidden-triple` | Hidden Triple | intermediate | Three digits restricted to three cells in a region |
| `hidden-quad` | Hidden Quad | advanced | Four digits restricted to four cells in a region |
| `pointing-pair` | Pointing Pair | intermediate | A digit in a box is restricted to one row/column |
| `box-line-reduction` | Box/Line Reduction | intermediate | A digit in a row/column is restricted to one box |
| `x-wing` | X-Wing | advanced | A digit in two rows restricted to the same two columns (or vice versa) |
| `swordfish` | Swordfish | advanced | 3-row/column variant of X-Wing |
| `jellyfish` | Jellyfish | advanced | 4-row/column variant of X-Wing |
| `xy-wing` | XY-Wing | expert | Three bivalue cells forming a Y-shape |
| `xyz-wing` | XYZ-Wing | expert | Variant of XY-Wing with a trivalue pivot |
| `simple-coloring` | Simple Coloring | expert | Conjugate pair chains for a single digit |
| `advanced-coloring` | Advanced Coloring | expert | Multi-digit coloring chains |
| `backtracking` | Backtracking | brute-force | Guess + recurse (last resort) |

## Registration

Heuristics are registered in `HeuristicRegistry`:

```ts
// heuristic/HeuristicRegistry.ts
interface HeuristicRegistry {
  register(heuristic: Heuristic): void;
  getAll(): ReadonlyArray<Heuristic>;           // in priority order
  getById(id: string): Heuristic | undefined;
  getByTier(tier: DifficultyTier): ReadonlyArray<Heuristic>;
}
```

The pipeline iterates heuristics in the order returned by `getAll()`. Default order is from cheapest (basic) to most expensive (brute-force).

Users can configure which heuristics are enabled via `SolverOptions.enabledHeuristics`.

## Writing a New Heuristic

1. Create a file in `packages/solver-engine/src/heuristic/techniques/`.
2. Implement the `Heuristic` interface.
3. In `apply()`, scan the grid for your pattern. Return `null` if not found.
4. If found, construct a `SolveStep` with:
   - `placements` (if you're placing a digit)
   - `eliminations` (if you're removing candidates)
   - `highlights` (for the UI to visualize the reasoning)
   - `description` (human-readable explanation)
5. Export and register in the default registry.
