# Solver Pipeline

## Execution Model

The solver uses a **priority-ordered, round-robin pipeline**:

```
1. INITIALIZE
   Fill all candidates for unsolved cells: digits [1..size]
   Apply constraint direct eliminations (initial propagation)

2. LOOP
   for each heuristic in priority order (cheapest first):
     result = heuristic.apply(grid, constraints)
     if result is not null:
       Record the SolveStep
       Apply placements and eliminations to the grid
       RESTART from the top of the loop (cheapest heuristic)
     else:
       Continue to next heuristic

3. EXIT CONDITIONS
   - All cells filled → SOLVED
   - No heuristic made progress:
     - Any cell has 0 candidates → CONTRADICTION
     - Otherwise → fall through to BACKTRACKING

4. BACKTRACKING (last resort)
   Pick unsolved cell with fewest candidates (MRV)
   For each candidate:
     Snapshot grid
     Place candidate
     Recurse to step 2
     If solved → done
     If contradiction → restore snapshot, try next candidate
   All candidates exhausted → UNSOLVABLE
```

### Why Restart From the Top?

After each successful step, the pipeline restarts from the cheapest heuristic (naked singles). Rationale:

- Naked Single is O(1) per cell; X-Wing is O(n^4).
- After an elimination, new naked singles often appear.
- Restarting from cheap heuristics prevents unnecessary expensive scans.
- This mimics how humans solve: after spotting something, re-scan for easy pickings.

## Priority Order

| Priority | Tier | Heuristics | Approx. Cost |
|----------|------|-----------|--------------|
| 0 | basic | Naked Single, Hidden Single | O(n^2) per scan |
| 1 | basic | Constraint Direct Eliminations | O(constraints) |
| 2 | intermediate | Naked Pair, Hidden Pair, Pointing Pair, Box/Line Reduction | O(n^2 * k) |
| 3 | intermediate | Naked Triple, Hidden Triple | O(n^2 * k^2) |
| 4 | advanced | Naked Quad, Hidden Quad | O(n^2 * k^3) |
| 5 | advanced | X-Wing, Swordfish, Jellyfish | O(n^3) to O(n^5) |
| 6 | expert | XY-Wing, XYZ-Wing | O(n^3) |
| 7 | expert | Simple Coloring, Advanced Coloring | O(n^2) graph traversal |
| 8 | brute-force | Backtracking | Exponential (bounded) |

Where n = grid size (9), k = candidates per cell.

## Generator Interface

```ts
interface Solver {
  /** Run to completion, return full result. */
  solve(grid: Grid, constraints: ConstraintSet, options?: SolverOptions): SolveResult;

  /** Yield one step at a time. */
  solveIterative(
    grid: Grid,
    constraints: ConstraintSet,
    options?: SolverOptions
  ): Generator<SolveStep, SolveResult, void>;
}

interface SolverOptions {
  maxSteps?: number;                          // safety limit (default: 10000)
  enabledHeuristics?: ReadonlyArray<string>;  // subset to use; default = all
}
```

### Usage Patterns

**Instant solve:**
```ts
const result = solver.solve(grid, constraints);
// result.steps contains all steps
// result.heuristicCounts has per-heuristic stats
```

**Step-by-step (UI-driven):**
```ts
const gen = solver.solveIterative(grid, constraints);

// On each "Step" button click:
const { value, done } = gen.next();
if (!done) {
  applyStep(value); // SolveStep
} else {
  showResult(value); // SolveResult
}
```

**Animated playback:**
```ts
const gen = solver.solveIterative(grid, constraints);
// Timer calls gen.next() at configured interval
// Each yielded SolveStep is added to the step list
// UI renders the current step with highlights
```

The solver is **fully synchronous and deterministic**. No setTimeout, no DOM, no async. For long-running solves (16x16 with backtracking), it can be offloaded to a Web Worker.

## SolveResult

```ts
interface SolveResult {
  readonly solved: boolean;
  readonly steps: ReadonlyArray<SolveStep>;
  readonly heuristicCounts: ReadonlyMap<string, number>;
  readonly difficulty: DifficultyTier;    // highest tier used
  readonly durationMs: number;
  readonly finalGrid: GridSnapshot;
}
```

The `difficulty` is determined by the highest-tier heuristic that was actually applied. A puzzle solvable with only naked and hidden singles is "basic"; one requiring X-Wing is "advanced".

## Constraint-Specific Heuristics

Some heuristics only make sense when certain constraint types are present:

- Cage sum elimination → requires `cage-sum` constraints
- Thermo bounds tightening → requires `thermo` constraints
- Arrow sum constraints → requires `arrow-sum` constraints

These heuristics declare `requiresConstraintTypes` in their definition. The pipeline checks this against the active constraint set and skips inapplicable heuristics. Zero overhead for puzzles that don't use those variants.

## Backtracking Integration

Backtracking is the last resort. It's a heuristic like any other, implementing the `Heuristic` interface, but:

1. It picks the cell with the **fewest candidates** (Minimum Remaining Values heuristic) to minimize branching.
2. Each guess is recorded as a `SolveStep` with `heuristicId = 'backtracking'`.
3. After placing a guess, it runs the full pipeline recursively.
4. If a contradiction is reached, it records a "backtrack" step, restores the snapshot, and tries the next candidate.
5. Backtracking steps are visually distinct in the UI (different color/icon).

## Performance Considerations

- **CandidateSet bitfield operations** are the hottest path. Intersection/union/difference are single bitwise ops.
- **Region indexing:** `ConstraintSet` maintains a cell→constraints index for O(1) lookup.
- **Early termination:** Heuristics return on the first pattern found, not all patterns.
- **Lazy evaluation:** More expensive heuristics are only reached if cheaper ones fail.
- **Web Worker:** For 16x16 grids or puzzles requiring heavy backtracking, the solver can run in a Web Worker to avoid blocking the UI thread.
