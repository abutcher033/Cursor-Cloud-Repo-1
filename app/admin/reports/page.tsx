import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function allowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admin = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  if (admin && email.toLowerCase() === admin) return true;
  // Demo triage: Casey
  return email.toLowerCase() === "casey@locallife.app";
}

export default async function AdminReportsPage() {
  const session = await getSession();
  if (!session?.user?.email || !allowedEmail(session.user.email)) {
    redirect("/auth?next=/admin/reports");
  }
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, displayName: true } } },
  });
  return (
    <div data-testid="admin-reports">
      <h1>Report triage</h1>
      <p className="sub">
        Local admin · {session.user.email}. Set <code>ADMIN_EMAIL</code> to lock this to one inbox; Casey demo always allowed on localhost.
      </p>
      {!reports.length ? (
        <div className="card empty">No reports yet.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {reports.map((r) => (
            <li key={r.id} className="card" data-testid="report-row">
              <div className="pill-row">
                <span className="badge">{r.targetType}</span>
                <span className="badge">{r.targetId}</span>
              </div>
              <p className="desc">{r.reason}</p>
              <p className="meta">
                {r.user?.displayName || "Guest"} · {r.createdAt.toLocaleString("en-US", { timeZone: "America/New_York" })} ET
                {r.targetType === "place" ? (
                  <>
                    {" · "}
                    <Link href={`/places/${r.targetId}`}>Open place</Link>
                  </>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
