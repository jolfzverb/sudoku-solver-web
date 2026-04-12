import { useSolver } from '../../state/SolverContext';
import { useHighlight } from '../../hooks/useHighlight';

export function ReportPanel() {
  const { state } = useSolver();
  const { activeStep } = useHighlight();

  if (state.status === 'idle') {
    return (
      <div className="report-panel">
        <p className="report-hint">Set up the puzzle, then click Start Solving.</p>
      </div>
    );
  }

  return (
    <div className="report-panel">
      {activeStep && (
        <div className="step-detail">
          <h3>{activeStep.heuristicId}</h3>
          <p>{activeStep.description}</p>
          {activeStep.placements.length > 0 && (
            <p className="step-placements">
              Places: {activeStep.placements.map(p => `${p.digit}@R${p.cell.row + 1}C${p.cell.col + 1}`).join(', ')}
            </p>
          )}
          {activeStep.eliminations.length > 0 && (
            <p className="step-eliminations">
              Eliminates: {activeStep.eliminations.length} candidate(s)
            </p>
          )}
        </div>
      )}

      {state.solveResult && (
        <div className="solve-summary">
          <h3>{state.solveResult.solved ? 'Solved!' : state.solveResult.error ? 'Error' : 'Could not solve'}</h3>
          {state.solveResult.error && (
            <p className="step-eliminations">{state.solveResult.error}</p>
          )}
          <table className="summary-table">
            <tbody>
              <tr><td>Difficulty</td><td>{state.solveResult.difficulty}</td></tr>
              <tr><td>Steps</td><td>{state.solveResult.steps.length}</td></tr>
              <tr><td>Time</td><td>{state.solveResult.durationMs.toFixed(1)}ms</td></tr>
            </tbody>
          </table>
          <h4>Heuristics Used</h4>
          <table className="heuristic-table">
            <thead><tr><th>Heuristic</th><th>Count</th></tr></thead>
            <tbody>
              {Array.from(state.solveResult.heuristicCounts.entries()).map(([id, count]) => (
                <tr key={id}><td>{id}</td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
