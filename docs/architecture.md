# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        React SPA (src/)                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  Grid View   │  │   Controls   │  │   Report Panel    │ │
│  │  (SVG-based) │  │  & Playback  │  │  (step list,      │ │
│  │              │  │              │  │   heuristic stats) │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘ │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴────────────────────┴──────────┐ │
│  │               State Layer (React Context)              │ │
│  │  PuzzleContext (grid, undo/redo)                       │ │
│  │  SolverContext (steps, playback, result)               │ │
│  └────────────────────────┬───────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │ imports
┌───────────────────────────┼─────────────────────────────────┐
│              Solver Engine (packages/solver-engine/)         │
│                    Pure TypeScript, zero DOM                 │
│                                                             │
│  ┌────────┐  ┌────────────┐  ┌───────────┐  ┌───────────┐ │
│  │ Model  │  │ Constraints │  │ Variants  │  │Heuristics │ │
│  │Grid    │  │Row/Col/Box  │  │Classic    │  │NakedSingle│ │
│  │Cell    │  │Cage/Thermo  │  │Killer     │  │HiddenPair │ │
│  │Region  │  │Arrow/Diag   │  │Thermo/... │  │XWing/...  │ │
│  └────┬───┘  └──────┬──────┘  └─────┬─────┘  └─────┬─────┘ │
│       │             │               │               │       │
│  ┌────┴─────────────┴───────────────┴───────────────┴─────┐ │
│  │                    Solver Pipeline                     │ │
│  │  Generator-based: yields SolveStep per heuristic hit   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Module Boundaries

### Solver Engine (`packages/solver-engine/`)

A framework-agnostic TypeScript library with **zero runtime dependencies**.
No React, no DOM, no browser APIs. Can be used standalone, in a Web Worker,
or published as an npm package.

Contains:
- **model/** -- Grid, Cell, Region, CandidateSet. The data structures.
- **constraint/** -- Constraint interface and implementations (row-unique, cage-sum, thermo, etc.).
- **variant/** -- VariantDefinition interface. Each variant (Classic, Killer, Thermo, Arrow, Diagonal, Jigsaw) creates regions + constraints.
- **heuristic/** -- Heuristic interface and implementations (naked/hidden singles through coloring and backtracking).
- **solver/** -- Solver orchestrator, SolveStep, SolveResult. Runs heuristics in priority order, records every step.
- **util/** -- CandidateSet (bitfield), coordinate helpers, combinatorial utilities.

### React SPA (`src/`)

The user-facing single-page application.

Contains:
- **components/grid/** -- SVG-based grid renderer with overlays for regions, constraints, and heuristic highlights.
- **components/controls/** -- Variant selector, solve buttons, playback controls (play/pause/speed/scrubber).
- **components/report/** -- Report panel showing applied heuristics, step list, and per-step details.
- **components/input/** -- Puzzle import (string/JSON), constraint editor (draw cages/thermos/arrows), region editor.
- **components/layout/** -- App shell, header, side panel.
- **hooks/** -- `useSolver`, `usePlayback`, `useGrid`, `useUndoRedo`, `useHighlight`.
- **state/** -- PuzzleContext + SolverContext with `useReducer`.

## Data Flow

```
User selects variant & size
  → VariantDefinition.buildRegions(size) → Region[]
  → GridFactory.create(size, regions) → Grid
  → VariantDefinition.buildConstraints(grid, extraData) → Constraint[]
  → ConstraintSet populated

User enters givens or imports puzzle

User clicks "Solve" or "Step"
  → Solver.solveIterative(grid, constraints) → Generator<SolveStep>
  → Each SolveStep stored in SolverContext.steps[]
  → UI renders grid at current step via snapshots + highlights

Playback controls navigate steps
  → currentStepIndex changes
  → Grid restored from snapshot, highlights rendered via HighlightOverlay
  → StepList scrolls to current step
```

## Technology Choices

| Choice | Rationale |
|--------|-----------|
| **React + TypeScript** | Strong ecosystem, component model fits the multi-panel UI |
| **Vite** | Fast dev server, native TS support, simple configuration |
| **SVG for grid** | Natural coordinate system for overlays (cages, thermos, arrows), resolution-independent, built-in animation, easy layering |
| **Separate solver-engine package** | Enforces clean boundary (no DOM leakage), testable in isolation, Web Worker ready, publishable |
| **Generator-based solver** | Single implementation supports instant solve (exhaust generator) and step-by-step (call `.next()`), no callbacks or events needed |
| **React Context + useReducer** | Sufficient for this scale (two contexts), avoids external state library overhead |
| **Bitfield CandidateSet** | O(1) set operations for candidates 1-16, efficient for hot path in solver |

## Folder Structure

```
sudoku-solver/
├── packages/solver-engine/   # Pure TS solver library
│   ├── src/
│   │   ├── model/
│   │   ├── constraint/
│   │   ├── variant/
│   │   ├── heuristic/techniques/
│   │   ├── solver/
│   │   └── util/
│   └── __tests__/
├── src/                      # React SPA
│   ├── components/
│   │   ├── layout/
│   │   ├── grid/
│   │   ├── controls/
│   │   ├── report/
│   │   └── input/
│   ├── hooks/
│   ├── state/
│   └── styles/
└── docs/                     # This documentation
```
