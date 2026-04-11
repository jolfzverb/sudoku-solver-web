import { useEffect, useCallback, useRef } from 'react';
import { PuzzleProvider } from './state/PuzzleContext';
import { SolverProvider } from './state/SolverContext';
import { AppLayout } from './components/layout/AppLayout';
import { GridView } from './components/grid/GridView';
import { SetupPanel } from './components/controls/SetupPanel';
import { PlaybackControls } from './components/controls/PlaybackControls';
import { ReportPanel } from './components/report/ReportPanel';
import { usePuzzle } from './state/PuzzleContext';
import { useSolver } from './state/SolverContext';
import { useHighlight } from './hooks/useHighlight';
import { CellPosition } from '@sudoku/solver-engine';
import './App.css';

function GridArea() {
  const { state: puzzle, dispatch } = usePuzzle();
  const { state: solver } = useSolver();
  const { highlights } = useHighlight();

  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const isDigitMode = puzzle.status === 'setup' && puzzle.editMode === 'digit';

  const handleCellClick = useCallback((pos: CellPosition) => {
    if (puzzle.status === 'setup' && puzzle.editMode !== 'digit') {
      dispatch({ type: 'ADD_PENDING_CELL', pos });
    } else {
      dispatch({ type: 'SELECT_CELL', pos });
      // Focus hidden input to raise mobile keyboard (only if not already focused)
      if (isDigitMode && document.activeElement !== hiddenInputRef.current) {
        setTimeout(() => hiddenInputRef.current?.focus(), 0);
      }
    }
  }, [dispatch, puzzle.status, puzzle.editMode, isDigitMode]);

  // Handle input from hidden element (mobile keyboard)
  const handleHiddenInput = useCallback((e: React.FormEvent<HTMLInputElement>) => {
    if (!puzzle.selectedCell) return;
    const val = e.currentTarget.value;
    e.currentTarget.value = '';
    const digit = parseInt(val);
    if (digit >= 1 && digit <= puzzle.size) {
      dispatch({ type: 'SET_CELL_VALUE', pos: puzzle.selectedCell, digit });
    }
  }, [dispatch, puzzle.selectedCell, puzzle.size]);

  const handleHiddenKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!puzzle.selectedCell) return;

    const digit = parseInt(e.key);
    if (digit >= 1 && digit <= puzzle.size) {
      dispatch({ type: 'SET_CELL_VALUE', pos: puzzle.selectedCell, digit });
      e.preventDefault();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      dispatch({ type: 'SET_CELL_VALUE', pos: puzzle.selectedCell, digit: null });
      e.preventDefault();
      return;
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const { row, col } = puzzle.selectedCell;
      let newRow = row, newCol = col;
      if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
      if (e.key === 'ArrowDown') newRow = Math.min(puzzle.size - 1, row + 1);
      if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
      if (e.key === 'ArrowRight') newCol = Math.min(puzzle.size - 1, col + 1);
      dispatch({ type: 'SELECT_CELL', pos: { row: newRow, col: newCol } });
    }
  }, [dispatch, puzzle.selectedCell, puzzle.size]);

  // Blur hidden input when leaving digit mode or deselecting
  useEffect(() => {
    if (!isDigitMode || !puzzle.selectedCell) {
      if (document.activeElement === hiddenInputRef.current) {
        hiddenInputRef.current?.blur();
      }
    }
  }, [isDigitMode, puzzle.selectedCell]);

  // Keyboard handler for desktop (physical keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (puzzle.status !== 'setup' || puzzle.editMode !== 'digit') return;
      if (!puzzle.selectedCell) return;
      // Skip if hidden input is focused (it handles its own events)
      if (document.activeElement === hiddenInputRef.current) return;

      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= puzzle.size) {
        dispatch({ type: 'SET_CELL_VALUE', pos: puzzle.selectedCell, digit });
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        dispatch({ type: 'SET_CELL_VALUE', pos: puzzle.selectedCell, digit: null });
        return;
      }
      if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const { row, col } = puzzle.selectedCell;
        let newRow = row, newCol = col;
        if (e.key === 'ArrowUp') newRow = Math.max(0, row - 1);
        if (e.key === 'ArrowDown') newRow = Math.min(puzzle.size - 1, row + 1);
        if (e.key === 'ArrowLeft') newCol = Math.max(0, col - 1);
        if (e.key === 'ArrowRight') newCol = Math.min(puzzle.size - 1, col + 1);
        dispatch({ type: 'SELECT_CELL', pos: { row: newRow, col: newCol } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, puzzle.selectedCell, puzzle.status, puzzle.editMode, puzzle.size]);

  // Determine which grid snapshot to show
  const step = solver.currentStepIndex >= 0 ? solver.steps[solver.currentStepIndex] : null;
  const isLastStep = solver.status === 'done' && solver.currentStepIndex === solver.steps.length - 1;
  const grid = isLastStep
    ? (solver.currentGrid ?? puzzle.grid)
    : (step?.snapshotBefore ?? solver.currentGrid ?? puzzle.grid);

  return (
    <>
      {/* Hidden input kept in DOM during digit mode to maintain mobile keyboard */}
      <input
        ref={hiddenInputRef}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        aria-hidden="true"
        tabIndex={-1}
        onInput={handleHiddenInput}
        onKeyDown={handleHiddenKeyDown}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
          padding: 0,
          border: 'none',
          pointerEvents: 'none',
        }}
      />
      <GridView
        grid={grid}
        size={grid.size}
        highlights={highlights}
        selectedCell={puzzle.selectedCell}
        onCellClick={handleCellClick}
        constraints={puzzle.constraints}
        pendingCells={puzzle.pendingCells}
        editMode={puzzle.editMode}
      />
    </>
  );
}

function App() {
  return (
    <PuzzleProvider>
      <SolverProvider>
        <AppLayout
          header={<h1>Sudoku Solver</h1>}
          grid={<GridArea />}
          controls={
            <>
              <SetupPanel />
              <PlaybackControls />
            </>
          }
          report={<ReportPanel />}
        />
      </SolverProvider>
    </PuzzleProvider>
  );
}

export default App;
