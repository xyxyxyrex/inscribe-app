import React, { useRef, useEffect, useImperativeHandle, forwardRef } from "react";

export interface OpponentCanvasRef {
  addPoint: (x: number, y: number, pressure: number) => void;
  clearCanvas: () => void;
}

interface OpponentCanvasProps {
  activeChord: string;
  shiftHeld: boolean;
}

export const OpponentCanvas = forwardRef<OpponentCanvasRef, OpponentCanvasProps>(({
  activeChord,
  shiftHeld
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<{ x: number; y: number; pressure: number }[]>([]);
  
  // Keep refs of props to avoid closure traps
  const chordRef = useRef(activeChord);
  const shiftRef = useRef(shiftHeld);

  useEffect(() => {
    chordRef.current = activeChord;
  }, [activeChord]);

  useEffect(() => {
    shiftRef.current = shiftHeld;
  }, [shiftHeld]);

  // Expose functions to parent
  useImperativeHandle(ref, () => ({
    addPoint: (x: number, y: number, pressure: number) => {
      pointsRef.current.push({ x, y, pressure });
    },
    clearCanvas: () => {
      pointsRef.current = [];
    }
  }));

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

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Grid Lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.02)";
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

      // 2. Draw Opponent's Stroke Points
      const points = pointsRef.current;
      if (points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }

        // Opponent Style: Neon Amber or Cyan for distinction
        ctx.strokeStyle = shiftRef.current
          ? "rgba(239, 68, 68, 0.7)"  // Red for opponent inversion
          : "rgba(6, 182, 212, 0.7)"; // Cyan for opponent spell
        
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.shadowBlur = 8;
        ctx.shadowColor = shiftRef.current ? "rgba(239, 68, 68, 0.4)" : "rgba(6, 182, 212, 0.4)";
        ctx.stroke();

        ctx.shadowBlur = 0; // Reset
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative w-full h-full border border-cyan-500/20 rounded-xl overflow-hidden bg-slate-950/70 backdrop-blur-md shadow-inner shadow-cyan-500/5">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none touch-none"
      />
      {pointsRef.current.length === 0 && activeChord === "" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-600 font-medium tracking-wider text-xs">
          OPPONENT CANVAS (IDLE)
        </div>
      )}
      {activeChord !== "" && (
        <div className="absolute top-3 right-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-semibold text-2xs px-2 py-0.5 rounded tracking-widest animate-pulse">
          INSCRIBING {activeChord} {shiftHeld ? "(INVERSION)" : ""}
        </div>
      )}
    </div>
  );
});

OpponentCanvas.displayName = "OpponentCanvas";
