import React, { useRef, useEffect } from "react";
import { Application, Graphics, Text, TextStyle } from "pixi.js";
import { SPELLBOOK } from "shared";
import type { SpellId, StrokePoint } from "shared";
import { SoundManager } from "../game/SoundManager";

interface DrawingCanvasProps {
  activeChord: string;
  shiftHeld: boolean;
  onStrokePoint: (x: number, y: number, pressure: number, timestamp: number) => void;
  onStrokeEnd: (points: StrokePoint[]) => void;
  overtime?: boolean;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  activeChord,
  shiftHeld,
  onStrokePoint,
  onStrokeEnd,
  overtime = false
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Pixi refs
  const pixiAppRef = useRef<Application | null>(null);
  const drawingGraphicsRef = useRef<Graphics | null>(null);
  const gridGraphicsRef = useRef<Graphics | null>(null);
  const guideTextRef = useRef<Text | null>(null);
  const particlesRef = useRef<Graphics[]>([]);

  // Keep refs of props to avoid closure traps in the RAF loop and event handlers
  const chordRef = useRef(activeChord);
  const shiftRef = useRef(shiftHeld);
  const overtimeRef = useRef(overtime);
  const pointsRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    chordRef.current = activeChord;
  }, [activeChord]);

  useEffect(() => {
    shiftRef.current = shiftHeld;
  }, [shiftHeld]);

  useEffect(() => {
    if (overtimeRef.current !== overtime) {
      overtimeRef.current = overtime;
      if (pixiAppRef.current && gridGraphicsRef.current) {
        const app = pixiAppRef.current;
        drawGrid(gridGraphicsRef.current, app.screen.width, app.screen.height, overtime);
      }
    }
  }, [overtime]);

  // Clean up canvas when chord changes or is released
  useEffect(() => {
    if (activeChord === "") {
      pointsRef.current = [];
      SoundManager.stopScribe();
    }
  }, [activeChord]);

  const drawGrid = (g: Graphics, width: number, height: number, isOvertime: boolean) => {
    g.clear();
    const color = isOvertime ? 0xef4444 : 0xffffff;
    const alpha = isOvertime ? 0.08 : 0.03;
    
    const gridSize = 40;
    
    // Grid lines
    for (let x = 0; x < width; x += gridSize) {
      g.moveTo(x, 0);
      g.lineTo(x, height);
    }
    for (let y = 0; y < height; y += gridSize) {
      g.moveTo(0, y);
      g.lineTo(width, y);
    }
    g.stroke({ width: 1, color, alpha });
  };

  const drawPoints = () => {
    if (!drawingGraphicsRef.current) return;
    const g = drawingGraphicsRef.current;
    g.clear();
    
    const points = pointsRef.current;
    if (points.length === 0) return;
    
    const isShift = shiftRef.current;
    const color = isShift ? 0xef4444 : 0xa855f7;
    
    // 1. Draw outer neon glow underlay
    if (points.length > 0) {
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p.pressure === -1) {
          g.moveTo(p.x, p.y);
        } else {
          g.lineTo(p.x, p.y);
        }
      }
      g.stroke({ width: 8, color, alpha: 0.22 });
    }
    
    // 2. Draw core sharp line
    if (points.length > 0) {
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p.pressure === -1) {
          g.moveTo(p.x, p.y);
        } else {
          g.lineTo(p.x, p.y);
        }
      }
      g.stroke({ width: 3.5, color, alpha: 0.95 });
    }
  };

  const updateGuide = () => {
    const currentChord = chordRef.current;
    const currentShift = shiftRef.current;
    const text = guideTextRef.current;
    if (!text) return;
    
    const spell = SPELLBOOK[currentChord as SpellId];
    if (!spell || currentChord === "") {
      text.visible = false;
      return;
    }
    
    text.text = spell.unicodeSymbol;
    text.visible = true;
    
    // Color based on spell type
    let color = 0xa855f7; // default combo
    if (spell.chord === "Q") color = 0xef4444; // Fire
    else if (spell.chord === "W") color = 0x3b82f6; // Water
    else if (spell.chord === "E") color = 0x10b981; // Earth
    else if (spell.chord === "R") color = 0xeab308; // Air
    
    text.style.fill = color;
    text.rotation = currentShift ? Math.PI : 0;
  };

  const spawnSparkles = (x: number, y: number, isShift: boolean) => {
    if (!pixiAppRef.current) return;
    const app = pixiAppRef.current;
    
    const color = isShift ? 0xef4444 : 0xa855f7;
    
    for (let i = 0; i < 3; i++) {
      const particle = new Graphics();
      particle.circle(0, 0, 1 + Math.random() * 3);
      particle.fill({ color, alpha: 0.85 });
      
      particle.x = x;
      particle.y = y;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.0;
      (particle as any).vx = Math.cos(angle) * speed;
      (particle as any).vy = Math.sin(angle) * speed;
      (particle as any).alpha = 1.0;
      (particle as any).decay = 0.025 + Math.random() * 0.035;
      
      app.stage.addChild(particle);
      particlesRef.current.push(particle);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const app = new Application();
    let isDestroyed = false;
    
    const initPixi = async () => {
      const rect = container.getBoundingClientRect();
      await app.init({
        width: rect.width || 400,
        height: rect.height || 400,
        backgroundAlpha: 0,
        antialias: true
      });
      
      if (isDestroyed) {
        app.destroy(true, { children: true, texture: true });
        return;
      }
      
      container.appendChild(app.canvas);
      pixiAppRef.current = app;
      
      // Grid graphics
      const gridG = new Graphics();
      app.stage.addChild(gridG);
      gridGraphicsRef.current = gridG;
      
      // Guide Text Watermark
      const style = new TextStyle({
        fontFamily: '"Noto Sans Runic", "Outfit", "Inter", sans-serif',
        fontSize: Math.min(app.screen.width, app.screen.height) * 0.45,
        fontWeight: "bold",
        fill: 0xa855f7,
        align: "center",
      });
      
      const text = new Text({ text: "", style });
      text.alpha = 0.16;
      text.anchor.set(0.5);
      text.x = app.screen.width / 2;
      text.y = app.screen.height / 2;
      app.stage.addChild(text);
      guideTextRef.current = text;
      
      // Drawing graphics
      const drawG = new Graphics();
      app.stage.addChild(drawG);
      drawingGraphicsRef.current = drawG;
      
      // Draw grid
      drawGrid(gridG, app.screen.width, app.screen.height, overtimeRef.current);
      
      // Pixi ticker loop
      app.ticker.add(() => {
        // Update particles
        const particles = particlesRef.current;
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += (p as any).vx;
          p.y += (p as any).vy;
          p.alpha -= (p as any).decay;
          p.scale.set(p.alpha);
          if (p.alpha <= 0) {
            app.stage.removeChild(p);
            p.destroy();
            particles.splice(i, 1);
          }
        }
        
        drawPoints();
        updateGuide();
        
        // Pulse grid if in overtime
        if (overtimeRef.current) {
          gridG.alpha = 0.5 + Math.sin(Date.now() / 150) * 0.25;
        } else {
          gridG.alpha = 1.0;
        }
      });
    };
    
    initPixi();
    
    const handleResize = () => {
      if (!pixiAppRef.current) return;
      const app = pixiAppRef.current;
      const rect = container.getBoundingClientRect();
      app.renderer.resize(rect.width, rect.height);
      
      if (guideTextRef.current) {
        guideTextRef.current.x = app.screen.width / 2;
        guideTextRef.current.y = app.screen.height / 2;
        guideTextRef.current.style.fontSize = Math.min(app.screen.width, app.screen.height) * 0.45;
      }
      
      if (gridGraphicsRef.current) {
        drawGrid(gridGraphicsRef.current, app.screen.width, app.screen.height, overtimeRef.current);
      }
    };
    window.addEventListener("resize", handleResize);
    
    return () => {
      isDestroyed = true;
      window.removeEventListener("resize", handleResize);
      
      particlesRef.current.forEach(p => p.destroy());
      particlesRef.current = [];
      
      if (pixiAppRef.current) {
        pixiAppRef.current.destroy(true, { children: true, texture: true });
        pixiAppRef.current = null;
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (chordRef.current === "") return;
    
    const container = containerRef.current;
    if (!container) return;

    isDrawingRef.current = true;
    container.setPointerCapture(e.pointerId);

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const timestamp = Date.now();
    const sentinelPt: StrokePoint = {
      x,
      y,
      pressure: -1,
      timestamp
    };
    const startPt: StrokePoint = {
      x,
      y,
      pressure: e.pressure || 0.5,
      timestamp
    };

    pointsRef.current.push(sentinelPt);
    pointsRef.current.push(startPt);
    
    onStrokePoint(x, y, sentinelPt.pressure, sentinelPt.timestamp);
    onStrokePoint(x, y, startPt.pressure, startPt.timestamp);
    
    spawnSparkles(x, y, shiftRef.current);
    SoundManager.playScribe();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current || chordRef.current === "") return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const points = pointsRef.current;
    const lastPt = points[points.length - 1];
    if (lastPt) {
      const dx = x - lastPt.x;
      const dy = y - lastPt.y;
      if (Math.sqrt(dx * dx + dy * dy) < 3) {
        return;
      }
    }

    const pt: StrokePoint = {
      x,
      y,
      pressure: e.pressure || 0.5,
      timestamp: Date.now()
    };

    pointsRef.current.push(pt);
    onStrokePoint(x, y, pt.pressure, pt.timestamp);
    
    spawnSparkles(x, y, shiftRef.current);
    SoundManager.playScribe();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    const container = containerRef.current;
    if (container) {
      container.releasePointerCapture(e.pointerId);
    }

    onStrokeEnd(pointsRef.current);
    SoundManager.stopScribe();
  };

  const containerBorderClass = overtime
    ? "pixel-panel-red border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
    : "pixel-panel";

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden transition-all duration-300 cursor-crosshair touch-none ${containerBorderClass}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {chordRef.current === "" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 font-medium tracking-wider text-sm">
          HOLD SPELL KEY CHORD TO START INSCRIBING
        </div>
      )}
    </div>
  );
};
