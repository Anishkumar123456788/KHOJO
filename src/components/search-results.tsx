"use client";
import { useEffect, useState } from "react";
import { WorkerCard, type Worker } from "@/components/worker-card";
import { workers as samples } from "@/lib/workers";

export function SearchResults({ query }: { query: Record<string, string | undefined> }) {
  const [items, setItems] = useState<Worker[]>([]); const [loading, setLoading] = useState(true); const [live, setLive] = useState(false);
  useEffect(() => { let active = true; const params = new URLSearchParams(); for (const key of ["q", "city", "radius", "lat", "lng", "requestedAt", "hours", "sort", "page"]) if (query[key]) params.set(key === "hours" ? "durationHours" : key, query[key]!); fetch(`/api/workers?${params}`).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Search unavailable"); if (active) { setItems(data.items.map((worker: Worker) => ({ ...worker, emoji: "🧰" }))); setLive(true); } }).catch(() => { if (active) { const term = (query.q || "").toLowerCase(); setItems(samples.filter(worker => !term || `${worker.skill} ${worker.name}`.toLowerCase().includes(term))); setLive(false); } }).finally(() => active && setLoading(false)); return () => { active = false; }; }, [query]);
  if (loading) return <div className="panel empty">Finding workers…</div>;
  const message = live ? `Showing ${items.length} verified, available worker(s).${query.lat ? " Distance uses your approximate location." : " Choose Use my location to sort by distance."}` : "Development sample listings only. Configure Firebase and Firestore for live inventory; sample workers cannot be booked.";
  return <><div className="notice">{message}</div><div className="worker-grid" style={{ marginTop: 18 }}>{items.length ? items.map(worker => <WorkerCard key={worker.id} worker={worker} />) : <div className="panel empty">No matching workers. Try another service, city or radius.</div>}</div></>;
}
