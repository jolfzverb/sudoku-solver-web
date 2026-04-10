import { CellPosition, GridSnapshot, HighlightGroup } from '@sudoku/solver-engine';
import { UserConstraint } from '../../state/puzzleReducer';

const CELL_SIZE = 50;
const THIN = 1;
const THICK = 3;

interface GridViewProps {
  grid: GridSnapshot;
  size: number;
  highlights?: HighlightGroup[];
  selectedCell?: CellPosition | null;
  onCellClick?: (pos: CellPosition) => void;
  constraints?: UserConstraint[];
  pendingCells?: CellPosition[];
  editMode?: string;
}

export function GridView({
  grid, size, highlights = [], selectedCell, onCellClick,
  constraints = [], pendingCells = [], editMode,
}: GridViewProps) {
  const boxW = size === 9 ? 3 : size === 4 ? 2 : size === 6 ? 3 : 4;
  const boxH = size === 9 ? 3 : size === 4 ? 2 : size === 6 ? 2 : 4;
  const totalSize = size * CELL_SIZE + THICK * 2;

  // Build highlight map
  const cellColors = new Map<string, string>();
  for (const group of highlights) {
    for (const pos of group.cells) {
      const key = `${pos.row},${pos.col}`;
      if (!cellColors.has(key)) cellColors.set(key, group.color);
    }
  }

  // Pending cells set
  const pendingSet = new Set(pendingCells.map(c => `${c.row},${c.col}`));

  function cx(col: number) { return THICK + col * CELL_SIZE + CELL_SIZE / 2; }
  function cy(row: number) { return THICK + row * CELL_SIZE + CELL_SIZE / 2; }

  return (
    <svg
      width={totalSize}
      height={totalSize}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      style={{ border: `${THICK}px solid #333` }}
      tabIndex={0}
    >
      {/* Cell backgrounds */}
      {grid.cells.map(cell => {
        const key = `${cell.position.row},${cell.position.col}`;
        const x = THICK + cell.position.col * CELL_SIZE;
        const y = THICK + cell.position.row * CELL_SIZE;
        const isSelected = selectedCell?.row === cell.position.row && selectedCell?.col === cell.position.col;
        const isPending = pendingSet.has(key);
        const hlColor = cellColors.get(key);
        let fill = '#fff';
        if (hlColor) fill = hlColor + '40';
        if (isPending) fill = '#fff3e0';
        if (isSelected) fill = '#e3f2fd';

        return (
          <rect
            key={key}
            x={x} y={y}
            width={CELL_SIZE} height={CELL_SIZE}
            fill={fill}
            stroke="#ccc"
            strokeWidth={THIN}
            style={{ cursor: 'pointer' }}
            onClick={() => onCellClick?.(cell.position)}
          />
        );
      })}

      {/* Killer cage overlays */}
      {constraints.filter(c => c.type === 'cage').map(cage => (
        <CageOverlay key={cage.id} cage={cage} />
      ))}

      {/* Thermometer overlays */}
      {constraints.filter(c => c.type === 'thermo').map(thermo => (
        <ThermoOverlay key={thermo.id} cells={thermo.cells} color="#aaa" />
      ))}

      {/* Arrow overlays */}
      {constraints.filter(c => c.type === 'arrow').map(arrow => (
        <ArrowOverlay key={arrow.id} cells={arrow.cells} />
      ))}

      {/* Pending constraint preview */}
      {pendingCells.length >= 2 && editMode === 'thermo' && (
        <ThermoOverlay cells={pendingCells} color="#ff9800" />
      )}
      {pendingCells.length >= 2 && editMode === 'arrow' && (
        <ArrowOverlay cells={pendingCells} />
      )}
      {pendingCells.length >= 1 && editMode !== 'digit' && (
        <>
          {pendingCells.map((c, i) => (
            <text
              key={`pnum-${i}`}
              x={THICK + c.col * CELL_SIZE + 8}
              y={THICK + c.row * CELL_SIZE + 12}
              fontSize={9}
              fill="#ff9800"
              fontWeight="bold"
              style={{ pointerEvents: 'none' }}
            >
              {i + 1}
            </text>
          ))}
        </>
      )}

      {/* Box borders */}
      {Array.from({ length: size / boxW + 1 }, (_, i) => (
        <line
          key={`vbox-${i}`}
          x1={THICK + i * boxW * CELL_SIZE}
          y1={THICK}
          x2={THICK + i * boxW * CELL_SIZE}
          y2={THICK + size * CELL_SIZE}
          stroke="#333"
          strokeWidth={THICK}
        />
      ))}
      {Array.from({ length: size / boxH + 1 }, (_, i) => (
        <line
          key={`hbox-${i}`}
          x1={THICK}
          y1={THICK + i * boxH * CELL_SIZE}
          x2={THICK + size * CELL_SIZE}
          y2={THICK + i * boxH * CELL_SIZE}
          stroke="#333"
          strokeWidth={THICK}
        />
      ))}

      {/* Cell values */}
      {grid.cells.map(cell => {
        const x = cx(cell.position.col);
        const y = cy(cell.position.row);
        const key = `val-${cell.position.row}-${cell.position.col}`;

        if (cell.value !== null) {
          return (
            <text
              key={key}
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={cell.isGiven ? 24 : 22}
              fontWeight={cell.isGiven ? 'bold' : 'normal'}
              fill={cell.isGiven ? '#1a237e' : '#333'}
              style={{ pointerEvents: 'none' }}
            >
              {cell.value}
            </text>
          );
        }

        // Render candidates as small numbers in a 3x3 grid
        if (cell.candidates.length > 0) {
          const cellX = THICK + cell.position.col * CELL_SIZE;
          const cellY = THICK + cell.position.row * CELL_SIZE;
          return cell.candidates.map(d => {
            const subCol = (d - 1) % 3;
            const subRow = Math.floor((d - 1) / 3);
            const dx = cellX + (subCol + 0.5) * (CELL_SIZE / 3);
            const dy = cellY + (subRow + 0.5) * (CELL_SIZE / 3);
            return (
              <text
                key={`cand-${cell.position.row}-${cell.position.col}-${d}`}
                x={dx} y={dy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fill="#999"
                style={{ pointerEvents: 'none' }}
              >
                {d}
              </text>
            );
          });
        }

        return null;
      })}
    </svg>
  );
}

/* ---- Constraint overlay components ---- */

function ThermoOverlay({ cells, color }: { cells: CellPosition[]; color: string }) {
  if (cells.length < 2) return null;
  const bulb = cells[0];
  const bx = THICK + bulb.col * CELL_SIZE + CELL_SIZE / 2;
  const by = THICK + bulb.row * CELL_SIZE + CELL_SIZE / 2;

  const pathPoints = cells.map(c =>
    `${THICK + c.col * CELL_SIZE + CELL_SIZE / 2},${THICK + c.row * CELL_SIZE + CELL_SIZE / 2}`
  );

  return (
    <g style={{ pointerEvents: 'none' }}>
      <polyline
        points={pathPoints.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.5}
      />
      <circle cx={bx} cy={by} r={12} fill={color} opacity={0.4} />
    </g>
  );
}

function CageOverlay({ cage }: { cage: UserConstraint }) {
  const cellSet = new Set(cage.cells.map(c => `${c.row},${c.col}`));
  const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const inset = 3;

  for (const cell of cage.cells) {
    const x = THICK + cell.col * CELL_SIZE;
    const y = THICK + cell.row * CELL_SIZE;

    // Check each edge - draw if neighbor is not in cage
    if (!cellSet.has(`${cell.row - 1},${cell.col}`)) {
      segments.push({ x1: x + inset, y1: y + inset, x2: x + CELL_SIZE - inset, y2: y + inset });
    }
    if (!cellSet.has(`${cell.row + 1},${cell.col}`)) {
      segments.push({ x1: x + inset, y1: y + CELL_SIZE - inset, x2: x + CELL_SIZE - inset, y2: y + CELL_SIZE - inset });
    }
    if (!cellSet.has(`${cell.row},${cell.col - 1}`)) {
      segments.push({ x1: x + inset, y1: y + inset, x2: x + inset, y2: y + CELL_SIZE - inset });
    }
    if (!cellSet.has(`${cell.row},${cell.col + 1}`)) {
      segments.push({ x1: x + CELL_SIZE - inset, y1: y + inset, x2: x + CELL_SIZE - inset, y2: y + CELL_SIZE - inset });
    }
  }

  // Find top-left cell for sum label
  const topLeft = cage.cells.reduce((best, c) => {
    if (c.row < best.row || (c.row === best.row && c.col < best.col)) return c;
    return best;
  }, cage.cells[0]);

  return (
    <g style={{ pointerEvents: 'none' }}>
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
          stroke="#666"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      ))}
      {cage.sum && (
        <text
          x={THICK + topLeft.col * CELL_SIZE + 6}
          y={THICK + topLeft.row * CELL_SIZE + 12}
          fontSize={10}
          fontWeight="bold"
          fill="#666"
        >
          {cage.sum}
        </text>
      )}
    </g>
  );
}

function ArrowOverlay({ cells }: { cells: CellPosition[] }) {
  if (cells.length < 2) return null;
  const circle = cells[0];
  const cxPos = THICK + circle.col * CELL_SIZE + CELL_SIZE / 2;
  const cyPos = THICK + circle.row * CELL_SIZE + CELL_SIZE / 2;

  const pathPoints = cells.map(c =>
    `${THICK + c.col * CELL_SIZE + CELL_SIZE / 2},${THICK + c.row * CELL_SIZE + CELL_SIZE / 2}`
  );

  // Arrow tip
  const last = cells[cells.length - 1];
  const prev = cells[cells.length - 2];
  const dx = (THICK + last.col * CELL_SIZE + CELL_SIZE / 2) - (THICK + prev.col * CELL_SIZE + CELL_SIZE / 2);
  const dy = (THICK + last.row * CELL_SIZE + CELL_SIZE / 2) - (THICK + prev.row * CELL_SIZE + CELL_SIZE / 2);
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / len;
  const ny = dy / len;
  const tipX = THICK + last.col * CELL_SIZE + CELL_SIZE / 2;
  const tipY = THICK + last.row * CELL_SIZE + CELL_SIZE / 2;
  const arrowSize = 8;

  return (
    <g style={{ pointerEvents: 'none' }}>
      <circle cx={cxPos} cy={cyPos} r={16} fill="none" stroke="#888" strokeWidth={2} opacity={0.6} />
      <polyline
        points={pathPoints.slice(1).join(' ')}
        fill="none"
        stroke="#888"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
      <polygon
        points={`${tipX},${tipY} ${tipX - arrowSize * nx + arrowSize * ny * 0.5},${tipY - arrowSize * ny - arrowSize * nx * 0.5} ${tipX - arrowSize * nx - arrowSize * ny * 0.5},${tipY - arrowSize * ny + arrowSize * nx * 0.5}`}
        fill="#888"
        opacity={0.6}
      />
    </g>
  );
}
