import "./DashboardPage.css";

type DashboardPageProps = Record<string, any>;

export default function DashboardPage(props: DashboardPageProps) {
  const {
    dashboardLoading,
    isAdmin,
    dashboard,
    userDashboard,
    dashboardError,
    CalendarIcon,
    dashboardRange,
    setDashboardRange,
    DASHBOARD_RANGE_OPTIONS,
    refreshDashboard,
    RefreshCwIcon,
    UsersIcon,
    LayersIcon,
    KeyIcon,
    ShieldAlertIcon,
    DASHBOARD_RANGE_LABELS,
    auditSearch,
    setAuditSearch,
    SearchIcon,
    auditActionFilter,
    setAuditActionFilter,
    formatActionLabel,
    ChevronIcon,
    users,
    DEFAULT_PAGE_SIZE,
    dashboardAuditPage,
    setDashboardAuditPage,
    formatDate,
    ActivityIcon,
    ShieldIcon,
    userRecentActivityPage,
    setUserRecentActivityPage,
    session,
  } = props as any;

  return (
    <section className="dashboard-page">
      <div style={{ display: "flex", flexDirection: "column" }}>
        {dashboardLoading && !(isAdmin ? dashboard : userDashboard) ? (
          <div className="panel" style={{ textAlign: "center", padding: "56px 0", color: "var(--ink-3)" }}>
            Loading dashboard metrics...
          </div>
        ) : dashboardError && !(isAdmin ? dashboard : userDashboard) ? (
          <div className="panel" style={{ textAlign: "center", padding: "56px 0", color: "var(--red)" }}>
            {dashboardError}
          </div>
        ) : isAdmin && dashboard ? (
          <>
            <div className="dashboard-v2-header">
              <div>
                <h1>Security Overview</h1>
                <p>High-level view of users, files, and system activity.</p>
              </div>
              <div className="time-range-picker">
                <CalendarIcon />
                <select
                  value={dashboardRange}
                  onChange={(event: any) => setDashboardRange(event.target.value)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--ink-2)",
                    fontSize: 13,
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer"
                  }}
                >
                  {DASHBOARD_RANGE_OPTIONS.map((option: any) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="btn-ghost"
                  style={{ padding: "2px 6px" }}
                  onClick={() => void refreshDashboard()}
                  title="Refresh dashboard"
                >
                  <RefreshCwIcon size={14} />
                </button>
              </div>
            </div>

            <section className="metrics-v2-grid">
              <div className="metric-v2-card" style={{ transitionDelay: "0.1s" }}>
                <div className="m-v2-header">
                  <span className="m-v2-title">Total Users</span>
                  <UsersIcon size={16} className="m-v2-icon" />
                </div>
                <div className="m-v2-value">{dashboard.users.total.toLocaleString()}</div>
                <div className="m-v2-footer">
                  <span className="text-green">{dashboard.users.active} Active</span>
                  <span className="m-divider"></span>
                  <span style={{ color: "var(--ink-4)" }}>{dashboard.users.disabled} Disabled</span>
                </div>
              </div>

              <div className="metric-v2-card" style={{ transitionDelay: "0.15s" }}>
                <div className="m-v2-header">
                  <span className="m-v2-title">Active Items</span>
                  <LayersIcon size={16} className="m-v2-icon" />
                </div>
                <div className="m-v2-value">{dashboard.items.total_active.toLocaleString()}</div>
                <div className="m-v2-footer">
                  <span style={{ color: "var(--ink-3)" }}>{dashboard.items.files} Files</span>
                  <span className="m-divider"></span>
                  <span style={{ color: "var(--ink-3)" }}>{dashboard.items.folders} Folders</span>
                </div>
              </div>

              <div className="metric-v2-card" style={{ transitionDelay: "0.2s" }}>
                <div className="m-v2-header">
                  <span className="m-v2-title">Role / Permission Sets</span>
                  <KeyIcon size={16} className="m-v2-icon" />
                </div>
                <div className="m-v2-value">
                  {dashboard.roles.total}
                  <span style={{ color: "var(--ink-4)", fontWeight: 400, margin: "0 4px" }}>/</span>
                  {dashboard.permissions.total}
                </div>
                <div className="m-v2-footer">
                  <span style={{ color: "var(--ink-3)" }}>{dashboard.shares.total} Grants</span>
                  <span className="m-divider"></span>
                  <span style={{ color: "var(--ink-3)" }}>{dashboard.items.deleted} Deleted</span>
                </div>
              </div>

              <div className="metric-v2-card bg-alert-subtle" style={{ border: "1px solid rgba(248, 113, 113, 0.2)", transitionDelay: "0.25s" }}>
                <div className="m-v2-header">
                  <span className="m-v2-title text-alert">Auth Security (24H)</span>
                  <ShieldAlertIcon size={16} className="m-v2-icon text-alert" />
                </div>
                <div className="m-v2-value text-alert">{dashboard.activityLast24h.login_failed}</div>
                <div className="m-v2-footer">
                  <span className="badge badge-disabled" style={{ padding: "2px 6px", fontSize: 11 }}>Failed Logins</span>
                  <span className="m-divider"></span>
                  <span style={{ color: "var(--ink-3)" }}>{dashboard.activityLast24h.logins} total</span>
                </div>
              </div>
            </section>




            <div className="panel-v2 table-panel-v2">
              <div className="panel-v2-header">
                <h2>Recent Security Activity ({DASHBOARD_RANGE_LABELS[dashboardRange]})</h2>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  {/* Email / name search */}
                  <div className="shad-input-wrapper" style={{ width: 240 }}>
                    <div className="shad-search-icon">
                      <SearchIcon size={16} />
                    </div>
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={auditSearch}
                      onChange={e => setAuditSearch(e.target.value)}
                      className="shad-input shad-input-search"
                    />
                  </div>
                  {/* Action filter dropdown */}
                  <div className="shad-select-wrapper" style={{ width: 160 }}>
                    <select
                      value={auditActionFilter}
                      onChange={e => setAuditActionFilter(e.target.value)}
                      className="shad-select"
                    >
                      <option value="">All actions</option>
                      {[...new Set(dashboard.recentAudit.map((l: any) => l.action))].sort().map((action: any) => (
                        <option key={action} value={action}>{formatActionLabel(action)}</option>
                      ))}
                    </select>
                    <div className="shad-select-caret">
                      <ChevronIcon size={14} />
                    </div>
                  </div>
                  {/* Clear filters */}
                  {(auditSearch || auditActionFilter) && (
                    <button
                      className="shad-btn-ghost"
                      onClick={() => { setAuditSearch(""); setAuditActionFilter(""); }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {(() => {
                const q = auditSearch.toLowerCase();
                const filtered = dashboard.recentAudit.filter((log: any) => {
                  const matchesAction = !auditActionFilter || log.action === auditActionFilter;
                  const actorUser = log.actor_email ? users.find((u: any) => u.email === log.actor_email) : null;
                  const fullName = actorUser?.first_name
                    ? `${actorUser.first_name} ${actorUser.last_name ?? ""}`.trim().toLowerCase()
                    : (log.actor_email ?? "").toLowerCase();
                  const matchesSearch = !q || fullName.includes(q) || (log.actor_email ?? "").toLowerCase().includes(q);
                  return matchesAction && matchesSearch;
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
                const currentPage = Math.min(dashboardAuditPage, totalPages);
                const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
                const pagedLogs = filtered.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
                if (filtered.length === 0) return (
                  <div style={{ color: "var(--ink-4)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
                    {dashboard.recentAudit.length === 0 ? "No security entries yet." : "No results match your filters."}
                  </div>
                );
                return (
                  <>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Action</th>
                          <th>Actor</th>
                          <th>Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedLogs.map((log: any) => {
                          const isAlert = log.action.includes("failed") || log.action.includes("delete");
                          const actorUser = log.actor_email ? users.find((u: any) => u.email === log.actor_email) : null;
                          const actorName = actorUser?.first_name
                            ? `${actorUser.first_name} ${actorUser.last_name ?? ""}`.trim()
                            : log.actor_email
                              ? log.actor_email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: any) => c.toUpperCase())
                              : "System";
                          return (
                            <tr key={log.id} className={isAlert ? "row-danger" : ""}>
                              <td className="cell-muted" style={{ fontSize: 12 }}>{formatDate(log.created_at)}</td>
                              <td>
                                <span className={`pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`}>{formatActionLabel(log.action)}</span>
                              </td>
                              <td className="t-main" style={{ fontWeight: 600 }}>{actorName}</td>
                              <td className="cell-muted" style={{ fontSize: 13 }}>
                                {log.target_type
                                  ? <span style={{ textTransform: "capitalize" }}>{log.target_type}</span>
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0 0", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                        Showing {startIndex + 1}-{Math.min(startIndex + DEFAULT_PAGE_SIZE, filtered.length)} of {filtered.length}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setDashboardAuditPage((prev: any) => Math.max(1, prev - 1))}
                          disabled={currentPage <= 1}
                        >
                          Previous
                        </button>
                        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setDashboardAuditPage((prev: any) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage >= totalPages}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        ) : !isAdmin && userDashboard ? (
          <>
            {/* ── Header (same as admin) ── */}
            <div className="dashboard-v2-header">
              <div>
                <h1>My Overview</h1>
                <p>Live view of your items, activity, and access.</p>
              </div>
              <div className="time-range-picker">
                <CalendarIcon />
                <select
                  value={dashboardRange}
                  onChange={(event: any) => setDashboardRange(event.target.value)}
                  style={{ background: "transparent", border: "none", color: "var(--ink-2)", fontSize: 13, fontWeight: 600, outline: "none", cursor: "pointer" }}
                >
                  {DASHBOARD_RANGE_OPTIONS.map((option: any) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <button className="btn-ghost" style={{ padding: "2px 6px" }} onClick={() => void refreshDashboard()} title="Refresh dashboard">
                  <RefreshCwIcon size={14} />
                </button>
              </div>
            </div>

            {/* ── 4 metric cards (same grid as admin) ── */}
            <section className="metrics-v2-grid">
              <div className="metric-v2-card" style={{ transitionDelay: "0.1s" }}>
                <div className="m-v2-header">
                  <span className="m-v2-title">Accessible Items</span>
                  <LayersIcon size={16} className="m-v2-icon" />
                </div>
                <div className="m-v2-value">{userDashboard.items.total_accessible.toLocaleString()}</div>
                <div className="m-v2-footer">
                  <span style={{ color: "var(--ink-3)" }}>{userDashboard.items.files} Files</span>
                  <span className="m-divider" />
                  <span style={{ color: "var(--ink-3)" }}>{userDashboard.items.folders} Folders</span>
                </div>
              </div>

              <div className="metric-v2-card" style={{ transitionDelay: "0.15s" }}>
                <div className="m-v2-header">
                  <span className="m-v2-title">Owned by You</span>
                  <UsersIcon size={16} className="m-v2-icon" />
                </div>
                <div className="m-v2-value">{userDashboard.items.owned.toLocaleString()}</div>
                <div className="m-v2-footer">
                  <span className="text-green">{userDashboard.items.owned} Owned</span>
                  <span className="m-divider" />
                  <span style={{ color: "var(--ink-4)" }}>{userDashboard.items.shared_with_me} Shared</span>
                </div>
              </div>

              <div className="metric-v2-card" style={{ transitionDelay: "0.2s" }}>
                <div className="m-v2-header">
                  <span className="m-v2-title">Role / Permissions</span>
                  <KeyIcon size={16} className="m-v2-icon" />
                </div>
                <div className="m-v2-value" style={{ textTransform: "capitalize" }}>{userDashboard.role}</div>
                <div className="m-v2-footer">
                  <span style={{ color: "var(--ink-3)" }}>{userDashboard.permissions.length} Active permissions</span>
                </div>
              </div>

              <div className="metric-v2-card" style={{ transitionDelay: "0.25s" }}>
                <div className="m-v2-header">
                  <span className="m-v2-title">24H Actions</span>
                  <ActivityIcon size={16} className="m-v2-icon" />
                </div>
                <div className="m-v2-value">
                  {(userDashboard.activityLast24h.uploads + userDashboard.activityLast24h.downloads + userDashboard.activityLast24h.updates + userDashboard.activityLast24h.deletes).toLocaleString()}
                </div>
                <div className="m-v2-footer">
                  <span style={{ color: "var(--ink-3)" }}>{userDashboard.activityLast24h.uploads} Uploads</span>
                  <span className="m-divider" />
                  <span style={{ color: "var(--ink-3)" }}>{userDashboard.activityLast24h.downloads} Downloads</span>
                </div>
              </div>
            </section>

            {/* ── Recent Activity table (same as admin's audit table) ── */}
            <div className="panel-v2 table-panel-v2">
              <div className="panel-v2-header">
                <h2>Recent Activity ({DASHBOARD_RANGE_LABELS[dashboardRange]})</h2>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="shad-input-wrapper" style={{ width: 240 }}>
                    <div className="shad-search-icon"><SearchIcon size={16} /></div>
                    <input
                      type="text"
                      placeholder="Search actions..."
                      value={auditSearch}
                      onChange={(e: any) => setAuditSearch(e.target.value)}
                      className="shad-input shad-input-search"
                    />
                  </div>
                  <div className="shad-select-wrapper" style={{ width: 160 }}>
                    <select
                      value={auditActionFilter}
                      onChange={(e: any) => setAuditActionFilter(e.target.value)}
                      className="shad-select"
                    >
                      <option value="">All actions</option>
                      {[...new Set(userDashboard.recentActivity.map((l: any) => l.action))].sort().map((action: any) => (
                        <option key={action} value={action}>{formatActionLabel(action)}</option>
                      ))}
                    </select>
                    <div className="shad-select-caret"><ChevronIcon size={14} /></div>
                  </div>
                  {(auditSearch || auditActionFilter) && (
                    <button className="shad-btn-ghost" onClick={() => { setAuditSearch(""); setAuditActionFilter(""); }}>Clear</button>
                  )}
                </div>
              </div>
              {(() => {
                const q = auditSearch.toLowerCase();
                const filtered = userDashboard.recentActivity.filter((log: any) => {
                  const matchesAction = !auditActionFilter || log.action === auditActionFilter;
                  const matchesSearch = !q || (log.actor_email ?? "").toLowerCase().includes(q) || (log.action ?? "").toLowerCase().includes(q);
                  return matchesAction && matchesSearch;
                });
                const totalPages = Math.max(1, Math.ceil(filtered.length / DEFAULT_PAGE_SIZE));
                const currentPage = Math.min(userRecentActivityPage, totalPages);
                const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
                const pagedLogs = filtered.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
                if (filtered.length === 0) return (
                  <div style={{ color: "var(--ink-4)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>
                    {userDashboard.recentActivity.length === 0 ? "No activity yet." : "No results match your filters."}
                  </div>
                );
                return (
                  <>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>Action</th>
                          <th>Actor</th>
                          <th>Target</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedLogs.map((log: any) => {
                          const isAlert = log.action.includes("failed") || log.action.includes("delete");
                          return (
                            <tr key={log.id} className={isAlert ? "row-danger" : ""}>
                              <td className="cell-muted" style={{ fontSize: 12 }}>{formatDate(log.created_at)}</td>
                              <td>
                                <span className={`pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`}>{formatActionLabel(log.action)}</span>
                              </td>
                              <td className="t-main" style={{ fontWeight: 600 }}>{log.actor_email ?? session?.user?.email}</td>
                              <td className="cell-muted" style={{ fontSize: 13 }}>
                                {log.target_type ? <span style={{ textTransform: "capitalize" }}>{log.target_type}</span> : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0 0", flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                        Showing {startIndex + 1}–{Math.min(startIndex + DEFAULT_PAGE_SIZE, filtered.length)} of {filtered.length}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setUserRecentActivityPage((prev: any) => Math.max(1, prev - 1))} disabled={currentPage <= 1}>Previous</button>
                        <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Page {currentPage} of {totalPages}</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => setUserRecentActivityPage((prev: any) => Math.min(totalPages, prev + 1))} disabled={currentPage >= totalPages}>Next</button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        ) : (
              <div className="panel" style={{ textAlign: "center", padding: "56px 0", color: "var(--ink-3)" }}>
                Dashboard data is unavailable.
              </div>
            )}
          </div>
    </section>
  );
}
