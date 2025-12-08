import React from "react";

type Props = {
  balance: number;
  streak: number;
  earnedToday?: number;
  cap?: number;
  lastDelta?: number;
};

export default function Hud({ balance, streak, earnedToday, cap, lastDelta }: Props) {
  const progress = typeof earnedToday === "number" && typeof cap === "number" && cap > 0
    ? Math.min(100, Math.round((earnedToday / cap) * 100))
    : undefined;
  return (
    <div className="w-full max-w-3xl flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-4 justify-center">
        <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
          💰 Balance: <b>{balance}</b>{typeof lastDelta === "number" && lastDelta !== 0 ? (
            <span className={`ml-2 text-xs ${lastDelta > 0 ? "text-green-400" : "text-red-400"}`}>
              {lastDelta > 0 ? "+" : ""}{lastDelta}
            </span>
          ) : null}
        </div>
        <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
          🔥 Streak: <b>{streak}</b>
        </div>
        {typeof earnedToday === "number" && typeof cap === "number" && (
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            📈 Today: <b>{earnedToday}</b> / {cap}
          </div>
        )}
      </div>
      {typeof progress === "number" && (
        <div className="w-full h-2 bg-amber-900/30 rounded-full overflow-hidden border border-amber-600/30">
          <div className="h-full bg-amber-500/60" style={{ width: progress + "%" }} />
        </div>
      )}
    </div>
  );
}
