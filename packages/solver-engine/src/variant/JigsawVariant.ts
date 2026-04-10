import { Region, CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint } from '../constraint/types';
import { RegionConstraint } from '../constraint/RegionConstraint';
import { VariantDefinition, VariantExtraData } from './types';

export const JigsawVariant: VariantDefinition = {
  name: 'jigsaw',
  displayName: 'Jigsaw',
  description: 'Sudoku with irregular box shapes',
  supportedSizes: [9],

  buildRegions(size: number, ): Region[] {
    // Rows and columns as standard
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
    // Custom box regions are provided via extraData in buildConstraints
    return regions;
  },

  buildConstraints(grid: Grid, extraData?: VariantExtraData): Constraint[] {
    const constraints: Constraint[] = grid.getRegions().map(r => new RegionConstraint(r));
    const boxes = (extraData?.boxes as Array<Array<{ row: number; col: number }>> | undefined) ?? [];
    for (let i = 0; i < boxes.length; i++) {
      const cells: CellPosition[] = boxes[i].map(c => ({ row: c.row, col: c.col }));
      const region: Region = { id: `jigsaw-box-${i}`, type: 'custom', cells };
      constraints.push(new RegionConstraint(region));
    }
    return constraints;
  },

};
