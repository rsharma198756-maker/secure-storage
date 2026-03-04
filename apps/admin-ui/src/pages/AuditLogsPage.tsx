import type { AuditLog } from "../api";

type AuditLogsPageProps = Record<string, any>;

export default function AuditLogsPage(props: AuditLogsPageProps) {
  const {
    tab,
    auditLogs,
    auditPage,
    setAuditPage,
    auditLoading,
    auditError,
    refreshAuditLogs,
    DEFAULT_PAGE_SIZE,
    getAuditCategory,
    AUDIT_CATEGORY_STYLES,
    auditExpandedRows,
    setAuditExpandedRows,
    formatDate,
    formatDateGroup,
    formatActionLabel,
    summarizeAuditMetadata,
    formatAuditMetadataValue,
    CalendarIcon,
    RefreshCwIcon,
    ChevronIcon,
    setTab,
    setPath,
  } = props as any;

  if (tab !== "Audit Logs") return null;

  const filteredLogs: AuditLog[] = auditLogs;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / DEFAULT_PAGE_SIZE));
  const currentPage = Math.min(auditPage, totalPages);
  const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
  const pagedLogs = filteredLogs.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);

  const dangerCount = filteredLogs.filter((l: any) => getAuditCategory(l.action) === "danger").length;
  const authCount = filteredLogs.filter((l: any) => getAuditCategory(l.action) === "auth").length;
  const fileCount = filteredLogs.filter((l: any) => getAuditCategory(l.action) === "file").length;
  const adminCount = filteredLogs.filter((l: any) => getAuditCategory(l.action) === "admin").length;

  // Build rows with date-group separators
  const rows: Array<{ type: "separator"; label: string } | { type: "log"; log: AuditLog }> = [];
  let lastGroup = "";
  for (const log of pagedLogs) {
    const group = formatDateGroup(log.created_at);
    if (group !== lastGroup) {
      rows.push({ type: "separator", label: group });
      lastGroup = group;
    }
    rows.push({ type: "log", log });
  }

  return (
    <div className="panel">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink-1)" }}>Audit Activity</h2>
          <p style={{ margin: "6px 0 0", fontSize: 14, color: "var(--ink-3)" }}>
            Track who did what, when, and on which target.
          </p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => void refreshAuditLogs()}
          disabled={auditLoading}
        >
          <RefreshCwIcon size={14} style={{ marginRight: 4 }} />
          {auditLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats bar */}
      {filteredLogs.length > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--ink-4)", fontWeight: 600 }}>
            {filteredLogs.length} event{filteredLogs.length !== 1 ? "s" : ""}
          </span>
          {dangerCount > 0 && <span className="audit-stat-chip audit-stat-chip-danger">{dangerCount} danger</span>}
          {authCount > 0 && <span className="audit-stat-chip audit-stat-chip-auth">{authCount} auth</span>}
          {fileCount > 0 && <span className="audit-stat-chip audit-stat-chip-file">{fileCount} file</span>}
          {adminCount > 0 && <span className="audit-stat-chip audit-stat-chip-admin">{adminCount} admin</span>}
        </div>
      )}

      {/* Content */}
      {auditError ? (
        <div style={{ color: "var(--red)", textAlign: "center", padding: "32px 0", fontSize: 14 }}>
          ⚠ {auditError}
        </div>
      ) : auditLoading && auditLogs.length === 0 ? (
        <div style={{ color: "var(--ink-3)", textAlign: "center", padding: "40px 0", fontSize: 14 }}>
          <div style={{ marginBottom: 8, opacity: 0.5 }}>⏳</div>
          Loading activity logs…
        </div>
      ) : filteredLogs.length === 0 ? (
        <div style={{ color: "var(--ink-3)", textAlign: "center", padding: "40px 0", fontSize: 14 }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
          No activity found for the selected filters.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: 160 }}>Time</th>
                <th style={{ minWidth: 200 }}>User / Actor</th>
                <th style={{ minWidth: 170 }}>Action</th>
                <th style={{ minWidth: 150 }}>Target</th>
                <th>Details</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, idx: number) => {
                if (row.type === "separator") {
                  return (
                    <tr key={`sep-${idx}`} className="date-separator">
                      <td colSpan={6}>{row.label}</td>
                    </tr>
                  );
                }
                const { log } = row;
                const cat = getAuditCategory(log.action);
                const catStyle = AUDIT_CATEGORY_STYLES[cat];
                const isExpanded = auditExpandedRows.has(log.id);
                const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                const isDanger = cat === "danger";
                return (
                  <>
                    <tr
                      key={log.id}
                      className={`audit-row-hover${isDanger ? " bg-alert-subtle" : ""}`}
                      style={{ cursor: hasMetadata ? "pointer" : "default" }}
                      onClick={() => {
                        if (!hasMetadata) return;
                        setAuditExpandedRows((prev: any) => {
                          const next = new Set(prev);
                          next.has(log.id) ? next.delete(log.id) : next.add(log.id);
                          return next;
                        });
                      }}
                    >
                      <td className="cell-muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                        <CalendarIcon size={12} style={{ marginRight: 4, opacity: 0.5, verticalAlign: "middle" }} />
                        {formatDate(log.created_at)}
                      </td>
                      <td>
                        {log.actor_email ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: "50%",
                              background: "var(--accent-light)", color: "var(--accent)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 11, fontWeight: 700, flexShrink: 0
                            }}>
                              {log.actor_email.slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
                              {log.actor_email}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--ink-4)", fontStyle: "italic" }}>System</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: "inline-flex", padding: "3px 9px", borderRadius: 6,
                          fontSize: 11, fontWeight: 600, fontFamily: "ui-monospace, monospace",
                          background: catStyle.bg, color: catStyle.color,
                          border: `1px solid ${catStyle.border}`, letterSpacing: "0.01em"
                        }}>
                          {formatActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="cell-muted" style={{ fontSize: 12 }}>
                        {log.target_type === "item" && log.target_id ? (() => {
                          const fileName = (log.metadata as any)?.name as string | undefined;
                          const isFolder = log.action.includes("folder") || (log.metadata as any)?.type === "folder";
                          const icon = isFolder ? "📁" : "📄";
                          return (
                            <button
                              title="Go to Files tab"
                              onClick={(e: any) => {
                                e.stopPropagation();
                                setTab("Files");
                                setPath([]);
                              }}
                              style={{
                                background: "none", border: "none", padding: "2px 6px", borderRadius: 6,
                                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
                                color: "var(--accent)", fontWeight: 600, fontSize: 12,
                                textDecoration: "underline", textUnderlineOffset: 2, transition: "opacity 150ms"
                              }}
                              onMouseEnter={(e: any) => (e.currentTarget.style.opacity = "0.75")}
                              onMouseLeave={(e: any) => (e.currentTarget.style.opacity = "1")}
                            >
                              <span>{icon}</span>
                              <span>{fileName ?? `item #${String(log.target_id).slice(0, 8)}`}</span>
                            </button>
                          );
                        })() : log.target_type ? (
                          <span>
                            <span style={{ fontWeight: 600, color: "var(--ink-3)" }}>{log.target_type}</span>
                            {log.target_id && (
                              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, marginLeft: 6, color: "var(--ink-4)" }}>
                                #{String(log.target_id).slice(0, 8)}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: "var(--ink-4)" }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--ink-4)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {hasMetadata ? summarizeAuditMetadata(log.metadata) : <span style={{ color: "var(--ink-4)" }}>—</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {hasMetadata && (
                          <span style={{ color: "var(--ink-4)", fontSize: 12, transition: "transform 200ms", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "none" }}>
                            <ChevronIcon size={14} />
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && hasMetadata && (
                      <tr key={`${log.id}-detail`} style={{ background: "var(--bg)" }}>
                        <td colSpan={6} style={{ padding: "0 16px 16px 56px" }}>
                          <div style={{
                            marginTop: 10, background: "var(--sidebar-bg)",
                            border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px",
                            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px 24px"
                          }}>
                            {Object.entries(log.metadata!).map(([key, val]) => (
                              <div key={key}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 3 }}>
                                  {formatActionLabel(key)}
                                </div>
                                <div style={{ fontSize: 13, color: "var(--ink-2)", fontFamily: typeof val === "string" || typeof val === "number" ? "inherit" : "ui-monospace, monospace", wordBreak: "break-word" }}>
                                  {formatAuditMetadataValue(val)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0 0", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
              Showing {startIndex + 1}-{Math.min(startIndex + DEFAULT_PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setAuditPage((prev: any) => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
              >
                Previous
              </button>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setAuditPage((prev: any) => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
