import React, { useRef, useEffect } from "react";
import { StrokePoint } from "shared";
import { SpellGuideRenderer } from "../game/SpellGuideRenderer";

interface DrawingCanvasProps {
  activeChord: string;
  shiftHeld: boolean;
  onStrokePoint: (x: number, y: number, pressure: number, timestamp: number) => void;
  onStrokeEnd: (points: StrokePoint[]) => void;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({
  activeChord,
  shiftHeld,
  onStrokePoint,
  onStrokeEnd
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<StrokePoint[]>([]);
  const isDrawingRef = useRef(false);
  
  // Keep refs of props to avoid closure traps in the RAF loop and event handlers
  const chordRef = useRef(activeChord);
  const shiftRef = useRef(shiftHeld);

  useEffect(() => {
    chordRef.current = activeChord;
  }, [activeChord]);

  useEffect(() => {
    shiftRef.current = shiftHeld;
  }, [shiftHeld]);

  // Clean up canvas when chord changes or is released
  useEffect(() => {
    if (activeChord === "") {
      pointsRef.current = [];
    }
  }, [activeChord]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle resizing
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Render loop (RAF)
    let animationFrameId: number;
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Grid Lines (Premium Aesthetic)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // 2. Draw Spell Guide Overlay (if chord is active)
      if (chordRef.current !== "") {
        SpellGuideRenderer.draw(ctx, canvas.width, canvas.height, chordRef.current, shiftRef.current);
      }

      // 3. Draw Player's Current Stroke Points
      const points = pointsRef.current;
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }

        // Draw style: Neon Glow
        ctx.strokeStyle = shiftRef.current 
          ? "rgba(239, 68, 68, 0.85)"   // Red for inversions
          : "rgba(168, 85, 247, 0.85)";  // Violet for spells
        
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 10;
        ctx.shadowColor = shiftRef.current ? "rgba(239, 68, 68, 0.5)" : "rgba(168, 85, 247, 0.5)";
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (chordRef.current === "") return; // Can only draw if holding a chord!

    const canvas = canvasRef.current;
    if (!canvas) return;

    isDrawingRef.current = true;
    canvas.setPointerCapture(e.pointerId);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pt: StrokePoint = {
      x,
      y,
      pressure: e.pressure || 0.5,
      timestamp: Date.now()
    };

    pointsRef.current = [pt];
    onStrokePoint(x, y, pt.pressure, pt.timestamp);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || chordRef.current === "") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const pt: StrokePoint = {
      x,
      y,
      pressure: e.pressure || 0.5,
      timestamp: Date.now()
    };

    pointsRef.current.push(pt);
    onStrokePoint(x, y, pt.pressure, pt.timestamp);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }

    onStrokeEnd(pointsRef.current);
  };

  return (
    <div className="relative w-full h-full border border-purple-500/30 rounded-xl overflow-hidden bg-slate-950/80 backdrop-blur-md shadow-inner shadow-purple-500/5">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      {chordRef.current === "" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 font-medium tracking-wider text-sm">
          HOLD SPELL KEY CHORD TO START INSCRIBING
        </div>
      )}
    </div>
  );
};
