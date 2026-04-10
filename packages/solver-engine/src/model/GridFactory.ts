import { CellPosition, GridSpec, Region } from './types';
import { Cell } from './Cell';
import { CandidateSet } from './CandidateSet';
import { Grid } from './Grid';

export class GridFactory {
  static createEmpty(spec: GridSpec): Grid {
    const cells: Cell[] = [];
    for (let row = 0; row < spec.size; row++) {
      for (let col = 0; col < spec.size; col++) {
        const pos: CellPosition = { row, col };
        const candidates = CandidateSet.full(spec.size);
        cells.push(new Cell(pos, null, false, candidates));
      }
    }
    return new Grid(spec.size, cells, spec.regions);
  }

  static createWithGivens(spec: GridSpec, givens: Array<{ position: CellPosition; digit: number }>): Grid {
    const givenMap = new Map<string, number>();
    for (const { position, digit } of givens) {
      givenMap.set(`${position.row},${position.col}`, digit);
    }
    const cells: Cell[] = [];
    for (let row = 0; row < spec.size; row++) {
      for (let col = 0; col < spec.size; col++) {
        const pos: CellPosition = { row, col };
        const key = `${row},${col}`;
        const givenDigit = givenMap.get(key);
        if (givenDigit !== undefined) {
          cells.push(new Cell(pos, givenDigit, true));
        } else {
          const candidates = CandidateSet.full(spec.size);
          cells.push(new Cell(pos, null, false, candidates));
        }
      }
    }
    return new Grid(spec.size, cells, spec.regions);
  }

  static standardRegions(size: number, boxWidth: number, boxHeight: number): Region[] {
    const regions: Region[] = [];
    for (let row = 0; row < size; row++) {
      const cells: CellPosition[] = [];
      for (let col = 0; col < size; col++) cells.push({ row, col });
      regions.push({ id: `row-${row}`, type: 'row', cells });
    }
    for (let col = 0; col < size; col++) {
      const cells: CellPosition[] = [];
      for (let row = 0; row < size; row++) cells.push({ row, col });
      regions.push({ id: `col-${col}`, type: 'column', cells });
    }
    for (let boxRow = 0; boxRow < size / boxHeight; boxRow++) {
      for (let boxCol = 0; boxCol < size / boxWidth; boxCol++) {
        const cells: CellPosition[] = [];
        for (let r = 0; r < boxHeight; r++) {
          for (let c = 0; c < boxWidth; c++) {
            cells.push({ row: boxRow * boxHeight + r, col: boxCol * boxWidth + c });
          }
        }
        regions.push({ id: `box-${boxRow}-${boxCol}`, type: 'box', cells });
      }
    }
    return regions;
  }
}
