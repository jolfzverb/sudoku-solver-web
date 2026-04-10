import { usePlayback } from '../../hooks/usePlayback';

export function PlaybackControls() {
  const {
    play, pause, stepForward, stepBackward, jumpTo, setSpeed,
    isPlaying, currentStepIndex, totalSteps, speed, isDone,
  } = usePlayback();

  if (totalSteps === 0) return null;

  return (
    <div className="playback-controls">
      <div className="playback-buttons">
        <button className="btn btn-sm" onClick={() => jumpTo(0)} disabled={currentStepIndex <= 0}>
          ⏮
        </button>
        <button className="btn btn-sm" onClick={stepBackward} disabled={currentStepIndex <= 0}>
          ◀
        </button>
        {isPlaying ? (
          <button className="btn btn-sm btn-primary" onClick={pause}>⏸</button>
        ) : (
          <button className="btn btn-sm btn-primary" onClick={play} disabled={isDone && currentStepIndex >= totalSteps - 1}>
            ▶
          </button>
        )}
        <button className="btn btn-sm" onClick={stepForward} disabled={currentStepIndex >= totalSteps - 1}>
          ▶
        </button>
        <button className="btn btn-sm" onClick={() => jumpTo(totalSteps - 1)} disabled={currentStepIndex >= totalSteps - 1}>
          ⏭
        </button>
      </div>
      <div className="playback-info">
        <span>Step {currentStepIndex + 1} / {totalSteps}</span>
        <input
          type="range"
          min={0}
          max={totalSteps - 1}
          value={Math.max(0, currentStepIndex)}
          onChange={e => jumpTo(parseInt(e.target.value))}
          className="scrubber"
        />
      </div>
      <div className="speed-control">
        <label>Speed:</label>
        <input
          type="range"
          min={50}
          max={2000}
          step={50}
          value={speed}
          onChange={e => setSpeed(parseInt(e.target.value))}
        />
        <span>{speed}ms</span>
      </div>
    </div>
  );
}
