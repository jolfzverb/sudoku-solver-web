import { Region } from '../model/types';
import { Grid } from '../model/Grid';
import { Constraint } from '../constraint/types';

export interface VariantExtraData {
  [key: string]: unknown;
}

export interface VariantDefinition {
  readonly name: string;
  readonly displayName: string;
  readonly description: string;
  readonly supportedSizes: number[];
  buildRegions(size: number): Region[];
  buildConstraints(grid: Grid, extraData?: VariantExtraData): Constraint[];
}
