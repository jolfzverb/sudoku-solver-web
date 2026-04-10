import { CellPosition, Region, GridSnapshot } from './types';
import { Cell } from './Cell';

export class Grid {
  readonly size: number;
  private _cells: Cell[];
  private _regions: ReadonlyArray<Region>;
  private _cellRegionIndex: Map<string, Region[]>;

  constructor(size: number, cells: Cell[], regions: ReadonlyArray<Region>) {
    this.size = size;
    this._cells = cells;
    this._regions = regions;
    this._cellRegionIndex = new Map();
    for (const region of regions) {
      for (const pos of region.cells) {
        const key = `${pos.row},${pos.col}`;
        const existing = this._cellRegionIndex.get(key) ?? [];
        existing.push(region);
        this._cellRegionIndex.set(key, existing);
      }
    }
  }

  getCell(pos: CellPosition): Cell {
    return this._cells[pos.row * this.size + pos.col];
  }

  getAllCells(): ReadonlyArray<Cell> {
    return this._cells;
  }

  getRegions(): ReadonlyArray<Region> {
    return this._regions;
  }

  getRegionsFor(pos: CellPosition): Region[] {
    return this._cellRegionIndex.get(`${pos.row},${pos.col}`) ?? [];
  }

  getCellsInRegion(region: Region): Cell[] {
    return region.cells.map(pos => this.getCell(pos));
  }

  snapshot(): GridSnapshot {
    return {
      size: this.size,
      cells: this._cells.map(c => ({
        position: c.position,
        value: c.value,
        candidates: c.candidates.values(),
        isGiven: c.isGiven,
      })),
    };
  }

  restore(snapshot: GridSnapshot): void {
    for (const cs of snapshot.cells) {
      const cell = this.getCell(cs.position);
      if (cs.value !== null) {
        cell.setValue(cs.value);
      } else {
        cell.clearValue();
        const candidates = cell.candidates;
        for (const d of candidates.values()) {
          candidates.remove(d);
        }
        for (const d of cs.candidates) {
          candidates.add(d);
        }
      }
    }
  }

  clone(): Grid {
    const cells = this._cells.map(c => c.clone());
    return new Grid(this.size, cells, this._regions);
  }
}
