import { useState } from 'react';
import { usePuzzle } from '../../state/PuzzleContext';
import { useSolverRunner } from '../../hooks/useSolverRunner';
import { GridSnapshot, CellSnapshot, CellPosition } from '@sudoku/solver-engine';
import { EditMode, UserConstraint } from '../../state/puzzleReducer';

const SIZES = [4, 6, 9, 16];

const EDIT_MODES: { mode: EditMode; label: string }[] = [
  { mode: 'digit', label: 'Digits' },
  { mode: 'thermo', label: 'Thermometer' },
  { mode: 'cage', label: 'Killer Cage' },
  { mode: 'arrow', label: 'Arrow' },
];

export function constraintLabel(c: UserConstraint): string {
  switch (c.type) {
    case 'thermo': return `Thermo (${c.cells.length} cells)`;
    case 'cage': return `Cage =${c.sum} (${c.cells.length} cells)`;
    case 'arrow': return `Arrow (${c.cells.length} cells)`;
    case 'diagonal': return c.id.includes('main') ? 'Main Diagonal' : 'Anti Diagonal';
  }
}

interface PuzzleData {
  size: number;
  givens: string;
  constraints: Array<{ type: string; cells: number[][]; sum?: number }>;
}

function serializePuzzle(
  size: number,
  grid: GridSnapshot,
  constraints: UserConstraint[],
): string {
  let givens = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid.cells[r * size + c];
      givens += cell.value !== null ? String(cell.value) : '.';
    }
  }

  const data: PuzzleData = {
    size,
    givens,
    constraints: constraints.map(c => ({
      type: c.type,
      cells: c.cells.map(p => [p.row, p.col]),
      ...(c.sum !== undefined ? { sum: c.sum } : {}),
    })),
  };

  return JSON.stringify(data);
}

function deserializePuzzle(json: string): {
  size: number;
  grid: GridSnapshot;
  constraints: UserConstraint[];
} {
  const data = JSON.parse(json) as PuzzleData & { variant?: string };

  if (!data.size || !data.givens) {
    throw new Error('Invalid puzzle format');
  }

  const size = data.size;
  if (data.givens.length !== size * size) {
    throw new Error(`Givens length ${data.givens.length} doesn't match size ${size}x${size}`);
  }

  const cells: CellSnapshot[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const ch = data.givens[r * size + c];
      const digit = ch === '.' ? null : parseInt(ch);
      cells.push({
        position: { row: r, col: c },
        value: digit,
        candidates: [],
        isGiven: digit !== null,
      });
    }
  }

  let idCounter = 0;
  const constraints: UserConstraint[] = (data.constraints ?? []).map(c => ({
    id: `imported-${c.type}-${++idCounter}`,
    type: c.type as UserConstraint['type'],
    cells: c.cells.map(([row, col]) => ({ row, col })),
    ...(c.sum !== undefined ? { sum: c.sum } : {}),
  }));

  return {
    size,
    grid: { cells, size },
    constraints,
  };
}

function makeDiagonalCells(size: number, type: 'main' | 'anti'): CellPosition[] {
  const cells: CellPosition[] = [];
  for (let i = 0; i < size; i++) {
    cells.push({ row: i, col: type === 'main' ? i : size - 1 - i });
  }
  return cells;
}

export function SetupPanel() {
  const { state: puzzle, dispatch } = usePuzzle();
  const { initSolver, stepOnce, solveAll, reset, isSolving, isSolved } = useSolverRunner();

  const [copyLabel, setCopyLabel] = useState('Copy');

  const isSetup = puzzle.status === 'setup';
  const isConstraintMode = puzzle.editMode !== 'digit';
  const hasPending = puzzle.pendingCells.length > 0;

  const hasMainDiag = puzzle.constraints.some(c => c.type === 'diagonal' && c.id.includes('main'));
  const hasAntiDiag = puzzle.constraints.some(c => c.type === 'diagonal' && c.id.includes('anti'));

  const handleCopy = () => {
    const json = serializePuzzle(puzzle.size, puzzle.grid, puzzle.constraints);
    navigator.clipboard.writeText(json).then(() => {
      setCopyLabel('Copied!');
      setTimeout(() => setCopyLabel('Copy'), 1500);
    });
  };

  const handleImport = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const { size, grid, constraints } = deserializePuzzle(text);
      dispatch({ type: 'LOAD_PUZZLE', size, grid, constraints });
      dispatch({ type: 'SET_ERROR', error: null });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: `Import failed: ${(e as Error).message}` });
    }
  };

  const addDiagonal = (diagType: 'main' | 'anti') => {
    const id = `diagonal-${diagType}`;
    const cells = makeDiagonalCells(puzzle.size, diagType);
    dispatch({ type: 'ADD_CONSTRAINT', constraint: { id, type: 'diagonal', cells } });
  };

  return (
    <div className="setup-panel">
      {/* Settings */}
      <div className="setup-section">
        <h3>Settings</h3>
        <div className="setting-row">
          <label>Size:</label>
          <select
            value={puzzle.size}
            onChange={e => dispatch({ type: 'SET_SIZE', size: parseInt(e.target.value) })}
            disabled={!isSetup}
          >
            {SIZES.map(s => (
              <option key={s} value={s}>{s}x{s}</option>
            ))}
          </select>
        </div>
        {isSetup && (
          <div className="button-row">
            <button className="btn btn-sm btn-secondary" onClick={handleCopy}>
              {copyLabel}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={handleImport}>
              Import
            </button>
          </div>
        )}
      </div>

      {/* Edit tools */}
      {isSetup && (
        <div className="setup-section">
          <h3>Edit Mode</h3>
          <div className="mode-buttons">
            {EDIT_MODES.map(({ mode, label }) => (
              <button
                key={mode}
                className={`btn btn-sm ${puzzle.editMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => dispatch({ type: 'SET_EDIT_MODE', mode })}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Diagonal toggles */}
          <div className="button-row" style={{ marginTop: '0.5rem' }}>
            <button
              className={`btn btn-sm ${hasMainDiag ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => hasMainDiag
                ? dispatch({ type: 'REMOVE_CONSTRAINT', id: 'diagonal-main' })
                : addDiagonal('main')
              }
            >
              Main Diagonal
            </button>
            <button
              className={`btn btn-sm ${hasAntiDiag ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => hasAntiDiag
                ? dispatch({ type: 'REMOVE_CONSTRAINT', id: 'diagonal-anti' })
                : addDiagonal('anti')
              }
            >
              Anti Diagonal
            </button>
          </div>

          {isConstraintMode && (
            <div className="constraint-builder">
              <p className="hint">
                {puzzle.editMode === 'thermo' && 'Click cells in order to form thermometer path'}
                {puzzle.editMode === 'cage' && 'Click cells to form killer cage'}
                {puzzle.editMode === 'arrow' && 'Click circle cell first, then shaft cells'}
              </p>
              {hasPending && (
                <p className="pending-info">
                  Selected: {puzzle.pendingCells.map(c => `R${c.row + 1}C${c.col + 1}`).join(' → ')}
                </p>
              )}
              {puzzle.editMode === 'cage' && hasPending && (
                <div className="setting-row">
                  <label>Sum:</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={puzzle.pendingCageSum ?? ''}
                    onChange={e => dispatch({ type: 'SET_CAGE_SUM', sum: parseInt(e.target.value) || 0 })}
                    className="cage-sum-input"
                    autoFocus
                  />
                </div>
              )}
              <div className="button-row">
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => dispatch({ type: 'FINISH_CONSTRAINT' })}
                  disabled={puzzle.pendingCells.length < 2}
                >
                  Confirm
                </button>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => dispatch({ type: 'CANCEL_CONSTRAINT' })}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {puzzle.editMode === 'digit' && (
            <p className="hint">Click a cell and type a digit (1-{puzzle.size}). Delete/Backspace to clear.</p>
          )}
        </div>
      )}

      {/* Error display */}
      {puzzle.error && (
        <div className="setup-section error-message">
          {puzzle.error}
        </div>
      )}

      {/* Solve controls */}
      <div className="setup-section">
        <div className="button-row">
          {isSetup && (
            <button className="btn btn-primary" onClick={initSolver}>
              Start Solving
            </button>
          )}
          {isSolving && (
            <>
              <button className="btn btn-primary" onClick={stepOnce}>
                Next Step
              </button>
              <button className="btn btn-secondary" onClick={solveAll}>
                Solve All
              </button>
            </>
          )}
          {(isSolving || isSolved) && (
            <button className="btn btn-secondary" onClick={reset}>
              Reset
            </button>
          )}
        </div>
      </div>

    </div>
  );
}
