import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export default function AuditLogsPage(props) {
    const { tab, auditLogs, auditPage, setAuditPage, auditLoading, auditError, refreshAuditLogs, DEFAULT_PAGE_SIZE, getAuditCategory, AUDIT_CATEGORY_STYLES, auditExpandedRows, setAuditExpandedRows, formatDate, formatDateGroup, formatActionLabel, summarizeAuditMetadata, formatAuditMetadataValue, CalendarIcon, RefreshCwIcon, ChevronIcon, setTab, setPath, } = props;
    if (tab !== "Audit Logs")
        return null;
    const filteredLogs = auditLogs;
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / DEFAULT_PAGE_SIZE));
    const currentPage = Math.min(auditPage, totalPages);
    const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
    const pagedLogs = filteredLogs.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
    const dangerCount = filteredLogs.filter((l) => getAuditCategory(l.action) === "danger").length;
    const authCount = filteredLogs.filter((l) => getAuditCategory(l.action) === "auth").length;
    const fileCount = filteredLogs.filter((l) => getAuditCategory(l.action) === "file").length;
    const adminCount = filteredLogs.filter((l) => getAuditCategory(l.action) === "admin").length;
    // Build rows with date-group separators
    const rows = [];
    let lastGroup = "";
    for (const log of pagedLogs) {
        const group = formatDateGroup(log.created_at);
        if (group !== lastGroup) {
            rows.push({ type: "separator", label: group });
            lastGroup = group;
        }
        rows.push({ type: "log", log });
    }
    return (_jsxs("div", { className: "panel", children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink-1)" }, children: "Audit Activity" }), _jsx("p", { style: { margin: "6px 0 0", fontSize: 14, color: "var(--ink-3)" }, children: "Track who did what, when, and on which target." })] }), _jsxs("button", { className: "btn btn-secondary btn-sm", onClick: () => void refreshAuditLogs(), disabled: auditLoading, children: [_jsx(RefreshCwIcon, { size: 14, style: { marginRight: 4 } }), auditLoading ? "Refreshing..." : "Refresh"] })] }), filteredLogs.length > 0 && (_jsxs("div", { style: { display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }, children: [_jsxs("span", { style: { fontSize: 12, color: "var(--ink-4)", fontWeight: 600 }, children: [filteredLogs.length, " event", filteredLogs.length !== 1 ? "s" : ""] }), dangerCount > 0 && _jsxs("span", { className: "audit-stat-chip audit-stat-chip-danger", children: [dangerCount, " danger"] }), authCount > 0 && _jsxs("span", { className: "audit-stat-chip audit-stat-chip-auth", children: [authCount, " auth"] }), fileCount > 0 && _jsxs("span", { className: "audit-stat-chip audit-stat-chip-file", children: [fileCount, " file"] }), adminCount > 0 && _jsxs("span", { className: "audit-stat-chip audit-stat-chip-admin", children: [adminCount, " admin"] })] })), auditError ? (_jsxs("div", { style: { color: "var(--red)", textAlign: "center", padding: "32px 0", fontSize: 14 }, children: ["\u26A0 ", auditError] })) : auditLoading && auditLogs.length === 0 ? (_jsxs("div", { style: { color: "var(--ink-3)", textAlign: "center", padding: "40px 0", fontSize: 14 }, children: [_jsx("div", { style: { marginBottom: 8, opacity: 0.5 }, children: "\u23F3" }), "Loading activity logs\u2026"] })) : filteredLogs.length === 0 ? (_jsxs("div", { style: { color: "var(--ink-3)", textAlign: "center", padding: "40px 0", fontSize: 14 }, children: [_jsx("div", { style: { fontSize: 28, marginBottom: 8 }, children: "\uD83D\uDD0D" }), "No activity found for the selected filters."] })) : (_jsxs("div", { style: { overflowX: "auto" }, children: [_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { minWidth: 160 }, children: "Time" }), _jsx("th", { style: { minWidth: 200 }, children: "User / Actor" }), _jsx("th", { style: { minWidth: 170 }, children: "Action" }), _jsx("th", { style: { minWidth: 150 }, children: "Target" }), _jsx("th", { children: "Details" }), _jsx("th", { style: { width: 36 } })] }) }), _jsx("tbody", { children: rows.map((row, idx) => {
                                    if (row.type === "separator") {
                                        return (_jsx("tr", { className: "date-separator", children: _jsx("td", { colSpan: 6, children: row.label }) }, `sep-${idx}`));
                                    }
                                    const { log } = row;
                                    const cat = getAuditCategory(log.action);
                                    const catStyle = AUDIT_CATEGORY_STYLES[cat];
                                    const isExpanded = auditExpandedRows.has(log.id);
                                    const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
                                    const isDanger = cat === "danger";
                                    return (_jsxs(_Fragment, { children: [_jsxs("tr", { className: `audit-row-hover${isDanger ? " bg-alert-subtle" : ""}`, style: { cursor: hasMetadata ? "pointer" : "default" }, onClick: () => {
                                                    if (!hasMetadata)
                                                        return;
                                                    setAuditExpandedRows((prev) => {
                                                        const next = new Set(prev);
                                                        next.has(log.id) ? next.delete(log.id) : next.add(log.id);
                                                        return next;
                                                    });
                                                }, children: [_jsxs("td", { className: "cell-muted", style: { whiteSpace: "nowrap", fontSize: 12 }, children: [_jsx(CalendarIcon, { size: 12, style: { marginRight: 4, opacity: 0.5, verticalAlign: "middle" } }), formatDate(log.created_at)] }), _jsx("td", { children: log.actor_email ? (_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("div", { style: {
                                                                        width: 28, height: 28, borderRadius: "50%",
                                                                        background: "var(--accent-light)", color: "var(--accent)",
                                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                                        fontSize: 11, fontWeight: 700, flexShrink: 0
                                                                    }, children: log.actor_email.slice(0, 2).toUpperCase() }), _jsx("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }, children: log.actor_email })] })) : (_jsx("span", { style: { fontSize: 12, color: "var(--ink-4)", fontStyle: "italic" }, children: "System" })) }), _jsx("td", { children: _jsx("span", { style: {
                                                                display: "inline-flex", padding: "3px 9px", borderRadius: 6,
                                                                fontSize: 11, fontWeight: 600, fontFamily: "ui-monospace, monospace",
                                                                background: catStyle.bg, color: catStyle.color,
                                                                border: `1px solid ${catStyle.border}`, letterSpacing: "0.01em"
                                                            }, children: formatActionLabel(log.action) }) }), _jsx("td", { className: "cell-muted", style: { fontSize: 12 }, children: log.target_type === "item" && log.target_id ? (() => {
                                                            const fileName = log.metadata?.name;
                                                            const isFolder = log.action.includes("folder") || log.metadata?.type === "folder";
                                                            const icon = isFolder ? "📁" : "📄";
                                                            return (_jsxs("button", { title: "Go to Files tab", onClick: (e) => {
                                                                    e.stopPropagation();
                                                                    setTab("Files");
                                                                    setPath([]);
                                                                }, style: {
                                                                    background: "none", border: "none", padding: "2px 6px", borderRadius: 6,
                                                                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5,
                                                                    color: "var(--accent)", fontWeight: 600, fontSize: 12,
                                                                    textDecoration: "underline", textUnderlineOffset: 2, transition: "opacity 150ms"
                                                                }, onMouseEnter: (e) => (e.currentTarget.style.opacity = "0.75"), onMouseLeave: (e) => (e.currentTarget.style.opacity = "1"), children: [_jsx("span", { children: icon }), _jsx("span", { children: fileName ?? `item #${String(log.target_id).slice(0, 8)}` })] }));
                                                        })() : log.target_type ? (_jsxs("span", { children: [_jsx("span", { style: { fontWeight: 600, color: "var(--ink-3)" }, children: log.target_type }), log.target_id && (_jsxs("span", { style: { fontFamily: "ui-monospace, monospace", fontSize: 11, marginLeft: 6, color: "var(--ink-4)" }, children: ["#", String(log.target_id).slice(0, 8)] }))] })) : (_jsx("span", { style: { color: "var(--ink-4)" }, children: "\u2014" })) }), _jsx("td", { style: { fontSize: 12, color: "var(--ink-4)", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: hasMetadata ? summarizeAuditMetadata(log.metadata) : _jsx("span", { style: { color: "var(--ink-4)" }, children: "\u2014" }) }), _jsx("td", { style: { textAlign: "center" }, children: hasMetadata && (_jsx("span", { style: { color: "var(--ink-4)", fontSize: 12, transition: "transform 200ms", display: "inline-block", transform: isExpanded ? "rotate(90deg)" : "none" }, children: _jsx(ChevronIcon, { size: 14 }) })) })] }, log.id), isExpanded && hasMetadata && (_jsx("tr", { style: { background: "var(--bg)" }, children: _jsx("td", { colSpan: 6, style: { padding: "0 16px 16px 56px" }, children: _jsx("div", { style: {
                                                            marginTop: 10, background: "var(--sidebar-bg)",
                                                            border: "1px solid var(--border)", borderRadius: 10, padding: "14px 18px",
                                                            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px 24px"
                                                        }, children: Object.entries(log.metadata).map(([key, val]) => (_jsxs("div", { children: [_jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 3 }, children: formatActionLabel(key) }), _jsx("div", { style: { fontSize: 13, color: "var(--ink-2)", fontFamily: typeof val === "string" || typeof val === "number" ? "inherit" : "ui-monospace, monospace", wordBreak: "break-word" }, children: formatAuditMetadataValue(val) })] }, key))) }) }) }, `${log.id}-detail`))] }));
                                }) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0 0", flexWrap: "wrap" }, children: [_jsxs("span", { style: { fontSize: 12, color: "var(--ink-4)" }, children: ["Showing ", startIndex + 1, "-", Math.min(startIndex + DEFAULT_PAGE_SIZE, filteredLogs.length), " of ", filteredLogs.length] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setAuditPage((prev) => Math.max(1, prev - 1)), disabled: currentPage <= 1, children: "Previous" }), _jsxs("span", { style: { fontSize: 12, color: "var(--ink-3)" }, children: ["Page ", currentPage, " of ", totalPages] }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setAuditPage((prev) => Math.min(totalPages, prev + 1)), disabled: currentPage >= totalPages, children: "Next" })] })] })] }))] }));
}
