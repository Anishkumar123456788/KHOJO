import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { firebaseAdmin } from "@/lib/firebase-admin";
import { AdminVerify } from "@/components/admin-verify";
type WorkerRow = { id: string; name?: string; skill?: string; skills?: string[]; locality?: string; city?: string };
export default async function Admin() {
  const user = await currentUser(); if (!user) redirect("/login"); if (user.role !== "ADMIN") redirect("/dashboard");
  let stats = { users: 0, workers: 0, bookings: 0, pending: 0 }; let workerRows: WorkerRow[] = [];
  try { const { db } = firebaseAdmin(); const [users, workers, bookings, pending] = await Promise.all([db.collection("users").count().get(), db.collection("workers").count().get(), db.collection("bookings").count().get(), db.collection("workers").where("verificationStatus", "==", "PENDING").get()]); stats = { users: users.data().count, workers: workers.data().count, bookings: bookings.data().count, pending: pending.size }; workerRows = pending.docs.slice(0, 50).map(d => ({ id: d.id, ...(d.data() as Omit<WorkerRow, "id">) })); } catch { /* Firebase setup errors are reflected in the empty operational view. */ }
  return <main className="page"><div className="wrap"><div className="eyebrow">Restricted access · KHOJO operations</div><h1 className="page-title">Admin dashboard</h1><div className="stat-grid"><div className="stat-card"><b>{stats.users}</b><small>Users</small></div><div className="stat-card"><b>{stats.workers}</b><small>Workers</small></div><div className="stat-card"><b>{stats.bookings}</b><small>Bookings</small></div></div><div className="panel"><h2>Worker verification queue ({stats.pending})</h2><p className="muted">Approve only after the platform’s documented checks are complete. Approval does not imply government identity verification.</p>{workerRows.length === 0 ? <p className="empty">No verification requests in queue or Firestore is not configured.</p> : workerRows.map(w => <div className="booking-row" key={w.id}><div><b>{w.name || "Worker"}</b><div className="muted">{(w.skills || [w.skill]).filter(Boolean).join(", ")} · {w.locality}, {w.city}</div></div><AdminVerify id={w.id}/></div>)}</div><p className="muted"><Link href="/dashboard">← Dashboard</Link></p></div></main>;
}
