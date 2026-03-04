import type { JSX } from "react";
import "./RolesPage.css";

type Role = { id: string; name: string };

type IconProps = {
  size?: number;
  [key: string]: any;
};

type IconComponent = (props: IconProps) => JSX.Element;

type RolesPageProps = {
  roles: Role[];
  KeyIcon: IconComponent;
  EditIcon: IconComponent;
  EyeIcon: IconComponent;
};

export default function RolesPage({ roles, KeyIcon, EditIcon, EyeIcon }: RolesPageProps) {
  const ROLE_META: Record<
    string,
    {
      label: string;
      description: string;
      iconBg: string;
      iconColor: string;
      icon: JSX.Element;
      badgeClass: string;
      badgeLabel: string;
    }
  > = {
    admin: {
      label: "Admin",
      description:
        "Full system access - manages users, roles, permissions, files, and audit logs. Cannot be removed or modified.",
      iconBg: "var(--yellow-bg)",
      iconColor: "var(--yellow)",
      icon: <KeyIcon size={20} />,
      badgeClass: "badge",
      badgeLabel: "Protected",
    },
    editor: {
      label: "Editor",
      description: "Can upload, edit, rename, move, and delete files and folders they have access to.",
      iconBg: "var(--accent-light)",
      iconColor: "var(--accent)",
      icon: <EditIcon size={20} />,
      badgeClass: "badge badge-active",
      badgeLabel: "Active",
    },
    viewer: {
      label: "Viewer",
      description:
        "Read-only access - can view and download files that have been shared with them. Cannot modify anything.",
      iconBg: "var(--green-bg)",
      iconColor: "var(--green)",
      icon: <EyeIcon size={20} />,
      badgeClass: "badge badge-active",
      badgeLabel: "Active",
    },
  };

  const visibleRoles = ["admin", "editor", "viewer"]
    .map((name) => roles.find((role) => role.name === name))
    .filter(Boolean) as Role[];

  return (
    <section className="roles-page">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {visibleRoles.map((role) => {
          const meta = ROLE_META[role.name];
          return (
            <div
              key={role.id}
              className="panel"
              style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "var(--radius-sm)",
                      background: meta.iconBg,
                      color: meta.iconColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {meta.icon}
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-1)" }}>{meta.label}</span>
                </div>
                <span
                  className={meta.badgeClass}
                  style={{
                    fontSize: 11,
                    ...(role.name === "admin"
                      ? {
                          background: "var(--yellow-bg)",
                          color: "var(--yellow)",
                          border: "1px solid color-mix(in srgb, var(--yellow) 30%, transparent)",
                        }
                      : {}),
                  }}
                >
                  {meta.badgeLabel}
                </span>
              </div>
              <div style={{ height: 1, background: "var(--border)" }} />
              <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, margin: 0 }}>{meta.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
