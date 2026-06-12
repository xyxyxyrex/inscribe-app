import { SpellId } from "./spells";

export interface Point {
  x: number;
  y: number;
}

export interface Template {
  name: SpellId;
  points: Point[];
}

// Bounding box dimensions for $1 recognizer scaling
const BBOX_SIZE = 250;
const NUM_POINTS = 64;
const PHI = 0.5 * (Math.sqrt(5.0) - 1.0); // Golden Ratio

export class Recognizer {
  public templates: Template[] = [];

  constructor() {
    this.initTemplates();
  }

  private initTemplates() {
    // Programmatically define the 10 templates.
    // Each template will be normalized (resampled, rotated to 0, scaled to 250, and translated to 0,0)
    // so we can compare user strokes directly against them.

    const rawTemplates: { name: SpellId; points: Point[] }[] = [
      // Q: Quyra (Fire) - Triangle pointing up with horizontal bar
      {
        name: "Q",
        points: [
          { x: 125, y: 50 },
          { x: 50, y: 200 },
          { x: 200, y: 200 },
          { x: 125, y: 50 },
          { x: 80, y: 130 },
          { x: 170, y: 130 }
        ]
      },
      // W: Wyra (Water) - Triangle pointing down with horizontal bar
      {
        name: "W",
        points: [
          { x: 50, y: 80 },
          { x: 200, y: 80 },
          { x: 125, y: 230 },
          { x: 50, y: 80 },
          { x: 80, y: 150 },
          { x: 170, y: 150 }
        ]
      },
      // E: Eldra (Earth) - Triangle pointing down
      {
        name: "E",
        points: [
          { x: 50, y: 70 },
          { x: 200, y: 70 },
          { x: 125, y: 220 },
          { x: 50, y: 70 }
        ]
      },
      // R: Rhael (Air) - Triangle pointing up
      {
        name: "R",
        points: [
          { x: 125, y: 50 },
          { x: 50, y: 200 },
          { x: 200, y: 200 },
          { x: 125, y: 50 }
        ]
      },
      // Q+W: Vael - Lightning bolt
      {
        name: "Q+W",
        points: [
          { x: 160, y: 50 },
          { x: 90, y: 125 },
          { x: 160, y: 125 },
          { x: 90, y: 200 }
        ]
      },
      // Q+E: Tharyn - Pentagram (5-pointed star)
      {
        name: "Q+E",
        points: [
          { x: 125, y: 50 },
          { x: 175, y: 200 },
          { x: 60, y: 110 },
          { x: 190, y: 110 },
          { x: 75, y: 200 },
          { x: 125, y: 50 }
        ]
      },
      // Q+R: Asurel - Comet (circle loop then straight tail)
      {
        name: "Q+R",
        points: this.generateCometPoints()
      },
      // W+E: Sorveth - Tidecurse (Figure 8 / infinity sign)
      {
        name: "W+E",
        points: this.generateInfinityPoints()
      },
      // W+R: Luneth - Crescent (inward curve, outward curve)
      {
        name: "W+R",
        points: [
          { x: 150, y: 60 },
          { x: 115, y: 90 },
          { x: 100, y: 125 },
          { x: 115, y: 160 },
          { x: 150, y: 190 },
          { x: 125, y: 160 },
          { x: 115, y: 125 },
          { x: 125, y: 90 },
          { x: 150, y: 60 }
        ]
      },
      // E+R: Draeven - Hexagon
      {
        name: "E+R",
        points: [
          { x: 125, y: 50 },
          { x: 190, y: 88 },
          { x: 190, y: 162 },
          { x: 125, y: 200 },
          { x: 60, y: 162 },
          { x: 60, y: 88 },
          { x: 125, y: 50 }
        ]
      }
    ];

    for (const t of rawTemplates) {
      this.templates.push({
        name: t.name,
        points: this.normalize(t.points)
      });
    }
  }

  private generateCometPoints(): Point[] {
    const pts: Point[] = [];
    const steps = 16;
    // Circle loop
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      pts.push({
        x: 125 + 40 * Math.cos(angle),
        y: 100 + 40 * Math.sin(angle)
      });
    }
    // Tail
    pts.push({ x: 165, y: 140 });
    pts.push({ x: 210, y: 190 });
    pts.push({ x: 250, y: 230 });
    return pts;
  }

  private generateInfinityPoints(): Point[] {
    const pts: Point[] = [];
    const steps = 32;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      // Lemniscate of Bernoulli
      const scale = 80;
      const denom = 1 + Math.sin(t) * Math.sin(t);
      pts.push({
        x: 125 + (scale * Math.cos(t)) / denom,
        y: 125 + (scale * Math.sin(t) * Math.cos(t)) / denom
      });
    }
    return pts;
  }

  public normalize(points: Point[]): Point[] {
    if (points.length === 0) return [];
    let pts = this.resample(points, NUM_POINTS);
    const radians = this.indicativeAngle(pts);
    pts = this.rotateBy(pts, -radians);
    pts = this.scaleTo(pts, BBOX_SIZE);
    pts = this.translateTo(pts, { x: 0, y: 0 });
    return pts;
  }

  public recognize(points: Point[]): { name: SpellId; score: number } {
    if (points.length < 2) {
      return { name: "Q", score: 0 };
    }

    const candidate = this.normalize(points);
    let bestDist = Infinity;
    let bestTemplate: Template | null = null;

    for (const temp of this.templates) {
      const dist = this.distanceAtBestAngle(
        candidate,
        temp,
        -Math.PI / 4,
        Math.PI / 4,
        Math.PI / 180
      );
      if (dist < bestDist) {
        bestDist = dist;
        bestTemplate = temp;
      }
    }

    if (!bestTemplate) {
      return { name: "Q", score: 0 };
    }

    // Convert average distance to score from 0.0 to 1.0
    // Standard $1 recognizer formula for score: 1.0 - (bestDist / (0.5 * Math.sqrt(BBOX_SIZE^2 + BBOX_SIZE^2)))
    const halfDiag = 0.5 * Math.sqrt(BBOX_SIZE * BBOX_SIZE + BBOX_SIZE * BBOX_SIZE);
    const score = Math.max(0, 1.0 - bestDist / halfDiag);
    return { name: bestTemplate.name, score };
  }

  private resample(points: Point[], n: number): Point[] {
    const I = this.pathLength(points) / (n - 1);
    let D = 0;
    const newPoints: Point[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const d = this.distance(points[i - 1], points[i]);
      if (D + d >= I) {
        const qx = points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
        const qy = points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
        const q = { x: qx, y: qy };
        newPoints.push(q);
        points.splice(i, 0, q); // Insert q as the next point
        D = 0;
      } else {
        D += d;
      }
    }

    // Rounding errors sometimes make us end up with n-1 points
    if (newPoints.length === n - 1) {
      newPoints.push({ x: points[points.length - 1].x, y: points[points.length - 1].y });
    }

    return newPoints;
  }

  private indicativeAngle(points: Point[]): number {
    const c = this.centroid(points);
    return Math.atan2(points[0].y - c.y, points[0].x - c.x);
  }

  private rotateBy(points: Point[], radians: number): Point[] {
    const c = this.centroid(points);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    return points.map(p => ({
      x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x,
      y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y
    }));
  }

  private scaleTo(points: Point[], size: number): Point[] {
    const bbox = this.boundingBox(points);
    return points.map(p => ({
      x: p.x * (size / bbox.width),
      y: p.y * (size / bbox.height)
    }));
  }

  private translateTo(points: Point[], pt: Point): Point[] {
    const c = this.centroid(points);
    return points.map(p => ({
      x: p.x + pt.x - c.x,
      y: p.y + pt.y - c.y
    }));
  }

  private distanceAtBestAngle(
    points: Point[],
    T: Template,
    a: number,
    b: number,
    threshold: number
  ): number {
    let x1 = PHI * a + (1.0 - PHI) * b;
    let f1 = this.distanceAtAngle(points, T, x1);
    let x2 = (1.0 - PHI) * a + PHI * b;
    let f2 = this.distanceAtAngle(points, T, x2);

    while (Math.abs(b - a) > threshold) {
      if (f1 < f2) {
        b = x2;
        x2 = x1;
        f2 = f1;
        x1 = PHI * a + (1.0 - PHI) * b;
        f1 = this.distanceAtAngle(points, T, x1);
      } else {
        a = x1;
        x1 = x2;
        f1 = f2;
        x2 = (1.0 - PHI) * a + PHI * b;
        f2 = this.distanceAtAngle(points, T, x2);
      }
    }
    return Math.min(f1, f2);
  }

  private distanceAtAngle(points: Point[], T: Template, radians: number): number {
    const newPoints = this.rotateBy(points, radians);
    return this.pathDistance(newPoints, T.points);
  }

  private pathDistance(pts1: Point[], pts2: Point[]): number {
    let d = 0;
    const len = Math.min(pts1.length, pts2.length);
    for (let i = 0; i < len; i++) {
      d += this.distance(pts1[i], pts2[i]);
    }
    return d / len;
  }

  private pathLength(points: Point[]): number {
    let d = 0;
    for (let i = 1; i < points.length; i++) {
      d += this.distance(points[i - 1], points[i]);
    }
    return d;
  }

  private distance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private centroid(points: Point[]): Point {
    let x = 0, y = 0;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    return { x: x / points.length, y: y / points.length };
  }

  private boundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    return {
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY)
    };
  }
}
