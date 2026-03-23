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
  fetchMyProfile,
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
  refreshSession as refreshAuthSession,
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
  DashboardRange,
  DashboardSummary,
  Item,
  SecurityState,
  UserDashboardSummary,
  UserProfile
} from "./api";
import "./styles.css";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import FilesPage from "./pages/FilesPage";
import AuditLogsPage from "./pages/AuditLogsPage";


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

const ALL_TABS = ["Dashboard", "Users", "Roles", "Permissions", "Files", "Audit Logs"] as const;
type Tab = (typeof ALL_TABS)[number];


type User = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string | null;
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

const SESSION_STORAGE_KEY = "magnus_session";
const LAST_EMAIL_STORAGE_KEY = "magnus_last_email";
const SAVED_EMAILS_STORAGE_KEY = "magnus_saved_emails";
const REMEMBER_ME_STORAGE_KEY = "magnus_remember";
const REFRESH_SKEW_MS = 30 * 1000;
const ACCESS_REFRESH_AHEAD_MS = 60 * 1000;
const PROFILE_SYNC_INTERVAL_MS = 5 * 1000;  // poll every 5 s so permission changes reflect quickly


const parseStoredSession = (raw: string | null): Session | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.refreshExpiresAt) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const normalizeStringList = (values: string[] | undefined) =>
  Array.from(
    new Set(values?.filter((value): value is string => typeof value === "string" && value.length > 0) ?? [])
  ).sort();

const isSameStringList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index]);

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
};


const tabDescriptions: Record<Tab, string> = {
  Dashboard: "High-level view of users, files, and security activity across your system.",
  Users: "Manage user accounts, assign roles, and control access permissions.",
  Roles: "View and manage the available roles in the system.",
  Permissions: "See which permissions are assigned to each role.",
  Files: "Browse, upload, and manage stored documents and folders.",
  "Audit Logs": "View a chronological log of all system activity.",
};


// ── URL routing ─────────────────────────────────────────────────────────────
const TAB_TO_PATH: Record<Tab, string> = {
  Dashboard: "/dashboard",
  Users: "/users",
  Roles: "/roles",
  Permissions: "/permissions",
  Files: "/files",
  "Audit Logs": "/audit-logs",
};

const PATH_TO_TAB: Record<string, Tab> = Object.fromEntries(
  Object.entries(TAB_TO_PATH).map(([tab, path]) => [path, tab as Tab])
);

function tabFromPath(): Tab {
  const path = window.location.pathname;
  return PATH_TO_TAB[path] ?? "Files";
}

const DASHBOARD_RANGE_OPTIONS: Array<{ value: DashboardRange; label: string }> = [
  { value: "7d", label: "Last 7 Days" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" }
];

const DASHBOARD_RANGE_LABELS: Record<DashboardRange, string> = {
  "7d": "Last 7 Days",
  today: "Today",
  yesterday: "Yesterday"
};

const DEFAULT_PAGE_SIZE = 10;

const getTabsForRole = (roles: string[], permissions: string[]): Tab[] => {
  // Admin always gets everything
  if (roles.includes("admin")) return [...ALL_TABS];

  // For everyone else, derive tabs from what permissions they actually have.
  // This means the admin's Permissions page directly controls which tabs appear.
  const has = (p: string) => permissions.includes(p);

  const tabs: Tab[] = ["Dashboard"]; // Dashboard is always visible when logged in

  if (has("items:read") || has("items:write") || has("items:delete") || has("items:share")) {
    tabs.push("Files");
  }
  if (has("audit:read")) {
    tabs.push("Audit Logs");
  }
  if (has("roles:manage")) {
    tabs.push("Roles");
    tabs.push("Permissions");
  }
  if (has("users:manage")) {
    tabs.push("Users");
  }

  // Preserve the canonical tab order from ALL_TABS
  return ALL_TABS.filter(t => tabs.includes(t));
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
    () => localStorage.getItem(LAST_EMAIL_STORAGE_KEY) ?? ""
  );
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loginStep, setLoginStep] = useState<1 | 2 | 3>(1);
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<Tab>(() => tabFromPath());

  // Keep URL in sync when tab changes programmatically
  const navigateToTab = useCallback((next: Tab) => {
    setTab(next);
    const path = TAB_TO_PATH[next];
    if (window.location.pathname !== path) {
      window.history.pushState({ tab: next }, "", path);
    }
  }, []);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermMap, setRolePermMap] = useState<RolePermMap[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserFirstName, setEditUserFirstName] = useState("");
  const [editUserLastName, setEditUserLastName] = useState("");
  const [editUserPhoneNumber, setEditUserPhoneNumber] = useState("");
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
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>("7d");
  const [dashboardAuditPage, setDashboardAuditPage] = useState(1);
  const [userRecentActivityPage, setUserRecentActivityPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState("");
  const [auditActionFilter, setAuditActionFilter] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
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
  const [newUserPhoneNumber, setNewUserPhoneNumber] = useState("");
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem(REMEMBER_ME_STORAGE_KEY) !== "false"
  );
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
      const raw = localStorage.getItem(SAVED_EMAILS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const viewerUrlRef = useRef<string | null>(null);
  const refreshInFlightRef = useRef<Promise<boolean> | null>(null);
  const profileSyncInFlightRef = useRef<Promise<void> | null>(null);
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

  // Restore session on mount and rotate access token if needed.
  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      const localRaw = localStorage.getItem(SESSION_STORAGE_KEY);
      const tabRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      const localSession = parseStoredSession(localRaw);
      const tabSession = parseStoredSession(tabRaw);

      if (localRaw && !localSession) localStorage.removeItem(SESSION_STORAGE_KEY);
      if (tabRaw && !tabSession) sessionStorage.removeItem(SESSION_STORAGE_KEY);

      const candidates: Session[] = [];
      if (localSession) candidates.push(localSession);
      if (tabSession) candidates.push(tabSession);
      if (candidates.length === 0) {
        if (!cancelled) setIsSessionChecking(false);
        return;
      }

      candidates.sort((a, b) => {
        const aExp = getJwtExpiryTime(a.accessToken) ?? 0;
        const bExp = getJwtExpiryTime(b.accessToken) ?? 0;
        return bExp - aExp;
      });
      const chosen = candidates[0];

      const accessExpiry = getJwtExpiryTime(chosen.accessToken);
      if (accessExpiry && accessExpiry > Date.now() + REFRESH_SKEW_MS) {
        if (!cancelled) {
          setSession(chosen);
          setIsSessionChecking(false);
        }
        return;
      }

      const refreshExpiry = new Date(chosen.refreshExpiresAt).getTime();
      const refreshStillValid = Number.isFinite(refreshExpiry) && refreshExpiry > Date.now() + REFRESH_SKEW_MS;
      if (!refreshStillValid) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        if (!cancelled) setIsSessionChecking(false);
        return;
      }

      try {
        const refreshed = await refreshAuthSession(chosen.refreshToken);
        if (cancelled) return;
        setSession(refreshed);
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(refreshed));
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(refreshed));
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } finally {
        if (!cancelled) setIsSessionChecking(false);
      }
    };

    void bootstrapSession();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist rememberMe preference
  useEffect(() => {
    localStorage.setItem(REMEMBER_ME_STORAGE_KEY, String(rememberMe));
  }, [rememberMe]);

  // Keep session tokens in storage in sync with in-memory session.
  // Persist in both storages so refresh/new-tab/window reopen all recover session reliably.
  useEffect(() => {
    if (!session) return;
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

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
        const data = await fetchDashboardSummary(accessToken, dashboardRange);
        setDashboard(data);
        setUserDashboard(null);
      } else {
        const data = await fetchUserDashboardSummary(accessToken, dashboardRange);
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
          fetchDashboardSummary(accessToken, dashboardRange)
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
        const dashboardRes = await fetchUserDashboardSummary(accessToken, dashboardRange);
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
    const normalizedSession: Session = {
      ...data,
      user: {
        ...data.user,
        roles: normalizeStringList(data.user?.roles),
        permissions: normalizeStringList(data.user?.permissions)
      }
    };

    setSession(normalizedSession);
    setSecurityActionToken(null);
    setSecurityActionExpiresAt(null);
    setSecurityState(null);
    setSecurityError(null);
    if (rememberMe) {
      localStorage.setItem(LAST_EMAIL_STORAGE_KEY, email);
      setSavedEmails((prev) => {
        const next = [email, ...prev.filter((value) => value !== email)].slice(0, 10);
        localStorage.setItem(SAVED_EMAILS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    }
    setLoginStep(1);
    setOtp("");
    setPassword("");
    const userTabs = getTabsForRole(
      normalizedSession.user?.roles ?? [],
      normalizedSession.user?.permissions ?? []
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
      setStatus("OTP sent. Check your registered contact method.");
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
  }, [session?.accessToken, isAdmin]);

  const clearClientSession = useCallback(() => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
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

  const rotateAccessSession = useCallback(
    async (showExpiryToast = true): Promise<boolean> => {
      if (!session?.refreshToken) return false;
      if (refreshInFlightRef.current) return refreshInFlightRef.current;

      const refreshExpiry = new Date(session.refreshExpiresAt).getTime();
      const refreshStillValid = Number.isFinite(refreshExpiry) && refreshExpiry > Date.now() + REFRESH_SKEW_MS;
      if (!refreshStillValid) {
        if (showExpiryToast) {
          showToast("error", "Session expired", "Your session expired. Please sign in again.");
        }
        clearClientSession();
        return false;
      }

      const promise = refreshAuthSession(session.refreshToken)
        .then((next) => {
          setSession(next);
          return true;
        })
        .catch(() => {
          if (showExpiryToast) {
            showToast("error", "Session expired", "Your session expired. Please sign in again.");
          }
          clearClientSession();
          return false;
        })
        .finally(() => {
          refreshInFlightRef.current = null;
        });

      refreshInFlightRef.current = promise;
      return promise;
    },
    [session?.refreshToken, session?.refreshExpiresAt, clearClientSession, showToast]
  );

  const syncSessionProfile = useCallback(async () => {
    if (!accessToken) return;
    if (profileSyncInFlightRef.current) return profileSyncInFlightRef.current;

    const promise = (async () => {
      try {
        const profile = await fetchMyProfile(accessToken);
        setSession((prev) => {
          if (!prev || prev.user.id !== profile.id) return prev;

          const prevRoles = normalizeStringList(prev.user.roles);
          const prevPerms = normalizeStringList(prev.user.permissions);
          const nextRoles = normalizeStringList(profile.roles);
          const nextPerms = normalizeStringList(profile.permissions);

          const rolesChanged = !isSameStringList(prevRoles, nextRoles);
          const permsChanged = !isSameStringList(prevPerms, nextPerms);
          const profileChanged =
            prev.user.email !== profile.email ||
            prev.user.firstName !== profile.firstName ||
            prev.user.lastName !== profile.lastName ||
            rolesChanged ||
            permsChanged;

          if (!profileChanged) return prev;

          // ── Notify the user about access changes ─────────────────────────
          if (rolesChanged || permsChanged) {
            const prevTabs = getTabsForRole(prevRoles, prevPerms);
            const nextTabs = getTabsForRole(nextRoles, nextPerms);

            const gained = nextTabs.filter(t => !prevTabs.includes(t));
            const lost = prevTabs.filter(t => !nextTabs.includes(t));

            if (gained.length > 0) {
              showToast(
                "success",
                "Access granted",
                `You now have access to: ${gained.join(", ")}`
              );
            }
            if (lost.length > 0) {
              showToast(
                "error",
                "Access removed",
                `Your access to the following was removed: ${lost.join(", ")}`
              );
            }
          }

          return {
            ...prev,
            user: {
              ...prev.user,
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              roles: nextRoles,
              permissions: nextPerms
            }
          };
        });
      } catch {
        // Ignore transient profile-sync failures; next interval/focus retries.
      }
    })().finally(() => {
      profileSyncInFlightRef.current = null;
    });

    profileSyncInFlightRef.current = promise;
    return promise;
  }, [accessToken, showToast]);


  // Rotate access token before it expires.
  useEffect(() => {
    if (!session?.accessToken) return;
    const expiryMs = getJwtExpiryTime(session.accessToken);
    if (!expiryMs) return;

    const msUntilRefresh = expiryMs - Date.now() - ACCESS_REFRESH_AHEAD_MS;
    if (msUntilRefresh <= 0) {
      void rotateAccessSession(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void rotateAccessSession(false);
    }, msUntilRefresh);

    return () => window.clearTimeout(timeoutId);
  }, [session?.accessToken, rotateAccessSession]);

  // If user comes back to the tab near expiry, refresh immediately.
  useEffect(() => {
    const onForegroundCheck = () => {
      if (document.visibilityState === "hidden" || !session?.accessToken) return;
      const expiryMs = getJwtExpiryTime(session.accessToken);
      if (!expiryMs) return;
      if (expiryMs - Date.now() <= ACCESS_REFRESH_AHEAD_MS) {
        void rotateAccessSession(false);
      }
    };

    window.addEventListener("focus", onForegroundCheck);
    document.addEventListener("visibilitychange", onForegroundCheck);
    return () => {
      window.removeEventListener("focus", onForegroundCheck);
      document.removeEventListener("visibilitychange", onForegroundCheck);
    };
  }, [session?.accessToken, rotateAccessSession]);

  // Sync auth session across tabs (localStorage-backed sessions).
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEY) return;
      if (!event.newValue) {
        clearClientSession();
        return;
      }
      const next = parseStoredSession(event.newValue);
      if (!next) return;
      setSession(next);
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clearClientSession]);

  const onSelectUser = async (user: User) => {
    if (!accessToken) return;
    setPendingRoleChange(null);
    setSelectedUser(user);
    setEditUserEmail(user.email);
    setEditUserFirstName(user.first_name ?? "");
    setEditUserLastName(user.last_name ?? "");
    setEditUserPhoneNumber(user.phone_number ?? "");
    const data = await listUserRoles(accessToken, user.id);
    setUserRoles(data);
  };

  const onSaveUserProfile = async (): Promise<boolean> => {
    if (!accessToken || !selectedUser) return false;

    const emailValue = normalizeEmail(editUserEmail);
    const firstNameValue = editUserFirstName.trim();
    const lastNameValue = editUserLastName.trim();
    const phoneNumberValue = editUserPhoneNumber.trim();

    if (!emailValue) {
      showToast("error", "Invalid email", "Email is required.");
      return false;
    }

    const currentFirst = selectedUser.first_name ?? "";
    const currentLast = selectedUser.last_name ?? "";
    const currentPhone = selectedUser.phone_number ?? "";
    if (
      emailValue === selectedUser.email &&
      firstNameValue === currentFirst &&
      lastNameValue === currentLast &&
      phoneNumberValue === currentPhone
    ) {
      showToast("success", "No changes", "User details are already up to date.");
      return true;
    }

    setIsBusy(true);
    try {
      const updated = await updateUserInfo(accessToken, selectedUser.id, {
        email: emailValue,
        firstName: firstNameValue,
        lastName: lastNameValue,
        phoneNumber: phoneNumberValue || null
      });

      setUsers((prev) =>
        prev.map((u) =>
          u.id === updated.id
            ? {
              ...u,
              email: updated.email,
              first_name: updated.first_name ?? "",
              last_name: updated.last_name ?? "",
              phone_number: updated.phone_number ?? null
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
            last_name: updated.last_name ?? "",
            phone_number: updated.phone_number ?? null
          }
          : prev
      );
      setEditUserEmail(updated.email);
      setEditUserFirstName(updated.first_name ?? "");
      setEditUserLastName(updated.last_name ?? "");
      setEditUserPhoneNumber(updated.phone_number ?? "");

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
    const phoneNumberValue = editUserPhoneNumber.trim();
    return (
      emailValue !== selectedUser.email ||
      firstNameValue !== (selectedUser.first_name ?? "") ||
      lastNameValue !== (selectedUser.last_name ?? "") ||
      phoneNumberValue !== (selectedUser.phone_number ?? "")
    );
  }, [selectedUser, editUserEmail, editUserFirstName, editUserLastName, editUserPhoneNumber]);

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

  // ---- folder tree upload (used by FilesPage drag-and-drop and input fallback) ----

  /**
   * Recursively reads a FileSystemDirectoryEntry and returns all files with
   * their full relative paths (e.g. "MyFolder/sub/file.txt").
   */
  const readEntryTree = (entry: any): Promise<{ relativePath: string; file: File }[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((f: File) => resolve([{ relativePath: entry.fullPath.slice(1), file: f }]));
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const allEntries: any[] = [];
        const readBatch = () => {
          reader.readEntries(async (batch: any[]) => {
            if (batch.length === 0) {
              const nested = await Promise.all(allEntries.map(readEntryTree));
              resolve(nested.flat());
            } else {
              allEntries.push(...batch);
              readBatch(); // keep reading until empty batch
            }
          });
        };
        readBatch();
      } else {
        resolve([]);
      }
    });
  };

  /**
   * Upload a folder tree:
   *  1. Collect all files with their path segments.
   *  2. Create folders top-down, caching id by path.
   *  3. Upload each file into its created parent.
   */
  const onUploadFolderTree = async (
    entries: { relativePath: string; file: File }[]
  ) => {
    if (!accessToken || entries.length === 0) return;
    setIsBusy(true);

    // folder-id cache: "" = currentFolderId (root of current location)
    const folderIdCache = new Map<string, string | null>();
    folderIdCache.set("", currentFolderId ?? null);
    const existingFolderLookup = new Map<string, string | null>();

    const toLookupKey = (parentId: string | null, folderName: string) =>
      `${parentId ?? "root"}::${folderName}`;

    const findExistingFolderId = async (
      parentId: string | null,
      folderName: string
    ) => {
      const lookupKey = toLookupKey(parentId, folderName);
      if (existingFolderLookup.has(lookupKey)) {
        return existingFolderLookup.get(lookupKey)!;
      }

      const siblings = await listItems(accessToken, parentId);
      const existingFolder = siblings.find(
        (item) => item.type === "folder" && item.name === folderName
      );
      const existingId = existingFolder?.id ?? null;
      existingFolderLookup.set(lookupKey, existingId);
      return existingId;
    };

    const ensureFolder = async (segments: string[]): Promise<string | null> => {
      if (segments.length === 0) return currentFolderId ?? null;
      const key = segments.join("/");
      if (folderIdCache.has(key)) return folderIdCache.get(key)!;
      const parentId = await ensureFolder(segments.slice(0, -1));
      const folderName = segments[segments.length - 1];
      try {
        const created = await createFolder(accessToken, folderName, parentId);
        const id: string | null = created?.item?.id ?? created?.id ?? null;
        folderIdCache.set(key, id);
        existingFolderLookup.set(toLookupKey(parentId, folderName), id);
        return id;
      } catch (error: any) {
        const message = (error?.message ?? "").toLowerCase();
        const isDuplicate =
          message.includes("already exists") || message.includes("duplicate");
        if (!isDuplicate) {
          throw error;
        }

        const existingId = await findExistingFolderId(parentId, folderName);
        if (!existingId) {
          throw error;
        }
        folderIdCache.set(key, existingId);
        return existingId;
      }
    };

    let uploaded = 0;
    let failed = 0;
    try {
      for (const { relativePath, file } of entries) {
        const parts = relativePath.split("/").filter(Boolean);
        if (parts.length === 0) {
          failed++;
          continue;
        }
        const dirSegments = parts.slice(0, -1);
        try {
          const parentId = await ensureFolder(dirSegments);
          await createFile(accessToken, file, parentId);
          uploaded++;
        } catch {
          failed++;
        }
      }

      await refreshItems(currentFolderId);
    } finally {
      setIsBusy(false);
    }

    if (uploaded > 0) {
      showToast("success", "Folder uploaded", `${uploaded} file${uploaded === 1 ? "" : "s"} uploaded, folder structure preserved.`);
    }
    if (failed > 0) {
      showToast("error", "Some files failed", `${failed} file${failed === 1 ? "" : "s"} could not be uploaded.`);
    }
  };

  /**
   * Handle drag-and-drop of a folder onto the Files page.
   * Uses DataTransferItem.webkitGetAsEntry() — no browser security dialog.
   */
  const onDropFolder = async (e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.items);
    const entries = items
      .map((item) => item.webkitGetAsEntry?.())
      .filter(Boolean) as any[];

    const allFiles = (await Promise.all(entries.map(readEntryTree))).flat();
    if (allFiles.length > 0) await onUploadFolderTree(allFiles);
  };

  /**
   * Fallback: input[webkitdirectory] — Chrome shows a dialog, but we still
   * preserve the folder structure using webkitRelativePath.
   */
  const onFolderInputChange = async (files: FileList) => {
    const entries = Array.from(files).map((file) => ({
      relativePath: file.webkitRelativePath || file.name,
      file,
    }));
    await onUploadFolderTree(entries);
  };

  // ---- flat file upload confirmation (used by FilesPage) ----
  type PendingUpload = { kind: "files"; files: FileList };
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);

  const queueFileUploadConfirmation = (files: FileList) => {
    setPendingUpload({ kind: "files", files });
  };

  const onConfirmPendingUpload = async () => {
    if (!pendingUpload) return;
    const fileList = pendingUpload.files;
    setPendingUpload(null);
    await onUploadFiles(fileList);
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
        newUserLastName,
        newUserPhoneNumber
      );
      showToast("success", "User created", `${newUserEmail} has been created successfully.`);
      setShowCreateUser(false);
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserFirstName("");
      setNewUserLastName("");
      setNewUserPhoneNumber("");
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
      showToast("success", "Code sent", "Verification code sent to your registered contact method.");
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
  }, [tab, accessToken, isAdmin, dashboardRange]);

  useEffect(() => {
    if (!accessToken) return;
    void syncSessionProfile();

    const intervalId = window.setInterval(() => {
      void syncSessionProfile();
    }, PROFILE_SYNC_INTERVAL_MS);

    const onFocusOrVisible = () => {
      if (document.visibilityState === "hidden") return;
      void syncSessionProfile();
    };

    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [accessToken, syncSessionProfile]);

  useEffect(() => {
    if (!session || visibleTabs.includes(tab)) return;
    const fallbackTab = visibleTabs[0] ?? "Files";
    navigateToTab(fallbackTab);
  }, [session, tab, visibleTabs, navigateToTab]);

  // Sync tab when browser back/forward buttons are used
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const next = (e.state?.tab as Tab | undefined) ?? tabFromPath();
      setTab(next);
    };
    window.addEventListener("popstate", onPop);
    // Stamp the current entry so popstate fires correctly on first back
    window.history.replaceState({ tab }, "", TAB_TO_PATH[tab]);
    return () => window.removeEventListener("popstate", onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDashboardAuditPage(1);
    setUserRecentActivityPage(1);
  }, [dashboardRange, auditSearch, auditActionFilter]);

  useEffect(() => {
    setDashboardAuditPage(1);
  }, [dashboard?.recentAudit.length]);

  useEffect(() => {
    setUserRecentActivityPage(1);
  }, [userDashboard?.recentActivity.length]);

  useEffect(() => {
    setUsersPage(1);
  }, [users]);

  useEffect(() => {
    setAuditPage(1);
    setAuditExpandedRows(new Set());
  }, [auditLogs]);

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
              <div className="login-brand-text">Magnus</div>
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
              <div className="login-brand-text">Magnus</div>
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
              <div className="login-brand-text">Magnus</div>
            </div>
            <div className="login-step-indicator">
              <div className="login-step-dot" />
              <div className="login-step-dot" />
              <div className="login-step-dot active" />
            </div>
            <h1 className="login-title">Check your messages</h1>
            <p className="login-subtitle">We sent a 6-digit code to your registered contact method.</p>
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
          <span className="sidebar-brand-text">Magnus</span>
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
                  onClick={() => navigateToTab(t)}
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
              {session.user.roles
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
          <DashboardPage
            dashboardLoading={dashboardLoading}
            isAdmin={isAdmin}
            dashboard={dashboard}
            userDashboard={userDashboard}
            dashboardError={dashboardError}
            CalendarIcon={CalendarIcon}
            dashboardRange={dashboardRange}
            setDashboardRange={setDashboardRange}
            DASHBOARD_RANGE_OPTIONS={DASHBOARD_RANGE_OPTIONS}
            DASHBOARD_RANGE_LABELS={DASHBOARD_RANGE_LABELS}
            refreshDashboard={refreshDashboard}
            RefreshCwIcon={RefreshCwIcon}
            UsersIcon={UsersIcon}
            LayersIcon={LayersIcon}
            KeyIcon={KeyIcon}
            ShieldAlertIcon={ShieldAlertIcon}
            ShieldIcon={ShieldIcon}
            ActivityIcon={ActivityIcon}
            SearchIcon={SearchIcon}
            ChevronIcon={ChevronIcon}
            auditSearch={auditSearch}
            setAuditSearch={setAuditSearch}
            auditActionFilter={auditActionFilter}
            setAuditActionFilter={setAuditActionFilter}
            formatActionLabel={formatActionLabel}
            formatDate={formatDate}
            users={users}
            DEFAULT_PAGE_SIZE={DEFAULT_PAGE_SIZE}
            dashboardAuditPage={dashboardAuditPage}
            setDashboardAuditPage={setDashboardAuditPage}
            userRecentActivityPage={userRecentActivityPage}
            setUserRecentActivityPage={setUserRecentActivityPage}
            session={session}
          />
        )}

        {/* ---- USERS TAB ---- */}
        {tab === "Users" && (
          <UsersPage
            setShowCreateUser={setShowCreateUser}
            PlusIcon={PlusIcon}
            users={users}
            DEFAULT_PAGE_SIZE={DEFAULT_PAGE_SIZE}
            usersPage={usersPage}
            setUsersPage={setUsersPage}
            onSelectUser={onSelectUser}
            selectedUser={selectedUser}
            getInitials={getInitials}
            ShieldIcon={ShieldIcon}
            canControlSecurity={canControlSecurity}
            onForceLogoutUser={onForceLogoutUser}
            isBusy={isBusy}
            session={session}
            formatDate={formatDate}
            setSelectedUser={setSelectedUser}
            editUserFirstName={editUserFirstName}
            setEditUserFirstName={setEditUserFirstName}
            editUserLastName={editUserLastName}
            setEditUserLastName={setEditUserLastName}
            editUserEmail={editUserEmail}
            setEditUserEmail={setEditUserEmail}
            editUserPhoneNumber={editUserPhoneNumber}
            setEditUserPhoneNumber={setEditUserPhoneNumber}
            selectedRoleIds={selectedRoleIds}
            onRequestUserAccessRoleChange={onRequestUserAccessRoleChange}
            roles={roles}
            ChevronIcon={ChevronIcon}
            onResetPassword={onResetPassword}
            setDeleteUserId={setDeleteUserId}
            onDoneUserDetails={onDoneUserDetails}
            isUserProfileDirty={isUserProfileDirty}
            resetUserId={resetUserId}
            setResetUserId={setResetUserId}
            showResetPassword={showResetPassword}
            setShowResetPassword={setShowResetPassword}
            resetNewPassword={resetNewPassword}
            setResetNewPassword={setResetNewPassword}
            LockIcon={LockIcon}
            EyeOffIcon={EyeOffIcon}
            EyeIcon={EyeIcon}
            onConfirmResetPassword={onConfirmResetPassword}
            resetPasswordError={resetPasswordError}
            pendingRoleChange={pendingRoleChange}
            setPendingRoleChange={setPendingRoleChange}
            onConfirmUserAccessRoleChange={onConfirmUserAccessRoleChange}
            deleteUserId={deleteUserId}
            deleteUserTarget={deleteUserTarget}
            onConfirmRemoveUser={onConfirmRemoveUser}
          />
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
          <FilesPage
            viewerItem={viewerItem}
            closeViewer={closeViewer}
            ArrowLeftIcon={ArrowLeftIcon}
            onDownload={onDownload}
            DownloadIcon={DownloadIcon}
            viewerUrl={viewerUrl}
            canWrite={canWrite}
            onOpenEdit={onOpenEdit}
            EditIcon={EditIcon}
            canDelete={canDelete}
            setDeleteTarget={setDeleteTarget}
            TrashIcon={TrashIcon}
            viewerLoading={viewerLoading}
            viewerError={viewerError}
            isCurrentViewerPdf={isCurrentViewerPdf}
            setViewerPdfPage={setViewerPdfPage}
            selectedPdfPage={selectedPdfPage}
            viewerPdfPages={viewerPdfPages}
            pdfScalePercent={pdfScalePercent}
            pdfCanvasWrapRef={pdfCanvasWrapRef}
            pdfCanvasRef={pdfCanvasRef}
            pdfRendering={pdfRendering}
            pdfRenderError={pdfRenderError}
            viewerContentType={viewerContentType}
            formatBytes={formatBytes}
            formatDate={formatDate}
            users={users}
            viewerTextPreview={viewerTextPreview}
            viewerPreviewNote={viewerPreviewNote}
            canEmbedCurrentViewer={canEmbedCurrentViewer}
            path={path}
            goToRoot={goToRoot}
            HomeIcon={HomeIcon}
            goToBreadcrumb={goToBreadcrumb}
            ChevronIcon={ChevronIcon}
            setFolderName={setFolderName}
            setShowFolderModal={setShowFolderModal}
            isBusy={isBusy}
            PlusIcon={PlusIcon}
            UploadIcon={UploadIcon}
            queueFileUploadConfirmation={queueFileUploadConfirmation}
            FolderIcon={FolderIcon}
            onDropFolder={onDropFolder}
            onFolderInputChange={onFolderInputChange}
            KeyIcon={KeyIcon}
            items={items}
            openFolder={openFolder}
            onOpenFile={onOpenFile}
            FileIcon={FileIcon}
            EyeIcon={EyeIcon}
            showFolderModal={showFolderModal}
            folderName={folderName}
            onCreateFolder={onCreateFolder}
            pendingUpload={pendingUpload}
            setPendingUpload={setPendingUpload}
            onConfirmPendingUpload={onConfirmPendingUpload}
            deleteTarget={deleteTarget}
            onConfirmDelete={onConfirmDelete}
            editTarget={editTarget}
            setEditTarget={setEditTarget}
            editName={editName}
            setEditName={setEditName}
            onConfirmEdit={onConfirmEdit}
          />
        )}

        {/* ---- AUDIT LOGS TAB ---- */}
        {tab === "Audit Logs" && (
          <AuditLogsPage
            tab={tab}
            auditLogs={auditLogs}
            auditPage={auditPage}
            setAuditPage={setAuditPage}
            auditLoading={auditLoading}
            auditError={auditError}
            refreshAuditLogs={refreshAuditLogs}
            DEFAULT_PAGE_SIZE={DEFAULT_PAGE_SIZE}
            getAuditCategory={getAuditCategory}
            AUDIT_CATEGORY_STYLES={AUDIT_CATEGORY_STYLES}
            auditExpandedRows={auditExpandedRows}
            setAuditExpandedRows={setAuditExpandedRows}
            formatDate={formatDate}
            formatDateGroup={formatDateGroup}
            formatActionLabel={formatActionLabel}
            summarizeAuditMetadata={summarizeAuditMetadata}
            formatAuditMetadataValue={formatAuditMetadataValue}
            CalendarIcon={CalendarIcon}
            RefreshCwIcon={RefreshCwIcon}
            ChevronIcon={ChevronIcon}
            setTab={navigateToTab}
            setPath={setPath}
          />
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
                <input
                  className="modal-input"
                  type="tel"
                  placeholder="Mobile number"
                  value={newUserPhoneNumber}
                  onChange={(e) => setNewUserPhoneNumber(e.target.value)}
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
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!newUserEmail.trim() || !newUserPhoneNumber.trim() || Boolean(newUserPasswordError) || isBusy}>
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
