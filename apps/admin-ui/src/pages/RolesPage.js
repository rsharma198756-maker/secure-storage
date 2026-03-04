import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./RolesPage.css";
export default function RolesPage({ roles, KeyIcon, EditIcon, EyeIcon }) {
    const ROLE_META = {
        admin: {
            label: "Admin",
            description: "Full system access - manages users, roles, permissions, files, and audit logs. Cannot be removed or modified.",
            iconBg: "var(--yellow-bg)",
            iconColor: "var(--yellow)",
            icon: _jsx(KeyIcon, { size: 20 }),
            badgeClass: "badge",
            badgeLabel: "Protected",
        },
        editor: {
            label: "Editor",
            description: "Can upload, edit, rename, move, and delete files and folders they have access to.",
            iconBg: "var(--accent-light)",
            iconColor: "var(--accent)",
            icon: _jsx(EditIcon, { size: 20 }),
            badgeClass: "badge badge-active",
            badgeLabel: "Active",
        },
        viewer: {
            label: "Viewer",
            description: "Read-only access - can view and download files that have been shared with them. Cannot modify anything.",
            iconBg: "var(--green-bg)",
            iconColor: "var(--green)",
            icon: _jsx(EyeIcon, { size: 20 }),
            badgeClass: "badge badge-active",
            badgeLabel: "Active",
        },
    };
    const visibleRoles = ["admin", "editor", "viewer"]
        .map((name) => roles.find((role) => role.name === name))
        .filter(Boolean);
    return (_jsx("section", { className: "roles-page", children: _jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }, children: visibleRoles.map((role) => {
                const meta = ROLE_META[role.name];
                return (_jsxs("div", { className: "panel", style: { padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("div", { style: {
                                                width: 42,
                                                height: 42,
                                                borderRadius: "var(--radius-sm)",
                                                background: meta.iconBg,
                                                color: meta.iconColor,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                flexShrink: 0,
                                            }, children: meta.icon }), _jsx("span", { style: { fontSize: 16, fontWeight: 700, color: "var(--ink-1)" }, children: meta.label })] }), _jsx("span", { className: meta.badgeClass, style: {
                                        fontSize: 11,
                                        ...(role.name === "admin"
                                            ? {
                                                background: "var(--yellow-bg)",
                                                color: "var(--yellow)",
                                                border: "1px solid color-mix(in srgb, var(--yellow) 30%, transparent)",
                                            }
                                            : {}),
                                    }, children: meta.badgeLabel })] }), _jsx("div", { style: { height: 1, background: "var(--border)" } }), _jsx("p", { style: { fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, margin: 0 }, children: meta.description })] }, role.id));
            }) }) }));
}
