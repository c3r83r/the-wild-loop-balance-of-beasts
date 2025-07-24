export type Biome =
  | 'grass'
  | 'forest'
  | 'dense-forest'
  | 'field'
  | 'river'
  | 'lake'
  | 'beach'
  | 'reed'
  | 'river-source'
  | 'river-mouth'
  | 'building'
  | 'village'
;

export interface Tile {
  biome: Biome;
  height: number; // wysokość terenu (0-1)
  obstacle?: 'tree' | 'bush' | 'burrow' | 'cabbage';
  isPassable: boolean;
}
