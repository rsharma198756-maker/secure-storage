import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  createFile,
  createFolder,
  createUser,
  deleteItem,
  downloadItem,
  forceLogoutEveryone,
  forceLogoutUser,
  fetchDashboardSummary,
  getSecurityState,
  fetchUserDashboardSummary,
  listAuditLogs,
  listItems,
  listPermissions,
  listRolePermissions,
  listRoles,
  listUserRoles,
  listUsers,
  login,
  logout,
  requestSecurityStepUp,
  removeUser,
  resetUserPassword,
  setUserRole,
  tapOffService,
  tapOnService,
  updateItemName,
  updateUserInfo,
  updateRolePermissions,
  verifySecurityStepUp,
  verifyOtp
} from "./api";
import type {
  AuditLog,
  DashboardSummary,
  Item,
  SecurityState,
  UserDashboardSummary,
  UserProfile
} from "./api";
import "./styles.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/* =============================================
   SVG Icons (Lucide-style, outline)
   ============================================= */

const svgBase = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

interface IconProps {
  size?: number;
  [key: string]: any;
}

const UsersIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ShieldIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const KeyIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
  </svg>
);

const FolderIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const FileIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

const UploadIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const DownloadIcon = ({ size = 16, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const TrashIcon = ({ size = 16, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const EditIcon = ({ size = 16, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);

const PlusIcon = ({ size = 16, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const LogoutIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const MailIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22 6 12 13 2 6" />
  </svg>
);

const LockIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const HomeIcon = ({ size = 14, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

const ArrowLeftIcon = ({ size = 16, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
);

const ChevronIcon = ({ size = 12, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const VaultIcon = ({ size = 22, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="8" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="16" />
  </svg>
);

const ActivityIcon = ({ size = 20, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);

const EyeIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const RefreshCwIcon = ({ size = 16, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M21 2v6h-6" />
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M3 22v-6h6" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
  </svg>
);

const LayersIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

const ShieldAlertIcon = ({ size = 20, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const SearchIcon = ({ size = 16, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const FilterIcon = ({ size = 16, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const CalendarIcon = ({ size = 14, ...props }: IconProps) => (
  <svg {...svgBase} width={size} height={size} {...props}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

/* =============================================
   Types
   ============================================= */

const ALL_TABS = ["Dashboard", "Users", "Roles", "Permissions", "Files", "Audit Logs", "Security"] as const;
type Tab = (typeof ALL_TABS)[number];

type User = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  roles?: string[];
};

type Role = { id: string; name: string };
type Permission = { id: string; key: string; description?: string };
type RolePermMap = { role_name: string; permissions: string[] };

type Session = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInMinutes: number;
  refreshExpiresAt: string;
  user: UserProfile;
};

const formatDate = (value: string) => {
  const d = new Date(value);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const formatBytes = (bytes?: number | null) => {
  if (typeof bytes !== "number" || Number.isNaN(bytes)) return "Unknown";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** idx;
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const isPdfFile = (item: Item, contentType?: string) => {
  const mime = (contentType ?? item.content_type ?? "").toLowerCase();
  return mime.includes("pdf") || item.name.toLowerCase().endsWith(".pdf");
};

const getFileExtension = (name: string) => {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "";
  return name.slice(idx + 1).toLowerCase();
};

const inferContentTypeFromName = (name: string) => {
  const ext = getFileExtension(name);
  const contentTypes: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    json: "application/json",
    xml: "application/xml",
    html: "text/html",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  };
  return contentTypes[ext];
};

const resolveViewerContentType = (item: Item, type?: string | null) => {
  const value = (type ?? "").toLowerCase();
  if (value && value !== "application/octet-stream") {
    return value;
  }
  return inferContentTypeFromName(item.name) ?? value;
};

const isTextPreviewable = (item: Item, contentType?: string) => {
  const mime = (contentType ?? item.content_type ?? "").toLowerCase();
  const ext = getFileExtension(item.name);
  if (mime.startsWith("text/")) return true;
  if (mime.includes("json") || mime.includes("xml")) return true;
  return ["txt", "md", "csv", "json", "xml", "log", "ini", "yaml", "yml"].includes(ext);
};

const isDocxFile = (item: Item, contentType?: string) => {
  const mime = (contentType ?? item.content_type ?? "").toLowerCase();
  const ext = getFileExtension(item.name);
  return (
    mime.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
    ext === "docx"
  );
};

const isBrowserEmbeddable = (item: Item, contentType?: string) => {
  const mime = (contentType ?? item.content_type ?? "").toLowerCase();
  const ext = getFileExtension(item.name);
  if (mime.startsWith("image/") || mime.startsWith("audio/") || mime.startsWith("video/")) {
    return true;
  }
  if (mime === "text/html" || mime === "application/xhtml+xml") {
    return true;
  }
  return ["html", "htm", "svg", "mp4", "webm", "ogg", "mp3", "wav"].includes(ext);
};

const getJwtExpiryTime = (token: string): number | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadPart = parts[1];
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = `${base64}${"=".repeat(padLength)}`;
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp !== "number") return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
};

const getInitials = (user: { firstName?: string; lastName?: string; email: string }) => {
  if (user.firstName && user.lastName) {
    return (user.firstName[0] + user.lastName[0]).toUpperCase();
  }
  const name = user.email.split("@")[0] ?? "";
  return name.slice(0, 2).toUpperCase();
};

const tabIcons: Record<Tab, (props: IconProps) => JSX.Element> = {
  Dashboard: VaultIcon,
  Users: UsersIcon,
  Roles: ShieldIcon,
  Permissions: KeyIcon,
  Files: FolderIcon,
  "Audit Logs": ActivityIcon,
  Security: ShieldAlertIcon,
};

const tabDescriptions: Record<Tab, string> = {
  Dashboard: "High-level view of users, files, and security activity across your system.",
  Users: "Manage user accounts, assign roles, and control access permissions.",
  Roles: "View and manage the available roles in the system.",
  Permissions: "See which permissions are assigned to each role.",
  Files: "Browse, upload, and manage stored documents and folders.",
  "Audit Logs": "View a chronological log of all system activity.",
  Security: "Run emergency controls, force logout sessions, and monitor tap-off state.",
};

const getTabsForRole = (roles: string[], permissions: string[]): Tab[] => {
  const canControlSecurity = permissions.includes("security:control");
  if (roles.includes("admin")) {
    return canControlSecurity ? [...ALL_TABS] : ALL_TABS.filter((tab) => tab !== "Security");
  }
  if (roles.some((role) => ["viewer", "editor"].includes(role))) {
    return canControlSecurity ? ["Dashboard", "Files", "Security"] : ["Dashboard", "Files"];
  }
  return canControlSecurity ? ["Files", "Security"] : ["Files"];
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const formatActionLabel = (action: string) =>
  action.replace(/\./g, " ").replace(/_/g, " ");

const formatAuditMetadataValue = (value: unknown): string => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

const summarizeAuditMetadata = (metadata: Record<string, unknown> | null): string => {
  if (!metadata) return "-";
  const entries = Object.entries(metadata);
  if (entries.length === 0) return "-";
  return entries
    .slice(0, 3)
    .map(([key, value]) => `${formatActionLabel(key)}: ${formatAuditMetadataValue(value)}`)
    .join(" | ");
};

type AuditCategory = "auth" | "file" | "admin" | "danger" | "info";

const getAuditCategory = (action: string): AuditCategory => {
  const a = action.toLowerCase();
  if (a.includes("failed") || a.includes("delete") || a.includes("removed") || a.includes("banned") || a.includes("disabled")) return "danger";
  if (a.includes("login") || a.includes("logout") || a.includes("otp") || a.includes("auth") || a.includes("token") || a.includes("password")) return "auth";
  if (a.includes("upload") || a.includes("download") || a.includes("file") || a.includes("folder") || a.includes("item") || a.includes("storage")) return "file";
  if (a.includes("user") || a.includes("role") || a.includes("permission") || a.includes("admin")) return "admin";
  return "info";
};

const AUDIT_CATEGORY_STYLES: Record<AuditCategory, { bg: string; color: string; border: string; label: string }> = {
  danger: { bg: "var(--red-bg)", color: "var(--red)", border: "rgba(248,113,113,0.25)", label: "⚠ Danger" },
  auth: { bg: "rgba(251,191,36,0.12)", color: "var(--yellow)", border: "rgba(251,191,36,0.25)", label: "🔐 Auth" },
  file: { bg: "var(--blue-bg)", color: "var(--blue)", border: "rgba(96,165,250,0.25)", label: "📂 File" },
  admin: { bg: "var(--accent-light)", color: "var(--accent)", border: "rgba(129,140,248,0.25)", label: "🛡 Admin" },
  info: { bg: "var(--border)", color: "var(--ink-3)", border: "var(--border-hover)", label: "ℹ Info" },
};

const formatDateGroup = (isoString: string): string => {
  const d = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
};

const permissionLabels: Record<string, string> = {
  "items:read": "View files and folders",
  "items:write": "Upload and edit files/folders",
  "items:delete": "Delete files and folders",
  "items:share": "Share files and manage access",
  "users:manage": "Manage users",
  "roles:manage": "Manage roles and permissions",
  "audit:read": "View audit logs"
};

const getPermissionDisplayLabel = (permission: Permission) => {
  if (permission.description && permission.description.trim()) {
    return permission.description.trim();
  }
  if (permissionLabels[permission.key]) {
    return permissionLabels[permission.key];
  }
  return permission.key;
};

const getPasswordValidationError = (password: string): string | null => {
  if (!password || password.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  if (!/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]/.test(password)) {
    return "Password must include at least one special character.";
  }
  return null;
};

/* =============================================
   Premium Stacked Toast System
   ============================================= */

type Toast = {
  id: number;
  type: "error" | "success" | "warning" | "loading" | "info";
  title: string;
  message: string;
};

type ToastEntry = Toast & { el: HTMLDivElement; height: number; timeoutId: ReturnType<typeof setTimeout> | null };

const TOAST_ICONS: Record<Toast["type"], string> = {
  success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  loading: `<svg class="p-toast-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
  info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`,
};

const toastEntries: ToastEntry[] = [];
let toastIsHovered = false;
let toastContainerEl: HTMLDivElement | null = null;

function getOrCreateToastContainer(): HTMLDivElement {
  if (toastContainerEl) return toastContainerEl;
  const el = document.createElement("div");
  el.id = "premium-toaster";
  document.body.appendChild(el);
  el.addEventListener("mouseenter", () => {
    toastIsHovered = true;
    renderToasts();
    toastEntries.forEach(t => { if (t.timeoutId) clearTimeout(t.timeoutId); });
  });
  el.addEventListener("mouseleave", () => {
    toastIsHovered = false;
    renderToasts();
    toastEntries.forEach(t => startToastTimer(t));
  });
  toastContainerEl = el;
  return el;
}

function renderToasts() {
  let hoverOffset = 0;
  toastEntries.forEach((t, index) => {
    t.el.style.zIndex = String(100 - index);
    if (toastIsHovered) {
      t.el.style.transform = `translateY(-${hoverOffset}px) scale(1)`;
      t.el.style.opacity = "1";
      t.el.style.pointerEvents = "auto";
      hoverOffset += t.height + 12;
    } else {
      if (index > 2) {
        t.el.style.opacity = "0";
        t.el.style.pointerEvents = "none";
        t.el.style.transform = `translateY(0px) scale(0.8)`;
      } else {
        t.el.style.transform = `translateY(${index * -16}px) scale(${1 - index * 0.05})`;
        t.el.style.pointerEvents = index === 0 ? "auto" : "none";
        t.el.style.opacity = index === 0 ? "1" : index === 1 ? "0.6" : "0.3";
      }
    }
  });
}

function startToastTimer(entry: ToastEntry, duration = 4500) {
  entry.timeoutId = setTimeout(() => dismissToastById(entry.id), duration);
}

function dismissToastById(id: number) {
  const idx = toastEntries.findIndex(t => t.id === id);
  if (idx === -1) return;
  const entry = toastEntries[idx];
  if (entry.timeoutId) clearTimeout(entry.timeoutId);
  entry.el.classList.add("p-toast-out");
  toastEntries.splice(idx, 1);
  renderToasts();
  setTimeout(() => entry.el.remove(), 400);
}

function pushToast(toast: Toast) {
  const container = getOrCreateToastContainer();
  const el = document.createElement("div");
  el.className = "p-toast";
  el.setAttribute("data-type", toast.type);
  el.innerHTML = `
    <div class="p-toast-icon">${TOAST_ICONS[toast.type]}</div>
    <div class="p-toast-content">
      <div class="p-toast-title">${toast.title}</div>
      ${toast.message ? `<div class="p-toast-desc">${toast.message}</div>` : ""}
    </div>`;
  el.addEventListener("click", () => dismissToastById(toast.id));
  container.prepend(el);
  const entry: ToastEntry = { ...toast, el, height: 0, timeoutId: null };
  toastEntries.unshift(entry);
  requestAnimationFrame(() => {
    entry.height = el.offsetHeight;
    renderToasts();
    startToastTimer(entry);
  });
}

// Dummy component — actual toasts are DOM-injected imperatively
function ToastContainer(_: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return null;
}

const CheckSmall = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/* =============================================
   App Component
   ============================================= */

export default function App() {
  const [email, setEmail] = useState(
    () => localStorage.getItem("securevault_last_email") ?? ""
  );
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loginStep, setLoginStep] = useState<1 | 2 | 3>(1);
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>("Files");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermMap, setRolePermMap] = useState<RolePermMap[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserFirstName, setEditUserFirstName] = useState("");
  const [editUserLastName, setEditUserLastName] = useState("");
  const [userRoles, setUserRoles] = useState<Role[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [path, setPath] = useState<Array<{ id: string; name: string }>>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [editTarget, setEditTarget] = useState<Item | null>(null);
  const [editName, setEditName] = useState("");
  const [viewerItem, setViewerItem] = useState<Item | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerContentType, setViewerContentType] = useState<string>("");
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerTextPreview, setViewerTextPreview] = useState<string | null>(null);
  const [viewerPreviewNote, setViewerPreviewNote] = useState<string | null>(null);
  const [viewerPdfPages, setViewerPdfPages] = useState(1);
  const [viewerPdfPage, setViewerPdfPage] = useState(1);
  const [pdfDocument, setPdfDocument] = useState<PDFDocumentProxy | null>(null);
  const [pdfRenderError, setPdfRenderError] = useState<string | null>(null);
  const [pdfRendering, setPdfRendering] = useState(false);
  const [pdfScalePercent, setPdfScalePercent] = useState(100);
  const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditFilterUserId, setAuditFilterUserId] = useState("");
  const [auditFilterAction, setAuditFilterAction] = useState("");
  const [auditFilterSearch, setAuditFilterSearch] = useState("");
  const [auditFilterDateFrom, setAuditFilterDateFrom] = useState("");
  const [auditFilterDateTo, setAuditFilterDateTo] = useState("");
  const [auditExpandedRows, setAuditExpandedRows] = useState<Set<string>>(new Set());
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [userDashboard, setUserDashboard] = useState<UserDashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [securityState, setSecurityState] = useState<SecurityState | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityActionToken, setSecurityActionToken] = useState<string | null>(null);
  const [securityActionExpiresAt, setSecurityActionExpiresAt] = useState<number | null>(null);
  const [securityTargetUserId, setSecurityTargetUserId] = useState("");
  const [showSecurityStepUpModal, setShowSecurityStepUpModal] = useState(false);
  const [stepUpPassword, setStepUpPassword] = useState("");
  const [stepUpOtp, setStepUpOtp] = useState("");
  const [stepUpOtpRequested, setStepUpOtpRequested] = useState(false);
  const [stepUpBusy, setStepUpBusy] = useState(false);
  const [securityReason, setSecurityReason] = useState("Routine maintenance activity.");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("securevault_remember") === "true");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    roleId: string;
    roleName: string;
    currentRoleName: string | null;
  } | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isSessionChecking, setIsSessionChecking] = useState(true);
  const [savedEmails, setSavedEmails] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("securevault_saved_emails");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const viewerUrlRef = useRef<string | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfCanvasWrapRef = useRef<HTMLDivElement | null>(null);
  const pdfRenderTaskRef = useRef<RenderTask | null>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const isCurrentViewerPdf = viewerItem ? isPdfFile(viewerItem, viewerContentType) : false;
  const canEmbedCurrentViewer = viewerItem
    ? isBrowserEmbeddable(viewerItem, viewerContentType)
    : false;
  const selectedPdfPage = Math.max(1, Math.min(viewerPdfPage, viewerPdfPages));
  const newUserPasswordError = getPasswordValidationError(newUserPassword);
  const resetPasswordError = getPasswordValidationError(resetNewPassword);

  // Restore session from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("securevault_session");
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem("securevault_session");
      }
    }
    setIsSessionChecking(false);
  }, []);

  // Persist rememberMe preference
  useEffect(() => {
    localStorage.setItem("securevault_remember", String(rememberMe));
  }, [rememberMe]);

  useEffect(() => {
    if (!securityActionExpiresAt) return;
    const msRemaining = securityActionExpiresAt - Date.now();
    if (msRemaining <= 0) {
      setSecurityActionToken(null);
      setSecurityActionExpiresAt(null);
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setSecurityActionToken(null);
      setSecurityActionExpiresAt(null);
    }, msRemaining);
    return () => window.clearTimeout(timeoutId);
  }, [securityActionExpiresAt]);

  useEffect(() => {
    viewerUrlRef.current = viewerUrl;
  }, [viewerUrl]);

  useEffect(() => {
    if (!selectedUser) {
      setPendingRoleChange(null);
    }
  }, [selectedUser]);

  useEffect(() => {
    return () => {
      if (viewerUrlRef.current) {
        URL.revokeObjectURL(viewerUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isCurrentViewerPdf) {
      setPdfViewportWidth(0);
      return;
    }

    const element = pdfCanvasWrapRef.current;
    if (!element) return;

    const update = () => {
      setPdfViewportWidth(element.clientWidth);
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, [isCurrentViewerPdf, viewerItem?.id]);

  useEffect(() => {
    let disposed = false;
    let loadingTask: { promise: Promise<PDFDocumentProxy>; destroy?: () => void } | null = null;

    if (pdfRenderTaskRef.current) {
      pdfRenderTaskRef.current.cancel();
      pdfRenderTaskRef.current = null;
    }

    if (pdfDocumentRef.current) {
      void pdfDocumentRef.current.destroy();
      pdfDocumentRef.current = null;
    }

    setPdfDocument(null);
    setPdfRenderError(null);
    setPdfRendering(false);
    setPdfScalePercent(100);

    if (!isCurrentViewerPdf || !viewerUrl) return;

    setPdfRendering(true);
    loadingTask = pdfjsLib.getDocument(viewerUrl);

    void loadingTask.promise
      .then((loadedDoc) => {
        if (disposed) {
          void loadedDoc.destroy();
          return;
        }
        pdfDocumentRef.current = loadedDoc;
        setPdfDocument(loadedDoc);
        setViewerPdfPages(Math.max(1, loadedDoc.numPages));
        setViewerPdfPage((prev) => Math.min(Math.max(prev, 1), Math.max(1, loadedDoc.numPages)));
      })
      .catch((error) => {
        if (disposed) return;
        console.error(error);
        setPdfRenderError("Could not load PDF preview.");
      })
      .finally(() => {
        if (!disposed) {
          setPdfRendering(false);
        }
      });

    return () => {
      disposed = true;
      if (loadingTask?.destroy) {
        loadingTask.destroy();
      }
    };
  }, [isCurrentViewerPdf, viewerUrl]);

  useEffect(() => {
    if (!isCurrentViewerPdf || !pdfDocument || !pdfCanvasRef.current) return;
    if (selectedPdfPage < 1 || selectedPdfPage > viewerPdfPages) return;

    let cancelled = false;
    const canvas = pdfCanvasRef.current;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) {
      setPdfRenderError("PDF canvas is unavailable.");
      return;
    }

    const renderPage = async () => {
      try {
        setPdfRenderError(null);
        setPdfRendering(true);

        const page = await pdfDocument.getPage(selectedPdfPage);
        if (cancelled) return;

        const baseViewport = page.getViewport({ scale: 1 });
        const viewportWidth = Math.max(320, pdfViewportWidth - 24);
        const scale = viewportWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        canvasContext.clearRect(0, 0, viewport.width, viewport.height);

        const task = page.render({ canvasContext, viewport, canvas });
        pdfRenderTaskRef.current = task;
        await task.promise;
        if (cancelled) return;

        setPdfScalePercent(Math.round(scale * 100));
      } catch (error: any) {
        if (cancelled || error?.name === "RenderingCancelledException") return;
        console.error(error);
        setPdfRenderError("Could not render this PDF page.");
      } finally {
        if (!cancelled) {
          setPdfRendering(false);
        }
      }
    };

    void renderPage();

    return () => {
      cancelled = true;
      if (pdfRenderTaskRef.current) {
        pdfRenderTaskRef.current.cancel();
        pdfRenderTaskRef.current = null;
      }
    };
  }, [isCurrentViewerPdf, pdfDocument, selectedPdfPage, viewerPdfPages, pdfViewportWidth]);

  // Role-derived computed state
  const userRolesList = session?.user?.roles ?? [];
  const userPerms = session?.user?.permissions ?? [];
  const isAdmin = userRolesList.includes("admin");
  const canControlSecurity = userPerms.includes("security:control");
  const canWrite = isAdmin || userPerms.includes("items:write");
  const canDelete = isAdmin || userPerms.includes("items:delete");
  const isSecurityTokenValid =
    Boolean(securityActionToken) &&
    typeof securityActionExpiresAt === "number" &&
    Date.now() < securityActionExpiresAt;
  const securityTokenRemainingSeconds =
    typeof securityActionExpiresAt === "number"
      ? Math.max(0, Math.floor((securityActionExpiresAt - Date.now()) / 1000))
      : 0;
  useEffect(() => {
    if (!isSecurityTokenValid) {
      setSecurityState(null);
    }
  }, [isSecurityTokenValid]);
  const visibleTabs = useMemo(
    () => getTabsForRole(userRolesList, userPerms),
    [userRolesList, userPerms]
  );
  const auditActionOptions = useMemo(
    () => Array.from(new Set(auditLogs.map((log) => log.action))).sort(),
    [auditLogs]
  );

  const showToast = useCallback((type: Toast["type"], title: string, message: string) => {
    const id = ++toastId.current;
    pushToast({ id, type, title, message });
    // Keep React state in sync so existing code referencing `toasts` doesn't break
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    dismissToastById(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const accessToken = session?.accessToken;

  const refreshDashboard = async () => {
    if (!accessToken) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      if (isAdmin) {
        const data = await fetchDashboardSummary(accessToken);
        setDashboard(data);
        setUserDashboard(null);
      } else {
        const data = await fetchUserDashboardSummary(accessToken);
        setUserDashboard(data);
        setDashboard(null);
      }
    } catch (error: any) {
      setDashboardError(error?.message ?? "Failed to load dashboard metrics.");
    } finally {
      setDashboardLoading(false);
    }
  };

  const refreshData = async () => {
    if (!accessToken) return;
    try {
      if (isAdmin) {
        const [usersRes, rolesRes, permsRes, rolePermsRes, dashboardRes] = await Promise.all([
          listUsers(accessToken),
          listRoles(accessToken),
          listPermissions(accessToken),
          listRolePermissions(accessToken),
          fetchDashboardSummary(accessToken)
        ]);
        setUsers(usersRes);
        setRoles(rolesRes);
        setPermissions(permsRes);
        setRolePermMap(rolePermsRes);
        setDashboard(dashboardRes);
        setUserDashboard(null);
        setDashboardError(null);
        setDashboardLoading(false);
      } else {
        const dashboardRes = await fetchUserDashboardSummary(accessToken);
        setUserDashboard(dashboardRes);
        setDashboard(null);
        setUsers([]);
        setRoles([]);
        setPermissions([]);
        setRolePermMap([]);
        setAuditLogs([]);
        setDashboardError(null);
        setDashboardLoading(false);
      }
    } catch (error: any) {
      setDashboardError(error?.message ?? "Failed to load dashboard metrics.");
      setDashboardLoading(false);
    }
  };

  const refreshItems = async (parentId?: string | null) => {
    if (!accessToken) return;
    const data = await listItems(accessToken, parentId ?? null);
    setItems(data);
  };

  const completeSessionLogin = (data: Session) => {
    setSession(data);
    setSecurityActionToken(null);
    setSecurityActionExpiresAt(null);
    setSecurityState(null);
    setSecurityError(null);
    if (rememberMe) {
      localStorage.setItem("securevault_session", JSON.stringify(data));
      localStorage.setItem("securevault_last_email", email);
      setSavedEmails((prev) => {
        const next = [email, ...prev.filter((value) => value !== email)].slice(0, 10);
        localStorage.setItem("securevault_saved_emails", JSON.stringify(next));
        return next;
      });
    } else {
      localStorage.removeItem("securevault_session");
    }
    setLoginStep(1);
    setOtp("");
    setPassword("");
    const userTabs = getTabsForRole(
      data.user?.roles ?? [],
      data.user?.permissions ?? []
    );
    setTab(userTabs.includes("Dashboard") ? "Dashboard" : "Files");
  };

  const onLogin = async () => {
    if (isLoginSubmitting) return;
    setStatus(null);
    setLoginError(null);
    setIsLoginSubmitting(true);
    try {
      const loginResult = await login(email, password);
      if ("accessToken" in loginResult && loginResult.accessToken) {
        completeSessionLogin(loginResult);
        return;
      }
      setLoginStep(3);
      setStatus("OTP sent! Check your email inbox.");
    } catch (err: any) {
      const msg = err?.message ?? "Please check your credentials.";
      setLoginError(msg);
      showToast("error", "Login failed", msg);
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const onVerifyOtp = async () => {
    if (isOtpSubmitting) return;
    setStatus(null);
    setIsOtpSubmitting(true);
    try {
      const data = await verifyOtp(email, otp);
      completeSessionLogin(data);
    } catch (err: any) {
      showToast("error", "Verification failed", err?.message ?? "Invalid OTP code. Please try again.");
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  // Load data after session is set
  useEffect(() => {
    if (session?.accessToken) {
      refreshData();
      refreshItems(null);
    }
  }, [session?.accessToken]);

  const clearClientSession = useCallback(() => {
    localStorage.removeItem("securevault_session");
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    if (pdfRenderTaskRef.current) {
      pdfRenderTaskRef.current.cancel();
      pdfRenderTaskRef.current = null;
    }
    if (pdfDocumentRef.current) {
      void pdfDocumentRef.current.destroy();
      pdfDocumentRef.current = null;
    }
    setSession(null);
    setSelectedUser(null);
    setUserRoles([]);
    setItems([]);
    setDashboard(null);
    setUserDashboard(null);
    setDashboardError(null);
    setDashboardLoading(false);
    setSecurityState(null);
    setSecurityLoading(false);
    setSecurityError(null);
    setSecurityActionToken(null);
    setSecurityActionExpiresAt(null);
    setShowSecurityStepUpModal(false);
    setStepUpPassword("");
    setStepUpOtp("");
    setStepUpOtpRequested(false);
    setStepUpBusy(false);
    setAuditLogs([]);
    setAuditFilterUserId("");
    setAuditFilterAction("");
    setAuditLoading(false);
    setAuditError(null);
    setPath([]);
    setViewerItem(null);
    setViewerUrl(null);
    setPdfDocument(null);
    setPdfRenderError(null);
    setPdfRendering(false);
    setPdfScalePercent(100);
    setPdfViewportWidth(0);
    setEmail(""); // Reset login details
    setPassword("");
    setOtp("");
    setLoginStep(1);
  }, [viewerUrl]);

  const onLogout = async () => {
    if (session) {
      try { await logout(session.refreshToken); } catch (e) { }
    }
    clearClientSession();
  };

  useEffect(() => {
    if (!session?.accessToken) return;
    const expiryMs = getJwtExpiryTime(session.accessToken);
    if (!expiryMs) return;

    const msUntilExpiry = expiryMs - Date.now();
    const refreshToken = session.refreshToken;

    if (msUntilExpiry <= 0) {
      if (refreshToken) {
        void logout(refreshToken).catch(() => undefined);
      }
      showToast("error", "Session expired", "Your session expired. Please sign in again.");
      clearClientSession();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (refreshToken) {
        void logout(refreshToken).catch(() => undefined);
      }
      showToast("error", "Session expired", "Your session expired. Please sign in again.");
      clearClientSession();
    }, msUntilExpiry);

    return () => window.clearTimeout(timeoutId);
  }, [session?.accessToken, session?.refreshToken, clearClientSession, showToast]);

  const onSelectUser = async (user: User) => {
    if (!accessToken) return;
    setPendingRoleChange(null);
    setSelectedUser(user);
    setEditUserEmail(user.email);
    setEditUserFirstName(user.first_name ?? "");
    setEditUserLastName(user.last_name ?? "");
    const data = await listUserRoles(accessToken, user.id);
    setUserRoles(data);
  };

  const onSaveUserProfile = async (): Promise<boolean> => {
    if (!accessToken || !selectedUser) return false;

    const emailValue = normalizeEmail(editUserEmail);
    const firstNameValue = editUserFirstName.trim();
    const lastNameValue = editUserLastName.trim();

    if (!emailValue) {
      showToast("error", "Invalid email", "Email is required.");
      return false;
    }

    const currentFirst = selectedUser.first_name ?? "";
    const currentLast = selectedUser.last_name ?? "";
    if (
      emailValue === selectedUser.email &&
      firstNameValue === currentFirst &&
      lastNameValue === currentLast
    ) {
      showToast("success", "No changes", "User details are already up to date.");
      return true;
    }

    setIsBusy(true);
    try {
      const updated = await updateUserInfo(accessToken, selectedUser.id, {
        email: emailValue,
        firstName: firstNameValue,
        lastName: lastNameValue
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === updated.id
            ? {
              ...u,
              email: updated.email,
              first_name: updated.first_name ?? "",
              last_name: updated.last_name ?? ""
            }
            : u
        )
      );
      setSelectedUser((prev) =>
        prev && prev.id === updated.id
          ? {
            ...prev,
            email: updated.email,
            first_name: updated.first_name ?? "",
            last_name: updated.last_name ?? ""
          }
          : prev
      );
      setEditUserEmail(updated.email);
      setEditUserFirstName(updated.first_name ?? "");
      setEditUserLastName(updated.last_name ?? "");

      if (session?.user?.id === updated.id) {
        const nextSession = {
          ...session,
          user: {
            ...session.user,
            email: updated.email,
            firstName: updated.first_name ?? "",
            lastName: updated.last_name ?? ""
          }
        };
        setSession(nextSession);
        if (rememberMe) {
          localStorage.setItem("securevault_session", JSON.stringify(nextSession));
        }
      }

      showToast("success", "User updated", "User profile information has been saved.");
      return true;
    } catch (error: any) {
      showToast("error", "Update failed", error?.message ?? "Could not update user details.");
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const onRequestUserAccessRoleChange = (roleId: string) => {
    if (!selectedUser || isBusy) return;
    const roleName = roles.find((role) => role.id === roleId)?.name;
    if (!roleName || !["viewer", "editor"].includes(roleName)) return;
    const currentRole = userRoles.find((role) => ["viewer", "editor"].includes(role.name));
    if (currentRole?.id === roleId) return;
    setPendingRoleChange({
      roleId,
      roleName,
      currentRoleName: currentRole?.name ?? null
    });
  };

  const onConfirmUserAccessRoleChange = async () => {
    if (!accessToken || !selectedUser || !pendingRoleChange || isBusy) return;

    setIsBusy(true);
    try {
      await setUserRole(accessToken, selectedUser.id, pendingRoleChange.roleId);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedUser.id
            ? { ...user, roles: [pendingRoleChange.roleName] }
            : user
        )
      );
      await onSelectUser(selectedUser);
      showToast(
        "success",
        "Role updated",
        `${pendingRoleChange.roleName} role assigned successfully.`
      );
      setPendingRoleChange(null);
    } catch (error: any) {
      showToast("error", "Role update failed", error?.message ?? "Could not change role.");
    } finally {
      setIsBusy(false);
    }
  };

  const onToggleRolePermission = async (roleName: string, permissionKey: string) => {
    if (!accessToken || isBusy) return;

    const role = roles.find((entry) => entry.name === roleName);
    if (!role) {
      showToast("error", "Permission update failed", "Role not found.");
      return;
    }

    const currentKeys = (
      rolePermMap.find((entry) => entry.role_name === roleName)?.permissions ?? []
    ).filter(Boolean);
    const nextKeySet = new Set(currentKeys);
    if (nextKeySet.has(permissionKey)) {
      nextKeySet.delete(permissionKey);
    } else {
      nextKeySet.add(permissionKey);
    }

    const permissionIdByKey = new Map(permissions.map((entry) => [entry.key, entry.id]));
    const nextKeys = Array.from(nextKeySet).sort();
    const nextPermissionIds: string[] = [];
    for (const key of nextKeys) {
      const permissionId = permissionIdByKey.get(key);
      if (!permissionId) {
        showToast("error", "Permission update failed", `Permission ${key} was not found.`);
        return;
      }
      nextPermissionIds.push(permissionId);
    }

    setIsBusy(true);
    try {
      await updateRolePermissions(accessToken, role.id, nextPermissionIds);
      setRolePermMap((prev) => {
        const found = prev.some((entry) => entry.role_name === roleName);
        if (found) {
          return prev.map((entry) =>
            entry.role_name === roleName
              ? { ...entry, permissions: nextKeys }
              : entry
          );
        }
        return [...prev, { role_name: roleName, permissions: nextKeys }];
      });
      showToast("success", "Permissions updated", `${roleName} role permissions updated.`);
    } catch (error: any) {
      showToast(
        "error",
        "Permission update failed",
        error?.message ?? "Could not update role permissions."
      );
    } finally {
      setIsBusy(false);
    }
  };

  const onConfirmRemoveUser = async () => {
    if (!accessToken || !deleteUserId) return;
    setIsBusy(true);
    try {
      const removed = users.find((u) => u.id === deleteUserId);
      await removeUser(accessToken, deleteUserId);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
      setUserRoles([]);
      if (selectedUser?.id === deleteUserId) {
        setSelectedUser(null);
      }
      setDeleteUserId(null);
      showToast(
        "success",
        "User removed",
        `${removed?.email ?? "The user"} has been removed successfully.`
      );
    } catch (error: any) {
      showToast("error", "Remove failed", error?.message ?? "Could not remove user.");
    } finally {
      setIsBusy(false);
    }
  };

  const isUserProfileDirty = useMemo(() => {
    if (!selectedUser) return false;
    const emailValue = normalizeEmail(editUserEmail);
    const firstNameValue = editUserFirstName.trim();
    const lastNameValue = editUserLastName.trim();
    return (
      emailValue !== selectedUser.email ||
      firstNameValue !== (selectedUser.first_name ?? "") ||
      lastNameValue !== (selectedUser.last_name ?? "")
    );
  }, [selectedUser, editUserEmail, editUserFirstName, editUserLastName]);

  const onDoneUserDetails = async () => {
    if (!selectedUser) return;
    if (!isUserProfileDirty) {
      setSelectedUser(null);
      return;
    }
    const saved = await onSaveUserProfile();
    if (saved) {
      setSelectedUser(null);
    }
  };

  const selectedRoleIds = useMemo(
    () => new Set(userRoles.map((role) => role.id)),
    [userRoles]
  );
  const deleteUserTarget = useMemo(() => {
    if (!deleteUserId) return null;
    return users.find((u) => u.id === deleteUserId) ?? (selectedUser?.id === deleteUserId ? selectedUser : null);
  }, [deleteUserId, selectedUser, users]);

  const currentFolderId = path.length ? path[path.length - 1].id : null;

  const openFolder = async (item: Item) => {
    if (item.type !== "folder") return;
    const nextPath = [...path, { id: item.id, name: item.name }];
    setPath(nextPath);
    await refreshItems(item.id);
  };

  const goToRoot = async () => {
    setPath([]);
    await refreshItems(null);
  };

  const goToBreadcrumb = async (index: number) => {
    const nextPath = path.slice(0, index + 1);
    setPath(nextPath);
    const folderId = nextPath.length ? nextPath[nextPath.length - 1].id : null;
    await refreshItems(folderId);
  };

  const onCreateFolder = async () => {
    if (!accessToken || !folderName.trim()) return;
    setIsBusy(true);
    try {
      await createFolder(accessToken, folderName.trim(), currentFolderId);
      await refreshItems(currentFolderId);
      setShowFolderModal(false);
      setFolderName("");
    } catch (error: any) {
      showToast("error", "Folder not created", error?.message ?? "Could not create folder.");
    } finally {
      setIsBusy(false);
    }
  };

  const onUploadFiles = async (files: FileList | File[]) => {
    if (!accessToken) return;
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) return;

    setIsBusy(true);
    let uploadedCount = 0;
    const uploadedNames: string[] = [];
    let failedCount = 0;
    let firstError: string | null = null;

    try {
      for (const file of selectedFiles) {
        try {
          await createFile(accessToken, file, currentFolderId);
          uploadedCount += 1;
          uploadedNames.push(file.name);
        } catch (error: any) {
          failedCount += 1;
          if (!firstError) {
            firstError = error?.message ?? `Could not upload ${file.name}.`;
          }
        }
      }

      await refreshItems(currentFolderId);

      if (uploadedCount > 0) {
        const title = uploadedCount === 1 ? "File uploaded" : "Files uploaded";
        const message =
          uploadedCount === 1
            ? `${uploadedNames[0]} uploaded successfully.`
            : `${uploadedCount} files uploaded successfully.`;
        showToast("success", title, message);
      }

      if (failedCount > 0) {
        showToast(
          "error",
          failedCount === 1 ? "Upload failed" : "Some uploads failed",
          firstError ?? `${failedCount} files could not be uploaded.`
        );
      }
    } finally {
      setIsBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!accessToken || !deleteTarget) return;
    setIsBusy(true);
    try {
      await deleteItem(accessToken, deleteTarget.id);
      await refreshItems(currentFolderId);
      if (viewerItem?.id === deleteTarget.id) {
        closeViewer();
      }
      showToast("success", "Deleted", `${deleteTarget.name} was deleted.`);
      setDeleteTarget(null);
    } catch (error: any) {
      showToast("error", "Delete failed", error?.message ?? "Could not delete item.");
    } finally {
      setIsBusy(false);
    }
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  };

  const closeViewer = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    if (pdfRenderTaskRef.current) {
      pdfRenderTaskRef.current.cancel();
      pdfRenderTaskRef.current = null;
    }
    if (pdfDocumentRef.current) {
      void pdfDocumentRef.current.destroy();
      pdfDocumentRef.current = null;
    }
    setViewerItem(null);
    setViewerUrl(null);
    setViewerContentType("");
    setViewerError(null);
    setViewerTextPreview(null);
    setViewerPreviewNote(null);
    setViewerPdfPage(1);
    setViewerPdfPages(1);
    setPdfDocument(null);
    setPdfRenderError(null);
    setPdfRendering(false);
    setPdfScalePercent(100);
    setPdfViewportWidth(0);
  };

  const onOpenFile = async (item: Item) => {
    if (!accessToken || item.type !== "file") return;
    setViewerItem(item);
    setViewerLoading(true);
    setViewerError(null);
    setViewerTextPreview(null);
    setViewerPreviewNote(null);
    try {
      const result = await downloadItem(accessToken, item.id, {
        disposition: "inline",
        fallbackName: item.name
      });
      if (viewerUrl) URL.revokeObjectURL(viewerUrl);
      const resolvedType = resolveViewerContentType(
        item,
        result.contentType || item.content_type || ""
      );
      const previewBlob =
        resolvedType && result.blob.type !== resolvedType
          ? new Blob([result.blob], { type: resolvedType })
          : result.blob;
      const nextUrl = URL.createObjectURL(previewBlob);
      setViewerUrl(nextUrl);
      setViewerContentType(resolvedType);
      if (isPdfFile(item, resolvedType)) {
        setViewerPdfPages(1);
        setViewerPdfPage(1);
      } else if (isDocxFile(item, resolvedType)) {
        setViewerPreviewNote("DOC/DOCX files are available for download. Browser preview support depends on installed plugins.");
        setViewerPdfPages(1);
        setViewerPdfPage(1);
      } else if (isTextPreviewable(item, resolvedType)) {
        const text = await previewBlob.text();
        setViewerTextPreview(text.slice(0, 800000));
        setViewerPreviewNote(text.length > 800000 ? "Showing first 800,000 characters." : null);
        setViewerPdfPages(1);
        setViewerPdfPage(1);
      } else {
        setViewerPreviewNote("Preview is shown when supported by your browser. You can always download the file.");
        setViewerPdfPages(1);
        setViewerPdfPage(1);
      }
    } catch (error: any) {
      setViewerError(error?.message ?? "Could not open file.");
      setViewerUrl(null);
    } finally {
      setViewerLoading(false);
    }
  };

  const onDownload = async (item: Item) => {
    if (!accessToken) return;
    setIsBusy(true);
    try {
      const result = await downloadItem(accessToken, item.id, {
        disposition: "attachment",
        fallbackName: item.type === "folder" ? `${item.name}.zip` : item.name
      });
      triggerBlobDownload(result.blob, result.filename);
      showToast("success", "Download ready", `${result.filename} downloaded.`);
    } catch (error: any) {
      showToast("error", "Download failed", error?.message ?? "Could not download item.");
    } finally {
      setIsBusy(false);
    }
  };

  const onOpenEdit = (item: Item) => {
    setEditTarget(item);
    setEditName(item.name);
  };

  const onConfirmEdit = async () => {
    if (!accessToken || !editTarget || !editName.trim()) return;
    setIsBusy(true);
    try {
      const updated = await updateItemName(accessToken, editTarget.id, editName.trim());
      await refreshItems(currentFolderId);
      if (viewerItem?.id === updated.id) {
        setViewerItem(updated);
      }
      showToast("success", "Updated", "Item name updated successfully.");
      setEditTarget(null);
      setEditName("");
    } catch (error: any) {
      showToast("error", "Update failed", error?.message ?? "Could not update name.");
    } finally {
      setIsBusy(false);
    }
  };

  const onCreateUserSubmit = async () => {
    if (!accessToken) return;
    if (newUserPasswordError) {
      showToast("error", "Invalid password", newUserPasswordError);
      return;
    }
    setIsBusy(true);
    try {
      await createUser(
        accessToken,
        newUserEmail,
        newUserPassword,
        newUserRole,
        newUserFirstName,
        newUserLastName
      );
      showToast("success", "User created", `${newUserEmail} has been created successfully.`);
      setShowCreateUser(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFirstName("");
      setNewUserLastName("");
      refreshData();
    } catch (err: any) {
      showToast("error", "Failed to create user", err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const onResetPassword = (userId: string) => {
    setResetUserId(userId);
    setResetNewPassword("");
    setShowResetPassword(false);
  };

  const onConfirmResetPassword = async () => {
    if (!accessToken || !resetUserId) return;
    if (resetPasswordError) {
      showToast("error", "Invalid password", resetPasswordError);
      return;
    }
    setIsBusy(true);
    try {
      await resetUserPassword(accessToken, resetUserId, resetNewPassword);
      showToast("success", "Password reset", "Password has been updated.");
      setResetUserId(null);
      setResetNewPassword("");
    } catch (err: any) {
      showToast("error", "Reset failed", err?.message ?? "Could not reset password.");
    } finally {
      setIsBusy(false);
    }
  };

  const openSecurityStepUpModal = () => {
    setShowSecurityStepUpModal(true);
    setStepUpPassword("");
    setStepUpOtp("");
    setStepUpOtpRequested(false);
  };

  const onRequestSecurityStepUpOtp = async () => {
    if (!accessToken || stepUpBusy) return;
    if (!stepUpPassword) {
      showToast("error", "Password required", "Enter your current password to continue.");
      return;
    }

    setStepUpBusy(true);
    try {
      await requestSecurityStepUp(accessToken, stepUpPassword);
      setStepUpOtpRequested(true);
      showToast("success", "Code sent", "Verification code sent to your email.");
    } catch (error: any) {
      showToast("error", "Verification failed", error?.message ?? "Could not request verification code.");
    } finally {
      setStepUpBusy(false);
    }
  };

  const onVerifySecurityStepUpOtp = async () => {
    if (!accessToken || stepUpBusy) return;
    if (!stepUpOtp) {
      showToast("error", "OTP required", "Enter the 6-digit OTP.");
      return;
    }

    setStepUpBusy(true);
    try {
      const result = await verifySecurityStepUp(accessToken, stepUpOtp);
      setSecurityActionToken(result.securityActionToken);
      setSecurityActionExpiresAt(Date.now() + result.expiresInSeconds * 1000);
      setShowSecurityStepUpModal(false);
      setStepUpPassword("");
      setStepUpOtp("");
      setStepUpOtpRequested(false);
      showToast("success", "Security controls unlocked", "Privileged actions are enabled for 5 minutes.");
    } catch (error: any) {
      showToast("error", "Verification failed", error?.message ?? "Could not verify OTP.");
    } finally {
      setStepUpBusy(false);
    }
  };

  const getSecurityTokenOrPrompt = () => {
    if (!isSecurityTokenValid || !securityActionToken) {
      openSecurityStepUpModal();
      showToast("error", "Verification required", "Unlock security controls before running this action.");
      return null;
    }
    return securityActionToken;
  };

  const refreshSecurityControlState = async () => {
    if (!accessToken || !canControlSecurity) return;
    const token = getSecurityTokenOrPrompt();
    if (!token) return;
    setSecurityLoading(true);
    setSecurityError(null);
    try {
      const nextState = await getSecurityState(accessToken, token);
      setSecurityState(nextState);
    } catch (error: any) {
      setSecurityState(null);
      setSecurityError(error?.message ?? "Could not fetch security state.");
      if ((error?.message ?? "").toLowerCase().includes("verification")) {
        setSecurityActionToken(null);
        setSecurityActionExpiresAt(null);
      }
    } finally {
      setSecurityLoading(false);
    }
  };

  const onForceLogoutUser = async (user: User) => {
    if (!accessToken) return;
    if (session?.user?.id === user.id) {
      showToast("error", "Action blocked", "Use 'Logout everyone' if you need to clear all sessions.");
      return;
    }
    const token = getSecurityTokenOrPrompt();
    if (!token) return;

    setIsBusy(true);
    try {
      await forceLogoutUser(accessToken, token, user.id, "Admin initiated targeted logout.");
      showToast("success", "User logged out", `${user.email} has been logged out from all active sessions.`);
    } catch (error: any) {
      showToast("error", "Logout failed", error?.message ?? "Could not logout user.");
      if ((error?.message ?? "").toLowerCase().includes("verification")) {
        setSecurityActionToken(null);
        setSecurityActionExpiresAt(null);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const onForceLogoutSelectedUser = async () => {
    if (!securityTargetUserId) {
      showToast("error", "Select a user", "Choose a user before running targeted logout.");
      return;
    }
    const target = users.find((user) => user.id === securityTargetUserId);
    if (!target) {
      showToast("error", "User not found", "Refresh users and try again.");
      return;
    }
    await onForceLogoutUser(target);
  };

  const onForceLogoutEveryone = async () => {
    if (!accessToken) return;
    const token = getSecurityTokenOrPrompt();
    if (!token) return;

    setIsBusy(true);
    try {
      await forceLogoutEveryone(accessToken, token, "Emergency global logout from Security Center.");
      showToast("success", "Global logout complete", "All active sessions were revoked.");
      await refreshSecurityControlState();
    } catch (error: any) {
      showToast("error", "Global logout failed", error?.message ?? "Could not logout everyone.");
      if ((error?.message ?? "").toLowerCase().includes("verification")) {
        setSecurityActionToken(null);
        setSecurityActionExpiresAt(null);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const onTapOff = async () => {
    if (!accessToken) return;
    const token = getSecurityTokenOrPrompt();
    if (!token) return;
    if (!securityReason.trim()) {
      showToast("error", "Reason required", "Provide a reason before activating emergency maintenance.");
      return;
    }

    setIsBusy(true);
    try {
      await tapOffService(accessToken, token, securityReason.trim());
      showToast("success", "Emergency maintenance active", "Traffic has been temporarily restricted.");
      await refreshSecurityControlState();
    } catch (error: any) {
      showToast("error", "Tap-off failed", error?.message ?? "Could not activate maintenance.");
      if ((error?.message ?? "").toLowerCase().includes("verification")) {
        setSecurityActionToken(null);
        setSecurityActionExpiresAt(null);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const onTapOn = async () => {
    if (!accessToken) return;
    const token = getSecurityTokenOrPrompt();
    if (!token) return;
    if (!securityReason.trim()) {
      showToast("error", "Reason required", "Provide a reason before restoring service.");
      return;
    }

    setIsBusy(true);
    try {
      await tapOnService(accessToken, token, securityReason.trim());
      showToast("success", "Service restored", "Emergency maintenance has been disabled.");
      await refreshSecurityControlState();
    } catch (error: any) {
      showToast("error", "Restore failed", error?.message ?? "Could not restore service.");
      if ((error?.message ?? "").toLowerCase().includes("verification")) {
        setSecurityActionToken(null);
        setSecurityActionExpiresAt(null);
      }
    } finally {
      setIsBusy(false);
    }
  };

  const refreshAuditLogs = async (filters?: { action?: string; userId?: string }) => {
    if (!accessToken) return;
    setAuditLoading(true);
    setAuditError(null);
    try {
      const actionFilter = filters?.action ?? auditFilterAction;
      const userFilter = filters?.userId ?? auditFilterUserId;
      const logs = await listAuditLogs(accessToken, {
        limit: 200,
        action: actionFilter || undefined,
        userId: userFilter || undefined
      });
      setAuditLogs(logs);
    } catch (error: any) {
      setAuditLogs([]);
      setAuditError(error?.message ?? "Failed to load audit logs.");
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "Audit Logs" && accessToken) {
      void refreshAuditLogs();
    }
  }, [tab, accessToken]);

  useEffect(() => {
    if (tab === "Dashboard" && accessToken) {
      refreshDashboard();
    }
  }, [tab, accessToken, isAdmin]);

  useEffect(() => {
    if (
      tab === "Security" &&
      accessToken &&
      canControlSecurity &&
      isSecurityTokenValid &&
      securityActionToken
    ) {
      void refreshSecurityControlState();
    }
  }, [
    tab,
    accessToken,
    canControlSecurity,
    isSecurityTokenValid,
    securityActionToken
  ]);

  if (isSessionChecking) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <VaultIcon size={48} color="var(--accent)" />
          <div style={{ width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  /* ---- LOGIN PAGE ---- */
  if (!session) {
    return (
      <div className="login-page">
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {loginStep === 1 && (
          <div className="login-card" key="step-email">
            <div className="login-brand">
              <div className="login-brand-icon"><VaultIcon size={24} /></div>
              <div className="login-brand-text">SecureVault</div>
            </div>
            <div className="login-step-indicator">
              <div className="login-step-dot active" />
              <div className="login-step-dot" />
              <div className="login-step-dot" />
            </div>
            <h1 className="login-title">Welcome back</h1>
            <p className="login-subtitle">Enter your email address to continue.</p>
            <form className="login-form" autoComplete="on" onSubmit={(e) => { e.preventDefault(); if (email.trim()) setLoginStep(2); }}>
              <div className="input-group">
                <span className="input-icon"><MailIcon /></span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  list="remembered-emails"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
                <datalist id="remembered-emails">
                  {savedEmails.map((savedEmail) => (
                    <option key={savedEmail} value={savedEmail} />
                  ))}
                </datalist>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0", cursor: "pointer", width: "fit-content" }} onClick={() => setRememberMe(!rememberMe)}>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: "2px solid var(--border)",
                  background: rememberMe ? "var(--accent)" : "transparent",
                  borderColor: rememberMe ? "var(--accent)" : "var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s"
                }}>
                  {rememberMe && <CheckSmall size={14} color="white" />}
                </div>
                <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500, userSelect: "none" }}>Remember me</span>
              </div>
              <button className="btn btn-primary" type="submit">Continue</button>
            </form>
          </div>
        )}

        {loginStep === 2 && (
          <div className="login-card" key="step-password">
            <div className="login-brand">
              <div className="login-brand-icon"><VaultIcon size={24} /></div>
              <div className="login-brand-text">SecureVault</div>
            </div>
            <div className="login-step-indicator">
              <div className="login-step-dot" />
              <div className="login-step-dot active" />
              <div className="login-step-dot" />
            </div>
            <h1 className="login-title">Enter your password</h1>
            <p className="login-subtitle">Signing in as <strong>{email}</strong></p>
            <form className="login-form" autoComplete="on" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
              <input type="email" name="username" autoComplete="username" value={email} readOnly style={{ display: "none" }} />
              <div className="input-group">
                <span className="input-icon"><LockIcon /></span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoginSubmitting}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  className="input-action-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoginSubmitting}
                >
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              {loginError && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--red-bg, rgba(248,113,113,0.1))",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "var(--red, #f87171)",
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 4
                }}>
                  <span>⚠</span> {loginError}
                </div>
              )}
              <button className="btn btn-primary" type="submit" disabled={isLoginSubmitting}>
                {isLoginSubmitting ? "Signing in..." : "Continue"}
              </button>
            </form>
            <div className="login-footer">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setLoginStep(1); setPassword(""); setLoginError(null); }}
                disabled={isLoginSubmitting}
                style={{ width: "100%", marginTop: 8 }}
              >
                ← Use a different email
              </button>
            </div>
          </div>
        )}

        {loginStep === 3 && (
          <div className="login-card" key="step-otp">
            <div className="login-brand">
              <div className="login-brand-icon"><VaultIcon size={24} /></div>
              <div className="login-brand-text">SecureVault</div>
            </div>
            <div className="login-step-indicator">
              <div className="login-step-dot" />
              <div className="login-step-dot" />
              <div className="login-step-dot active" />
            </div>
            <h1 className="login-title">Check your email</h1>
            <p className="login-subtitle">We sent a 6-digit code to <strong>{email}</strong></p>
            <form className="login-form" onSubmit={(e) => { e.preventDefault(); onVerifyOtp(); }}>
              <div className="input-group">
                <span className="input-icon"><LockIcon /></span>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  disabled={isOtpSubmitting}
                  required
                  maxLength={6}
                  autoFocus
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={isOtpSubmitting}>
                {isOtpSubmitting ? "Verifying..." : "Verify & Sign In"}
              </button>
            </form>
            <div className="login-footer">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setLoginStep(1); setOtp(""); setPassword(""); setStatus(null); }}
                disabled={isOtpSubmitting}
                style={{ width: "100%", marginTop: 8 }}
              >
                ← Start over
              </button>
            </div>
            {status && <p className="login-status" style={{ marginTop: 12 }}>{status}</p>}
          </div>
        )}
      </div>
    );
  }

  /* ---- MAIN DASHBOARD ---- */

  return (
    <div className="app">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <VaultIcon size={22} />
          </div>
          <span className="sidebar-brand-text">SecureVault</span>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Main menu</div>
          <nav className="sidebar-nav">
            {visibleTabs.map((t) => {
              const Icon = tabIcons[t];
              return (
                <button
                  key={t}
                  className={`sidebar-nav-item ${tab === t ? "active" : ""}`}
                  onClick={() => setTab(t)}
                >
                  <span className="nav-icon"><Icon /></span>
                  {t}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-spacer" />

        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {getInitials({ firstName: session.user.firstName, lastName: session.user.lastName, email: session.user.email })}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">
              {session.user.firstName ? `${session.user.firstName} ${session.user.lastName}` : session.user.email.split('@')[0]}
            </div>
            <div className="sidebar-profile-role" style={{ textTransform: "capitalize" }}>
              {session.user.roles.includes("super_admin")
                ? "Super Admin"
                : session.user.roles
                  .filter(r => r !== "super_admin")
                  .map(r => r.replace(/_/g, " "))
                  .join(", ")
              }
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout} title="Sign out" style={{ marginLeft: "auto", background: "none", border: "none", padding: 8, cursor: "pointer", color: "var(--ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="content" key={tab}>
        {/* ── Top page header ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: tab === "Dashboard" ? 0 : 24,
          gap: 12,
          flexWrap: "wrap"
        }}>
          {tab !== "Dashboard" ? (
            <div className="page-header" style={{ margin: 0 }}>
              <h1 className="page-title">{tab}</h1>
              <p className="page-subtitle">{tabDescriptions[tab]}</p>
            </div>
          ) : (
            <div /> /* Dashboard has its own header inside */
          )}

          {isAdmin && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 14px",
              borderRadius: 999,
              background: "linear-gradient(135deg, rgba(129,140,248,0.18) 0%, rgba(99,102,241,0.1) 100%)",
              border: "1px solid rgba(129,140,248,0.35)",
              color: "var(--accent)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.5px",
              whiteSpace: "nowrap",
              flexShrink: 0,
              boxShadow: "0 0 0 3px rgba(129,140,248,0.08)"
            }}>
              <ShieldIcon size={13} />
              Admin
            </div>
          )}
        </div>


        {/* ---- DASHBOARD TAB ---- */}
        {tab === "Dashboard" && (
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
                  <div className="time-range-picker" onClick={refreshDashboard}>
                    <CalendarIcon />
                    <span>Last 7 Days</span>
                    <ChevronIcon />
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

                <section className="bento-v2-grid">
                  <div className="panel-v2">
                    <div className="panel-v2-header">
                      <h2>Top Actions (7 Days)</h2>
                      <button className="btn-ghost" style={{ padding: 4 }}><ActivityIcon size={16} /></button>
                    </div>

                    <div className="action-v2-list">
                      {dashboard.topActions7d.length === 0 ? (
                        <div style={{ color: "var(--ink-4)", fontSize: 14, padding: "20px 0", textAlign: "center" }}>No recent activity.</div>
                      ) : (
                        dashboard.topActions7d.map((row) => {
                          const max = Math.max(...dashboard.topActions7d.map((a) => a.count), 1);
                          const width = Math.max(8, Math.round((row.count / max) * 100));
                          const isAlert = row.action.includes("failed") || row.action.includes("delete");
                          return (
                            <div className="action-v2-item" key={row.action}>
                              <div className="a-v2-info">
                                <span className={`a-v2-name ${isAlert ? "text-alert" : ""}`}>{formatActionLabel(row.action)}</span>
                                <span className="a-v2-count">{row.count}</span>
                              </div>
                              <div className="progress-v2-track">
                                <div
                                  className={`progress-v2-fill ${isAlert ? "fill-red" : row.action.includes("create") || row.action.includes("upload") ? "fill-accent" : "fill-muted"}`}
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="panel-v2">
                    <div className="panel-v2-header">
                      <h2>Activity Snapshot</h2>
                      <span className="badge badge-neutral" style={{ fontSize: 11 }}>24h</span>
                    </div>

                    <div className="snapshot-v2-grid">
                      <div className="snap-v2-box">
                        <span className="s-v2-label">Logins</span>
                        <span className="s-v2-val">{dashboard.activityLast24h.logins}</span>
                      </div>
                      <div className="snap-v2-box bg-alert-subtle">
                        <span className="s-v2-label text-alert">Login Failed</span>
                        <span className="s-v2-val text-alert">{dashboard.activityLast24h.login_failed}</span>
                      </div>
                      <div className="snap-v2-box">
                        <span className="s-v2-label">Uploads</span>
                        <span className="s-v2-val">{dashboard.activityLast24h.uploads}</span>
                      </div>
                      <div className="snap-v2-box">
                        <span className="s-v2-label">Downloads</span>
                        <span className="s-v2-val">{dashboard.activityLast24h.downloads}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="panel-v2 table-panel-v2">
                  <div className="panel-v2-header">
                    <h2>Recent Security Activity</h2>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <SearchIcon style={{ position: "absolute", left: 10, color: "var(--ink-4)" }} />
                        <input
                          type="text"
                          placeholder="Search logs..."
                          className="modal-input"
                          style={{ margin: 0, paddingLeft: 34, width: 180, fontSize: 13, height: 34 }}
                        />
                      </div>
                      <button className="btn-ghost" style={{ border: "1px solid var(--border)", borderRadius: 8, height: 34, width: 34, padding: 0 }}>
                        <FilterIcon size={14} />
                      </button>
                    </div>
                  </div>
                  {dashboard.recentAudit.length === 0 ? (
                    <div style={{ color: "var(--ink-4)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>No security entries yet.</div>
                  ) : (
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
                        {dashboard.recentAudit.map((log) => {
                          const isAlert = log.action.includes("failed") || log.action.includes("delete");
                          return (
                            <tr key={log.id} className={isAlert ? "row-danger" : ""}>
                              <td className="cell-muted" style={{ fontSize: 12 }}>{formatDate(log.created_at)}</td>
                              <td>
                                <span className={`pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`}>{formatActionLabel(log.action)}</span>
                              </td>
                              <td className="t-main" style={{ fontWeight: 600 }}>{log.actor_email ?? "system"}</td>
                              <td className="cell-muted" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                                {log.target_type}{log.target_id ? ` · ${String(log.target_id).slice(0, 8)}...` : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : !isAdmin && userDashboard ? (
              <>
                <div className="dashboard-v2-header">
                  <div>
                    <h1>My Dashboard</h1>
                    <p>Live usage and activity for your account.</p>
                  </div>
                  <div className="time-range-picker" onClick={refreshDashboard}>
                    <CalendarIcon />
                    <span>Last 7 Days</span>
                    <ChevronIcon />
                  </div>
                </div>

                <section className="metrics-v2-grid">
                  <div className="metric-v2-card" style={{ transitionDelay: "0.1s" }}>
                    <div className="m-v2-header">
                      <span className="m-v2-title">Accessible Items</span>
                      <LayersIcon size={16} className="m-v2-icon" />
                    </div>
                    <div className="m-v2-value">{userDashboard.items.total_accessible.toLocaleString()}</div>
                    <div className="m-v2-footer">
                      <span style={{ color: "var(--ink-3)" }}>{userDashboard.items.files} Files</span>
                      <span className="m-divider"></span>
                      <span style={{ color: "var(--ink-3)" }}>{userDashboard.items.folders} Folders</span>
                    </div>
                  </div>

                  <div className="metric-v2-card" style={{ transitionDelay: "0.15s" }}>
                    <div className="m-v2-header">
                      <span className="m-v2-title">Ownership</span>
                      <UsersIcon size={16} className="m-v2-icon" />
                    </div>
                    <div className="m-v2-value">{userDashboard.items.owned.toLocaleString()}</div>
                    <div className="m-v2-footer">
                      <span style={{ color: "var(--ink-3)" }}>Owned by you</span>
                      <span className="m-divider"></span>
                      <span style={{ color: "var(--ink-3)" }}>{userDashboard.items.shared_with_me} Shared with you</span>
                    </div>
                  </div>

                  <div className="metric-v2-card" style={{ transitionDelay: "0.2s" }}>
                    <div className="m-v2-header">
                      <span className="m-v2-title">Current Role</span>
                      <ShieldIcon size={16} className="m-v2-icon" />
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
                      <span style={{ color: "var(--ink-3)" }}>{userDashboard.activityLast24h.logins} Logins</span>
                      <span className="m-divider"></span>
                      <span style={{ color: "var(--ink-3)" }}>{userDashboard.activityLast24h.shares} Shares</span>
                    </div>
                  </div>
                </section>

                <section className="bento-v2-grid">
                  <div className="panel-v2">
                    <div className="panel-v2-header">
                      <h2>Top Actions (7 Days)</h2>
                      <button className="btn-ghost" style={{ padding: 4 }}><ActivityIcon size={16} /></button>
                    </div>
                    <div className="action-v2-list">
                      {userDashboard.topActions7d.length === 0 ? (
                        <div style={{ color: "var(--ink-4)", fontSize: 14, padding: "20px 0", textAlign: "center" }}>No recent activity.</div>
                      ) : (
                        userDashboard.topActions7d.map((row) => {
                          const max = Math.max(...userDashboard.topActions7d.map((a) => a.count), 1);
                          const width = Math.max(8, Math.round((row.count / max) * 100));
                          const isAlert = row.action.includes("failed") || row.action.includes("delete");
                          return (
                            <div className="action-v2-item" key={row.action}>
                              <div className="a-v2-info">
                                <span className={`a-v2-name ${isAlert ? "text-alert" : ""}`}>{formatActionLabel(row.action)}</span>
                                <span className="a-v2-count">{row.count}</span>
                              </div>
                              <div className="progress-v2-track">
                                <div
                                  className={`progress-v2-fill ${isAlert ? "fill-red" : row.action.includes("create") || row.action.includes("upload") ? "fill-accent" : "fill-muted"}`}
                                  style={{ width: `${width}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="panel-v2">
                    <div className="panel-v2-header">
                      <h2>Activity Snapshot</h2>
                      <span className="badge badge-neutral" style={{ fontSize: 11 }}>24h</span>
                    </div>
                    <div className="snapshot-v2-grid">
                      <div className="snap-v2-box">
                        <span className="s-v2-label">Logins</span>
                        <span className="s-v2-val">{userDashboard.activityLast24h.logins}</span>
                      </div>
                      <div className="snap-v2-box">
                        <span className="s-v2-label">Uploads</span>
                        <span className="s-v2-val">{userDashboard.activityLast24h.uploads}</span>
                      </div>
                      <div className="snap-v2-box">
                        <span className="s-v2-label">Downloads</span>
                        <span className="s-v2-val">{userDashboard.activityLast24h.downloads}</span>
                      </div>
                      <div className="snap-v2-box">
                        <span className="s-v2-label">Updates</span>
                        <span className="s-v2-val">{userDashboard.activityLast24h.updates}</span>
                      </div>
                      <div className="snap-v2-box bg-alert-subtle">
                        <span className="s-v2-label text-alert">Deletes</span>
                        <span className="s-v2-val text-alert">{userDashboard.activityLast24h.deletes}</span>
                      </div>
                      <div className="snap-v2-box">
                        <span className="s-v2-label">Shares</span>
                        <span className="s-v2-val">{userDashboard.activityLast24h.shares}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="panel-v2 table-panel-v2">
                  <div className="panel-v2-header">
                    <h2>Recent Activity</h2>
                  </div>
                  {userDashboard.recentActivity.length === 0 ? (
                    <div style={{ color: "var(--ink-4)", fontSize: 14, padding: "40px 0", textAlign: "center" }}>No activity entries yet.</div>
                  ) : (
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
                        {userDashboard.recentActivity.map((log) => {
                          const isAlert = log.action.includes("failed") || log.action.includes("delete");
                          return (
                            <tr key={log.id} className={isAlert ? "row-danger" : ""}>
                              <td className="cell-muted" style={{ fontSize: 12 }}>{formatDate(log.created_at)}</td>
                              <td>
                                <span className={`pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`}>{formatActionLabel(log.action)}</span>
                              </td>
                              <td className="t-main" style={{ fontWeight: 600 }}>{log.actor_email ?? session.user.email}</td>
                              <td className="cell-muted" style={{ fontFamily: "ui-monospace, monospace", fontSize: 12 }}>
                                {log.target_type}{log.target_id ? ` · ${String(log.target_id).slice(0, 8)}...` : ""}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            ) : (
              <div className="panel" style={{ textAlign: "center", padding: "56px 0", color: "var(--ink-3)" }}>
                Dashboard data is unavailable.
              </div>
            )}
          </div>
        )}

        {/* ---- USERS TAB ---- */}
        {tab === "Users" && (
          <div className="panel">
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowCreateUser(true)}>
                <PlusIcon /> Create User
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User / Name</th>
                  <th>Roles</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const adminUsers = users.filter(u => !u.roles || u.roles.length === 0);
                  const regularUsers = users.filter(u => u.roles && u.roles.length > 0);

                  const renderRow = (user: typeof users[0]) => {
                    const isAdminUser = !user.roles || user.roles.length === 0;
                    return (
                      <tr
                        key={user.id}
                        onClick={() => !isAdminUser && onSelectUser(user)}
                        style={{
                          background: selectedUser?.id === user.id ? "var(--accent-light)" : undefined,
                          cursor: isAdminUser ? "default" : "pointer",
                          opacity: isAdminUser ? 0.7 : 1
                        }}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                              {getInitials({ firstName: user.first_name, lastName: user.last_name, email: user.email })}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span className="cell-email" style={{ marginBottom: 2 }}>
                                {user.first_name ? `${user.first_name} ${user.last_name}` : "-"}
                              </span>
                              <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{user.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          {isAdminUser ? (
                            <span className="badge badge-accent" style={{ fontSize: 11 }}>
                              <ShieldIcon size={11} style={{ marginRight: 3 }} /> admin
                            </span>
                          ) : (() => {
                            const visibleRoles = (user.roles ?? []).filter(r => ["viewer", "editor"].includes(r));
                            if (visibleRoles.length === 0) return <span className="cell-muted">-</span>;
                            return visibleRoles.map(role => (
                              <span key={role} className={`badge ${role === "editor" ? "badge-active" : "badge-disabled"}`} style={{ marginRight: 4 }}>
                                {role}
                              </span>
                            ));
                          })()}
                        </td>
                        <td>
                          <span className={`badge ${user.status === "active" ? "badge-active" : "badge-disabled"}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="cell-muted">{formatDate(user.created_at)}</td>
                        <td>
                          {canControlSecurity ? (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                void onForceLogoutUser(user);
                              }}
                              disabled={isBusy || session?.user?.id === user.id}
                              title={
                                session?.user?.id === user.id
                                  ? "Cannot force-logout your active security session here"
                                  : "Logout this user from all active sessions"
                              }
                            >
                              Logout user
                            </button>
                          ) : (
                            <span className="cell-muted">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  };

                  const sectionLabel = (label: string) => (
                    <tr key={`section-${label}`} style={{ pointerEvents: "none" }}>
                      <td colSpan={5} style={{ padding: "8px 16px 4px", background: "var(--bg)" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                          {label}
                        </span>
                      </td>
                    </tr>
                  );

                  return (
                    <>
                      {adminUsers.length > 0 && sectionLabel("Administrators")}
                      {adminUsers.map(u => renderRow(u))}
                      {regularUsers.length > 0 && sectionLabel("Users")}
                      {regularUsers.map(u => renderRow(u))}
                    </>
                  );
                })()}
              </tbody>
            </table>

            {selectedUser && (
              <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

                  {/* ── HEADER ── */}
                  <header style={{ padding: "24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: "50%",
                        background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                        color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, fontWeight: 700, flexShrink: 0,
                        boxShadow: "0 4px 10px rgba(99,102,241,0.3)"
                      }}>
                        {getInitials({ firstName: selectedUser.first_name, lastName: selectedUser.last_name, email: selectedUser.email })}
                      </div>
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink-1)", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          {selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : "System User"}
                          <span className={`badge ${selectedUser.status === "active" ? "badge-active" : "badge-disabled"}`} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {selectedUser.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 14, color: "var(--ink-3)" }}>{selectedUser.email}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(null)} style={{ background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-1)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)"; }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </header>

                  {/* ── BODY ── */}
                  <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", maxHeight: "65vh" }}>

                    {/* Edit Details */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Edit User Details</div>
                      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>First Name</label>
                          <input
                            className="modal-input"
                            type="text"
                            placeholder="First Name"
                            value={editUserFirstName}
                            onChange={(e) => setEditUserFirstName(e.target.value)}
                            style={{ margin: 0 }}
                          />
                        </div>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                          <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Last Name</label>
                          <input
                            className="modal-input"
                            type="text"
                            placeholder="Last Name"
                            value={editUserLastName}
                            onChange={(e) => setEditUserLastName(e.target.value)}
                            style={{ margin: 0 }}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Email Address</label>
                        <input
                          className="modal-input"
                          type="email"
                          placeholder="Email address"
                          value={editUserEmail}
                          onChange={(e) => setEditUserEmail(e.target.value)}
                          style={{ margin: 0 }}
                        />
                      </div>
                    </div>

                    {/* Role Chips */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Manage Access Role</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        {roles.filter(r => ["viewer", "editor"].includes(r.name)).map(role => {
                          const isActive = selectedRoleIds.has(role.id);
                          return (
                            <button
                              key={role.id}
                              onClick={() => onRequestUserAccessRoleChange(role.id)}
                              disabled={isBusy || isActive}
                              style={{
                                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                padding: "10px 16px", borderRadius: 8, border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                                background: isActive ? "var(--accent-light)" : "var(--surface)",
                                color: isActive ? "var(--accent)" : "var(--ink-3)",
                                fontWeight: 500, fontSize: 14, cursor: isActive ? "default" : "pointer",
                                transition: "all 0.2s", fontFamily: "inherit"
                              }}
                            >
                              <span style={{
                                width: 18, height: 18, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                background: isActive ? "var(--accent)" : "rgba(255,255,255,0.1)", color: "white", fontSize: 10
                              }}>
                                {isActive
                                  ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                  : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                }
                              </span>
                              <span style={{ textTransform: "capitalize" }}>{role.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Account Management */}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Account Management</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onResetPassword(selectedUser.id)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                        >
                          <LockIcon size={16} /> Reset Password
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => { void onForceLogoutUser(selectedUser); }}
                          disabled={isBusy || selectedUser.id === session?.user?.id || !canControlSecurity}
                          title={!canControlSecurity ? "Requires security control permission" : selectedUser.id === session?.user?.id ? "Cannot logout yourself" : "Force logout this user"}
                          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                        >
                          <LogoutIcon size={16} /> Force Logout
                        </button>
                      </div>

                      {/* Remove User */}
                      <div style={{ marginTop: 12 }}>
                        {(() => {
                          const isAdminUser = !selectedUser.roles || selectedUser.roles.length === 0;
                          const isSelf = selectedUser.id === session?.user?.id;
                          if (isAdminUser) {
                            return (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                                <ShieldIcon size={14} /> Admin account — cannot be removed
                              </div>
                            );
                          }
                          return (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => setDeleteUserId(selectedUser.id)}
                              disabled={isBusy || isSelf}
                              title={isSelf ? "You cannot remove your own account" : "Remove user"}
                              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                            >
                              <TrashIcon size={16} /> Remove User
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ── FOOTER ── */}
                  <footer style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--panel-bg)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                    <button className="btn btn-ghost" onClick={() => setSelectedUser(null)}>Cancel</button>
                    <button
                      className="btn btn-primary"
                      onClick={() => { void onDoneUserDetails(); }}
                      disabled={isBusy || !editUserEmail.trim()}
                    >
                      {isBusy ? "Saving..." : isUserProfileDirty ? "Save Changes" : "Done"}
                    </button>
                  </footer>

                </div>
              </div>
            )}

            {resetUserId && (
              <div className="modal-overlay" onClick={() => setResetUserId(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                  <div className="modal-title">Reset Password</div>
                  <div className="modal-desc">
                    Enter a new password for this user.
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 14, padding: "10px 14px", background: "var(--surface)", borderRadius: 10, lineHeight: 1.6 }}>
                    🔒 Must be <strong>8+ characters</strong> with uppercase, lowercase, number and special character (e.g. <code>Secure@123</code>).
                  </div>

                  <div className="input-group" style={{ marginBottom: 20 }}>
                    <span className="input-icon"><LockIcon /></span>
                    <input
                      type={showResetPassword ? "text" : "password"}
                      placeholder="New password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button type="button" className="input-action-btn" onClick={() => setShowResetPassword(!showResetPassword)}>
                      {showResetPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => setResetUserId(null)} style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={onConfirmResetPassword} disabled={isBusy || Boolean(resetPasswordError)} style={{ flex: 1 }}>
                      {isBusy ? "Resetting..." : "Reset Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pendingRoleChange && selectedUser && (
              <div className="modal-overlay" onClick={() => (!isBusy ? setPendingRoleChange(null) : undefined)}>
                <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                  <div className="modal-title">Confirm role change</div>
                  <div className="modal-desc" style={{ lineHeight: 1.6 }}>
                    Change <strong>{selectedUser.email}</strong> from{" "}
                    <strong>{pendingRoleChange.currentRoleName ?? "no role"}</strong> to{" "}
                    <strong>{pendingRoleChange.roleName}</strong>?
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPendingRoleChange(null)}
                      disabled={isBusy}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        void onConfirmUserAccessRoleChange();
                      }}
                      disabled={isBusy}
                      style={{ flex: 1 }}
                    >
                      {isBusy ? "Updating..." : "Confirm"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {deleteUserId && (
              <div className="modal-overlay" onClick={() => (!isBusy ? setDeleteUserId(null) : undefined)}>
                <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                  <div className="modal-title">Remove user</div>
                  <div className="modal-desc" style={{ lineHeight: 1.6 }}>
                    This will permanently remove <strong>{deleteUserTarget?.email ?? "this user"}</strong> and all owned data.
                    This action cannot be undone.
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setDeleteUserId(null)} disabled={isBusy} style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={onConfirmRemoveUser} disabled={isBusy} style={{ flex: 1 }}>
                      {isBusy ? "Removing..." : "Remove User"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- ROLES TAB ---- */}
        {tab === "Roles" && (() => {
          const ROLE_META: Record<string, { label: string; description: string; iconBg: string; iconColor: string; icon: JSX.Element; badgeClass: string; badgeLabel: string }> = {
            admin: {
              label: "Admin",
              description: "Full system access — manages users, roles, permissions, files, and audit logs. Cannot be removed or modified.",
              iconBg: "var(--yellow-bg)",
              iconColor: "var(--yellow)",
              icon: <KeyIcon size={20} />,
              badgeClass: "badge",
              badgeLabel: "Protected"
            },
            editor: {
              label: "Editor",
              description: "Can upload, edit, rename, move, and delete files and folders they have access to.",
              iconBg: "var(--accent-light)",
              iconColor: "var(--accent)",
              icon: <EditIcon size={20} />,
              badgeClass: "badge badge-active",
              badgeLabel: "Active"
            },
            viewer: {
              label: "Viewer",
              description: "Read-only access — can view and download files that have been shared with them. Cannot modify anything.",
              iconBg: "var(--green-bg)",
              iconColor: "var(--green)",
              icon: <EyeIcon size={20} />,
              badgeClass: "badge badge-active",
              badgeLabel: "Active"
            }
          };

          const visibleRoles = ["admin", "editor", "viewer"]
            .map(name => roles.find(r => r.name === name))
            .filter(Boolean) as Role[];

          return (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {visibleRoles.map((role) => {
                const meta = ROLE_META[role.name];
                return (
                  <div key={role.id} className="panel" style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 42, height: 42, borderRadius: "var(--radius-sm)",
                          background: meta.iconBg, color: meta.iconColor,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                        }}>
                          {meta.icon}
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-1)" }}>
                          {meta.label}
                        </span>
                      </div>
                      <span className={meta.badgeClass} style={{
                        fontSize: 11,
                        ...(role.name === "admin" ? {
                          background: "var(--yellow-bg)",
                          color: "var(--yellow)",
                          border: "1px solid color-mix(in srgb, var(--yellow) 30%, transparent)"
                        } : {})
                      }}>
                        {meta.badgeLabel}
                      </span>
                    </div>
                    {/* Divider */}
                    <div style={{ height: 1, background: "var(--border)" }} />
                    {/* Description */}
                    <p style={{ fontSize: 13, color: "var(--ink-3)", lineHeight: 1.65, margin: 0 }}>
                      {meta.description}
                    </p>
                  </div>
                );
              })}
            </div>
          );
        })()}



        {/* ---- PERMISSIONS TAB ---- */}
        {tab === "Permissions" && (
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
                lineHeight: 1.6
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
                    <div key={role.id} style={{
                      background: "var(--bg)",
                      borderRadius: 12,
                      padding: "20px 24px",
                      border: "1px solid var(--border)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                        <ShieldIcon />
                        <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-1)", textTransform: "capitalize" }}>
                          {role.name}
                        </span>
                        <span style={{
                          fontSize: 12,
                          color: "var(--ink-4)",
                          background: "var(--surface)",
                          padding: "2px 10px",
                          borderRadius: 10
                        }}>
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
                          {permissions.map((perm) => {
                            const [category] = perm.key.split(":");
                            const colorMap: Record<string, string> = {
                              items: "var(--accent)",
                              users: "var(--green)",
                              roles: "#e8912d",
                              audit: "#9b59b6"
                            };
                            const color = colorMap[category] ?? "var(--ink-3)";
                            const assigned = assignedSet.has(perm.key);
                            const label = getPermissionDisplayLabel(perm);
                            return (
                              <button
                                key={`${role.id}:${perm.id}`}
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  void onToggleRolePermission(role.name, perm.key);
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
                                  textAlign: "left"
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
                                    flexShrink: 0
                                  }}
                                >
                                  {assigned ? "✓" : ""}
                                </span>
                                <span style={{ display: "grid", gap: 2 }}>
                                  <span style={{ fontWeight: 600, color: "var(--ink-1)" }}>{label}</span>
                                  <span style={{ fontSize: 11, color: "var(--ink-4)", fontFamily: "ui-monospace, monospace" }}>
                                    {perm.key}
                                  </span>
                                </span>
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
        )}

        {/* ---- FILES TAB ---- */}
        {tab === "Files" && (
          <>
            {viewerItem ? (
              <div className="file-viewer-shell">
                <div className="file-viewer-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={closeViewer}>
                      <ArrowLeftIcon /> Back to Files
                    </button>
                    <span className="file-viewer-title">{viewerItem.name}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => onDownload(viewerItem)}>
                      <DownloadIcon /> Download
                    </button>
                    {viewerUrl && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => window.open(viewerUrl, "_blank", "noopener,noreferrer")}
                      >
                        Open Raw
                      </button>
                    )}
                    {canWrite && (
                      <button className="btn btn-secondary btn-sm" onClick={() => onOpenEdit(viewerItem)}>
                        <EditIcon /> Edit name
                      </button>
                    )}
                    {canDelete && (
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(viewerItem)}>
                        <TrashIcon /> Delete
                      </button>
                    )}
                  </div>
                </div>

                {viewerLoading ? (
                  <div className="file-viewer-loading">Loading file preview...</div>
                ) : viewerError ? (
                  <div className="file-viewer-error">{viewerError}</div>
                ) : !viewerUrl ? (
                  <div className="file-viewer-error">Preview unavailable.</div>
                ) : isCurrentViewerPdf ? (
                  <div className="pdf-editor-layout">
                    <div className="pdf-preview-pane">
                      <div className="pdf-preview-toolbar">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewerPdfPage((prev) => Math.max(1, prev - 1))}
                          disabled={selectedPdfPage <= 1}
                        >
                          Previous
                        </button>
                        <div className="pdf-page-indicator">
                          Page {selectedPdfPage} of {viewerPdfPages}
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setViewerPdfPage((prev) => Math.min(viewerPdfPages, prev + 1))}
                          disabled={selectedPdfPage >= viewerPdfPages}
                        >
                          Next
                        </button>
                      </div>
                      <div className="pdf-preview-meta">
                        <span>Fit to width</span>
                        <strong>{pdfScalePercent}%</strong>
                      </div>
                      <div className="pdf-canvas-wrap" ref={pdfCanvasWrapRef}>
                        <canvas ref={pdfCanvasRef} className="pdf-preview-canvas" />
                        {pdfRendering && (
                          <div className="pdf-render-overlay">Rendering page…</div>
                        )}
                        {pdfRenderError && (
                          <div className="pdf-render-overlay pdf-render-overlay-error">{pdfRenderError}</div>
                        )}
                      </div>
                    </div>

                    <div className="file-details-pane">
                      <h3>PDF Details</h3>
                      <div className="file-detail-row"><span>Name</span><strong>{viewerItem.name}</strong></div>
                      <div className="file-detail-row"><span>Type</span><strong>{viewerContentType || viewerItem.content_type || "application/pdf"}</strong></div>
                      <div className="file-detail-row"><span>Size</span><strong>{formatBytes(viewerItem.size_bytes)}</strong></div>
                      <div className="file-detail-row"><span>Total pages</span><strong>{viewerPdfPages}</strong></div>
                      {viewerItem.updated_at && (
                        <div className="file-detail-row"><span>Updated</span><strong>{formatDate(viewerItem.updated_at)}</strong></div>
                      )}
                      {viewerItem.owner_user_id && (() => {
                        const owner = users.find(u => u.id === viewerItem.owner_user_id);
                        const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                        return (
                          <div className="file-detail-row">
                            <span>Uploaded by</span>
                            <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                                {display[0]?.toUpperCase()}
                              </span>
                              {display}
                            </strong>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ) : viewerTextPreview !== null ? (
                  <div className="file-viewer-generic">
                    <div className="file-text-preview">
                      <pre>{viewerTextPreview || "(No preview available.)"}</pre>
                    </div>
                    <div className="file-details-pane">
                      <h3>File Details</h3>
                      <div className="file-detail-row"><span>Name</span><strong>{viewerItem.name}</strong></div>
                      <div className="file-detail-row"><span>Type</span><strong>{viewerContentType || viewerItem.content_type || "Unknown"}</strong></div>
                      <div className="file-detail-row"><span>Size</span><strong>{formatBytes(viewerItem.size_bytes)}</strong></div>
                      {viewerItem.updated_at && (
                        <div className="file-detail-row"><span>Updated</span><strong>{formatDate(viewerItem.updated_at)}</strong></div>
                      )}
                      {viewerItem.owner_user_id && (() => {
                        const owner = users.find(u => u.id === viewerItem.owner_user_id);
                        const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                        return (
                          <div className="file-detail-row">
                            <span>Uploaded by</span>
                            <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                                {display[0]?.toUpperCase()}
                              </span>
                              {display}
                            </strong>
                          </div>
                        );
                      })()}
                      {viewerPreviewNote && <div className="file-preview-note">{viewerPreviewNote}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="file-viewer-generic">
                    <div className="file-generic-preview">
                      {viewerContentType.startsWith("image/") ? (
                        <img src={viewerUrl} alt={viewerItem.name} className="file-image-preview" />
                      ) : canEmbedCurrentViewer ? (
                        <object
                          data={viewerUrl}
                          type={viewerContentType || "application/octet-stream"}
                          className="file-generic-frame"
                        >
                          <iframe title={viewerItem.name} src={viewerUrl} className="file-generic-frame" />
                        </object>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: "100%",
                            padding: "24px",
                            color: "var(--ink-3)",
                            textAlign: "center",
                            lineHeight: 1.6
                          }}
                        >
                          This file type cannot be previewed in the browser.
                          Use Download to view it in the native app.
                        </div>
                      )}
                    </div>
                    <div className="file-details-pane">
                      <h3>File Details</h3>
                      <div className="file-detail-row"><span>Name</span><strong>{viewerItem.name}</strong></div>
                      <div className="file-detail-row"><span>Type</span><strong>{viewerContentType || viewerItem.content_type || "Unknown"}</strong></div>
                      <div className="file-detail-row"><span>Size</span><strong>{formatBytes(viewerItem.size_bytes)}</strong></div>
                      {viewerItem.updated_at && (
                        <div className="file-detail-row"><span>Updated</span><strong>{formatDate(viewerItem.updated_at)}</strong></div>
                      )}
                      {viewerItem.owner_user_id && (() => {
                        const owner = users.find(u => u.id === viewerItem.owner_user_id);
                        const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                        return (
                          <div className="file-detail-row">
                            <span>Uploaded by</span>
                            <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                                {display[0]?.toUpperCase()}
                              </span>
                              {display}
                            </strong>
                          </div>
                        );
                      })()}
                      {viewerPreviewNote && <div className="file-preview-note">{viewerPreviewNote}</div>}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="breadcrumb">
                  <button
                    className={`breadcrumb-item ${path.length === 0 ? "current" : ""}`}
                    onClick={goToRoot}
                  >
                    <HomeIcon /> Root
                  </button>
                  {path.map((crumb, index) => (
                    <span key={crumb.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span className="breadcrumb-sep"><ChevronIcon /></span>
                      <button
                        className={`breadcrumb-item ${index === path.length - 1 ? "current" : ""}`}
                        onClick={() => goToBreadcrumb(index)}
                      >
                        {crumb.name}
                      </button>
                    </span>
                  ))}
                </div>

                {canWrite ? (
                  <div className="file-toolbar">
                    <button className="btn btn-primary btn-sm" onClick={() => { setFolderName(""); setShowFolderModal(true); }} disabled={isBusy}>
                      <PlusIcon /> New Folder
                    </button>
                    <label className="upload-label">
                      <UploadIcon /> Upload Files
                      <input
                        type="file"
                        multiple
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files?.length) onUploadFiles(files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div style={{ padding: "8px 16px", fontSize: 13, color: "var(--ink-4)", display: "flex", alignItems: "center", gap: 6 }}>
                    <KeyIcon /> Read-only access — you can view and download files.
                  </div>
                )}

                <div className="panel">
                  {items.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-3)" }}>
                      <FolderIcon size={40} />
                      <p style={{ marginTop: 12, fontSize: 15 }}>This folder is empty</p>
                      <p style={{ fontSize: 13, color: "var(--ink-4)" }}>
                        Create a folder or upload a file to get started.
                      </p>
                    </div>
                  ) : (
                    <div className="file-grid">
                      {items.map((item) => (
                        <div key={item.id} className="file-row">
                          <div className={`file-icon-box ${item.type === "folder" ? "file-icon-folder" : "file-icon-file"}`}>
                            {item.type === "folder" ? <FolderIcon /> : <FileIcon />}
                          </div>
                          <div>
                            <div
                              className="file-name clickable"
                              onClick={() => (item.type === "folder" ? openFolder(item) : onOpenFile(item))}
                            >
                              {item.name}
                            </div>
                            <div className="file-type">
                              {item.type} {item.type === "file" ? `· ${formatBytes(item.size_bytes)}` : ""}
                            </div>
                          </div>
                          <div className="file-actions">
                            {item.type === "file" && (
                              <button className="btn btn-ghost btn-sm" onClick={() => onOpenFile(item)} title="Open">
                                <EyeIcon size={16} />
                              </button>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => onDownload(item)} title="Download">
                              <DownloadIcon />
                            </button>
                            {canWrite && (
                              <button className="btn btn-ghost btn-sm" onClick={() => onOpenEdit(item)} title="Edit">
                                <EditIcon />
                              </button>
                            )}
                            {canDelete && (
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(item)} title="Delete" style={{ color: "var(--red)" }}>
                                <TrashIcon />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Create Folder Modal */}
            {showFolderModal && (
              <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-icon modal-icon-folder">
                    <FolderIcon size={24} />
                  </div>
                  <div className="modal-title">Create new folder</div>
                  <div className="modal-desc">Enter a name for your new folder.</div>
                  <form onSubmit={(e) => { e.preventDefault(); onCreateFolder(); }}>
                    <input
                      className="modal-input"
                      placeholder="Folder name"
                      value={folderName}
                      onChange={(e) => setFolderName(e.target.value)}
                      autoFocus
                      required
                    />
                    <div className="modal-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowFolderModal(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={!folderName.trim() || isBusy}>Create</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
              <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-icon modal-icon-danger">
                    <TrashIcon />
                  </div>
                  <div className="modal-title">Delete {deleteTarget.type}</div>
                  <div className="modal-desc">
                    Are you sure you want to delete <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>? This action cannot be undone.
                  </div>
                  <div className="modal-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
                    <button className="btn btn-danger btn-sm" onClick={onConfirmDelete} disabled={isBusy}>Delete</button>
                  </div>
                </div>
              </div>
            )}

            {/* Rename/Edit Modal */}
            {editTarget && (
              <div className="modal-overlay" onClick={() => setEditTarget(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-icon modal-icon-folder">
                    <EditIcon size={22} />
                  </div>
                  <div className="modal-title">Edit {editTarget.type} name</div>
                  <div className="modal-desc">Update the display name for this {editTarget.type}.</div>
                  <form onSubmit={(e) => { e.preventDefault(); onConfirmEdit(); }}>
                    <input
                      className="modal-input"
                      placeholder="Enter new name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      required
                    />
                    <div className="modal-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={!editName.trim() || isBusy}>Save</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {/* ---- SECURITY TAB ---- */}
        {tab === "Security" && (
          <div className="panel" style={{ padding: 20 }}>
            {!canControlSecurity ? (
              <div style={{ color: "var(--ink-3)", padding: "8px 0" }}>
                You do not have permission to use security controls.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, color: "var(--ink-1)" }}>Security Control Center</h2>
                    <p style={{ margin: "6px 0 0", color: "var(--ink-3)", fontSize: 14 }}>
                      Targeted/global logout and emergency tap-off controls.
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void refreshSecurityControlState()}
                    disabled={securityLoading || isBusy}
                  >
                    <RefreshCwIcon size={14} style={{ marginRight: 4 }} />
                    {securityLoading ? "Refreshing..." : "Refresh State"}
                  </button>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
                  <span className={`badge ${isSecurityTokenValid ? "badge-active" : "badge-disabled"}`}>
                    {isSecurityTokenValid ? "Security controls unlocked" : "Verification required"}
                  </span>
                  {isSecurityTokenValid && (
                    <span style={{ color: "var(--ink-4)", fontSize: 12 }}>
                      Token expires in {securityTokenRemainingSeconds}s
                    </span>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={openSecurityStepUpModal} disabled={stepUpBusy}>
                    {isSecurityTokenValid ? "Re-verify identity" : "Verify identity"}
                  </button>
                </div>

                {securityError && (
                  <div style={{ marginBottom: 12, color: "var(--red)", fontSize: 13 }}>
                    {securityError}
                  </div>
                )}

                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 18 }}>
                  <div className="panel" style={{ margin: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6 }}>Tap-off status</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: securityState?.tapOffActive ? "var(--red)" : "var(--green)" }}>
                      {securityState?.tapOffActive ? "ACTIVE" : "INACTIVE"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-4)" }}>
                      Started: {securityState?.tapOffStartedAt ? formatDate(securityState.tapOffStartedAt) : "-"}
                    </div>
                  </div>
                  <div className="panel" style={{ margin: 0 }}>
                    <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6 }}>Global logout cutoff</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
                      {securityState?.globalLogoutAfter ? formatDate(securityState.globalLogoutAfter) : "Not set"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-4)" }}>
                      Last tap-off by: {securityState?.tapOffBy ?? "-"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "var(--ink-4)", fontWeight: 600 }}>Reason for security action</label>
                  <textarea
                    value={securityReason}
                    onChange={(event) => setSecurityReason(event.target.value)}
                    placeholder="Reason for audit trail..."
                    style={{
                      minHeight: 80,
                      resize: "vertical",
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--ink-1)",
                      padding: "10px 12px"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "var(--ink-4)", fontWeight: 600 }}>
                    Target user for single-account logout
                  </label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <select
                      value={securityTargetUserId}
                      onChange={(event) => setSecurityTargetUserId(event.target.value)}
                      style={{
                        minWidth: 260,
                        borderRadius: 10,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        color: "var(--ink-1)",
                        padding: "10px 12px"
                      }}
                    >
                      <option value="">Select a user...</option>
                      {users
                        .filter((user) => user.id !== session?.user?.id)
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.email}
                          </option>
                        ))}
                    </select>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => void onForceLogoutSelectedUser()}
                      disabled={isBusy || !securityTargetUserId}
                    >
                      Logout Selected User
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void onForceLogoutEveryone()}
                    disabled={isBusy}
                  >
                    Logout Everyone
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => void onTapOff()}
                    disabled={isBusy || Boolean(securityState?.tapOffActive)}
                  >
                    Activate Tap-Off
                  </button>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => void onTapOn()}
                    disabled={isBusy || !securityState?.tapOffActive}
                  >
                    Restore Service
                  </button>
                </div>

                <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink-4)" }}>
                  Tip: Use the <strong>Logout user</strong> action in the Users tab for targeted session revocation.
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- AUDIT LOGS TAB ---- */}
        {tab === "Audit Logs" && (() => {
          const filteredLogs = auditLogs;

          const dangerCount = filteredLogs.filter(l => getAuditCategory(l.action) === "danger").length;
          const authCount = filteredLogs.filter(l => getAuditCategory(l.action) === "auth").length;
          const fileCount = filteredLogs.filter(l => getAuditCategory(l.action) === "file").length;
          const adminCount = filteredLogs.filter(l => getAuditCategory(l.action) === "admin").length;

          // Build rows with date-group separators
          const rows: Array<{ type: "separator"; label: string } | { type: "log"; log: typeof filteredLogs[0] }> = [];
          let lastGroup = "";
          for (const log of filteredLogs) {
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
                  {dangerCount > 0 && (
                    <span className="audit-stat-chip audit-stat-chip-danger">{dangerCount} danger</span>
                  )}
                  {authCount > 0 && (
                    <span className="audit-stat-chip audit-stat-chip-auth">{authCount} auth</span>
                  )}
                  {fileCount > 0 && (
                    <span className="audit-stat-chip audit-stat-chip-file">{fileCount} file</span>
                  )}
                  {adminCount > 0 && (
                    <span className="audit-stat-chip audit-stat-chip-admin">{adminCount} admin</span>
                  )}
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
                      {rows.map((row, idx) => {
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
                                setAuditExpandedRows((prev) => {
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
                                      width: 28,
                                      height: 28,
                                      borderRadius: "50%",
                                      background: "var(--accent-light)",
                                      color: "var(--accent)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      flexShrink: 0
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
                                <span
                                  style={{
                                    display: "inline-flex",
                                    padding: "3px 9px",
                                    borderRadius: 6,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    fontFamily: "ui-monospace, monospace",
                                    background: catStyle.bg,
                                    color: catStyle.color,
                                    border: `1px solid ${catStyle.border}`,
                                    letterSpacing: "0.01em"
                                  }}
                                >
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
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTab("Files");
                                        setPath([]);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        padding: "2px 6px",
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 5,
                                        color: "var(--accent)",
                                        fontWeight: 600,
                                        fontSize: 12,
                                        textDecoration: "underline",
                                        textUnderlineOffset: 2,
                                        transition: "opacity 150ms"
                                      }}
                                      onMouseEnter={e => (e.currentTarget.style.opacity = "0.75")}
                                      onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
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
                                    marginTop: 10,
                                    background: "var(--sidebar-bg)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 10,
                                    padding: "14px 18px",
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                                    gap: "10px 24px"
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
                </div>
              )}
            </div>
          );
        })()}

        {showSecurityStepUpModal && (
          <div className="modal-overlay" onClick={() => (!stepUpBusy ? setShowSecurityStepUpModal(false) : undefined)}>
            <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-title">Verify identity</div>
              <div className="modal-desc">
                Confirm your password and OTP to unlock security controls.
              </div>

              <div className="input-group" style={{ marginBottom: 12 }}>
                <span className="input-icon"><LockIcon /></span>
                <input
                  type="password"
                  placeholder="Current password"
                  value={stepUpPassword}
                  onChange={(event) => setStepUpPassword(event.target.value)}
                  disabled={stepUpBusy}
                />
              </div>

              {!stepUpOtpRequested ? (
                <button
                  className="btn btn-primary"
                  onClick={() => void onRequestSecurityStepUpOtp()}
                  disabled={stepUpBusy || !stepUpPassword}
                  style={{ width: "100%", marginBottom: 12 }}
                >
                  {stepUpBusy ? "Requesting..." : "Send OTP"}
                </button>
              ) : (
                <>
                  <div className="input-group" style={{ marginBottom: 12 }}>
                    <span className="input-icon"><MailIcon /></span>
                    <input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      value={stepUpOtp}
                      onChange={(event) => setStepUpOtp(event.target.value)}
                      disabled={stepUpBusy}
                      maxLength={6}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => void onVerifySecurityStepUpOtp()}
                    disabled={stepUpBusy || !stepUpOtp}
                    style={{ width: "100%", marginBottom: 10 }}
                  >
                    {stepUpBusy ? "Verifying..." : "Verify & Unlock"}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => void onRequestSecurityStepUpOtp()}
                    disabled={stepUpBusy}
                    style={{ width: "100%" }}
                  >
                    Resend OTP
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Create User Modal */}
        {showCreateUser && (
          <div className="modal-overlay" onClick={() => setShowCreateUser(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-icon modal-icon-folder">
                <UsersIcon />
              </div>
              <div className="modal-title">Create new user</div>
              <div className="modal-desc">Add a new user to the system with their personal details and role.</div>
              <form onSubmit={(e) => { e.preventDefault(); onCreateUserSubmit(); }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="First Name"
                    value={newUserFirstName}
                    onChange={(e) => setNewUserFirstName(e.target.value)}
                    required
                    style={{ margin: 0 }}
                  />
                  <input
                    className="modal-input"
                    type="text"
                    placeholder="Last Name"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    required
                    style={{ margin: 0 }}
                  />
                </div>
                <input
                  className="modal-input"
                  type="email"
                  placeholder="Email address"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                  style={{ marginBottom: 12 }}
                />
                <div style={{ position: "relative", marginBottom: 6 }}>
                  <input
                    className="modal-input"
                    type={showNewUserPassword ? "text" : "password"}
                    placeholder="Password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    minLength={8}
                    style={{ margin: 0, paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowNewUserPassword(!showNewUserPassword)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-4)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                    {showNewUserPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 12, padding: "8px 12px", background: "var(--surface)", borderRadius: 10, lineHeight: 1.6 }}>
                  🔒 Min 8 chars · Uppercase · Lowercase · Number · Special char<br />
                  <span style={{ color: "var(--ink-3)" }}>e.g. <code>Secure@123</code></span>
                </div>
                <select
                  className="modal-input"
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  style={{ marginBottom: 12 }}
                >
                  <option value="viewer">Viewer (read-only)</option>
                  <option value="editor">Editor (read/write)</option>
                </select>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowCreateUser(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!newUserEmail.trim() || Boolean(newUserPasswordError) || isBusy}>
                    {isBusy ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
