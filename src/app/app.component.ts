import { Component, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { MapService } from './services/map.service';
import { Tile, Biome } from './models/tile.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [FormsModule],
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  @ViewChild('mapCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('miniMapCanvas') miniMapRef!: ElementRef<HTMLCanvasElement>;
  private map: Tile[][] = [];
  colorMode: 'height' | 'biome' = 'height';
  // Płynny zoom i przesuwanie
  centerX = 500; // środek mapy
  centerY = 500;
  zoom = 1; // 1 = cała mapa, 2 = 2x, 4 = 4x itd.
  minZoom = 1;
  maxZoom = 32;

  constructor(private mapService: MapService) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const mapSize = 1000;
    this.map = this.mapService.generateMap(mapSize, mapSize);
    this.redraw();
    // Obsługa scrolla
    canvas.addEventListener('wheel', (event) => this.onCanvasWheel(event));
    // Obsługa przesuwania myszą
    let isDragging = false;
    let lastX = 0, lastY = 0;
    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      lastX = e.offsetX;
      lastY = e.offsetY;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const dx = (e.clientX - rect.left - lastX) / (width / (1000 / this.zoom));
      const dy = (e.clientY - rect.top - lastY) / (height / (1000 / this.zoom));
      this.centerX -= dx;
      this.centerY -= dy;
      this.clampCenter();
      lastX = e.clientX - rect.left;
      lastY = e.clientY - rect.top;
      this.redraw();
    });
    window.addEventListener('mouseup', () => { isDragging = false; });
  }

  private getZoomWindow() {
    const mapWidth = this.map[0].length;
    const mapHeight = this.map.length;
    const viewWidth = mapWidth / this.zoom;
    const viewHeight = mapHeight / this.zoom;
    let minX = this.centerX - viewWidth / 2;
    let maxX = this.centerX + viewWidth / 2;
    let minY = this.centerY - viewHeight / 2;
    let maxY = this.centerY + viewHeight / 2;
    // Clamp do mapy
    if (minX < 0) { maxX += -minX; minX = 0; }
    if (maxX > mapWidth) { minX -= (maxX - mapWidth); maxX = mapWidth; }
    if (minY < 0) { maxY += -minY; minY = 0; }
    if (maxY > mapHeight) { minY -= (maxY - mapHeight); maxY = mapHeight; }
    return { minX: Math.floor(minX), minY: Math.floor(minY), maxX: Math.ceil(maxX), maxY: Math.ceil(maxY) };
  }

  private clampCenter() {
    const mapWidth = this.map[0].length;
    const mapHeight = this.map.length;
    const viewWidth = mapWidth / this.zoom;
    const viewHeight = mapHeight / this.zoom;
    this.centerX = Math.max(viewWidth / 2, Math.min(mapWidth - viewWidth / 2, this.centerX));
    this.centerY = Math.max(viewHeight / 2, Math.min(mapHeight - viewHeight / 2, this.centerY));
  }

  onCanvasWheel(event: WheelEvent) {
    event.preventDefault();
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    // Pozycja kursora na mapie (współrzędne mapy)
    const { minX, minY, maxX, maxY } = this.getZoomWindow();
    const mapX = minX + (mouseX / rect.width) * (maxX - minX);
    const mapY = minY + (mouseY / rect.height) * (maxY - minY);
    // Zoom in/out względem kursora
    const zoomFactor = event.deltaY < 0 ? 2 : 0.5;
    let newZoom = this.zoom * zoomFactor;
    newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    if (newZoom === this.zoom) return;

    // Oblicz proporcje kursora względem widoku
    const relX = (mapX - this.centerX) / (maxX - minX);
    const relY = (mapY - this.centerY) / (maxY - minY);

    // Nowy widok tak, by punkt pod kursorem pozostał pod kursorem
    this.zoom = newZoom;
    const newViewW = this.map[0].length / this.zoom;
    const newViewH = this.map.length / this.zoom;
    this.centerX = mapX - relX * newViewW;
    this.centerY = mapY - relY * newViewH;
    this.clampCenter();
    this.redraw();
  }

  moveZoom(dx: number, dy: number) {
    // Przesuwanie widoku o ułamek szerokości/wysokości widoku
    const mapWidth = this.map[0].length;
    const mapHeight = this.map.length;
    const viewWidth = mapWidth / this.zoom;
    const viewHeight = mapHeight / this.zoom;
    this.centerX += dx * viewWidth * 0.2;
    this.centerY += dy * viewHeight * 0.2;
    this.clampCenter();
    this.redraw();
  }

  // Rysowanie izohips
  private drawContours(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    // Najpierw tło (gradient wysokości lub biomy)
    const imageData = ctx.createImageData(width, height);
    const mapWidth = this.map[0].length;
    const mapHeight = this.map.length;
    const { minX, minY, maxX, maxY } = this.getZoomWindow();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const mapX = Math.round(minX + (x / width) * (maxX - minX));
        const mapY = Math.round(minY + (y / height) * (maxY - minY));
        const tile = this.map[mapY][mapX];
        let color;
        if (this.colorMode === 'height') {
          // Czerwono-różowy gradient
          const h = tile.height;
          const r = 255;
          const g = Math.round(240 - (240 - 34) * h); // 240 -> 34
          const b = Math.round(250 - (250 - 34) * h); // 250 -> 34
          color = { r, g, b };
        } else {
          // Kolor biomu
          color = this.hexToRgb(this.mapService.getBiomeColor(tile.biome));
        }
        const idx = (y * width + x) * 4;
        imageData.data[idx] = color.r;
        imageData.data[idx + 1] = color.g;
        imageData.data[idx + 2] = color.b;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Teraz rysuj izohipsy jako linie o stałej szerokości
    const contourStep = 0.05; // co 50 metrów
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#000';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // Kolorowanie izohips: od jasnego czerwonego do bordowego
    const minIso = 0.05; // minimalna izohipsa (pomijamy 0)
    const maxIso = 0.95; // maksymalna izohipsa (poniżej 1)
    for (let iso = minIso; iso <= maxIso; iso += contourStep) {
      // Interpoluj kolor: #ffcccc (jasny) -> #800020 (bordowy)
      const t = (iso - minIso) / (maxIso - minIso);
      // R: 255 -> 128, G: 204 -> 0, B: 204 -> 32
      const r = Math.round(255 * (1 - t) + 128 * t);
      const g = Math.round(204 * (1 - t) + 0 * t);
      const b = Math.round(204 * (1 - t) + 32 * t);
      ctx.strokeStyle = `rgb(${r},${g},${b})`;
      for (let mapY = Math.max(0, Math.floor(minY)); mapY < Math.min(mapHeight - 1, Math.ceil(maxY)); mapY++) {
        for (let mapX = Math.max(0, Math.floor(minX)); mapX < Math.min(mapWidth - 1, Math.ceil(maxX)); mapX++) {
          // marching squares: sprawdź 4 rogi kafelka
          const h00 = this.map[mapY][mapX].height;
          const h10 = this.map[mapY][mapX+1].height;
          const h01 = this.map[mapY+1][mapX].height;
          const h11 = this.map[mapY+1][mapX+1].height;
          // znajdź krawędzie przecięte przez izohipsę
          const edges = [];
          // lewa krawędź
          if ((h00 < iso && h01 > iso) || (h00 > iso && h01 < iso)) {
            const tL = (iso - h00) / (h01 - h00);
            const x = mapX;
            const y = mapY + tL;
            edges.push({cx: x, cy: y});
          }
          // prawa krawędź
          if ((h10 < iso && h11 > iso) || (h10 > iso && h11 < iso)) {
            const tR = (iso - h10) / (h11 - h10);
            const x = mapX + 1;
            const y = mapY + tR;
            edges.push({cx: x, cy: y});
          }
          // góra
          if ((h00 < iso && h10 > iso) || (h00 > iso && h10 < iso)) {
            const tT = (iso - h00) / (h10 - h00);
            const x = mapX + tT;
            const y = mapY;
            edges.push({cx: x, cy: y});
          }
          // dół
          if ((h01 < iso && h11 > iso) || (h01 > iso && h11 < iso)) {
            const tB = (iso - h01) / (h11 - h01);
            const x = mapX + tB;
            const y = mapY + 1;
            edges.push({cx: x, cy: y});
          }
          // jeśli są dwa przecięcia, rysuj odcinek
          if (edges.length === 2) {
            // przelicz na canvas
            const x1 = ((edges[0].cx - minX) / (maxX - minX)) * width;
            const y1 = ((edges[0].cy - minY) / (maxY - minY)) * height;
            const x2 = ((edges[1].cx - minX) / (maxX - minX)) * width;
            const y2 = ((edges[1].cy - minY) / (maxY - minY)) * height;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        }
      }
    }
    // Przechodzimy po każdym "kafelku" mapy w oknie zoomu
    if (width > 0 && height > 0) {
      for (let mapY = Math.max(1, Math.floor(minY)); mapY < Math.min(mapHeight - 1, Math.ceil(maxY)); mapY++) {
        for (let mapX = Math.max(1, Math.floor(minX)); mapX < Math.min(mapWidth - 1, Math.ceil(maxX)); mapX++) {
          const h = this.map[mapY][mapX].height;
          // Sprawdź sąsiadów (prawo i dół) – rysuj izohipsę jeśli przechodzi przez krawędź
          for (const [dx, dy] of [[1,0],[0,1]]) {
            const nx = mapX + dx;
            const ny = mapY + dy;
            if (nx >= 0 && nx < mapWidth && ny >= 0 && ny < mapHeight) {
              const nh = this.map[ny][nx].height;
              if (nh === h) continue; // uniknij dzielenia przez zero
              const minH = Math.min(h, nh);
              const maxH = Math.max(h, nh);
              let lower = Math.ceil(minH / contourStep) * contourStep;
              if (Math.abs(lower - minH) < 1e-8) lower += contourStep;
              for (let iso = lower; iso < maxH; iso += contourStep) {
                if (iso > minH && iso < maxH) {
                  const t = (iso - h) / (nh - h);
                  if (isNaN(t) || t < 0 || t > 1) continue;
                  // mapX, mapY -> canvasX, canvasY
                  const x1 = ((mapX - minX) / (maxX - minX)) * width;
                  const y1 = ((mapY - minY) / (maxY - minY)) * height;
                  const x2 = ((nx - minX) / (maxX - minX)) * width;
                  const y2 = ((ny - minY) / (maxY - minY)) * height;
                  const cx = x1 + (x2 - x1) * t;
                  const cy = y1 + (y2 - y1) * t;
                  ctx.beginPath();
                  if (dx === 1) {
                    ctx.moveTo(cx, y1);
                    ctx.lineTo(cx, y2);
                  } else {
                    ctx.moveTo(x1, cy);
                    ctx.lineTo(x2, cy);
                  }
                  ctx.stroke();
                }
              }
            }
          }
        }
      }
    }
    ctx.restore();
  }

  redraw(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    this.drawContours(ctx, width, height);
    this.drawPeaksAndValleys(ctx, width, height);
    this.drawMiniMap();
  }

  private drawMiniMap(): void {
    if (!this.miniMapRef) return;
    const mini = this.miniMapRef.nativeElement;
    const ctx = mini.getContext('2d');
    if (!ctx) return;
    const w = mini.width;
    const h = mini.height;
    // Tło mini-mapki (biomy lub wysokość, bardzo uproszczone)
    const mapW = this.map[0].length;
    const mapH = this.map.length;
    const stepX = mapW / w;
    const stepY = mapH / h;
    const imageData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const mapX = Math.floor(x * stepX);
        const mapY = Math.floor(y * stepY);
        const tile = this.map[mapY][mapX];
        let color;
        if (this.colorMode === 'height') {
          const hh = tile.height;
          const r = 255;
          const g = Math.round(240 - (240 - 34) * hh);
          const b = Math.round(250 - (250 - 34) * hh);
          color = { r, g, b };
        } else {
          color = this.hexToRgb(this.mapService.getBiomeColor(tile.biome));
        }
        const idx = (y * w + x) * 4;
        imageData.data[idx] = color.r;
        imageData.data[idx + 1] = color.g;
        imageData.data[idx + 2] = color.b;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    // Ramka widoku
    ctx.save();
    ctx.strokeStyle = '#ff0';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.9;
    // Wyznacz prostokąt widoku na mini-mapce
    const viewW = mapW / this.zoom;
    const viewH = mapH / this.zoom;
    const minX = this.centerX - viewW / 2;
    const minY = this.centerY - viewH / 2;
    const x = (minX / mapW) * w;
    const y = (minY / mapH) * h;
    const ww = (viewW / mapW) * w;
    const hh2 = (viewH / mapH) * h;
    ctx.strokeRect(x, y, ww, hh2);
    ctx.restore();
  }

// ...istniejący kod klasy AppComponent...

private drawPeaksAndValleys(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.save();
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.strokeStyle = '#282828';
  ctx.fillStyle = '#282828';
  const peakRadius = 6;
  const valleyRadius = 6;
  const mapWidth = this.map[0].length;
  const mapHeight = this.map.length;
  const minPeakDistance = 20; // px na canvasie
  const minValleyDistance = 20;

  // Wyznacz okno zoomu
  const { minX, minY, maxX, maxY } = this.getZoomWindow();

  // Szczyty
  const peaks: { x: number, y: number, h: number }[] = [];
  for (let mapY = Math.floor(minY); mapY < Math.ceil(maxY); mapY++) {
    for (let mapX = Math.floor(minX); mapX < Math.ceil(maxX); mapX++) {
      const tile = this.map[mapY][mapX] as any;
      if (tile.isPeak && tile.height > 0.2) {
        const x = ((mapX - minX) / (maxX - minX)) * width;
        const y = ((mapY - minY) / (maxY - minY)) * height;
        peaks.push({ x, y, h: tile.height });
      }
    }
  }
  // Filtruj szczyty po odległości na canvasie
  const filteredPeaks: { x: number, y: number, h: number }[] = [];
  peaks.sort((a, b) => b.h - a.h); // od najwyższego
  for (const peak of peaks) {
    if (!filteredPeaks.some(p => Math.hypot(p.x - peak.x, p.y - peak.y) < minPeakDistance)) {
      filteredPeaks.push(peak);
    }
  }
  // Rysuj szczyty
  for (const peak of filteredPeaks) {
    ctx.beginPath();
    ctx.moveTo(peak.x - peakRadius, peak.y - peakRadius);
    ctx.lineTo(peak.x + peakRadius, peak.y + peakRadius);
    ctx.moveTo(peak.x - peakRadius, peak.y + peakRadius);
    ctx.lineTo(peak.x + peakRadius, peak.y - peakRadius);
    ctx.stroke();
    ctx.fillText(Math.round(peak.h * 1000) + ' m', peak.x, peak.y + peakRadius + 2);
  }

  // Doliny
  const valleys: { x: number, y: number, h: number }[] = [];
  for (let mapY = Math.floor(minY); mapY < Math.ceil(maxY); mapY++) {
    for (let mapX = Math.floor(minX); mapX < Math.ceil(maxX); mapX++) {
      const tile = this.map[mapY][mapX] as any;
      if (tile.isValley && tile.height < 0.8) {
        const x = ((mapX - minX) / (maxX - minX)) * width;
        const y = ((mapY - minY) / (maxY - minY)) * height;
        valleys.push({ x, y, h: tile.height });
      }
    }
  }
  // Filtruj doliny po odległości na canvasie
  const filteredValleys: { x: number, y: number, h: number }[] = [];
  valleys.sort((a, b) => a.h - b.h); // od najniższego
  for (const valley of valleys) {
    if (!filteredValleys.some(v => Math.hypot(v.x - valley.x, v.y - valley.y) < minValleyDistance)) {
      filteredValleys.push(valley);
    }
  }
  // Rysuj doliny
  for (const valley of filteredValleys) {
    ctx.beginPath();
    ctx.moveTo(valley.x - valleyRadius, valley.y - valleyRadius);
    ctx.lineTo(valley.x, valley.y + valleyRadius);
    ctx.lineTo(valley.x + valleyRadius, valley.y - valleyRadius);
    ctx.stroke();
    ctx.fillText(Math.round(valley.h * 1000) + ' m', valley.x, valley.y + valleyRadius + 2);
  }

  ctx.restore();
}

// ...istniejący kod klasy AppComponent...

  // Converts a hex color string to an object with r, g, b properties
  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
      hex = hex.split('').map(x => x + x).join('');
    }
    const num = parseInt(hex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  generateRandomMap(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;
    const mapSize = 1000;
    this.map = this.mapService.generateMap(mapSize, mapSize);
    this.centerX = 500;
    this.centerY = 500;
    this.zoom = 1;
    this.redraw();
  }

  downloadMap(): void {
    const blob = new Blob([this.mapService.exportMap(this.map)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'map.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  uploadMap(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      const json = reader.result as string;
      const map = this.mapService.importMap(json);
      if (map) {
        this.map = map;
        const canvas = this.canvasRef.nativeElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const width = canvas.width;
        const height = canvas.height;
        this.drawContours(ctx, width, height);
        this.drawPeaksAndValleys(ctx, width, height);
      }
    };
    reader.readAsText(file);
  }

  onZoomSliderChange(event: Event) {
    const newZoom = +(event.target as HTMLInputElement).value;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
    this.clampCenter();
    this.redraw();
  }
}