import { Injectable } from '@angular/core';
import { Tile, Biome } from '../models/tile.model';

@Injectable({ providedIn: 'root' })
export class MapService {

  /**
   * Generuje mapę o zadanych wymiarach (width x height) z wysokościami i biomami
   * @param width szerokość mapy (liczba kafelków)
   * @param height wysokość mapy (liczba kafelków)
   */
  generateMap(width: number = 1000, height: number = 1000): Tile[][] {
    // Dodaj losowe przesunięcia
    const offsetX = Math.random() * 1000;
    const offsetY = Math.random() * 1000;

    // Funkcja wysokości (wygładzony szum, łagodne przewyższenia, zakres 0-1)
    function getHeight(x: number, y: number): number {
      const nx = (x + offsetX) / width - 0.5;
      const ny = (y + offsetY) / height - 0.5;
      // Fractal noise: kilka warstw szumu sinusowego o malejącej amplitudzie
      let h = 0.5
        + 0.15 * Math.sin(3 * nx + 2 * Math.cos(3 * ny))
        + 0.08 * Math.sin(8 * nx + 5 * Math.cos(8 * ny))
        + 0.04 * Math.cos(15 * nx + 7 * Math.sin(15 * ny));
      // Bardzo łagodny gradient (np. wyżej na północy)
      h += 0.05 * (0.5 - ny);
      // Normalizacja do 0-1
      h = (h - 0.1) / 0.9;
      return Math.max(0, Math.min(1, h));
    }
    // Mapa biomów i wysokości
    const map: Tile[][] = [];
    // Najpierw generujemy wysokości i biomy
    for (let y = 0; y < height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x++) {
        const heightVal = getHeight(x, y);
        let biome: Biome;
        if (heightVal > 0.7) biome = 'forest';
        else if (heightVal > 0.5) biome = 'grass';
        else if (heightVal > 0.3) biome = 'field';
        else biome = 'forest';
        row.push({ biome, height: heightVal, isPassable: true });
      }
      map.push(row);
    }
    // Następnie flagujemy szczyty i doliny
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = map[y][x];
        let isPeak = true;
        let isValley = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const neighbor = map[ny][nx];
            if (neighbor.height >= tile.height) isPeak = false;
            if (neighbor.height <= tile.height) isValley = false;
          }
        }
        (tile as any).isPeak = isPeak;
        (tile as any).isValley = isValley;
      }
    }
    return map;
  }

  getBiomeColor(biome: Biome): string {
    switch (biome) {
      case 'grass': return '#a8d08d';
      case 'forest': return '#558b2f';
      case 'field': return '#e4c976';
      case 'lake': return '#4fc3f7';
      case 'beach': return '#ffe4a1';
      case 'reed': return '#b5c96b';
      case 'river': return '#0288d1';
      case 'river-source': return '#6ec6ff';
      case 'river-mouth': return '#01579b';
      default: return '#cccccc';
    }
  }

  exportMap(map: Tile[][]): string {
    return JSON.stringify(map);
  }

  importMap(json: string): Tile[][] {
    return JSON.parse(json);
  }
}