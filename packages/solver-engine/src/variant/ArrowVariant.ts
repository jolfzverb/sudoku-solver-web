import { Region, CellPosition } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint } from '../constraint/types';
import { RegionConstraint } from '../constraint/RegionConstraint';
import { ArrowSumConstraint } from '../constraint/ArrowSumConstraint';
import { GridFactory } from '../model/GridFactory';
import { VariantDefinition, VariantExtraData } from './types';

interface ArrowData {
  circle: { row: number; col: number };
  shaft: Array<{ row: number; col: number }>;
}

const BOX_DIMS: Record<number, [number, number]> = { 9: [3, 3] };

export const ArrowVariant: VariantDefinition = {
  name: 'arrow',
  displayName: 'Arrow',
  description: 'Standard Sudoku with arrow constraints (circle = sum of shaft)',
  supportedSizes: [9],

  buildRegions(size: number): Region[] {
    const dims = BOX_DIMS[size];
    if (!dims) throw new Error(`Unsupported size: ${size}`);
    return GridFactory.standardRegions(size, dims[0], dims[1]);
  },

  buildConstraints(grid: Grid, extraData?: VariantExtraData): Constraint[] {
    const constraints: Constraint[] = grid.getRegions().map(r => new RegionConstraint(r));
    const arrows = (extraData?.arrows as ArrowData[] | undefined) ?? [];
    for (let i = 0; i < arrows.length; i++) {
      const a = arrows[i];
      const circle: CellPosition = { row: a.circle.row, col: a.circle.col };
      const shaft: CellPosition[] = a.shaft.map(c => ({ row: c.row, col: c.col }));
      constraints.push(new ArrowSumConstraint(`arrow-${i}`, circle, shaft));
    }
    return constraints;
  },

};
