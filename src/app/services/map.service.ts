// Typy zwierząt
export type AnimalType = 'fox' | 'hare';

export interface Animal {
  type: AnimalType;
  x: number; // współrzędne w pikselach/kafelkach
  y: number;
}
export type TerrainPreset = 'niziny' | 'pagorki' | 'gory';

export interface MapGenerationOptions {
  width?: number;
  height?: number;
  minHeight?: number; // w metrach
  maxHeight?: number; // w metrach
  preset?: TerrainPreset;
}
// ...usunięto powielone deklaracje spoza klasy...
import { Injectable } from '@angular/core';
import { Tile, Biome } from '../models/tile.model';

// Nowe typy pokrycia terenu (land cover)
export type LandCover = 'meadow' | 'field' | 'forest' | 'dense-forest' | 'bush' | 'water' | 'building' | 'road';


@Injectable({ providedIn: 'root' })
export class MapService {
  /**
   * Generuje losowe zwierzęta (lisy i zające) na mapie
   * @param map wygenerowana mapa kafelków
   * @param foxCount liczba lisów (domyślnie 8)
   * @param hareCount liczba zajęcy (domyślnie 18)
   */
  getAnimals(map: Tile[][], foxCount = 8, hareCount = 18): Animal[] {
    const animals: Animal[] = [];
    const height = map.length;
    const width = map[0]?.length || 0;
    // Lisy: preferują skraje lasów, łąki, obrzeża pól
    let placed = 0, tries = 0;
    while (placed < foxCount && tries < foxCount * 30) {
      tries++;
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const biome = map[y][x].biome;
      // Skraj lasu/łąki lub łąka
      if (biome === 'forest' || biome === 'grass') {
        // Preferuj skraj: sąsiadujący kafelek innego typu
        let isEdge = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            if (map[ny][nx].biome !== biome) isEdge = true;
          }
        }
        if (isEdge || biome === 'grass') {
          animals.push({ type: 'fox', x, y });
          placed++;
        }
      }
    }
    // Zające: preferują pola i łąki, z dala od wioski i gęstego lasu
    placed = 0; tries = 0;
    while (placed < hareCount && tries < hareCount * 30) {
      tries++;
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const biome = map[y][x].biome;
      if ((biome === 'field' || biome === 'grass') && map[y][x].isPassable) {
        // Nie za blisko wioski/gęstego lasu
        let tooClose = false;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
            const b = map[ny][nx].biome;
            if (b === 'village' || b === 'dense-forest') tooClose = true;
          }
        }
        if (!tooClose) {
          animals.push({ type: 'hare', x, y });
          placed++;
        }
      }
    }
    return animals;
  }
  /**
   * Zwraca domyślne parametry generowania mapy dla wybranego typu terenu
   */
  getPresetOptions(preset: TerrainPreset): { minHeight: number, maxHeight: number } {
    switch (preset) {
      case 'niziny': return { minHeight: 98, maxHeight: 105 };
      case 'pagorki': return { minHeight: 120, maxHeight: 170 };
      case 'gory': return { minHeight: 300, maxHeight: 500 };
      default: return { minHeight: 100, maxHeight: 110 };
    }
  }
  /**
   * Rozmiar jednego kafelka w metrach (np. 10 = 10m x 10m)
   */
  readonly tileSizeMeters = 1;

  /**
   * Zwraca szerokość mapy w metrach
   */
  getMapWidthMeters(width: number = 1000): number {
    return width * this.tileSizeMeters;
  }

  /**
   * Zwraca wysokość mapy w metrach
   */
  getMapHeightMeters(height: number = 1000): number {
    return height * this.tileSizeMeters;
  }

  /**
   * Zwraca szerokość mapy w kilometrach
   */
  getMapWidthKm(width: number = 1000): number {
    return this.getMapWidthMeters(width) / 1000;
  }

  /**
   * Zwraca wysokość mapy w kilometrach
   */
  getMapHeightKm(height: number = 1000): number {
    return this.getMapHeightMeters(height) / 1000;
  }

  /**
   * Generuje mapę o zadanych wymiarach (width x height) z wysokościami i biomami
   * @param width szerokość mapy (liczba kafelków)
   * @param height wysokość mapy (liczba kafelków)
   */
  /**
   * Generuje mapę o zadanych wymiarach i parametrach wysokości
   */
  generateMap(options: MapGenerationOptions | number = 1000, heightOpt?: number): Tile[][] {
    let width = 1000, height = 1000, minHeight = 100, maxHeight = 110;
    if (typeof options === 'number') {
      width = options;
      height = heightOpt ?? options;
    } else {
      width = options.width ?? 1000;
      height = options.height ?? 1000;
      if (options.preset) {
        const preset = this.getPresetOptions(options.preset);
        minHeight = options.minHeight ?? preset.minHeight;
        maxHeight = options.maxHeight ?? preset.maxHeight;
      } else {
        minHeight = options.minHeight ?? 100;
        maxHeight = options.maxHeight ?? 110;
      }
    }
    // Losowe przesunięcia do szumów
    const offsetX = Math.random() * 1000;
    const offsetY = Math.random() * 1000;
    // Szumy do ścieżek i biomów
    const off1 = Math.random() * 1000;
    const off2 = Math.random() * 1000;
    // Funkcja wysokości (jak dotychczas)
    function getHeight(x: number, y: number): number {
      const nx = (x + offsetX) / width - 0.5;
      const ny = (y + offsetY) / height - 0.5;
      let h = 0.5
        + 0.15 * Math.sin(3 * nx + 2 * Math.cos(3 * ny))
        + 0.08 * Math.sin(8 * nx + 5 * Math.cos(8 * ny))
        + 0.04 * Math.cos(15 * nx + 7 * Math.sin(15 * ny));
      h += 0.05 * (0.5 - ny);
      h = (h - 0.1) / 0.9;
      h = Math.max(0, Math.min(1, h));
      return minHeight + h * (maxHeight - minHeight);
    }
    // --- GĘSTY LAS NA BRZEGU, WIOSKA NA ŚRODKU, POLA WOKÓŁ, ŚCIEŻKI, NIEREGULARNE BIOMY ---
    // Maski biomów
    const biomeMask: string[][] = Array.from({ length: height }, () => Array(width).fill(''));
    // 1. Gęsty las na brzegu (jednolity, nieregularna krawędź)
    const denseForestWidth = 15 + Math.floor(Math.random() * 15); // 15-30 px
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Nieregularność: noise na krawędzi
        const edgeDist = Math.min(x, y, width - 1 - x, height - 1 - y);
        const noise = Math.floor(Math.random() * 4) - 2; // -2..+1
        if (edgeDist + noise < denseForestWidth) {
          biomeMask[y][x] = 'dense-forest';
        }
      }
    }
    // 2. Wioska na środku (ośmiobok, promień 50)
    const cx = Math.floor(width / 2), cy = Math.floor(height / 2);
    const villageRadius = 50;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Ośmiobok: max(|dx|,|dy|) + 0.4*min(|dx|,|dy|) < r
        const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
        if (Math.max(dx, dy) + 0.4 * Math.min(dx, dy) < villageRadius) {
          biomeMask[y][x] = 'village';
        }
      }
    }
    // 3. Pola w promieniu 100-400m od wioski (równoległoboki, bez nakładania)
    // Parametry
    const minFieldR = 100, maxFieldR = 400;
    const numFields = Math.floor(12 + Math.random() * 6); // 12-18 pól
    type Field = { cx: number, cy: number, w: number, h: number, angle: number, edge: number };
    const fields: Field[] = [];
    let attempts = 0;
    while (fields.length < numFields && attempts < 200) {
      attempts++;
      // Losuj środek pola w promieniu od wioski
      const a = Math.random() * Math.PI * 2;
      const r = minFieldR + Math.random() * (maxFieldR - minFieldR);
      const fcx = Math.floor(cx + Math.cos(a) * r);
      const fcy = Math.floor(cy + Math.sin(a) * r);
      // Rozmiar i orientacja
      const fw = 30 + Math.random() * 40; // 30-70 px
      const fh = 20 + Math.random() * 30; // 20-50 px
      const angle = (Math.random() - 0.5) * Math.PI/2;
      // Sprawdź czy nie nachodzi na inne pole/wioskę/gęsty las
      let overlaps = false;
      for (let y0 = -fh/2; y0 < fh/2; y0++) {
        for (let x0 = -fw/2; x0 < fw/2; x0++) {
          const rx = Math.round(fcx + Math.cos(angle) * x0 - Math.sin(angle) * y0);
          const ry = Math.round(fcy + Math.sin(angle) * x0 + Math.cos(angle) * y0);
          if (rx < 0 || rx >= width || ry < 0 || ry >= height) { overlaps = true; break; }
          if (biomeMask[ry][rx]) { overlaps = true; break; }
        }
        if (overlaps) break;
      }
      if (overlaps) continue;
      // Losuj krawędź na rów (0=top,1=right,2=bottom,3=left)
      const edge = Math.floor(Math.random() * 4);
      fields.push({ cx: fcx, cy: fcy, w: fw, h: fh, angle, edge });
      // Zaznacz pole w masce
      // Rasteryzacja: przejdź po oknie otaczającym pole i sprawdź, czy punkt należy do wnętrza obróconego prostokąta
      const minX = Math.max(0, Math.floor(fcx - fw/2 - 2));
      const maxX = Math.min(width-1, Math.ceil(fcx + fw/2 + 2));
      const minY = Math.max(0, Math.floor(fcy - fh/2 - 2));
      const maxY = Math.min(height-1, Math.ceil(fcy + fh/2 + 2));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          // Przekształć (x, y) do układu lokalnego prostokąta
          const dx = x - fcx;
          const dy = y - fcy;
          const lx =  Math.cos(-angle) * dx - Math.sin(-angle) * dy;
          const ly =  Math.sin(-angle) * dx + Math.cos(-angle) * dy;
          if (lx < -fw/2 || lx >= fw/2 || ly < -fh/2 || ly >= fh/2) continue;
          if (biomeMask[y][x] === 'dense-forest') continue;
          // Krawędzie pola
          let isEdge = false;
          if (Math.abs(ly + fh/2) < 1 && edge === 0) isEdge = true;
          if (Math.abs(lx - (fw/2-1)) < 1 && edge === 1) isEdge = true;
          if (Math.abs(ly - (fh/2-1)) < 1 && edge === 2) isEdge = true;
          if (Math.abs(lx + fw/2) < 1 && edge === 3) isEdge = true;
          if (isEdge) {
            biomeMask[y][x] = 'ditch';
          } else if (
            Math.abs(ly + fh/2) < 1 || Math.abs(lx - (fw/2-1)) < 1 || Math.abs(ly - (fh/2-1)) < 1 || Math.abs(lx + fw/2) < 1
          ) {
            biomeMask[y][x] = 'road';
          } else {
            biomeMask[y][x] = 'field';
          }
        }
      }
    }
    // 4. Ścieżki na łąkach (szkielet pod graf, na razie proste promienie do wioski)
    // --- Nowy algorytm: graf ścieżek ---
    const numPoints = 15 + Math.floor(Math.random() * 11); // 15-25 punktów
    // Wioska zawsze w centrum
    const points = [{ x: cx, y: cy }];
    // Losuj pozostałe punkty (poza wioską, nie w gęstym lesie)
    for (let i = 1; i < numPoints; i++) {
      let px = 0, py = 0, ok = false, tries = 0;
      while (!ok && tries < 100) {
        px = Math.floor(Math.random() * width);
        py = Math.floor(Math.random() * height);
        tries++;
        // Nie w gęstym lesie ani wiosce
        if (biomeMask[py][px] === 'dense-forest' || biomeMask[py][px] === 'village') continue;
        // Nie za blisko wioski
        const dist = Math.sqrt((px-cx)**2 + (py-cy)**2);
        if (dist < villageRadius + 10) continue;
        ok = true;
      }
      if (ok) points.push({ x: px, y: py });
    }

    // Buduj graf: połącz najbliższe punkty (MST - algorytm Prima)
    const edges: {a: number, b: number}[] = [];
    const connected = [0];
    const left = Array.from({length: points.length-1}, (_,i)=>i+1);
    while (left.length > 0) {
      let minDist = Infinity, minA = -1, minB = -1;
      for (const a of connected) {
        for (const b of left) {
          const dx = points[a].x - points[b].x;
          const dy = points[a].y - points[b].y;
          const d = dx*dx + dy*dy;
          if (d < minDist) { minDist = d; minA = a; minB = b; }
        }
      }
      edges.push({a: minA, b: minB});
      connected.push(minB);
      left.splice(left.indexOf(minB),1);
    }
    // (opcjonalnie) Dodaj kilka dodatkowych połączeń do najbliższych sąsiadów
    for (let i = 1; i < points.length; i++) {
      // Połącz z najbliższym innym punktem (jeśli nie jest już połączony)
      let minDist = Infinity, minJ = -1;
      for (let j = 0; j < points.length; j++) {
        if (i === j) continue;
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const d = dx*dx + dy*dy;
        if (d < minDist) { minDist = d; minJ = j; }
      }
      if (!edges.some(e => (e.a === i && e.b === minJ) || (e.a === minJ && e.b === i))) {
        edges.push({a: i, b: minJ});
      }
    }

    // DODATKOWO: Każde pole powinno mieć doprowadzoną ścieżkę
    // Dla każdego pola znajdź najbliższy punkt grafu i dodaj krawędź, jeśli nie istnieje
    for (const field of fields) {
      // Środek pola
      const fx = Math.round(field.cx);
      const fy = Math.round(field.cy);
      // Znajdź najbliższy punkt grafu
      let minDist = Infinity, minIdx = -1;
      for (let i = 0; i < points.length; i++) {
        const dx = fx - points[i].x;
        const dy = fy - points[i].y;
        const d = dx*dx + dy*dy;
        if (d < minDist) { minDist = d; minIdx = i; }
      }
      // Dodaj punkt środka pola do grafu, jeśli nie jest już bardzo blisko istniejącego punktu
      let fieldPointIdx = points.length;
      if (minDist > 16) { // jeśli nie jest bardzo blisko istniejącego punktu
        points.push({x: fx, y: fy});
        fieldPointIdx = points.length - 1;
        edges.push({a: fieldPointIdx, b: minIdx});
      } else {
        // Jeśli jest bardzo blisko, połącz najbliższy punkt z polem (ale nie duplikuj krawędzi)
        if (!edges.some(e => (e.a === minIdx && e.b === minIdx) || (e.a === minIdx && e.b === minIdx))) {
          // (niepotrzebne, bo to ten sam punkt)
        }
      }
      // Jeśli środek pola nie jest już połączony z grafem, dorysuj ścieżkę
      if (fieldPointIdx === points.length - 1) {
        // Punkt został dodany, krawędź już dodana
        // (ścieżka zostanie narysowana niżej)
      } else {
        // Pole jest blisko istniejącego punktu, dorysuj ścieżkę bezpośrednio
        // (jeśli nie istnieje krawędź)
        if (!edges.some(e => (e.a === minIdx && e.b === minIdx))) {
          // (niepotrzebne, bo to ten sam punkt)
        }
      }
    }

    // Rysuj ścieżki między punktami (z lekkim szumem)
    function drawPath(x1: number, y1: number, x2: number, y2: number) {
      const steps = Math.max(Math.abs(x2-x1), Math.abs(y2-y1));
      for (let i = 0; i <= steps; i++) {
        const t = i/steps;
        // Dodaj delikatny szum do ścieżki
        const nx = x1 + (x2-x1)*t + Math.sin(t*5+off1)*1.2 + (Math.random()-0.5)*0.5;
        const ny = y1 + (y2-y1)*t + Math.cos(t*5+off2)*1.2 + (Math.random()-0.5)*0.5;
        const xi = Math.round(nx);
        const yi = Math.round(ny);
        if (xi < 0 || xi >= width || yi < 0 || yi >= height) continue;
        // Szerokość ścieżki zależna od odległości od wioski
        const dist = Math.sqrt((xi-cx)**2 + (yi-cy)**2);
        const pathW = Math.max(1, Math.round(8 - 7*(dist-villageRadius)/(Math.min(width, height)/2-denseForestWidth-villageRadius)));
        for (let dx = -Math.floor(pathW/2); dx <= Math.floor(pathW/2); dx++) {
          for (let dy = -Math.floor(pathW/2); dy <= Math.floor(pathW/2); dy++) {
            const xx = xi+dx, yy = yi+dy;
            if (xx < 0 || xx >= width || yy < 0 || yy >= height) continue;
            if (!biomeMask[yy][xx] || biomeMask[yy][xx]==='meadow') biomeMask[yy][xx] = 'road';
          }
        }
      }
    }
    for (const edge of edges) {
      const p1 = points[edge.a], p2 = points[edge.b];
      drawPath(p1.x, p1.y, p2.x, p2.y);
    }
    // 5. Pozostałe biomy: łąki, lasy, krzaki (nieregularne, przez noise)
    // Bardziej subtelne, większe obszary biomów: zmniejszona częstotliwość szumów, mniej losowości
    const off3 = Math.random() * 1000;
    // 1. Duże płaty lasu: jeden szum, szeroki threshold
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (biomeMask[y][x]) continue;
        // Kombinacja kilku szumów o różnych kierunkach i przesunięciach
        const n1 = Math.sin(x*0.012 + y*0.014 + off1);
        const n2 = Math.cos(x*0.009 - y*0.011 + off2);
        const n3 = Math.sin(x*0.021 + y*0.017 + off3);
        // Lokalny offset progu (drobne zaburzenia granic)
        const edgeNoise = Math.sin(x*0.07 + y*0.11 + off2) * 0.18;
        const n = n1 + n2 + n3;
        // Próg z lokalnym offsetem
        if (n < -0.45 + edgeNoise) {
          biomeMask[y][x] = 'forest';
        } else {
          biomeMask[y][x] = 'meadow';
        }
      }
    }
    // 2. Krzaki tylko na granicy lasu i łąki (pasy przejściowe)
    for (let y = 1; y < height-1; y++) {
      for (let x = 1; x < width-1; x++) {
        if (biomeMask[y][x] !== 'meadow') continue;
        // Jeśli sąsiaduje z lasem, zamień na bush
        let hasForest = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (biomeMask[y+dy][x+dx] === 'forest') hasForest = true;
          }
        }
        if (hasForest) biomeMask[y][x] = 'bush';
      }
    }

    // Funkcja pokrycia terenu
    function getLandCover(x: number, y: number): LandCover {
      const b = biomeMask[y][x];
      if (b === 'dense-forest') return 'dense-forest';
      if (b === 'village') return 'building';
      if (b === 'field') return 'field';
      if (b === 'ditch') return 'water';
      if (b === 'road') return 'road';
      if (b === 'forest') return 'forest';
      if (b === 'meadow') return 'meadow';
      if (b === 'bush') return 'bush';
      return 'meadow';
    }
    // Generuj mapę
    const map: Tile[][] = [];
    for (let y = 0; y < height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < width; x++) {
        const heightVal = getHeight(x, y);
        const cover = getLandCover(x, y);
        // Mapowanie land cover na Biome (do zachowania kompatybilności)
        let biome: Biome;
        switch (cover) {
          case 'meadow': biome = 'grass'; break;
          case 'field': biome = 'field'; break;
          case 'forest': biome = 'forest'; break;
          case 'bush': biome = 'reed'; break;
          case 'water': biome = 'lake'; break;
          case 'road': biome = 'river'; break; // TODO: dodać osobny biome na ścieżki
          case 'dense-forest': biome = 'dense-forest'; break;
          case 'building': biome = 'village'; break;
          default: biome = 'grass';
        }
        // Gęsty las i wioska są nieprzekraczalne
        let isPassable = true;
        if (cover === 'water' || biomeMask[y][x] === 'dense-forest' || biomeMask[y][x] === 'village') isPassable = false;
        row.push({ biome, height: heightVal, isPassable });
      }
      map.push(row);
    }
    // Szczyty i doliny jak dotychczas
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


  exportMap(map: Tile[][]): string {
    return JSON.stringify(map);
  }

  importMap(json: string): Tile[][] {
    return JSON.parse(json);
  }
}