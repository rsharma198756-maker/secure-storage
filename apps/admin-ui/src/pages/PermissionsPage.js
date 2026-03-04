import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./PermissionsPage.css";
export default function PermissionsPage({ roles, rolePermMap, permissions, isBusy, ShieldIcon, getPermissionDisplayLabel, onToggleRolePermission, }) {
    return (_jsx("section", { className: "permissions-page", children: _jsxs("div", { className: "panel", style: { padding: 28 }, children: [_jsx("p", { style: { color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }, children: "Permission settings for each role are editable here. Changes are saved immediately." }), _jsxs("div", { style: {
                        marginBottom: 20,
                        padding: "12px 14px",
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--ink-2)",
                        fontSize: 13,
                        lineHeight: 1.6,
                    }, children: ["This can be edited: click any permission row to switch it between ", _jsx("strong", { children: "Enabled" }), " and ", _jsx("strong", { children: "Disabled" }), "."] }), _jsx("div", { style: { display: "grid", gap: 20 }, children: roles
                        .filter((role) => ["viewer", "editor"].includes(role.name))
                        .map((role) => {
                        const assignedSet = new Set((rolePermMap.find((entry) => entry.role_name === role.name)?.permissions ?? []).filter(Boolean));
                        return (_jsxs("div", { style: {
                                background: "var(--bg)",
                                borderRadius: 12,
                                padding: "20px 24px",
                                border: "1px solid var(--border)",
                            }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }, children: [_jsx(ShieldIcon, {}), _jsx("span", { style: { fontSize: 16, fontWeight: 600, color: "var(--ink-1)", textTransform: "capitalize" }, children: role.name }), _jsxs("span", { style: {
                                                fontSize: 12,
                                                color: "var(--ink-4)",
                                                background: "var(--surface)",
                                                padding: "2px 10px",
                                                borderRadius: 10,
                                            }, children: [assignedSet.size, " permission", assignedSet.size !== 1 ? "s" : ""] }), _jsx("span", { style: { marginLeft: "auto", fontSize: 12, color: "var(--accent)", fontWeight: 600 }, children: "Editable" })] }), permissions.length === 0 ? (_jsx("span", { style: { fontSize: 13, color: "var(--ink-4)", fontStyle: "italic" }, children: "No permissions available" })) : (_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }, children: permissions.map((permission) => {
                                        const [category] = permission.key.split(":");
                                        const colorMap = {
                                            items: "var(--accent)",
                                            users: "var(--green)",
                                            roles: "#e8912d",
                                            audit: "#9b59b6",
                                        };
                                        const color = colorMap[category] ?? "var(--ink-3)";
                                        const assigned = assignedSet.has(permission.key);
                                        const label = getPermissionDisplayLabel(permission);
                                        return (_jsxs("button", { type: "button", disabled: isBusy, onClick: () => {
                                                void onToggleRolePermission(role.name, permission.key);
                                            }, title: assigned ? "Revoke permission" : "Grant permission", style: {
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                width: "100%",
                                                padding: "10px 12px",
                                                borderRadius: 8,
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color,
                                                background: assigned
                                                    ? `color-mix(in srgb, ${color} 14%, transparent)`
                                                    : "var(--surface)",
                                                border: assigned
                                                    ? `1px solid color-mix(in srgb, ${color} 30%, transparent)`
                                                    : "1px solid var(--border)",
                                                cursor: isBusy ? "not-allowed" : "pointer",
                                                opacity: isBusy ? 0.65 : 1,
                                                textAlign: "left",
                                            }, children: [_jsx("span", { style: {
                                                        width: 16,
                                                        height: 16,
                                                        borderRadius: 4,
                                                        border: assigned ? `1px solid ${color}` : "1px solid var(--border)",
                                                        background: assigned ? color : "transparent",
                                                        color: "white",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: 11,
                                                        flexShrink: 0,
                                                    }, children: assigned ? "✓" : "" }), _jsx("span", { style: { fontWeight: 600, color: "var(--ink-1)" }, children: label }), _jsx("span", { style: { marginLeft: "auto", fontSize: 12, opacity: 0.9 }, children: assigned ? "Enabled" : "Disabled" })] }, `${role.id}:${permission.id}`));
                                    }) }))] }, role.id));
                    }) })] }) }));
}
