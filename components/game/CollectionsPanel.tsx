import React from "react";

export default function CollectionsPanel({ open, onClose, items, spiceSet }: { open: boolean; onClose: () => void; items: Record<string, number>; spiceSet: boolean; }) {
  if (!open) return null;
  const keys = ["spice","rum","ancient_map","idol","doubloon"];
  const labels: Record<string,string> = { spice: "Spice", rum: "Rum", ancient_map: "Ancient Map", idol: "Idol", doubloon: "Doubloon" };
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-slate-900/95 border border-amber-600/30 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-amber-200 text-xl font-bold">Collections</h3>
          <button className="text-amber-300 hover:text-amber-200" onClick={onClose}>✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {keys.map(k => (
            <div key={k} className="p-3 rounded-xl bg-amber-900/20 border border-amber-600/30 flex items-center justify-between">
              <span className="text-amber-100">{labels[k]}</span>
              <span className="text-amber-300 font-semibold">x{items?.[k] || 0}</span>
            </div>
          ))}
        </div>
        <div className={"mt-4 p-3 rounded-xl text-sm border " + (spiceSet ? "bg-emerald-900/20 border-emerald-600/40 text-emerald-300" : "bg-amber-900/20 border-amber-600/30 text-amber-200/90")}>
          Spice Set (Spice + Rum + Ancient Map): {spiceSet ? "ACTIVE: +10% sail rewards" : "Collect all three to activate +10% sail rewards"}
        </div>
      </div>
    </div>
  );
}
