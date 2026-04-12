import { usePuzzle } from '../../state/PuzzleContext';
import { constraintLabel } from './SetupPanel';

export function ConstraintList() {
  const { state: puzzle, dispatch } = usePuzzle();
  const isSetup = puzzle.status === 'setup';

  if (puzzle.constraints.length === 0) return null;

  return (
    <div className="setup-section">
      <h3>Constraints</h3>
      <ul className="constraint-list">
        {puzzle.constraints.map(c => (
          <li key={c.id}>
            <span>{constraintLabel(c)}</span>
            {isSetup && (
              <button
                className="btn-remove"
                onClick={() => dispatch({ type: 'REMOVE_CONSTRAINT', id: c.id })}
                title="Remove"
              >
                x
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
