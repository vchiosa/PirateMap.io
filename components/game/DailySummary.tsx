import React from "react";

export default function DailySummary({ open, onClose, data }: { open: boolean; onClose: () => void; data: any }) {
  if (!open || !data) return null;
  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-amber-600/30 p-6 shadow-2xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-amber-200 text-xl font-bold">Yesterday&apos;s Summary</h3>
          <button className="text-amber-300 hover:text-amber-200" onClick={onClose}>✕</button>
        </div>
        <p className="text-amber-100/90 text-sm">{data.date}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-600/30">💰 Earned: <b>{data.earned}</b></div>
          <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-600/30">⛵ Sails: <b>{data.sails}</b></div>
          <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-600/30">🏴‍☠️ Treasures: <b>{data.treasures}</b></div>
          <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-600/30">✅ Quests: <b>{data.questsCompleted}</b></div>
        </div>
        <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-600/30 text-amber-100/90 text-sm">
          Current streak: <b>{data.streak} day{data.streak === 1 ? "" : "s"}</b>
        </div>
        {Array.isArray(data.newRewards) && data.newRewards.length > 0 && (
          <div className="p-3 rounded-xl bg-emerald-900/20 border border-emerald-600/30 text-emerald-300 text-sm">
            {data.newRewards.map((m: string, i: number) => <div key={i}>🎉 {m}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}
