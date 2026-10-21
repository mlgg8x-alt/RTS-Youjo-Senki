import { clamp } from './util';

export class Camera {
  x = 360;
  y = 240;
  zoom = 2.2; // pixels per world metre
  minZoom = 0.55;
  maxZoom = 6;
  w = 800;
  h = 600;
  mapW = 720;
  mapH = 480;

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  setMap(w: number, h: number): void {
    this.mapW = w;
    this.mapH = h;
  }

  worldToScreen(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.x) * this.zoom + this.w / 2, y: (y - this.y) * this.zoom + this.h / 2 };
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.w / 2) / this.zoom + this.x, y: (sy - this.h / 2) / this.zoom + this.y };
  }

  panBy(dxPx: number, dyPx: number): void {
    this.x -= dxPx / this.zoom;
    this.y -= dyPx / this.zoom;
    this.clamp();
  }

  zoomAt(sx: number, sy: number, factor: number): void {
    const before = this.screenToWorld(sx, sy);
    this.zoom = clamp(this.zoom * factor, this.minZoom, this.maxZoom);
    const after = this.screenToWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.clamp();
  }

  centerOn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.clamp();
  }

  clamp(): void {
    const halfW = this.w / (2 * this.zoom);
    const halfH = this.h / (2 * this.zoom);
    const mx = Math.min(halfW, this.mapW / 2);
    const my = Math.min(halfH, this.mapH / 2);
    this.x = clamp(this.x, mx, this.mapW - mx);
    this.y = clamp(this.y, my, this.mapH - my);
  }

  visibleBounds(): { x0: number; y0: number; x1: number; y1: number } {
    const halfW = this.w / (2 * this.zoom);
    const halfH = this.h / (2 * this.zoom);
    return { x0: this.x - halfW, y0: this.y - halfH, x1: this.x + halfW, y1: this.y + halfH };
  }
}
