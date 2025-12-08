import React from "react";

type Quest = {
  key: "sail_tiles" | "find_treasures" | "earn_gold";
  label: string;
  target: number;
  progress: number;
  reward: number;
  completed: boolean;
};

export default function QuestsPanel({ open, onClose, quests }: { open: boolean; onClose: () => void; quests: Quest[] }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-amber-600/30 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-amber-200 text-xl font-bold">Daily Quests</h3>
          <button className="text-amber-300 hover:text-amber-200" onClick={onClose}>✕</button>
        </div>
        <div className="space-y-3">
          {quests.map(q => {
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            return (
              <div key={q.key} className="p-3 rounded-xl bg-amber-900/20 border border-amber-600/30">
                <div className="flex justify-between text-sm text-amber-100/90">
                  <span>{q.label}</span>
                  <span>{q.progress} / {q.target} • +{q.reward}</span>
                </div>
                <div className="mt-2 h-2 bg-amber-900/40 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500/70" style={{ width: pct + "%" }} />
                </div>
                {q.completed && <div className="mt-1 text-emerald-400 text-xs font-semibold">✅ Completed (bonus credited)</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
