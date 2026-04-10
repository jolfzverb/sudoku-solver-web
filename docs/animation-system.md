# Animation & Playback System

## Overview

The app supports three modes of solving:

1. **Instant solve** — solve immediately, browse steps afterward.
2. **Step-by-step (manual)** — click "Step" to advance one heuristic application at a time.
3. **Animated playback** — auto-advance steps at a configurable speed.

All three modes use the same data: an array of `SolveStep` objects produced by the solver's generator.

## Data Flow

```
Solver.solveIterative(grid, constraints)
  │
  │  yields SolveStep
  ▼
SolverContext.steps[]          ← accumulated steps
  │
  │  currentStepIndex
  ▼
usePlayback hook               ← controls timer, navigation
  │
  ├──► useHighlight hook       ← reads highlights from current step
  │     │
  │     ▼
  │   <HighlightOverlay />     ← renders colored cells/candidates on the grid
  │
  └──► <GridView />            ← renders grid state from step snapshot
        │
        ▼
      <StepList />             ← scrolls to and highlights current step
```

## Playback Controls

| Control | Action |
|---------|--------|
| **Solve All** | Exhaust the generator, populate all steps. Switch to browse mode. |
| **Step** | Call `generator.next()` once. Append step. Advance index. |
| **Play** | Start auto-advancing timer. |
| **Pause** | Stop timer. |
| **Speed slider** | Set interval between steps (50ms – 2000ms). |
| **Scrubber** | Range input to jump to any step index. |
| **Step Back** | Decrement `currentStepIndex`. |
| **Step Forward** | Increment `currentStepIndex` (or call `generator.next()` if at the end). |
| **Reset** | Clear solver state, restore initial grid. |

## Rendering a Step

When `currentStepIndex` changes, the UI performs this sequence:

### Phase 1: Show "Before" State
1. Restore grid to `steps[currentStepIndex].snapshotBefore`.
2. Render the grid as-is (no highlights yet).

### Phase 2: Show Reasoning (highlight)
3. Read `steps[currentStepIndex].highlights`.
4. `<HighlightOverlay>` renders colored rectangles/circles over cells and candidates.
   - `'trigger'` cells: green — the pattern that was found.
   - `'region'` cells: light blue outline — the region(s) involved.
   - `'elimination'` candidates: red — about to be eliminated.
   - `'target'` cells: gold — where a value will be placed.

### Phase 3: Apply Changes (animate)
5. After a visual hold (configurable, default 500ms in animated mode, instant in manual mode):
   - Placed digits fade in with a scale animation.
   - Eliminated candidates fade out.
6. The `StepDetail` in the `StepList` shows the description (e.g., "Naked Single: R3C5 = 7").

### Phase 4: Ready for Next Step
7. Grid now reflects the state after this step.
8. Timer fires again (in animated mode) or user clicks "Step" (in manual mode).

## State Management

### SolverContext (solverReducer)

```ts
interface SolverState {
  status: 'idle' | 'solving' | 'paused' | 'done';
  steps: SolveStep[];
  currentStepIndex: number;
  playbackSpeed: number;       // ms per step
  solveResult: SolveResult | null;
  generator: Generator<SolveStep, SolveResult, void> | null;
}
```

Actions:
- `START_SOLVE` — create generator, set status to `'solving'`.
- `STEP_FORWARD` — advance index (or call `generator.next()` if needed).
- `STEP_BACKWARD` — decrement index.
- `JUMP_TO_STEP` — set index directly (scrubber).
- `SET_SPEED` — update playback interval.
- `PAUSE` — stop timer, set status to `'paused'`.
- `RESUME` — restart timer, set status to `'solving'`.
- `SOLVE_COMPLETE` — set final result, status to `'done'`.
- `RESET` — clear all solver state.

### usePlayback Hook

```ts
function usePlayback(): {
  play(): void;
  pause(): void;
  stepForward(): void;
  stepBackward(): void;
  jumpTo(index: number): void;
  setSpeed(ms: number): void;
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
}
```

Uses `requestAnimationFrame` or `setTimeout` to auto-advance. Cleans up timer on pause/unmount.

### useHighlight Hook

```ts
function useHighlight(): {
  highlights: ReadonlyArray<HighlightGroup>;
  activeStep: SolveStep | null;
}
```

Reads from SolverContext based on `currentStepIndex`. Returns empty highlights when idle.

## Undo/Redo vs. Playback

These are **separate** systems:

- **Undo/redo** applies to manual user edits (entering digits, clearing cells). Managed by `PuzzleContext.undoStack / redoStack`. Ctrl+Z / Ctrl+Shift+Z.
- **Playback** applies to solver steps. Managed by `SolverContext.currentStepIndex`. Uses playback controls (scrubber, step buttons).

They don't interact. Starting a solve "freezes" the puzzle state. Resetting the solver restores the pre-solve grid.
