# Sudoku Solver

A web application for solving Sudoku puzzles using logical deduction — no backtracking. Supports multiple variants (Classic, Diagonal, Killer, Thermometer, Arrow, Jigsaw) with heuristic techniques and step-by-step visualization.

## Quick Start

```bash
make install   # npm install
make dev       # dev server at http://localhost:5173
```

## Features

- **Interactive grid editor** — click to place digits, draw thermometers, killer cages, and arrows
- **Step-by-step solving** — play/pause, step forward/backward, scrub through solution
- **No backtracking** — pure logical deduction with generator-based architecture
- **Highlighting** — color-coded visualization of each deduction step
- **Difficulty rating** — classifies puzzles by the hardest technique required

## Project Structure

```
src/                          # React frontend
  components/
    grid/GridView.tsx         # SVG grid with constraint overlays
    controls/SetupPanel.tsx   # Variant/size/constraint builder
    controls/PlaybackControls # Step-through playback
    report/ReportPanel.tsx    # Solving statistics
  state/                      # React Context + useReducer
  hooks/                      # useSolverRunner, usePlayback, useHighlight

packages/solver-engine/src/   # Pure TypeScript solver (no dependencies)
  model/                      # Grid, Cell, CandidateSet
  constraint/                 # RegionConstraint, ThermometerConstraint,
                              # CageSumConstraint, ArrowSumConstraint
  heuristic/techniques/       # 16 solving techniques
  variant/                    # 6 puzzle variant definitions
  solver/                     # Generator-based Solver
```

## Supported Variants

| Variant | Sizes | Description |
|---------|-------|-------------|
| Classic | 4, 6, 9, 16 | Standard Sudoku |
| Diagonal | 4, 9, 16 | + both main diagonals |
| Killer | 9 | + cage sum constraints |
| Thermometer | 9 | + strictly increasing paths |
| Arrow | 9 | + circle = sum of shaft |
| Jigsaw | 9 | Irregular box shapes |

## Solving Techniques

**Basic:** Naked Single, Hidden Single

**Intermediate:** Constraint Elimination, Naked Pair, Hidden Pair, Pointing Pair, Box Line Reduction

**Advanced:** Hidden Triple, Y-Wing, X-Wing, Swordfish, Jellyfish, Thermo Fork

**Expert:** Thermo Fish, Thermo Forcing, Parallel Thermos, Constraint Claiming

The solver applies heuristics in priority order, restarting from the cheapest after each successful step.

## How the Solver Works

The solver is a generator that yields `SolveStep` objects:

```typescript
const solver = new Solver(grid, constraints);
for (const step of solver.solveIterative()) {
  // step contains: placements, eliminations, highlights, description
}
```

Each step describes a single logical deduction — a placement or candidate elimination — with metadata for visualization. The frontend consumes these steps one at a time for interactive playback.

## Commands

| Command | Description |
|---------|-------------|
| `make install` | Install dependencies |
| `make dev` | Start dev server with HMR |
| `make build` | Type-check + production build |
| `make lint` | Run ESLint |
| `make preview` | Preview production build |
| `npm test` | Run test suite (Vitest) |

## Tech Stack

- **React 18** + **TypeScript 5.6** + **Vite 5**
- **Vitest** for testing (72 heuristic tests)
- Monorepo: frontend app + `@sudoku/solver-engine` package
- SVG-based grid rendering with constraint overlays
