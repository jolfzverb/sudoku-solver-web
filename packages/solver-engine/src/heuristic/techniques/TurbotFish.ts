import { Grid } from '../../model/Grid';
import { ConstraintSet } from '../../constraint/ConstraintSet';
import { Heuristic, SolveStep } from '../types';
import { CellPosition, Region } from '../../model/types';
import { Elimination } from '../../constraint/types';
import { formatRegion } from '../utils';

/**
 * X-Chain heuristic (generalized Turbot Fish).
 *
 * For a single digit D, find an alternating chain of strong and weak links:
 *
 *   A ==strong== B --weak-- C ==strong== D --weak-- E ==strong== F ...
 *
 * Strong link: D appears in exactly 2 cells of a region (conjugate pair).
 *   If one cell is NOT D, the other MUST be D.
 *
 * Weak link: two cells share a region (same row/col/box).
 *   If one cell IS D, the other is NOT D.
 *
 * The chain always starts and ends with a strong link. This means: either
 * the first node = D or the last node = D (at least one). Any cell that
 * sees BOTH endpoints and has candidate D can have D eliminated.
 *
 * Length 4 (2 strong + 1 weak): Turbot Fish / Skyscraper / 2-String Kite
 * Length 6 (3 strong + 2 weak): X-Chain length 6
 * Length 8+: longer X-Chains
 *
 * Implementation: BFS from each strong link endpoint, alternating
 * strong→weak→strong→... Shorter chains are preferred (found first by BFS).
 * Max depth is capped to avoid excessive computation.
 */

const MAX_CHAIN_NODES = 12; // max nodes in chain (6 strong links)

function cellsSeeEachOther(grid: Grid, a: CellPosition, b: CellPosition): boolean {
  if (a.row === b.row && a.col === b.col) return false;
  for (const region of grid.getRegionsFor(a)) {
    if (region.cells.some(c => c.row === b.row && c.col === b.col)) return true;
  }
  return false;
}

function sameCell(a: CellPosition, b: CellPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

function cellKey(p: CellPosition): string {
  return `${p.row},${p.col}`;
}

interface StrongLink {
  a: CellPosition;
  b: CellPosition;
  regionId: string;
}

export const TurbotFish: Heuristic = {
  id: 'turbot-fish',
  displayName: 'X-Chain',
  difficulty: 'advanced',

  apply(grid: Grid, _constraints: ConstraintSet): SolveStep | null {
    const regions = grid.getRegions();

    for (let digit = 1; digit <= grid.size; digit++) {
      const strongLinks = findStrongLinks(grid, regions, digit);
      if (strongLinks.length < 2) continue;

      const step = findXChain(grid, digit, strongLinks);
      if (step) return step;
    }

    return null;
  },
};

/**
 * Find all conjugate pairs (strong links) for a digit across all regions.
 */
function findStrongLinks(
  grid: Grid,
  regions: ReadonlyArray<Region>,
  digit: number,
): StrongLink[] {
  const links: StrongLink[] = [];

  for (const region of regions) {
    const cells: CellPosition[] = [];
    for (const pos of region.cells) {
      const cell = grid.getCell(pos);
      if (cell.value === null && cell.candidates.has(digit)) {
        cells.push(pos);
      }
    }
    if (cells.length === 2) {
      links.push({ a: cells[0], b: cells[1], regionId: region.id });
    }
  }

  return links;
}

interface ChainNode {
  cell: CellPosition;
  /** The chain of cells from start to this node. */
  path: CellPosition[];
  /** Region IDs for each strong link in the chain. */
  linkRegions: string[];
  /** Next expected link type: 'weak' or 'strong'. */
  nextLink: 'weak' | 'strong';
}

/**
 * BFS to find X-Chains of increasing length.
 * Starts from every strong link endpoint, alternates strong→weak→strong→...
 * At each "strong end" (just completed a strong link), checks for eliminations.
 * Returns the first chain that produces eliminations (shortest first due to BFS).
 */
function findXChain(
  grid: Grid,
  digit: number,
  strongLinks: StrongLink[],
): SolveStep | null {
  // Index: cell key → strong links containing that cell (with the "other" end)
  const strongByCell = new Map<string, Array<{ other: CellPosition; regionId: string }>>();
  for (const link of strongLinks) {
    const ka = cellKey(link.a);
    const kb = cellKey(link.b);
    if (!strongByCell.has(ka)) strongByCell.set(ka, []);
    if (!strongByCell.has(kb)) strongByCell.set(kb, []);
    strongByCell.get(ka)!.push({ other: link.b, regionId: link.regionId });
    strongByCell.get(kb)!.push({ other: link.a, regionId: link.regionId });
  }

  // Cells that have candidate D (for weak link neighbors)
  const digitCells: CellPosition[] = [];
  for (const cell of grid.getAllCells()) {
    if (cell.value === null && cell.candidates.has(digit)) {
      digitCells.push(cell.position);
    }
  }

  // BFS queue: start from each end of each strong link
  const queue: ChainNode[] = [];
  for (const link of strongLinks) {
    // Start at link.a, strong link leads to link.b
    queue.push({
      cell: link.b,
      path: [link.a, link.b],
      linkRegions: [link.regionId],
      nextLink: 'weak',
    });
    // Start at link.b, strong link leads to link.a
    queue.push({
      cell: link.a,
      path: [link.b, link.a],
      linkRegions: [link.regionId],
      nextLink: 'weak',
    });
  }

  // Process BFS level by level (ensures shortest chains first)
  while (queue.length > 0) {
    const node = queue.shift()!;
    const { cell: current, path, linkRegions, nextLink } = node;

    if (path.length > MAX_CHAIN_NODES) continue;

    if (nextLink === 'weak') {
      // Follow weak links: any cell with digit D that sees current and isn't in path
      const pathSet = new Set(path.map(cellKey));
      for (const target of digitCells) {
        if (pathSet.has(cellKey(target))) continue;
        if (!cellsSeeEachOther(grid, current, target)) continue;

        // After weak link, next must be strong
        queue.push({
          cell: target,
          path: [...path, target],
          linkRegions,
          nextLink: 'strong',
        });
      }
    } else {
      // Follow strong links from current cell
      const links = strongByCell.get(cellKey(current));
      if (!links) continue;

      const pathSet = new Set(path.map(cellKey));
      for (const { other, regionId } of links) {
        if (pathSet.has(cellKey(other))) continue;

        const newPath = [...path, other];
        const newRegions = [...linkRegions, regionId];

        // Chain is complete (ends with strong link) — check for eliminations
        const start = newPath[0];
        const end = other;
        const step = tryEliminations(grid, digit, start, end, newPath, newRegions);
        if (step) return step;

        // Continue searching for longer chains
        if (newPath.length < MAX_CHAIN_NODES) {
          queue.push({
            cell: other,
            path: newPath,
            linkRegions: newRegions,
            nextLink: 'weak',
          });
        }
      }
    }
  }

  return null;
}

/**
 * Check if any cell seeing both chain endpoints has candidate D → eliminate.
 */
function tryEliminations(
  grid: Grid,
  digit: number,
  start: CellPosition,
  end: CellPosition,
  path: CellPosition[],
  linkRegions: string[],
): SolveStep | null {
  if (sameCell(start, end)) return null;

  const pathSet = new Set(path.map(cellKey));
  const elims: Elimination[] = [];

  for (const cell of grid.getAllCells()) {
    if (cell.value !== null) continue;
    if (!cell.candidates.has(digit)) continue;
    const pos = cell.position;
    if (pathSet.has(cellKey(pos))) continue;

    if (cellsSeeEachOther(grid, pos, start) && cellsSeeEachOther(grid, pos, end)) {
      elims.push({ cell: pos, digit });
    }
  }

  if (elims.length === 0) return null;

  const fmt = (p: CellPosition) => `R${p.row + 1}C${p.col + 1}`;
  const chainLen = linkRegions.length; // number of strong links

  // Build description: A ==region== B --weak-- C ==region== D ...
  let desc = `X-Chain (${chainLen} strong links): digit ${digit}, `;
  for (let i = 0; i < path.length; i++) {
    if (i > 0) {
      // Even index = after strong link, odd index = after weak link
      // path[0]=start, path[1]=strong end, path[2]=weak end, path[3]=strong end...
      if (i % 2 === 1) {
        // strong link: use linkRegions[floor(i/2)]
        desc += ` ==${formatRegion(linkRegions[Math.floor(i / 2)])}== `;
      } else {
        desc += ' --weak-- ';
      }
    }
    desc += fmt(path[i]);
  }

  return {
    heuristicId: 'turbot-fish',
    description: desc,
    placements: [],
    eliminations: elims,
    highlights: [
      {
        role: 'trigger', color: '#4CAF50',
        cells: [...path],
        candidates: path.map(c => ({ cell: c, digit })),
      },
      {
        role: 'elimination', color: '#F44336',
        cells: elims.map(e => e.cell),
        candidates: elims,
      },
    ],
    snapshotBefore: grid.snapshot(),
  };
}
