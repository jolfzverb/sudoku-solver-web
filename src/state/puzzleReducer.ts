import { GridSnapshot, CellSnapshot, CellPosition } from '@sudoku/solver-engine';

export type PuzzleStatus = 'setup' | 'solving' | 'solved';
export type EditMode = 'digit' | 'thermo' | 'cage' | 'arrow';

export interface UserConstraint {
  id: string;
  type: 'thermo' | 'cage' | 'arrow' | 'diagonal';
  cells: CellPosition[];
  sum?: number;
}

export interface PuzzleState {
  size: number;
  grid: GridSnapshot;
  status: PuzzleStatus;
  selectedCell: CellPosition | null;
  editMode: EditMode;
  constraints: UserConstraint[];
  pendingCells: CellPosition[];
  pendingCageSum: number | null;
  error: string | null;
}

export type PuzzleAction =
  | { type: 'SET_SIZE'; size: number }
  | { type: 'SELECT_CELL'; pos: CellPosition | null }
  | { type: 'SET_CELL_VALUE'; pos: CellPosition; digit: number | null }
  | { type: 'SET_EDIT_MODE'; mode: EditMode }
  | { type: 'ADD_PENDING_CELL'; pos: CellPosition }
  | { type: 'SET_CAGE_SUM'; sum: number }
  | { type: 'FINISH_CONSTRAINT' }
  | { type: 'CANCEL_CONSTRAINT' }
  | { type: 'ADD_CONSTRAINT'; constraint: UserConstraint }
  | { type: 'REMOVE_CONSTRAINT'; id: string }
  | { type: 'SET_STATUS'; status: PuzzleStatus }
  | { type: 'SET_GRID'; grid: GridSnapshot }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'LOAD_PUZZLE'; size: number; grid: GridSnapshot; constraints: UserConstraint[] }
  | { type: 'RESET' };

export function createEmptyGrid(size: number): GridSnapshot {
  const cells: CellSnapshot[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      cells.push({
        position: { row, col },
        value: null,
        candidates: [],
        isGiven: false,
      });
    }
  }
  return { cells, size };
}

export const initialPuzzleState: PuzzleState = {
  size: 9,
  grid: createEmptyGrid(9),
  status: 'setup',
  selectedCell: null,
  editMode: 'digit',
  constraints: [],
  pendingCells: [],
  pendingCageSum: null,
  error: null,
};

let constraintIdCounter = 0;

function cellInList(list: CellPosition[], pos: CellPosition): boolean {
  return list.some(c => c.row === pos.row && c.col === pos.col);
}

export function puzzleReducer(state: PuzzleState, action: PuzzleAction): PuzzleState {
  switch (action.type) {
    case 'SET_SIZE':
      return {
        ...initialPuzzleState,
        size: action.size,
        grid: createEmptyGrid(action.size),
      };
    case 'SELECT_CELL':
      return { ...state, selectedCell: action.pos };
    case 'SET_CELL_VALUE': {
      if (state.status !== 'setup') return state;
      const newCells = state.grid.cells.map(c => {
        if (c.position.row === action.pos.row && c.position.col === action.pos.col) {
          return { ...c, value: action.digit, candidates: [], isGiven: action.digit !== null };
        }
        return c;
      });
      return { ...state, grid: { ...state.grid, cells: newCells } };
    }
    case 'SET_EDIT_MODE':
      return { ...state, editMode: action.mode, pendingCells: [], pendingCageSum: null };
    case 'ADD_PENDING_CELL': {
      if (cellInList(state.pendingCells, action.pos)) {
        return { ...state, pendingCells: state.pendingCells.filter(c => !(c.row === action.pos.row && c.col === action.pos.col)) };
      }
      return { ...state, pendingCells: [...state.pendingCells, action.pos] };
    }
    case 'SET_CAGE_SUM':
      return { ...state, pendingCageSum: action.sum };
    case 'FINISH_CONSTRAINT': {
      if (state.pendingCells.length < 2) return state;
      const constraintType = state.editMode as 'thermo' | 'cage' | 'arrow';
      if (constraintType === 'cage' && (state.pendingCageSum === null || state.pendingCageSum <= 0)) return state;
      const newConstraint: UserConstraint = {
        id: `user-${constraintType}-${++constraintIdCounter}`,
        type: constraintType,
        cells: [...state.pendingCells],
        ...(constraintType === 'cage' ? { sum: state.pendingCageSum! } : {}),
      };
      return {
        ...state,
        constraints: [...state.constraints, newConstraint],
        pendingCells: [],
        pendingCageSum: null,
      };
    }
    case 'CANCEL_CONSTRAINT':
      return { ...state, pendingCells: [], pendingCageSum: null };
    case 'ADD_CONSTRAINT':
      return { ...state, constraints: [...state.constraints, action.constraint] };
    case 'REMOVE_CONSTRAINT':
      return { ...state, constraints: state.constraints.filter(c => c.id !== action.id) };
    case 'SET_STATUS':
      return { ...state, status: action.status };
    case 'SET_GRID':
      return { ...state, grid: action.grid };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'LOAD_PUZZLE':
      return {
        ...initialPuzzleState,
        size: action.size,
        grid: action.grid,
        constraints: action.constraints,
      };
    case 'RESET':
      return {
        ...initialPuzzleState,
        size: state.size,
        grid: createEmptyGrid(state.size),
      };
    default:
      return state;
  }
}
