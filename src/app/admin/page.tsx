import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobMatches, userSettings, users } from "@/db/schema";
import { requireAdmin } from "@/lib/requireAdmin";
import { nextDueDate } from "@/lib/pipeline/schedule";
import { estimateCostUsd } from "@/lib/pipeline/anthropicPricing";
import { formatDateTime } from "@/lib/format";
import { card } from "@/lib/ui";
import { InviteForm } from "./InviteForm";
import { LockButton } from "./LockButton";

export default async function AdminPage() {
  await requireAdmin();

  const [allUsers, allSettings, matchCounts] = await Promise.all([
    db.select().from(users),
    db.select().from(userSettings),
    db.select({ userId: jobMatches.userId, count: count() }).from(jobMatches).groupBy(jobMatches.userId),
  ]);
  const settingsByUserId = new Map(allSettings.map((s) => [s.userId, s]));
  const matchCountByUserId = new Map(matchCounts.map((row) => [row.userId, row.count]));

  const rows = allUsers.map((user) => {
    const settings = settingsByUserId.get(user.id);
    const next = settings ? nextDueDate(settings) : null;
    const nextRunText = !settings
      ? "—"
      : settings.emailFrequency === "paused"
        ? "Paused"
        : next && next.getTime() <= Date.now()
          ? "Due now"
          : formatDateTime(next);

    return {
      user,
      settings,
      matchCount: matchCountByUserId.get(user.id) ?? 0,
      nextRunText,
      estimatedCost: settings
        ? estimateCostUsd(
            settings.totalInputTokens,
            settings.totalOutputTokens,
            settings.totalWebSearches,
          )
        : 0,
    };
  });

  const totalCost = rows.reduce((sum, row) => sum + row.estimatedCost, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Admin</h1>
        <p className="text-sm text-muted">
          Manage who can use this app. Total estimated Anthropic spend:{" "}
          <span className="font-medium text-ink">${totalCost.toFixed(2)}</span>
        </p>
      </div>

      <div className={`${card} flex flex-col gap-3`}>
        <h2 className="font-display text-base font-semibold">Invite someone</h2>
        <InviteForm />
      </div>

      <div className={`${card} overflow-x-auto`}>
        <h2 className="mb-3 font-display text-base font-semibold">Users</h2>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="py-2 pr-3 font-medium">Email</th>
              <th className="py-2 pr-3 font-medium">Matches</th>
              <th className="py-2 pr-3 font-medium">Last run</th>
              <th className="py-2 pr-3 font-medium">Next run</th>
              <th className="py-2 pr-3 font-medium">Est. cost</th>
              <th className="py-2 pr-3 font-medium">Last error</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, settings, matchCount, nextRunText, estimatedCost }) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-3">{user.email}</td>
                <td className="py-2 pr-3">{matchCount}</td>
                <td className="py-2 pr-3">{formatDateTime(settings?.lastRunAt ?? null)}</td>
                <td className="py-2 pr-3">{nextRunText}</td>
                <td className="py-2 pr-3">${estimatedCost.toFixed(2)}</td>
                <td className="py-2 pr-3">
                  {settings?.lastRunError ? (
                    <span
                      title={settings.lastRunError}
                      className="block max-w-[160px] truncate text-xs text-danger"
                    >
                      {settings.lastRunError}
                    </span>
                  ) : (
                    <span className="text-xs text-muted">—</span>
                  )}
                </td>
                <td className="py-2 pr-3">
                  {settings?.adminLocked ? (
                    <span className="rounded-full bg-danger/10 px-2 py-1 text-xs font-medium text-danger">
                      Paused by admin
                    </span>
                  ) : (
                    <span className="text-xs text-muted">Active</span>
                  )}
                </td>
                <td className="py-2">
                  <LockButton userId={user.id} locked={settings?.adminLocked ?? false} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
