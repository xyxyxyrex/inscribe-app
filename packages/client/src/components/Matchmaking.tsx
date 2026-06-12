import React, { useState } from "react";

interface MatchmakingProps {
  onJoin: (username: string) => void;
  status: "idle" | "connecting" | "queueing" | "error";
  errorMessage?: string;
  onPractice: () => void;
}

export const Matchmaking: React.FC<MatchmakingProps> = ({ onJoin, status, errorMessage, onPractice }) => {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = username.trim() || `Mage_${Math.random().toString(36).substring(2, 6)}`;
    onJoin(name);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 select-none">
      {/* Premium Glowing Title */}
      <div className="text-center flex flex-col gap-2 mb-10">
        <h1 className="text-5xl md:text-6xl font-black tracking-widest bg-gradient-to-b from-white to-purple-400 bg-clip-text text-transparent filter drop-shadow-[0_0_20px_rgba(168,85,247,0.3)]">
          SIGIL DUEL
        </h1>
        <p className="text-slate-400 font-medium text-xs md:text-sm tracking-wide max-w-sm mx-auto uppercase">
          physically draw sigils in real-time to cast powerful arcane magic.
        </p>
      </div>

      <div className="w-full max-w-sm bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-md shadow-2xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {status === "idle" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-3xs text-purple-400 font-bold uppercase tracking-wider">
                Mage Nickname
              </label>
              <input
                id="username"
                type="text"
                placeholder="Enter your name..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={12}
                className="bg-slate-950/70 border border-slate-800 text-slate-200 placeholder-slate-600 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-purple-500/50 transition-all font-semibold"
              />
            </div>

            {errorMessage && (
              <div className="text-red-400 text-2xs font-semibold text-center border border-red-500/20 bg-red-500/5 rounded py-1 px-2">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 border border-purple-500 text-white font-bold py-2.5 rounded-lg text-xs tracking-widest uppercase transition-all shadow-lg shadow-purple-500/10 active:scale-97 cursor-pointer"
              >
                Enter the Arena
              </button>
              
              <button
                type="button"
                onClick={onPractice}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/30 text-purple-300 hover:text-purple-200 font-bold py-2.5 rounded-lg text-xs tracking-widest uppercase transition-all shadow-md active:scale-97 cursor-pointer"
              >
                Practice Room (Offline)
              </button>
            </div>
          </form>
        )}

        {(status === "connecting" || status === "queueing") && (
          <div className="flex flex-col items-center justify-center py-6 gap-4">
            {/* Spinning Arc Loading Animation */}
            <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
            <div className="text-center flex flex-col gap-1">
              <span className="text-xs text-slate-300 font-bold uppercase tracking-widest animate-pulse">
                {status === "connecting" ? "Connecting to Leyline..." : "Finding Opponent Mage..."}
              </span>
              <span className="text-4xs text-slate-500 font-semibold tracking-wider">
                {status === "connecting" ? "Establishing socket connection" : "Lobby matchmaking in progress"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 max-w-sm text-center flex flex-col gap-2 bg-slate-950/20 border border-slate-900 rounded-xl p-3 text-4xs text-slate-500 font-medium tracking-wide">
        <span className="font-bold text-slate-400">HOW TO PLAY</span>
        <p>1. Hold spell key(s) (Q, W, E, R) to reveal the Sigil guide.</p>
        <p>2. Physically draw the Sigil path with mouse/stylus on the canvas.</p>
        <p>3. Press SPACE to seal it in your queue. (Shift + Chord for Inversions!)</p>
        <p>4. Press SPACE with no active draw to cast all slots simultaneously.</p>
      </div>
    </div>
  );
};
