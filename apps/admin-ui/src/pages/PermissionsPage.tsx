import type { JSX } from "react";
import "./PermissionsPage.css";

type Role = { id: string; name: string };
type Permission = { id: string; key: string; description?: string };
type RolePermMap = { role_name: string; permissions: string[] };

type IconProps = {
  size?: number;
  [key: string]: any;
};

type IconComponent = (props: IconProps) => JSX.Element;

type PermissionsPageProps = {
  roles: Role[];
  rolePermMap: RolePermMap[];
  permissions: Permission[];
  isBusy: boolean;
  ShieldIcon: IconComponent;
  getPermissionDisplayLabel: (permission: Permission) => string;
  onToggleRolePermission: (roleName: string, permissionKey: string) => Promise<void>;
};

export default function PermissionsPage({
  roles,
  rolePermMap,
  permissions,
  isBusy,
  ShieldIcon,
  getPermissionDisplayLabel,
  onToggleRolePermission,
}: PermissionsPageProps) {
  return (
    <section className="permissions-page">
      <div className="panel" style={{ padding: 28 }}>
        <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
          Permission settings for each role are editable here. Changes are saved immediately.
        </p>
        <div
          style={{
            marginBottom: 20,
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--ink-2)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          This can be edited: click any permission row to switch it between <strong>Enabled</strong> and <strong>Disabled</strong>.
        </div>
        <div style={{ display: "grid", gap: 20 }}>
          {roles
            .filter((role) => ["viewer", "editor"].includes(role.name))
            .map((role) => {
              const assignedSet = new Set(
                (rolePermMap.find((entry) => entry.role_name === role.name)?.permissions ?? []).filter(Boolean)
              );
              return (
                <div
                  key={role.id}
                  style={{
                    background: "var(--bg)",
                    borderRadius: 12,
                    padding: "20px 24px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    <ShieldIcon />
                    <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-1)", textTransform: "capitalize" }}>
                      {role.name}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--ink-4)",
                        background: "var(--surface)",
                        padding: "2px 10px",
                        borderRadius: 10,
                      }}
                    >
                      {assignedSet.size} permission{assignedSet.size !== 1 ? "s" : ""}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                      Editable
                    </span>
                  </div>

                  {permissions.length === 0 ? (
                    <span style={{ fontSize: 13, color: "var(--ink-4)", fontStyle: "italic" }}>
                      No permissions available
                    </span>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                      {permissions.map((permission) => {
                        const [category] = permission.key.split(":");
                        const colorMap: Record<string, string> = {
                          items: "var(--accent)",
                          users: "var(--green)",
                          roles: "#e8912d",
                          audit: "#9b59b6",
                        };
                        const color = colorMap[category] ?? "var(--ink-3)";
                        const assigned = assignedSet.has(permission.key);
                        const label = getPermissionDisplayLabel(permission);
                        return (
                          <button
                            key={`${role.id}:${permission.id}`}
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              void onToggleRolePermission(role.name, permission.key);
                            }}
                            title={assigned ? "Revoke permission" : "Grant permission"}
                            style={{
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
                            }}
                          >
                            <span
                              style={{
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
                              }}
                            >
                              {assigned ? "✓" : ""}
                            </span>
                            <span style={{ fontWeight: 600, color: "var(--ink-1)" }}>{label}</span>
                            <span style={{ marginLeft: "auto", fontSize: 12, opacity: 0.9 }}>
                              {assigned ? "Enabled" : "Disabled"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </section>
  );
}
