"use client";
import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function AdminMetricsPage() {
  const [data, setData] = useState<{ daily: any[]; top: any[] } | null>(null);
  const [days, setDays] = useState(7);
  const [token, setToken] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("ADMIN_TOKEN") || "";
    setToken(t);
  }, []);

  async function load() {
    if (!token) return;
    const res = await fetch(`/api/admin/metrics?token=${token}&days=${days}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  useEffect(() => { load(); }, [token, days]);

  const chartData = useMemo(() => (data?.daily || []).map(d => ({
    day: new Date(d.day).toISOString().slice(0,10),
    earned: d.earned,
    rejected: d.rejected,
    events: d.events,
  })), [data]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Metrics</h1>
      <div className="flex gap-3 items-end">
        <div className="flex flex-col">
          <label className="text-sm">Admin Token</label>
          <input className="px-3 py-2 border rounded bg-white/80 text-black" value={token} onChange={e=>{ setToken(e.target.value); localStorage.setItem("ADMIN_TOKEN", e.target.value); }} placeholder="Set ADMIN_TOKEN here" />
        </div>
        <div className="flex flex-col">
          <label className="text-sm">Days</label>
          <input type="number" className="px-3 py-2 border rounded bg-white/80 text-black w-24" value={days} onChange={e=>setDays(Number(e.target.value)||7)} />
        </div>
        <button onClick={load} className="px-4 py-2 rounded bg-black text-white border">Refresh</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-white rounded p-3 shadow">
          <div className="font-semibold mb-2">Earned vs Rejected (daily)</div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="earned" />
              <Bar dataKey="rejected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="h-72 bg-white rounded p-3 shadow">
          <div className="font-semibold mb-2">Events (daily)</div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="events" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded p-3 shadow">
        <div className="font-semibold mb-2">Top Players</div>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Player</th>
                <th className="text-left py-2 px-2">Doubloons</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top || []).map((r, i) => (
                <tr key={i} className="border-b">
                  <td className="py-2 px-2 font-mono">{r.player_id}</td>
                  <td className="py-2 px-2">{(r.amount||0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
