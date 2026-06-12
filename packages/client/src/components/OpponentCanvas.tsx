import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { Application, Graphics } from "pixi.js";

export interface OpponentCanvasRef {
  addPoint: (x: number, y: number, pressure: number) => void;
  clearCanvas: () => void;
}

interface OpponentCanvasProps {
  activeChord: string;
  shiftHeld: boolean;
  overtime?: boolean;
}

export const OpponentCanvas = forwardRef<OpponentCanvasRef, OpponentCanvasProps>(({
  activeChord,
  shiftHeld,
  overtime = false
}, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  // Pixi refs
  const pixiAppRef = useRef<Application | null>(null);
  const drawingGraphicsRef = useRef<Graphics | null>(null);
  const gridGraphicsRef = useRef<Graphics | null>(null);
  const particlesRef = useRef<Graphics[]>([]);

  // Keep refs of props to avoid closure traps
  const chordRef = useRef(activeChord);
  const shiftRef = useRef(shiftHeld);
  const overtimeRef = useRef(overtime);
  const pointsRef = useRef<{ x: number; y: number; pressure: number }[]>([]);

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

  // Expose functions to parent
  useImperativeHandle(ref, () => ({
    addPoint: (x: number, y: number, pressure: number) => {
      pointsRef.current.push({ x, y, pressure });
      spawnOpponentSparkles(x, y, shiftRef.current);
    },
    clearCanvas: () => {
      pointsRef.current = [];
      if (drawingGraphicsRef.current) {
        drawingGraphicsRef.current.clear();
      }
    }
  }));

  const drawGrid = (g: Graphics, width: number, height: number, isOvertime: boolean) => {
    g.clear();
    const color = isOvertime ? 0xef4444 : 0xffffff;
    const alpha = isOvertime ? 0.06 : 0.02;
    
    const gridSize = 40;
    
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
    const color = isShift ? 0xef4444 : 0x06b6d4; // Cyan for opponent spell
    
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
      g.stroke({ width: 7, color, alpha: 0.2 });
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
      g.stroke({ width: 2.5, color, alpha: 0.85 });
    }
  };

  const spawnOpponentSparkles = (x: number, y: number, isShift: boolean) => {
    if (!pixiAppRef.current) return;
    const app = pixiAppRef.current;
    
    const color = isShift ? 0xef4444 : 0x06b6d4;
    
    for (let i = 0; i < 2; i++) {
      const particle = new Graphics();
      particle.circle(0, 0, 1 + Math.random() * 2.5);
      particle.fill({ color, alpha: 0.8 });
      
      particle.x = x;
      particle.y = y;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.5;
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
        
        // Pulse grid slightly if in overtime
        if (overtimeRef.current) {
          gridG.alpha = 0.45 + Math.sin(Date.now() / 150) * 0.2;
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

  const containerBorderClass = overtime
    ? "pixel-panel-red border-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse"
    : "pixel-panel-cyan";

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden transition-all duration-300 ${containerBorderClass}`}
    >
      {pointsRef.current.length === 0 && activeChord === "" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600 font-medium tracking-wider text-xs">
          OPPONENT CANVAS (IDLE)
        </div>
      )}
      {activeChord !== "" && (
        <div className="absolute top-3 right-3 bg-cyan-950 border-2 border-cyan-500 text-cyan-400 font-bold text-2xs px-2 py-1 tracking-widest animate-pulse z-10 pointer-events-none">
          INSCRIBING {activeChord} {shiftHeld ? "(INVERSION)" : ""}
        </div>
      )}
    </div>
  );
});

OpponentCanvas.displayName = "OpponentCanvas";
