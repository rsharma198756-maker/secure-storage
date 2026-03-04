import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createFile, createFolder, createUser, deleteItem, downloadItem, forceLogoutUser, fetchDashboardSummary, fetchMyProfile, fetchUserDashboardSummary, listAuditLogs, listItems, listPermissions, listRolePermissions, listRoles, listUserRoles, listUsers, login, logout, refreshSession as refreshAuthSession, requestSecurityStepUp, removeUser, resetUserPassword, setUserRole, updateItemName, updateUserInfo, updateRolePermissions, verifySecurityStepUp, verifyOtp } from "./api";
import "./styles.css";
import DashboardPage from "./pages/DashboardPage";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import PermissionsPage from "./pages/PermissionsPage";
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
    strokeLinecap: "round",
    strokeLinejoin: "round",
};
const UsersIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), _jsx("circle", { cx: "9", cy: "7", r: "4" }), _jsx("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), _jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })] }));
const ShieldIcon = ({ size = 20, ...props }) => (_jsx("svg", { ...svgBase, width: size, height: size, ...props, children: _jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }) }));
const KeyIcon = ({ size = 20, ...props }) => (_jsx("svg", { ...svgBase, width: size, height: size, ...props, children: _jsx("path", { d: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" }) }));
const FolderIcon = ({ size = 20, ...props }) => (_jsx("svg", { ...svgBase, width: size, height: size, ...props, children: _jsx("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" }) }));
const FileIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), _jsx("polyline", { points: "14 2 14 8 20 8" })] }));
const UploadIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "17 8 12 3 7 8" }), _jsx("line", { x1: "12", y1: "3", x2: "12", y2: "15" })] }));
const DownloadIcon = ({ size = 16, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), _jsx("polyline", { points: "7 10 12 15 17 10" }), _jsx("line", { x1: "12", y1: "15", x2: "12", y2: "3" })] }));
const TrashIcon = ({ size = 16, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("polyline", { points: "3 6 5 6 21 6" }), _jsx("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })] }));
const EditIcon = ({ size = 16, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M12 20h9" }), _jsx("path", { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" })] }));
const PlusIcon = ({ size = 16, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), _jsx("line", { x1: "5", y1: "12", x2: "19", y2: "12" })] }));
const LogoutIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), _jsx("polyline", { points: "16 17 21 12 16 7" }), _jsx("line", { x1: "21", y1: "12", x2: "9", y2: "12" })] }));
const MailIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }), _jsx("polyline", { points: "22 6 12 13 2 6" })] }));
const LockIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }), _jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })] }));
const HomeIcon = ({ size = 14, ...props }) => (_jsx("svg", { ...svgBase, width: size, height: size, ...props, children: _jsx("path", { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" }) }));
const ArrowLeftIcon = ({ size = 16, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("line", { x1: "19", y1: "12", x2: "5", y2: "12" }), _jsx("polyline", { points: "12 19 5 12 12 5" })] }));
const ChevronIcon = ({ size = 12, ...props }) => (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", ...props, children: _jsx("polyline", { points: "9 18 15 12 9 6" }) }));
const VaultIcon = ({ size = 22, ...props }) => (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", ...props, children: [_jsx("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }), _jsx("circle", { cx: "12", cy: "12", r: "4" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "4" }), _jsx("line", { x1: "12", y1: "20", x2: "12", y2: "16" })] }));
const ActivityIcon = ({ size = 20, ...props }) => (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", ...props, children: _jsx("path", { d: "M22 12h-4l-3 9L9 3l-3 9H2" }) }));
const EyeIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), _jsx("circle", { cx: "12", cy: "12", r: "3" })] }));
const EyeOffIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }), _jsx("line", { x1: "1", y1: "1", x2: "23", y2: "23" })] }));
const RefreshCwIcon = ({ size = 16, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M21 2v6h-6" }), _jsx("path", { d: "M3 12a9 9 0 0 1 15-6.7L21 8" }), _jsx("path", { d: "M3 22v-6h6" }), _jsx("path", { d: "M21 12a9 9 0 0 1-15 6.7L3 16" })] }));
const LayersIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("polygon", { points: "12 2 2 7 12 12 22 7 12 2" }), _jsx("polyline", { points: "2 17 12 22 22 17" }), _jsx("polyline", { points: "2 12 12 17 22 12" })] }));
const ShieldAlertIcon = ({ size = 20, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }));
const SearchIcon = ({ size = 16, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("circle", { cx: "11", cy: "11", r: "8" }), _jsx("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })] }));
const FilterIcon = ({ size = 16, ...props }) => (_jsx("svg", { ...svgBase, width: size, height: size, ...props, children: _jsx("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }) }));
const CalendarIcon = ({ size = 14, ...props }) => (_jsxs("svg", { ...svgBase, width: size, height: size, ...props, children: [_jsx("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }), _jsx("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), _jsx("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), _jsx("line", { x1: "3", y1: "10", x2: "21", y2: "10" })] }));
/* =============================================
   Types
   ============================================= */
const ALL_TABS = ["Dashboard", "Users", "Roles", "Permissions", "Files", "Audit Logs"];
const SESSION_STORAGE_KEY = "magnus_session";
const LAST_EMAIL_STORAGE_KEY = "magnus_last_email";
const SAVED_EMAILS_STORAGE_KEY = "magnus_saved_emails";
const REMEMBER_ME_STORAGE_KEY = "magnus_remember";
const REFRESH_SKEW_MS = 30 * 1000;
const ACCESS_REFRESH_AHEAD_MS = 60 * 1000;
const PROFILE_SYNC_INTERVAL_MS = 10 * 1000;
const parseStoredSession = (raw) => {
    if (!raw)
        return null;
    try {
        const parsed = JSON.parse(raw);
        if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.refreshExpiresAt) {
            return null;
        }
        return parsed;
    }
    catch {
        return null;
    }
};
const normalizeStringList = (values) => Array.from(new Set(values?.filter((value) => typeof value === "string" && value.length > 0) ?? [])).sort();
const isSameStringList = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);
const formatDate = (value) => {
    const d = new Date(value);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
        d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};
const formatBytes = (bytes) => {
    if (typeof bytes !== "number" || Number.isNaN(bytes))
        return "Unknown";
    if (bytes === 0)
        return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const idx = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** idx;
    return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};
const isPdfFile = (item, contentType) => {
    const mime = (contentType ?? item.content_type ?? "").toLowerCase();
    return mime.includes("pdf") || item.name.toLowerCase().endsWith(".pdf");
};
const getFileExtension = (name) => {
    const idx = name.lastIndexOf(".");
    if (idx === -1)
        return "";
    return name.slice(idx + 1).toLowerCase();
};
const inferContentTypeFromName = (name) => {
    const ext = getFileExtension(name);
    const contentTypes = {
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
const resolveViewerContentType = (item, type) => {
    const value = (type ?? "").toLowerCase();
    if (value && value !== "application/octet-stream") {
        return value;
    }
    return inferContentTypeFromName(item.name) ?? value;
};
const isTextPreviewable = (item, contentType) => {
    const mime = (contentType ?? item.content_type ?? "").toLowerCase();
    const ext = getFileExtension(item.name);
    if (mime.startsWith("text/"))
        return true;
    if (mime.includes("json") || mime.includes("xml"))
        return true;
    return ["txt", "md", "csv", "json", "xml", "log", "ini", "yaml", "yml"].includes(ext);
};
const isDocxFile = (item, contentType) => {
    const mime = (contentType ?? item.content_type ?? "").toLowerCase();
    const ext = getFileExtension(item.name);
    return (mime.includes("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
        ext === "docx");
};
const isBrowserEmbeddable = (item, contentType) => {
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
const getJwtExpiryTime = (token) => {
    const parts = token.split(".");
    if (parts.length !== 3)
        return null;
    try {
        const payloadPart = parts[1];
        const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
        const padLength = (4 - (base64.length % 4)) % 4;
        const padded = `${base64}${"=".repeat(padLength)}`;
        const payload = JSON.parse(atob(padded));
        if (typeof payload.exp !== "number")
            return null;
        return payload.exp * 1000;
    }
    catch {
        return null;
    }
};
const getInitials = (user) => {
    if (user.firstName && user.lastName) {
        return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    const name = user.email.split("@")[0] ?? "";
    return name.slice(0, 2).toUpperCase();
};
const tabIcons = {
    Dashboard: VaultIcon,
    Users: UsersIcon,
    Roles: ShieldIcon,
    Permissions: KeyIcon,
    Files: FolderIcon,
    "Audit Logs": ActivityIcon
};
const tabDescriptions = {
    Dashboard: "High-level view of users, files, and security activity across your system.",
    Users: "Manage user accounts, assign roles, and control access permissions.",
    Roles: "View and manage the available roles in the system.",
    Permissions: "See which permissions are assigned to each role.",
    Files: "Browse, upload, and manage stored documents and folders.",
    "Audit Logs": "View a chronological log of all system activity."
};
const DASHBOARD_RANGE_OPTIONS = [
    { value: "7d", label: "Last 7 Days" },
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" }
];
const DASHBOARD_RANGE_LABELS = {
    "7d": "Last 7 Days",
    today: "Today",
    yesterday: "Yesterday"
};
const DEFAULT_PAGE_SIZE = 10;
const getTabsForRole = (_roles, permissions) => {
    const tabs = ["Dashboard"];
    const canAccessFiles = permissions.some((permission) => ["items:read", "items:write", "items:delete", "items:share"].includes(permission));
    if (permissions.includes("users:manage")) {
        tabs.push("Users");
    }
    if (permissions.includes("roles:manage")) {
        tabs.push("Roles", "Permissions");
    }
    if (canAccessFiles) {
        tabs.push("Files");
    }
    if (permissions.includes("audit:read")) {
        tabs.push("Audit Logs");
    }
    return tabs;
};
const TAB_TO_PATH = {
    Dashboard: "/dashboard",
    Users: "/users",
    Roles: "/roles",
    Permissions: "/permissions",
    Files: "/files",
    "Audit Logs": "/audit-logs"
};
const PATH_TO_TAB = Object.entries(TAB_TO_PATH).reduce((acc, [tab, path]) => {
    acc[path] = tab;
    return acc;
}, {});
const resolveTabFromPath = (pathname) => {
    const normalized = pathname.trim().toLowerCase().replace(/\/+$/, "") || "/";
    if (normalized === "/")
        return "Dashboard";
    return PATH_TO_TAB[normalized] ?? "Dashboard";
};
const normalizeEmail = (value) => value.trim().toLowerCase();
const formatActionLabel = (action) => action.replace(/\./g, " ").replace(/_/g, " ");
const formatAuditMetadataValue = (value) => {
    if (value === null || value === undefined)
        return "-";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return JSON.stringify(value);
};
const summarizeAuditMetadata = (metadata) => {
    if (!metadata)
        return "-";
    const entries = Object.entries(metadata);
    if (entries.length === 0)
        return "-";
    return entries
        .slice(0, 3)
        .map(([key, value]) => `${formatActionLabel(key)}: ${formatAuditMetadataValue(value)}`)
        .join(" | ");
};
const getAuditCategory = (action) => {
    const a = action.toLowerCase();
    if (a.includes("failed") || a.includes("delete") || a.includes("removed") || a.includes("banned") || a.includes("disabled"))
        return "danger";
    if (a.includes("login") || a.includes("logout") || a.includes("otp") || a.includes("auth") || a.includes("token") || a.includes("password"))
        return "auth";
    if (a.includes("upload") || a.includes("download") || a.includes("file") || a.includes("folder") || a.includes("item") || a.includes("storage"))
        return "file";
    if (a.includes("user") || a.includes("role") || a.includes("permission") || a.includes("admin"))
        return "admin";
    return "info";
};
const AUDIT_CATEGORY_STYLES = {
    danger: { bg: "var(--red-bg)", color: "var(--red)", border: "rgba(248,113,113,0.25)", label: "⚠ Danger" },
    auth: { bg: "rgba(251,191,36,0.12)", color: "var(--yellow)", border: "rgba(251,191,36,0.25)", label: "🔐 Auth" },
    file: { bg: "var(--blue-bg)", color: "var(--blue)", border: "rgba(96,165,250,0.25)", label: "📂 File" },
    admin: { bg: "var(--accent-light)", color: "var(--accent)", border: "rgba(129,140,248,0.25)", label: "🛡 Admin" },
    info: { bg: "var(--border)", color: "var(--ink-3)", border: "var(--border-hover)", label: "ℹ Info" },
};
const formatDateGroup = (isoString) => {
    const d = new Date(isoString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString())
        return "Today";
    if (d.toDateString() === yesterday.toDateString())
        return "Yesterday";
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
};
const permissionLabels = {
    "items:read": "View files and folders",
    "items:write": "Upload and edit files/folders",
    "items:delete": "Delete files and folders",
    "items:share": "Share files and manage access",
    "users:manage": "Manage users",
    "roles:manage": "Manage roles and permissions",
    "audit:read": "View audit logs"
};
const getPermissionDisplayLabel = (permission) => {
    if (permission.description && permission.description.trim()) {
        return permission.description.trim();
    }
    if (permissionLabels[permission.key]) {
        return permissionLabels[permission.key];
    }
    return permission.key;
};
const getPasswordValidationError = (password) => {
    if (!password || password.length < 8)
        return "Password must be at least 8 characters.";
    if (!/[A-Z]/.test(password))
        return "Password must include at least one uppercase letter.";
    if (!/[a-z]/.test(password))
        return "Password must include at least one lowercase letter.";
    if (!/[0-9]/.test(password))
        return "Password must include at least one number.";
    if (!/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?`~]/.test(password)) {
        return "Password must include at least one special character.";
    }
    return null;
};
const TOAST_ICONS = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    loading: `<svg class="p-toast-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8"/><line x1="12" y1="12" x2="12" y2="16"/></svg>`,
};
const toastEntries = [];
let toastIsHovered = false;
let toastContainerEl = null;
function getOrCreateToastContainer() {
    if (toastContainerEl)
        return toastContainerEl;
    const el = document.createElement("div");
    el.id = "premium-toaster";
    document.body.appendChild(el);
    el.addEventListener("mouseenter", () => {
        toastIsHovered = true;
        renderToasts();
        toastEntries.forEach(t => { if (t.timeoutId)
            clearTimeout(t.timeoutId); });
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
        }
        else {
            if (index > 2) {
                t.el.style.opacity = "0";
                t.el.style.pointerEvents = "none";
                t.el.style.transform = `translateY(0px) scale(0.8)`;
            }
            else {
                t.el.style.transform = `translateY(${index * -16}px) scale(${1 - index * 0.05})`;
                t.el.style.pointerEvents = index === 0 ? "auto" : "none";
                t.el.style.opacity = index === 0 ? "1" : index === 1 ? "0.6" : "0.3";
            }
        }
    });
}
function startToastTimer(entry, duration = 4500) {
    entry.timeoutId = setTimeout(() => dismissToastById(entry.id), duration);
}
function dismissToastById(id) {
    const idx = toastEntries.findIndex(t => t.id === id);
    if (idx === -1)
        return;
    const entry = toastEntries[idx];
    if (entry.timeoutId)
        clearTimeout(entry.timeoutId);
    entry.el.classList.add("p-toast-out");
    toastEntries.splice(idx, 1);
    renderToasts();
    setTimeout(() => entry.el.remove(), 400);
}
function pushToast(toast) {
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
    const entry = { ...toast, el, height: 0, timeoutId: null };
    toastEntries.unshift(entry);
    requestAnimationFrame(() => {
        entry.height = el.offsetHeight;
        renderToasts();
        startToastTimer(entry);
    });
}
// Dummy component — actual toasts are DOM-injected imperatively
function ToastContainer(_) {
    return null;
}
const CheckSmall = ({ size = 14, color = "currentColor" }) => (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }));
/* =============================================
   App Component
   ============================================= */
export default function App() {
    const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_STORAGE_KEY) ?? "");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [loginStep, setLoginStep] = useState(1);
    const [session, setSession] = useState(null);
    const [tab, setTab] = useState(() => resolveTabFromPath(window.location.pathname));
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [rolePermMap, setRolePermMap] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [editUserEmail, setEditUserEmail] = useState("");
    const [editUserFirstName, setEditUserFirstName] = useState("");
    const [editUserLastName, setEditUserLastName] = useState("");
    const [userRoles, setUserRoles] = useState([]);
    const [status, setStatus] = useState(null);
    const [items, setItems] = useState([]);
    const [path, setPath] = useState([]);
    const [isBusy, setIsBusy] = useState(false);
    const [toasts, setToasts] = useState([]);
    const toastId = useRef(0);
    const [showFolderModal, setShowFolderModal] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [pendingUpload, setPendingUpload] = useState(null);
    const [editName, setEditName] = useState("");
    const [viewerItem, setViewerItem] = useState(null);
    const [viewerUrl, setViewerUrl] = useState(null);
    const [viewerContentType, setViewerContentType] = useState("");
    const [viewerLoading, setViewerLoading] = useState(false);
    const [viewerError, setViewerError] = useState(null);
    const [viewerTextPreview, setViewerTextPreview] = useState(null);
    const [viewerPreviewNote, setViewerPreviewNote] = useState(null);
    const [viewerPdfPages, setViewerPdfPages] = useState(1);
    const [viewerPdfPage, setViewerPdfPage] = useState(1);
    const [pdfDocument, setPdfDocument] = useState(null);
    const [pdfRenderError, setPdfRenderError] = useState(null);
    const [pdfRendering, setPdfRendering] = useState(false);
    const [pdfScalePercent, setPdfScalePercent] = useState(100);
    const [pdfViewportWidth, setPdfViewportWidth] = useState(0);
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditFilterUserId, setAuditFilterUserId] = useState("");
    const [auditFilterAction, setAuditFilterAction] = useState("");
    const [auditFilterSearch, setAuditFilterSearch] = useState("");
    const [auditFilterDateFrom, setAuditFilterDateFrom] = useState("");
    const [auditFilterDateTo, setAuditFilterDateTo] = useState("");
    const [auditExpandedRows, setAuditExpandedRows] = useState(new Set());
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [userDashboard, setUserDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState(null);
    const [dashboardRange, setDashboardRange] = useState("7d");
    const [dashboardAuditPage, setDashboardAuditPage] = useState(1);
    const [userRecentActivityPage, setUserRecentActivityPage] = useState(1);
    const [auditSearch, setAuditSearch] = useState("");
    const [auditActionFilter, setAuditActionFilter] = useState("");
    const [usersPage, setUsersPage] = useState(1);
    const [auditPage, setAuditPage] = useState(1);
    const [securityActionToken, setSecurityActionToken] = useState(null);
    const [securityActionExpiresAt, setSecurityActionExpiresAt] = useState(null);
    const [showSecurityStepUpModal, setShowSecurityStepUpModal] = useState(false);
    const [stepUpPassword, setStepUpPassword] = useState("");
    const [stepUpOtp, setStepUpOtp] = useState("");
    const [stepUpOtpRequested, setStepUpOtpRequested] = useState(false);
    const [stepUpBusy, setStepUpBusy] = useState(false);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState("");
    const [newUserPassword, setNewUserPassword] = useState("");
    const [newUserRole, setNewUserRole] = useState("viewer");
    const [newUserFirstName, setNewUserFirstName] = useState("");
    const [newUserLastName, setNewUserLastName] = useState("");
    const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(REMEMBER_ME_STORAGE_KEY) !== "false");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
    const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const [showNewUserPassword, setShowNewUserPassword] = useState(false);
    const [resetUserId, setResetUserId] = useState(null);
    const [deleteUserId, setDeleteUserId] = useState(null);
    const [pendingRoleChange, setPendingRoleChange] = useState(null);
    const [resetNewPassword, setResetNewPassword] = useState("");
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [isSessionChecking, setIsSessionChecking] = useState(true);
    const [savedEmails, setSavedEmails] = useState(() => {
        try {
            const raw = localStorage.getItem(SAVED_EMAILS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        }
        catch {
            return [];
        }
    });
    const viewerUrlRef = useRef(null);
    const refreshInFlightRef = useRef(null);
    const profileSyncInFlightRef = useRef(null);
    const pdfCanvasRef = useRef(null);
    const pdfCanvasWrapRef = useRef(null);
    const pdfRenderTaskRef = useRef(null);
    const pdfDocumentRef = useRef(null);
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
            if (localRaw && !localSession)
                localStorage.removeItem(SESSION_STORAGE_KEY);
            if (tabRaw && !tabSession)
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
            const candidates = [];
            if (localSession)
                candidates.push(localSession);
            if (tabSession)
                candidates.push(tabSession);
            if (candidates.length === 0) {
                if (!cancelled)
                    setIsSessionChecking(false);
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
                if (!cancelled)
                    setIsSessionChecking(false);
                return;
            }
            try {
                const refreshed = await refreshAuthSession(chosen.refreshToken);
                if (cancelled)
                    return;
                setSession(refreshed);
                sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(refreshed));
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(refreshed));
            }
            catch {
                localStorage.removeItem(SESSION_STORAGE_KEY);
                sessionStorage.removeItem(SESSION_STORAGE_KEY);
            }
            finally {
                if (!cancelled)
                    setIsSessionChecking(false);
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
        if (!session)
            return;
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }, [session]);
    useEffect(() => {
        if (!securityActionExpiresAt)
            return;
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
        if (!element)
            return;
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
        let loadingTask = null;
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
        if (!isCurrentViewerPdf || !viewerUrl)
            return;
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
            if (disposed)
                return;
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
        if (!isCurrentViewerPdf || !pdfDocument || !pdfCanvasRef.current)
            return;
        if (selectedPdfPage < 1 || selectedPdfPage > viewerPdfPages)
            return;
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
                if (cancelled)
                    return;
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
                if (cancelled)
                    return;
                setPdfScalePercent(Math.round(scale * 100));
            }
            catch (error) {
                if (cancelled || error?.name === "RenderingCancelledException")
                    return;
                console.error(error);
                setPdfRenderError("Could not render this PDF page.");
            }
            finally {
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
    const canManageUsers = isAdmin || userPerms.includes("users:manage");
    const canManageRoles = isAdmin || userPerms.includes("roles:manage");
    const canControlSecurity = userPerms.includes("security:control");
    const canWrite = isAdmin || userPerms.includes("items:write");
    const canDelete = isAdmin || userPerms.includes("items:delete");
    const isSecurityTokenValid = Boolean(securityActionToken) &&
        typeof securityActionExpiresAt === "number" &&
        Date.now() < securityActionExpiresAt;
    const visibleTabs = useMemo(() => getTabsForRole(userRolesList, userPerms), [userRolesList, userPerms]);
    const navigateToTab = useCallback((nextTab, options) => {
        setTab(nextTab);
        const nextPath = TAB_TO_PATH[nextTab];
        if (window.location.pathname !== nextPath) {
            if (options?.replace) {
                window.history.replaceState({}, "", nextPath);
            }
            else {
                window.history.pushState({}, "", nextPath);
            }
        }
    }, []);
    useEffect(() => {
        const initialTab = resolveTabFromPath(window.location.pathname);
        setTab(initialTab);
        const onPopState = () => {
            setTab(resolveTabFromPath(window.location.pathname));
        };
        window.addEventListener("popstate", onPopState);
        return () => {
            window.removeEventListener("popstate", onPopState);
        };
    }, []);
    useEffect(() => {
        document.title = `Magnus — ${tab}`;
    }, [tab]);
    useEffect(() => {
        const expectedPath = TAB_TO_PATH[tab];
        if (window.location.pathname !== expectedPath) {
            window.history.replaceState({}, "", expectedPath);
        }
    }, [tab]);
    const auditActionOptions = useMemo(() => Array.from(new Set(auditLogs.map((log) => log.action))).sort(), [auditLogs]);
    const showToast = useCallback((type, title, message) => {
        const id = ++toastId.current;
        pushToast({ id, type, title, message });
        // Keep React state in sync so existing code referencing `toasts` doesn't break
        setToasts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    }, []);
    const dismissToast = useCallback((id) => {
        dismissToastById(id);
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);
    const accessToken = session?.accessToken;
    const refreshDashboard = async () => {
        if (!accessToken)
            return;
        setDashboardLoading(true);
        setDashboardError(null);
        try {
            if (isAdmin) {
                const data = await fetchDashboardSummary(accessToken, dashboardRange);
                setDashboard(data);
                setUserDashboard(null);
            }
            else {
                const data = await fetchUserDashboardSummary(accessToken, dashboardRange);
                setUserDashboard(data);
                setDashboard(null);
            }
        }
        catch (error) {
            setDashboardError(error?.message ?? "Failed to load dashboard metrics.");
        }
        finally {
            setDashboardLoading(false);
        }
    };
    const refreshData = async () => {
        if (!accessToken)
            return;
        try {
            const shouldLoadUsers = canManageUsers;
            const shouldLoadRoleData = canManageRoles;
            const [usersRes, rolesRes, permsRes, rolePermsRes, adminDashboardRes, userDashboardRes] = await Promise.all([
                shouldLoadUsers ? listUsers(accessToken) : Promise.resolve([]),
                shouldLoadRoleData ? listRoles(accessToken) : Promise.resolve([]),
                shouldLoadRoleData ? listPermissions(accessToken) : Promise.resolve([]),
                shouldLoadRoleData ? listRolePermissions(accessToken) : Promise.resolve([]),
                isAdmin ? fetchDashboardSummary(accessToken, dashboardRange) : Promise.resolve(null),
                isAdmin ? Promise.resolve(null) : fetchUserDashboardSummary(accessToken, dashboardRange)
            ]);
            setUsers(usersRes);
            setRoles(rolesRes);
            setPermissions(permsRes);
            setRolePermMap(rolePermsRes);
            setDashboard(adminDashboardRes);
            setUserDashboard(userDashboardRes);
            setDashboardError(null);
            setDashboardLoading(false);
        }
        catch (error) {
            setDashboardError(error?.message ?? "Failed to load dashboard metrics.");
            setDashboardLoading(false);
        }
    };
    const refreshItems = async (parentId) => {
        if (!accessToken)
            return;
        const data = await listItems(accessToken, parentId ?? null);
        setItems(data);
    };
    const completeSessionLogin = (data) => {
        const normalizedSession = {
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
        const userTabs = getTabsForRole(normalizedSession.user?.roles ?? [], normalizedSession.user?.permissions ?? []);
        navigateToTab(userTabs.includes("Dashboard") ? "Dashboard" : "Files", { replace: true });
    };
    const onLogin = async () => {
        if (isLoginSubmitting)
            return;
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
        }
        catch (err) {
            const msg = err?.message ?? "Please check your credentials.";
            setLoginError(msg);
            showToast("error", "Login failed", msg);
        }
        finally {
            setIsLoginSubmitting(false);
        }
    };
    const onVerifyOtp = async () => {
        if (isOtpSubmitting)
            return;
        setStatus(null);
        setIsOtpSubmitting(true);
        try {
            const data = await verifyOtp(email, otp);
            completeSessionLogin(data);
        }
        catch (err) {
            showToast("error", "Verification failed", err?.message ?? "Invalid OTP code. Please try again.");
        }
        finally {
            setIsOtpSubmitting(false);
        }
    };
    // Load data after session is set
    useEffect(() => {
        if (session?.accessToken) {
            refreshData();
            refreshItems(null);
        }
    }, [session?.accessToken, isAdmin, canManageUsers, canManageRoles]);
    const clearClientSession = useCallback(() => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        if (viewerUrl)
            URL.revokeObjectURL(viewerUrl);
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
            try {
                await logout(session.refreshToken);
            }
            catch (e) { }
        }
        clearClientSession();
    };
    const rotateAccessSession = useCallback(async (showExpiryToast = true) => {
        if (!session?.refreshToken)
            return false;
        if (refreshInFlightRef.current)
            return refreshInFlightRef.current;
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
    }, [session?.refreshToken, session?.refreshExpiresAt, clearClientSession, showToast]);
    const syncSessionProfile = useCallback(async () => {
        if (!accessToken)
            return;
        if (profileSyncInFlightRef.current)
            return profileSyncInFlightRef.current;
        const promise = (async () => {
            try {
                const profile = await fetchMyProfile(accessToken);
                setSession((prev) => {
                    if (!prev || prev.user.id !== profile.id)
                        return prev;
                    const prevRoles = normalizeStringList(prev.user.roles);
                    const prevPerms = normalizeStringList(prev.user.permissions);
                    const nextRoles = normalizeStringList(profile.roles);
                    const nextPerms = normalizeStringList(profile.permissions);
                    const changed = prev.user.email !== profile.email ||
                        prev.user.firstName !== profile.firstName ||
                        prev.user.lastName !== profile.lastName ||
                        !isSameStringList(prevRoles, nextRoles) ||
                        !isSameStringList(prevPerms, nextPerms);
                    if (!changed)
                        return prev;
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
            }
            catch {
                // Ignore transient profile-sync failures; next interval/focus retries.
            }
        })().finally(() => {
            profileSyncInFlightRef.current = null;
        });
        profileSyncInFlightRef.current = promise;
        return promise;
    }, [accessToken]);
    // Rotate access token before it expires.
    useEffect(() => {
        if (!session?.accessToken)
            return;
        const expiryMs = getJwtExpiryTime(session.accessToken);
        if (!expiryMs)
            return;
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
            if (document.visibilityState === "hidden" || !session?.accessToken)
                return;
            const expiryMs = getJwtExpiryTime(session.accessToken);
            if (!expiryMs)
                return;
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
        const onStorage = (event) => {
            if (event.key !== SESSION_STORAGE_KEY)
                return;
            if (!event.newValue) {
                clearClientSession();
                return;
            }
            const next = parseStoredSession(event.newValue);
            if (!next)
                return;
            setSession(next);
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, [clearClientSession]);
    const onSelectUser = async (user) => {
        if (!accessToken)
            return;
        setPendingRoleChange(null);
        setSelectedUser(user);
        setEditUserEmail(user.email);
        setEditUserFirstName(user.first_name ?? "");
        setEditUserLastName(user.last_name ?? "");
        const data = await listUserRoles(accessToken, user.id);
        setUserRoles(data);
    };
    const onSaveUserProfile = async () => {
        if (!accessToken || !selectedUser)
            return false;
        const emailValue = normalizeEmail(editUserEmail);
        const firstNameValue = editUserFirstName.trim();
        const lastNameValue = editUserLastName.trim();
        if (!emailValue) {
            showToast("error", "Invalid email", "Email is required.");
            return false;
        }
        const currentFirst = selectedUser.first_name ?? "";
        const currentLast = selectedUser.last_name ?? "";
        if (emailValue === selectedUser.email &&
            firstNameValue === currentFirst &&
            lastNameValue === currentLast) {
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
            setUsers((prev) => prev.map((u) => u.id === updated.id
                ? {
                    ...u,
                    email: updated.email,
                    first_name: updated.first_name ?? "",
                    last_name: updated.last_name ?? ""
                }
                : u));
            setSelectedUser((prev) => prev && prev.id === updated.id
                ? {
                    ...prev,
                    email: updated.email,
                    first_name: updated.first_name ?? "",
                    last_name: updated.last_name ?? ""
                }
                : prev);
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
            }
            showToast("success", "User updated", "User profile information has been saved.");
            return true;
        }
        catch (error) {
            showToast("error", "Update failed", error?.message ?? "Could not update user details.");
            return false;
        }
        finally {
            setIsBusy(false);
        }
    };
    const onRequestUserAccessRoleChange = (roleId) => {
        if (!selectedUser || isBusy)
            return;
        const roleName = roles.find((role) => role.id === roleId)?.name;
        if (!roleName || !["viewer", "editor"].includes(roleName))
            return;
        const currentRole = userRoles.find((role) => ["viewer", "editor"].includes(role.name));
        if (currentRole?.id === roleId)
            return;
        setPendingRoleChange({
            roleId,
            roleName,
            currentRoleName: currentRole?.name ?? null
        });
    };
    const onConfirmUserAccessRoleChange = async () => {
        if (!accessToken || !selectedUser || !pendingRoleChange || isBusy)
            return;
        setIsBusy(true);
        try {
            await setUserRole(accessToken, selectedUser.id, pendingRoleChange.roleId);
            setUsers((prev) => prev.map((user) => user.id === selectedUser.id
                ? { ...user, roles: [pendingRoleChange.roleName] }
                : user));
            await onSelectUser(selectedUser);
            showToast("success", "Role updated", `${pendingRoleChange.roleName} role assigned successfully.`);
            setPendingRoleChange(null);
        }
        catch (error) {
            showToast("error", "Role update failed", error?.message ?? "Could not change role.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const onToggleRolePermission = async (roleName, permissionKey) => {
        if (!accessToken || isBusy)
            return;
        const role = roles.find((entry) => entry.name === roleName);
        if (!role) {
            showToast("error", "Permission update failed", "Role not found.");
            return;
        }
        const currentKeys = (rolePermMap.find((entry) => entry.role_name === roleName)?.permissions ?? []).filter(Boolean);
        const nextKeySet = new Set(currentKeys);
        if (nextKeySet.has(permissionKey)) {
            nextKeySet.delete(permissionKey);
        }
        else {
            nextKeySet.add(permissionKey);
        }
        const permissionIdByKey = new Map(permissions.map((entry) => [entry.key, entry.id]));
        const nextKeys = Array.from(nextKeySet).sort();
        const nextPermissionIds = [];
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
                    return prev.map((entry) => entry.role_name === roleName
                        ? { ...entry, permissions: nextKeys }
                        : entry);
                }
                return [...prev, { role_name: roleName, permissions: nextKeys }];
            });
            showToast("success", "Permissions updated", `${roleName} role permissions updated.`);
        }
        catch (error) {
            showToast("error", "Permission update failed", error?.message ?? "Could not update role permissions.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const onConfirmRemoveUser = async () => {
        if (!accessToken || !deleteUserId)
            return;
        setIsBusy(true);
        try {
            const removedId = deleteUserId;
            const removed = users.find((u) => u.id === removedId);
            await removeUser(accessToken, deleteUserId);
            const serverUsers = (await listUsers(accessToken));
            const stillExists = serverUsers.some((u) => u.id === removedId || (!!removed?.email && u.email === removed.email));
            if (stillExists) {
                throw new Error("Delete verification failed. User still exists in the database.");
            }
            setUsers(serverUsers);
            setUserRoles([]);
            if (selectedUser?.id === removedId) {
                setSelectedUser(null);
            }
            setDeleteUserId(null);
            showToast("success", "User removed", `${removed?.email ?? "The user"} has been removed successfully.`);
        }
        catch (error) {
            showToast("error", "Remove failed", error?.message ?? "Could not remove user.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const isUserProfileDirty = useMemo(() => {
        if (!selectedUser)
            return false;
        const emailValue = normalizeEmail(editUserEmail);
        const firstNameValue = editUserFirstName.trim();
        const lastNameValue = editUserLastName.trim();
        return (emailValue !== selectedUser.email ||
            firstNameValue !== (selectedUser.first_name ?? "") ||
            lastNameValue !== (selectedUser.last_name ?? ""));
    }, [selectedUser, editUserEmail, editUserFirstName, editUserLastName]);
    const onDoneUserDetails = async () => {
        if (!selectedUser)
            return;
        if (!isUserProfileDirty) {
            setSelectedUser(null);
            return;
        }
        const saved = await onSaveUserProfile();
        if (saved) {
            setSelectedUser(null);
        }
    };
    const selectedRoleIds = useMemo(() => new Set(userRoles.map((role) => role.id)), [userRoles]);
    const deleteUserTarget = useMemo(() => {
        if (!deleteUserId)
            return null;
        return users.find((u) => u.id === deleteUserId) ?? (selectedUser?.id === deleteUserId ? selectedUser : null);
    }, [deleteUserId, selectedUser, users]);
    const currentFolderId = path.length ? path[path.length - 1].id : null;
    const openFolder = async (item) => {
        if (item.type !== "folder")
            return;
        const nextPath = [...path, { id: item.id, name: item.name }];
        setPath(nextPath);
        await refreshItems(item.id);
    };
    const goToRoot = async () => {
        setPath([]);
        await refreshItems(null);
    };
    const goToBreadcrumb = async (index) => {
        const nextPath = path.slice(0, index + 1);
        setPath(nextPath);
        const folderId = nextPath.length ? nextPath[nextPath.length - 1].id : null;
        await refreshItems(folderId);
    };
    const onCreateFolder = async () => {
        if (!accessToken || !folderName.trim())
            return;
        setIsBusy(true);
        try {
            await createFolder(accessToken, folderName.trim(), currentFolderId);
            await refreshItems(currentFolderId);
            setShowFolderModal(false);
            setFolderName("");
        }
        catch (error) {
            showToast("error", "Folder not created", error?.message ?? "Could not create folder.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const onUploadFiles = async (files) => {
        if (!accessToken)
            return;
        const selectedFiles = Array.from(files);
        if (selectedFiles.length === 0)
            return;
        setIsBusy(true);
        let uploadedCount = 0;
        const uploadedNames = [];
        let failedCount = 0;
        let firstError = null;
        try {
            for (const file of selectedFiles) {
                try {
                    await createFile(accessToken, file, currentFolderId);
                    uploadedCount += 1;
                    uploadedNames.push(file.name);
                }
                catch (error) {
                    failedCount += 1;
                    if (!firstError) {
                        firstError = error?.message ?? `Could not upload ${file.name}.`;
                    }
                }
            }
            await refreshItems(currentFolderId);
            if (uploadedCount > 0) {
                const title = uploadedCount === 1 ? "File uploaded" : "Files uploaded";
                const message = uploadedCount === 1
                    ? `${uploadedNames[0]} uploaded successfully.`
                    : `${uploadedCount} files uploaded successfully.`;
                showToast("success", title, message);
            }
            if (failedCount > 0) {
                showToast("error", failedCount === 1 ? "Upload failed" : "Some uploads failed", firstError ?? `${failedCount} files could not be uploaded.`);
            }
        }
        finally {
            setIsBusy(false);
        }
    };
    const queueFileUploadConfirmation = (files) => {
        const selectedFiles = Array.from(files);
        if (selectedFiles.length === 0)
            return;
        setPendingUpload({ kind: "files", files: selectedFiles });
    };
    const onUploadFolderFiles = async (files) => {
        if (!accessToken)
            return;
        const selectedFiles = Array.from(files);
        if (selectedFiles.length === 0)
            return;
        const folderIdByPath = new Map();
        folderIdByPath.set("", currentFolderId);
        const folderChildrenCache = new Map();
        const toCacheKey = (parentId) => parentId ?? "__root__";
        let createdFolders = 0;
        let uploadedCount = 0;
        let failedCount = 0;
        let firstError = null;
        let firstUploadedPath = null;
        const ensureFolderPath = async (segments) => {
            let parentId = currentFolderId;
            let currentPath = "";
            for (const segment of segments) {
                currentPath = currentPath ? `${currentPath}/${segment}` : segment;
                const cached = folderIdByPath.get(currentPath);
                if (cached !== undefined) {
                    parentId = cached;
                    continue;
                }
                const parentKey = toCacheKey(parentId);
                let knownFolders = folderChildrenCache.get(parentKey);
                if (!knownFolders) {
                    const siblings = await listItems(accessToken, parentId);
                    knownFolders = new Map(siblings
                        .filter((item) => item.type === "folder")
                        .map((item) => [item.name, item.id]));
                    folderChildrenCache.set(parentKey, knownFolders);
                }
                let folderId = knownFolders.get(segment) ?? null;
                if (!folderId) {
                    const created = (await createFolder(accessToken, segment, parentId));
                    folderId = created.id;
                    knownFolders.set(segment, folderId);
                    createdFolders += 1;
                }
                folderIdByPath.set(currentPath, folderId);
                parentId = folderId;
            }
            return parentId;
        };
        setIsBusy(true);
        try {
            for (const rawFile of selectedFiles) {
                const file = rawFile;
                const rawRelativePath = file.webkitRelativePath && file.webkitRelativePath.trim().length > 0
                    ? file.webkitRelativePath
                    : file.name;
                const pathSegments = rawRelativePath
                    .replace(/\\/g, "/")
                    .split("/")
                    .map((segment) => segment.trim())
                    .filter((segment) => segment.length > 0 && segment !== ".");
                if (pathSegments.length === 0)
                    continue;
                const fileName = pathSegments[pathSegments.length - 1];
                const folderSegments = pathSegments.slice(0, -1);
                if (!fileName)
                    continue;
                try {
                    const parentId = await ensureFolderPath(folderSegments);
                    await createFile(accessToken, file, parentId);
                    uploadedCount += 1;
                    if (!firstUploadedPath) {
                        firstUploadedPath = rawRelativePath;
                    }
                }
                catch (error) {
                    failedCount += 1;
                    if (!firstError) {
                        firstError = error?.message ?? `Could not upload ${rawRelativePath}.`;
                    }
                }
            }
            await refreshItems(currentFolderId);
            if (uploadedCount > 0) {
                const folderLabel = createdFolders > 0
                    ? `${createdFolders} folder${createdFolders === 1 ? "" : "s"} and `
                    : "";
                const message = uploadedCount === 1
                    ? `${firstUploadedPath ?? "File"} uploaded successfully.`
                    : `${folderLabel}${uploadedCount} files uploaded successfully.`;
                showToast("success", "Folder uploaded", message);
            }
            if (failedCount > 0) {
                showToast("error", failedCount === 1 ? "Upload failed" : "Some uploads failed", firstError ?? `${failedCount} files could not be uploaded.`);
            }
        }
        finally {
            setIsBusy(false);
        }
    };
    const queueFolderUploadConfirmation = (files) => {
        const selectedFiles = Array.from(files);
        if (selectedFiles.length === 0)
            return;
        const firstWithRelativePath = selectedFiles.find((entry) => typeof entry.webkitRelativePath === "string" &&
            entry.webkitRelativePath.length > 0);
        const folderName = firstWithRelativePath?.webkitRelativePath
            ?.replace(/\\/g, "/")
            .split("/")
            .map((segment) => segment.trim())
            .filter(Boolean)[0] ?? "Selected Folder";
        setPendingUpload({ kind: "folder", files: selectedFiles, folderName });
    };
    const onConfirmPendingUpload = async () => {
        if (!pendingUpload || isBusy)
            return;
        const upload = pendingUpload;
        setPendingUpload(null);
        if (upload.kind === "folder") {
            await onUploadFolderFiles(upload.files);
            return;
        }
        await onUploadFiles(upload.files);
    };
    const onConfirmDelete = async () => {
        if (!accessToken || !deleteTarget)
            return;
        setIsBusy(true);
        try {
            await deleteItem(accessToken, deleteTarget.id);
            await refreshItems(currentFolderId);
            if (viewerItem?.id === deleteTarget.id) {
                closeViewer();
            }
            showToast("success", "Deleted", `${deleteTarget.name} was deleted.`);
            setDeleteTarget(null);
        }
        catch (error) {
            showToast("error", "Delete failed", error?.message ?? "Could not delete item.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const triggerBlobDownload = (blob, filename) => {
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
        if (viewerUrl)
            URL.revokeObjectURL(viewerUrl);
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
    const onOpenFile = async (item) => {
        if (!accessToken || item.type !== "file")
            return;
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
            if (viewerUrl)
                URL.revokeObjectURL(viewerUrl);
            const resolvedType = resolveViewerContentType(item, result.contentType || item.content_type || "");
            const previewBlob = resolvedType && result.blob.type !== resolvedType
                ? new Blob([result.blob], { type: resolvedType })
                : result.blob;
            const nextUrl = URL.createObjectURL(previewBlob);
            setViewerUrl(nextUrl);
            setViewerContentType(resolvedType);
            if (isPdfFile(item, resolvedType)) {
                setViewerPdfPages(1);
                setViewerPdfPage(1);
            }
            else if (isDocxFile(item, resolvedType)) {
                setViewerPreviewNote("DOC/DOCX files are available for download. Browser preview support depends on installed plugins.");
                setViewerPdfPages(1);
                setViewerPdfPage(1);
            }
            else if (isTextPreviewable(item, resolvedType)) {
                const text = await previewBlob.text();
                setViewerTextPreview(text.slice(0, 800000));
                setViewerPreviewNote(text.length > 800000 ? "Showing first 800,000 characters." : null);
                setViewerPdfPages(1);
                setViewerPdfPage(1);
            }
            else {
                setViewerPreviewNote("Preview is shown when supported by your browser. You can always download the file.");
                setViewerPdfPages(1);
                setViewerPdfPage(1);
            }
        }
        catch (error) {
            setViewerError(error?.message ?? "Could not open file.");
            setViewerUrl(null);
        }
        finally {
            setViewerLoading(false);
        }
    };
    const onDownload = async (item) => {
        if (!accessToken)
            return;
        setIsBusy(true);
        try {
            const result = await downloadItem(accessToken, item.id, {
                disposition: "attachment",
                fallbackName: item.type === "folder" ? `${item.name}.zip` : item.name
            });
            triggerBlobDownload(result.blob, result.filename);
            showToast("success", "Download ready", `${result.filename} downloaded.`);
        }
        catch (error) {
            showToast("error", "Download failed", error?.message ?? "Could not download item.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const onOpenEdit = (item) => {
        setEditTarget(item);
        setEditName(item.name);
    };
    const onConfirmEdit = async () => {
        if (!accessToken || !editTarget || !editName.trim())
            return;
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
        }
        catch (error) {
            showToast("error", "Update failed", error?.message ?? "Could not update name.");
        }
        finally {
            setIsBusy(false);
        }
    };
    const onCreateUserSubmit = async () => {
        if (!accessToken)
            return;
        if (newUserPasswordError) {
            showToast("error", "Invalid password", newUserPasswordError);
            return;
        }
        setIsBusy(true);
        try {
            const created = await createUser(accessToken, newUserEmail, newUserPassword, newUserRole, newUserFirstName, newUserLastName);
            const createdEmail = created?.email ?? newUserEmail;
            if (created?.reused) {
                showToast("success", "User reactivated", `${createdEmail} was restored and is active again.`);
            }
            else {
                showToast("success", "User created", `${createdEmail} has been created successfully.`);
            }
            setShowCreateUser(false);
            setNewUserEmail("");
            setNewUserPassword("");
            setNewUserFirstName("");
            setNewUserLastName("");
            refreshData();
        }
        catch (err) {
            showToast("error", "Failed to create user", err.message);
        }
        finally {
            setIsBusy(false);
        }
    };
    const onResetPassword = (userId) => {
        setResetUserId(userId);
        setResetNewPassword("");
        setShowResetPassword(false);
    };
    const onConfirmResetPassword = async () => {
        if (!accessToken || !resetUserId)
            return;
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
        }
        catch (err) {
            showToast("error", "Reset failed", err?.message ?? "Could not reset password.");
        }
        finally {
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
        if (!accessToken || stepUpBusy)
            return;
        if (!stepUpPassword) {
            showToast("error", "Password required", "Enter your current password to continue.");
            return;
        }
        setStepUpBusy(true);
        try {
            await requestSecurityStepUp(accessToken, stepUpPassword);
            setStepUpOtpRequested(true);
            showToast("success", "Code sent", "Verification code sent to your email.");
        }
        catch (error) {
            showToast("error", "Verification failed", error?.message ?? "Could not request verification code.");
        }
        finally {
            setStepUpBusy(false);
        }
    };
    const onVerifySecurityStepUpOtp = async () => {
        if (!accessToken || stepUpBusy)
            return;
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
        }
        catch (error) {
            showToast("error", "Verification failed", error?.message ?? "Could not verify OTP.");
        }
        finally {
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
    const onForceLogoutUser = async (user) => {
        if (!accessToken)
            return;
        if (session?.user?.id === user.id) {
            showToast("error", "Action blocked", "Use 'Logout everyone' if you need to clear all sessions.");
            return;
        }
        const token = getSecurityTokenOrPrompt();
        if (!token)
            return;
        setIsBusy(true);
        try {
            await forceLogoutUser(accessToken, token, user.id, "Admin initiated targeted logout.");
            showToast("success", "User logged out", `${user.email} has been logged out from all active sessions.`);
        }
        catch (error) {
            showToast("error", "Logout failed", error?.message ?? "Could not logout user.");
            if ((error?.message ?? "").toLowerCase().includes("verification")) {
                setSecurityActionToken(null);
                setSecurityActionExpiresAt(null);
            }
        }
        finally {
            setIsBusy(false);
        }
    };
    const refreshAuditLogs = async (filters) => {
        if (!accessToken)
            return;
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
        }
        catch (error) {
            setAuditLogs([]);
            setAuditError(error?.message ?? "Failed to load audit logs.");
        }
        finally {
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
        if (!accessToken)
            return;
        void syncSessionProfile();
        const intervalId = window.setInterval(() => {
            void syncSessionProfile();
        }, PROFILE_SYNC_INTERVAL_MS);
        const onFocusOrVisible = () => {
            if (document.visibilityState === "hidden")
                return;
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
        if (!session || visibleTabs.includes(tab))
            return;
        const fallbackTab = visibleTabs.includes("Dashboard")
            ? "Dashboard"
            : visibleTabs[0] ?? "Files";
        navigateToTab(fallbackTab, { replace: true });
    }, [session, tab, visibleTabs, navigateToTab]);
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
        return (_jsx("div", { style: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }, children: _jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }, children: [_jsx(VaultIcon, { size: 48, color: "var(--accent)" }), _jsx("div", { style: { width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" } }), _jsx("style", { children: `@keyframes spin { to { transform: rotate(360deg); } }` })] }) }));
    }
    /* ---- LOGIN PAGE ---- */
    if (!session) {
        return (_jsxs("div", { className: "login-page", children: [_jsx(ToastContainer, { toasts: toasts, onDismiss: dismissToast }), loginStep === 1 && (_jsxs("div", { className: "login-card", children: [_jsxs("div", { className: "login-brand", children: [_jsx("div", { className: "login-brand-icon", children: _jsx(VaultIcon, { size: 24 }) }), _jsx("div", { className: "login-brand-text", children: "Magnus" })] }), _jsxs("div", { className: "login-step-indicator", children: [_jsx("div", { className: "login-step-dot active" }), _jsx("div", { className: "login-step-dot" }), _jsx("div", { className: "login-step-dot" })] }), _jsx("h1", { className: "login-title", children: "Welcome back" }), _jsx("p", { className: "login-subtitle", children: "Enter your email address to continue." }), _jsxs("form", { className: "login-form", autoComplete: "on", onSubmit: (e) => { e.preventDefault(); if (email.trim())
                                setLoginStep(2); }, children: [_jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-icon", children: _jsx(MailIcon, {}) }), _jsx("input", { type: "email", name: "email", autoComplete: "email", list: "remembered-emails", placeholder: "Enter your email", value: email, onChange: (e) => setEmail(e.target.value), required: true, autoFocus: true }), _jsx("datalist", { id: "remembered-emails", children: savedEmails.map((savedEmail) => (_jsx("option", { value: savedEmail }, savedEmail))) })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, margin: "16px 0", cursor: "pointer", width: "fit-content" }, onClick: () => setRememberMe(!rememberMe), children: [_jsx("div", { style: {
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
                                            }, children: rememberMe && _jsx(CheckSmall, { size: 14, color: "white" }) }), _jsx("span", { style: { fontSize: 13, color: "var(--ink-3)", fontWeight: 500, userSelect: "none" }, children: "Remember me" })] }), _jsx("button", { className: "btn btn-primary", type: "submit", children: "Continue" })] })] }, "step-email")), loginStep === 2 && (_jsxs("div", { className: "login-card", children: [_jsxs("div", { className: "login-brand", children: [_jsx("div", { className: "login-brand-icon", children: _jsx(VaultIcon, { size: 24 }) }), _jsx("div", { className: "login-brand-text", children: "Magnus" })] }), _jsxs("div", { className: "login-step-indicator", children: [_jsx("div", { className: "login-step-dot" }), _jsx("div", { className: "login-step-dot active" }), _jsx("div", { className: "login-step-dot" })] }), _jsx("h1", { className: "login-title", children: "Enter your password" }), _jsxs("p", { className: "login-subtitle", children: ["Signing in as ", _jsx("strong", { children: email })] }), _jsxs("form", { className: "login-form", autoComplete: "on", onSubmit: (e) => { e.preventDefault(); onLogin(); }, children: [_jsx("input", { type: "email", name: "username", autoComplete: "username", value: email, readOnly: true, style: { display: "none" } }), _jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-icon", children: _jsx(LockIcon, {}) }), _jsx("input", { type: showPassword ? "text" : "password", name: "password", autoComplete: "current-password", placeholder: "Enter your password", value: password, onChange: (e) => setPassword(e.target.value), disabled: isLoginSubmitting, required: true, autoFocus: true }), _jsx("button", { type: "button", className: "input-action-btn", onClick: () => setShowPassword(!showPassword), disabled: isLoginSubmitting, children: showPassword ? _jsx(EyeOffIcon, { size: 18 }) : _jsx(EyeIcon, { size: 18 }) })] }), loginError && (_jsxs("div", { style: {
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
                                    }, children: [_jsx("span", { children: "\u26A0" }), " ", loginError] })), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: isLoginSubmitting, children: isLoginSubmitting ? "Signing in..." : "Continue" })] }), _jsx("div", { className: "login-footer", children: _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => { setLoginStep(1); setPassword(""); setLoginError(null); }, disabled: isLoginSubmitting, style: { width: "100%", marginTop: 8 }, children: "\u2190 Use a different email" }) })] }, "step-password")), loginStep === 3 && (_jsxs("div", { className: "login-card", children: [_jsxs("div", { className: "login-brand", children: [_jsx("div", { className: "login-brand-icon", children: _jsx(VaultIcon, { size: 24 }) }), _jsx("div", { className: "login-brand-text", children: "Magnus" })] }), _jsxs("div", { className: "login-step-indicator", children: [_jsx("div", { className: "login-step-dot" }), _jsx("div", { className: "login-step-dot" }), _jsx("div", { className: "login-step-dot active" })] }), _jsx("h1", { className: "login-title", children: "Check your email" }), _jsxs("p", { className: "login-subtitle", children: ["We sent a 6-digit code to ", _jsx("strong", { children: email })] }), _jsxs("form", { className: "login-form", onSubmit: (e) => { e.preventDefault(); onVerifyOtp(); }, children: [_jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-icon", children: _jsx(LockIcon, {}) }), _jsx("input", { type: "text", placeholder: "Enter 6-digit OTP", value: otp, onChange: (e) => setOtp(e.target.value), disabled: isOtpSubmitting, required: true, maxLength: 6, autoFocus: true })] }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: isOtpSubmitting, children: isOtpSubmitting ? "Verifying..." : "Verify & Sign In" })] }), _jsx("div", { className: "login-footer", children: _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => { setLoginStep(1); setOtp(""); setPassword(""); setStatus(null); }, disabled: isOtpSubmitting, style: { width: "100%", marginTop: 8 }, children: "\u2190 Start over" }) }), status && _jsx("p", { className: "login-status", style: { marginTop: 12 }, children: status })] }, "step-otp"))] }));
    }
    /* ---- MAIN DASHBOARD ---- */
    return (_jsxs("div", { className: "app", children: [_jsx(ToastContainer, { toasts: toasts, onDismiss: dismissToast }), _jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "sidebar-brand", children: [_jsx("div", { className: "sidebar-brand-icon", children: _jsx(VaultIcon, { size: 22 }) }), _jsx("span", { className: "sidebar-brand-text", children: "Magnus" })] }), _jsxs("div", { className: "sidebar-section", children: [_jsx("div", { className: "sidebar-label", children: "Main menu" }), _jsx("nav", { className: "sidebar-nav", children: visibleTabs.map((t) => {
                                    const Icon = tabIcons[t];
                                    return (_jsxs("button", { className: `sidebar-nav-item ${tab === t ? "active" : ""}`, onClick: () => navigateToTab(t), children: [_jsx("span", { className: "nav-icon", children: _jsx(Icon, {}) }), t] }, t));
                                }) })] }), _jsx("div", { className: "sidebar-spacer" }), _jsxs("div", { className: "sidebar-profile", children: [_jsx("div", { className: "sidebar-avatar", children: getInitials({ firstName: session.user.firstName, lastName: session.user.lastName, email: session.user.email }) }), _jsxs("div", { className: "sidebar-profile-info", children: [_jsx("div", { className: "sidebar-profile-name", children: session.user.firstName ? `${session.user.firstName} ${session.user.lastName}` : session.user.email.split('@')[0] }), _jsx("div", { className: "sidebar-profile-role", style: { textTransform: "capitalize" }, children: session.user.roles.includes("super_admin")
                                            ? "Super Admin"
                                            : session.user.roles
                                                .filter(r => r !== "super_admin")
                                                .map(r => r.replace(/_/g, " "))
                                                .join(", ") })] }), _jsx("button", { className: "btn-logout", onClick: onLogout, title: "Sign out", style: { marginLeft: "auto", background: "none", border: "none", padding: 8, cursor: "pointer", color: "var(--ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(LogoutIcon, {}) })] })] }), _jsxs("main", { className: "content", children: [_jsxs("div", { style: {
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: tab === "Dashboard" ? 0 : 24,
                            gap: 12,
                            flexWrap: "wrap"
                        }, children: [tab !== "Dashboard" ? (_jsxs("div", { className: "page-header", style: { margin: 0 }, children: [_jsx("h1", { className: "page-title", children: tab }), _jsx("p", { className: "page-subtitle", children: tabDescriptions[tab] })] })) : (_jsx("div", {}) /* Dashboard has its own header inside */), isAdmin && (_jsxs("div", { style: {
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
                                }, children: [_jsx(ShieldIcon, { size: 13 }), "Admin"] }))] }), tab === "Dashboard" && (_jsx(DashboardPage, { children: _jsx("div", { style: { display: "flex", flexDirection: "column" }, children: dashboardLoading && !(isAdmin ? dashboard : userDashboard) ? (_jsx("div", { className: "panel", style: { textAlign: "center", padding: "56px 0", color: "var(--ink-3)" }, children: "Loading dashboard metrics..." })) : dashboardError && !(isAdmin ? dashboard : userDashboard) ? (_jsx("div", { className: "panel", style: { textAlign: "center", padding: "56px 0", color: "var(--red)" }, children: dashboardError })) : isAdmin && dashboard ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-v2-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "Security Overview" }), _jsx("p", { children: "High-level view of users, files, and system activity." })] }), _jsxs("div", { className: "time-range-picker", children: [_jsx(CalendarIcon, {}), _jsx("select", { value: dashboardRange, onChange: (event) => setDashboardRange(event.target.value), style: {
                                                            background: "transparent",
                                                            border: "none",
                                                            color: "var(--ink-2)",
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            outline: "none",
                                                            cursor: "pointer"
                                                        }, children: DASHBOARD_RANGE_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), _jsx("button", { className: "btn-ghost", style: { padding: "2px 6px" }, onClick: () => void refreshDashboard(), title: "Refresh dashboard", children: _jsx(RefreshCwIcon, { size: 14 }) })] })] }), _jsxs("section", { className: "metrics-v2-grid", children: [_jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.1s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Total Users" }), _jsx(UsersIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: dashboard.users.total.toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { className: "text-green", children: [dashboard.users.active, " Active"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-4)" }, children: [dashboard.users.disabled, " Disabled"] })] })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.15s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Active Items" }), _jsx(LayersIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: dashboard.items.total_active.toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.items.files, " Files"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.items.folders, " Folders"] })] })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.2s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Role / Permission Sets" }), _jsx(KeyIcon, { size: 16, className: "m-v2-icon" })] }), _jsxs("div", { className: "m-v2-value", children: [dashboard.roles.total, _jsx("span", { style: { color: "var(--ink-4)", fontWeight: 400, margin: "0 4px" }, children: "/" }), dashboard.permissions.total] }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.shares.total, " Grants"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.items.deleted, " Deleted"] })] })] }), _jsxs("div", { className: "metric-v2-card bg-alert-subtle", style: { border: "1px solid rgba(248, 113, 113, 0.2)", transitionDelay: "0.25s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title text-alert", children: "Auth Security (24H)" }), _jsx(ShieldAlertIcon, { size: 16, className: "m-v2-icon text-alert" })] }), _jsx("div", { className: "m-v2-value text-alert", children: dashboard.activityLast24h.login_failed }), _jsxs("div", { className: "m-v2-footer", children: [_jsx("span", { className: "badge badge-disabled", style: { padding: "2px 6px", fontSize: 11 }, children: "Failed Logins" }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.activityLast24h.logins, " total"] })] })] })] }), _jsxs("div", { className: "panel-v2 table-panel-v2", children: [_jsxs("div", { className: "panel-v2-header", children: [_jsxs("h2", { children: ["Recent Security Activity (", DASHBOARD_RANGE_LABELS[dashboardRange], ")"] }), _jsxs("div", { style: { display: "flex", gap: 12, alignItems: "center" }, children: [_jsxs("div", { className: "shad-input-wrapper", style: { width: 240 }, children: [_jsx("div", { className: "shad-search-icon", children: _jsx(SearchIcon, { size: 16 }) }), _jsx("input", { type: "text", placeholder: "Search by name or email...", value: auditSearch, onChange: e => setAuditSearch(e.target.value), className: "shad-input shad-input-search" })] }), _jsxs("div", { className: "shad-select-wrapper", style: { width: 160 }, children: [_jsxs("select", { value: auditActionFilter, onChange: e => setAuditActionFilter(e.target.value), className: "shad-select", children: [_jsx("option", { value: "", children: "All actions" }), [...new Set(dashboard.recentAudit.map(l => l.action))].sort().map(action => (_jsx("option", { value: action, children: formatActionLabel(action) }, action)))] }), _jsx("div", { className: "shad-select-caret", children: _jsx(ChevronIcon, { size: 14 }) })] }), (auditSearch || auditActionFilter) && (_jsx("button", { className: "shad-btn-ghost", onClick: () => { setAuditSearch(""); setAuditActionFilter(""); }, children: "Clear" }))] })] }), (() => {
                                                const q = auditSearch.toLowerCase();
                                                const filtered = dashboard.recentAudit.filter(log => {
                                                    const matchesAction = !auditActionFilter || log.action === auditActionFilter;
                                                    const actorUser = log.actor_email ? users.find(u => u.email === log.actor_email) : null;
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
                                                if (filtered.length === 0)
                                                    return (_jsx("div", { style: { color: "var(--ink-4)", fontSize: 14, padding: "40px 0", textAlign: "center" }, children: dashboard.recentAudit.length === 0 ? "No security entries yet." : "No results match your filters." }));
                                                return (_jsxs(_Fragment, { children: [_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Time" }), _jsx("th", { children: "Action" }), _jsx("th", { children: "Actor" }), _jsx("th", { children: "Target" })] }) }), _jsx("tbody", { children: pagedLogs.map((log) => {
                                                                        const isAlert = log.action.includes("failed") || log.action.includes("delete");
                                                                        const actorUser = log.actor_email ? users.find(u => u.email === log.actor_email) : null;
                                                                        const actorName = actorUser?.first_name
                                                                            ? `${actorUser.first_name} ${actorUser.last_name ?? ""}`.trim()
                                                                            : log.actor_email
                                                                                ? log.actor_email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                                                                                : "System";
                                                                        return (_jsxs("tr", { className: isAlert ? "row-danger" : "", children: [_jsx("td", { className: "cell-muted", style: { fontSize: 12 }, children: formatDate(log.created_at) }), _jsx("td", { children: _jsx("span", { className: `pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`, children: formatActionLabel(log.action) }) }), _jsx("td", { className: "t-main", style: { fontWeight: 600 }, children: actorName }), _jsx("td", { className: "cell-muted", style: { fontSize: 13 }, children: log.target_type
                                                                                        ? _jsx("span", { style: { textTransform: "capitalize" }, children: log.target_type })
                                                                                        : "—" })] }, log.id));
                                                                    }) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0 0", flexWrap: "wrap" }, children: [_jsxs("span", { style: { fontSize: 12, color: "var(--ink-4)" }, children: ["Showing ", startIndex + 1, "-", Math.min(startIndex + DEFAULT_PAGE_SIZE, filtered.length), " of ", filtered.length] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setDashboardAuditPage((prev) => Math.max(1, prev - 1)), disabled: currentPage <= 1, children: "Previous" }), _jsxs("span", { style: { fontSize: 12, color: "var(--ink-3)" }, children: ["Page ", currentPage, " of ", totalPages] }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setDashboardAuditPage((prev) => Math.min(totalPages, prev + 1)), disabled: currentPage >= totalPages, children: "Next" })] })] })] }));
                                            })()] })] })) : !isAdmin && userDashboard ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-v2-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "My Dashboard" }), _jsx("p", { children: "Live usage and activity for your account." })] }), _jsxs("div", { className: "time-range-picker", children: [_jsx(CalendarIcon, {}), _jsx("select", { value: dashboardRange, onChange: (event) => setDashboardRange(event.target.value), style: {
                                                            background: "transparent",
                                                            border: "none",
                                                            color: "var(--ink-2)",
                                                            fontSize: 13,
                                                            fontWeight: 600,
                                                            outline: "none",
                                                            cursor: "pointer"
                                                        }, children: DASHBOARD_RANGE_OPTIONS.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }), _jsx("button", { className: "btn-ghost", style: { padding: "2px 6px" }, onClick: () => void refreshDashboard(), title: "Refresh dashboard", children: _jsx(RefreshCwIcon, { size: 14 }) })] })] }), _jsxs("section", { className: "metrics-v2-grid", children: [_jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.1s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Accessible Items" }), _jsx(LayersIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: userDashboard.items.total_accessible.toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.items.files, " Files"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.items.folders, " Folders"] })] })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.15s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Ownership" }), _jsx(UsersIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: userDashboard.items.owned.toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsx("span", { style: { color: "var(--ink-3)" }, children: "Owned by you" }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.items.shared_with_me, " Shared with you"] })] })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.2s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Current Role" }), _jsx(ShieldIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", style: { textTransform: "capitalize" }, children: userDashboard.role }), _jsx("div", { className: "m-v2-footer", children: _jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.permissions.length, " Active permissions"] }) })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.25s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "24H Actions" }), _jsx(ActivityIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: (userDashboard.activityLast24h.uploads + userDashboard.activityLast24h.downloads + userDashboard.activityLast24h.updates + userDashboard.activityLast24h.deletes).toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.activityLast24h.logins, " Logins"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.activityLast24h.shares, " Shares"] })] })] })] }), _jsxs("section", { className: "bento-v2-grid", children: [_jsxs("div", { className: "panel-v2", children: [_jsxs("div", { className: "panel-v2-header", children: [_jsxs("h2", { children: ["Top Actions (", DASHBOARD_RANGE_LABELS[dashboardRange], ")"] }), _jsx("button", { className: "btn-ghost", style: { padding: 4 }, children: _jsx(ActivityIcon, { size: 16 }) })] }), _jsx("div", { className: "action-v2-list", children: userDashboard.topActions7d.length === 0 ? (_jsx("div", { style: { color: "var(--ink-4)", fontSize: 14, padding: "20px 0", textAlign: "center" }, children: "No recent activity." })) : (userDashboard.topActions7d.map((row) => {
                                                            const max = Math.max(...userDashboard.topActions7d.map((a) => a.count), 1);
                                                            const width = Math.max(8, Math.round((row.count / max) * 100));
                                                            const isAlert = row.action.includes("failed") || row.action.includes("delete");
                                                            return (_jsxs("div", { className: "action-v2-item", children: [_jsxs("div", { className: "a-v2-info", children: [_jsx("span", { className: `a-v2-name ${isAlert ? "text-alert" : ""}`, children: formatActionLabel(row.action) }), _jsx("span", { className: "a-v2-count", children: row.count })] }), _jsx("div", { className: "progress-v2-track", children: _jsx("div", { className: `progress-v2-fill ${isAlert ? "fill-red" : row.action.includes("create") || row.action.includes("upload") ? "fill-accent" : "fill-muted"}`, style: { width: `${width}%` } }) })] }, row.action));
                                                        })) })] }), _jsxs("div", { className: "panel-v2", children: [_jsxs("div", { className: "panel-v2-header", children: [_jsx("h2", { children: "Activity Snapshot" }), _jsx("span", { className: "badge badge-neutral", style: { fontSize: 11 }, children: "24h" })] }), _jsxs("div", { className: "snapshot-v2-grid", children: [_jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Logins" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.logins })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Uploads" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.uploads })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Downloads" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.downloads })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Updates" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.updates })] }), _jsxs("div", { className: "snap-v2-box bg-alert-subtle", children: [_jsx("span", { className: "s-v2-label text-alert", children: "Deletes" }), _jsx("span", { className: "s-v2-val text-alert", children: userDashboard.activityLast24h.deletes })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Shares" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.shares })] })] })] })] }), _jsxs("div", { className: "panel-v2 table-panel-v2", children: [_jsx("div", { className: "panel-v2-header", children: _jsx("h2", { children: "Recent Activity" }) }), (() => {
                                                const totalPages = Math.max(1, Math.ceil(userDashboard.recentActivity.length / DEFAULT_PAGE_SIZE));
                                                const currentPage = Math.min(userRecentActivityPage, totalPages);
                                                const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
                                                const pagedLogs = userDashboard.recentActivity.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
                                                if (userDashboard.recentActivity.length === 0) {
                                                    return (_jsx("div", { style: { color: "var(--ink-4)", fontSize: 14, padding: "40px 0", textAlign: "center" }, children: "No activity entries yet." }));
                                                }
                                                return (_jsxs(_Fragment, { children: [_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Time" }), _jsx("th", { children: "Action" }), _jsx("th", { children: "Actor" }), _jsx("th", { children: "Target" })] }) }), _jsx("tbody", { children: pagedLogs.map((log) => {
                                                                        const isAlert = log.action.includes("failed") || log.action.includes("delete");
                                                                        return (_jsxs("tr", { className: isAlert ? "row-danger" : "", children: [_jsx("td", { className: "cell-muted", style: { fontSize: 12 }, children: formatDate(log.created_at) }), _jsx("td", { children: _jsx("span", { className: `pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`, children: formatActionLabel(log.action) }) }), _jsx("td", { className: "t-main", style: { fontWeight: 600 }, children: log.actor_email ?? session.user.email }), _jsxs("td", { className: "cell-muted", style: { fontFamily: "ui-monospace, monospace", fontSize: 12 }, children: [log.target_type, log.target_id ? ` · ${String(log.target_id).slice(0, 8)}...` : ""] })] }, log.id));
                                                                    }) })] }), _jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0 0", flexWrap: "wrap" }, children: [_jsxs("span", { style: { fontSize: 12, color: "var(--ink-4)" }, children: ["Showing ", startIndex + 1, "-", Math.min(startIndex + DEFAULT_PAGE_SIZE, userDashboard.recentActivity.length), " of ", userDashboard.recentActivity.length] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setUserRecentActivityPage((prev) => Math.max(1, prev - 1)), disabled: currentPage <= 1, children: "Previous" }), _jsxs("span", { style: { fontSize: 12, color: "var(--ink-3)" }, children: ["Page ", currentPage, " of ", totalPages] }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setUserRecentActivityPage((prev) => Math.min(totalPages, prev + 1)), disabled: currentPage >= totalPages, children: "Next" })] })] })] }));
                                            })()] })] })) : (_jsx("div", { className: "panel", style: { textAlign: "center", padding: "56px 0", color: "var(--ink-3)" }, children: "Dashboard data is unavailable." })) }) })), tab === "Users" && (_jsx(UsersPage, { children: _jsxs("div", { className: "panel", children: [_jsx("div", { style: { display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderBottom: "1px solid var(--border)" }, children: _jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => setShowCreateUser(true), children: [_jsx(PlusIcon, {}), " Create User"] }) }), _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "User / Name" }), _jsx("th", { children: "Roles" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: (() => {
                                                const adminUsers = users.filter(u => !u.roles || u.roles.length === 0);
                                                const regularUsers = users.filter(u => u.roles && u.roles.length > 0);
                                                const orderedUsers = [...adminUsers, ...regularUsers];
                                                const totalPages = Math.max(1, Math.ceil(orderedUsers.length / DEFAULT_PAGE_SIZE));
                                                const currentPage = Math.min(usersPage, totalPages);
                                                const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
                                                const pagedUsers = orderedUsers.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
                                                const pagedAdminUsers = pagedUsers.filter(u => !u.roles || u.roles.length === 0);
                                                const pagedRegularUsers = pagedUsers.filter(u => u.roles && u.roles.length > 0);
                                                const renderRow = (user) => {
                                                    const isAdminUser = !user.roles || user.roles.length === 0;
                                                    return (_jsxs("tr", { onClick: () => !isAdminUser && onSelectUser(user), style: {
                                                            background: selectedUser?.id === user.id ? "var(--accent-light)" : undefined,
                                                            cursor: isAdminUser ? "default" : "pointer",
                                                            opacity: isAdminUser ? 0.7 : 1
                                                        }, children: [_jsx("td", { children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("div", { className: "sidebar-avatar", style: { width: 32, height: 32, fontSize: 12 }, children: getInitials({ firstName: user.first_name, lastName: user.last_name, email: user.email }) }), _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [_jsx("span", { className: "cell-email", style: { marginBottom: 2 }, children: user.first_name ? `${user.first_name} ${user.last_name}` : "-" }), _jsx("span", { style: { fontSize: 12, color: "var(--ink-4)" }, children: user.email })] })] }) }), _jsx("td", { children: isAdminUser ? (_jsxs("span", { className: "badge badge-accent", style: { fontSize: 11 }, children: [_jsx(ShieldIcon, { size: 11, style: { marginRight: 3 } }), " admin"] })) : (() => {
                                                                    const visibleRoles = (user.roles ?? []).filter(r => ["viewer", "editor"].includes(r));
                                                                    if (visibleRoles.length === 0)
                                                                        return _jsx("span", { className: "cell-muted", children: "-" });
                                                                    return visibleRoles.map(role => (_jsx("span", { className: `badge ${role === "editor" ? "badge-active" : "badge-disabled"}`, style: { marginRight: 4 }, children: role }, role)));
                                                                })() }), _jsx("td", { children: _jsx("span", { className: `badge ${user.status === "active" ? "badge-active" : "badge-disabled"}`, children: user.status }) }), _jsx("td", { className: "cell-muted", children: formatDate(user.created_at) }), _jsx("td", { children: canControlSecurity ? (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: (event) => {
                                                                        event.stopPropagation();
                                                                        void onForceLogoutUser(user);
                                                                    }, disabled: isBusy || session?.user?.id === user.id, title: session?.user?.id === user.id
                                                                        ? "Cannot force-logout your active security session here"
                                                                        : "Logout this user from all active sessions", children: "Logout user" })) : (_jsx("span", { className: "cell-muted", children: "-" })) })] }, user.id));
                                                };
                                                const sectionLabel = (label) => (_jsx("tr", { style: { pointerEvents: "none" }, children: _jsx("td", { colSpan: 5, style: { padding: "8px 16px 4px", background: "var(--bg)" }, children: _jsx("span", { style: { fontSize: 11, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.6px", textTransform: "uppercase" }, children: label }) }) }, `section-${label}`));
                                                return (_jsxs(_Fragment, { children: [pagedAdminUsers.length > 0 && sectionLabel("Administrators"), pagedAdminUsers.map(u => renderRow(u)), pagedRegularUsers.length > 0 && sectionLabel("Users"), pagedRegularUsers.map(u => renderRow(u))] }));
                                            })() })] }), (() => {
                                    const totalUsers = users.length;
                                    const totalPages = Math.max(1, Math.ceil(totalUsers / DEFAULT_PAGE_SIZE));
                                    const currentPage = Math.min(usersPage, totalPages);
                                    const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
                                    const start = totalUsers === 0 ? 0 : startIndex + 1;
                                    const end = Math.min(startIndex + DEFAULT_PAGE_SIZE, totalUsers);
                                    return (_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 16px 0", flexWrap: "wrap" }, children: [_jsxs("span", { style: { fontSize: 12, color: "var(--ink-4)" }, children: ["Showing ", start, "-", end, " of ", totalUsers] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setUsersPage((prev) => Math.max(1, prev - 1)), disabled: currentPage <= 1, children: "Previous" }), _jsxs("span", { style: { fontSize: 12, color: "var(--ink-3)" }, children: ["Page ", currentPage, " of ", totalPages] }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setUsersPage((prev) => Math.min(totalPages, prev + 1)), disabled: currentPage >= totalPages, children: "Next" })] })] }));
                                })(), selectedUser && (_jsx("div", { className: "modal-overlay", onClick: () => setSelectedUser(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 480, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }, children: [_jsxs("header", { style: { padding: "24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16 }, children: [_jsx("div", { style: {
                                                                    width: 56, height: 56, borderRadius: "50%",
                                                                    background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                                                                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                                                                    fontSize: 20, fontWeight: 700, flexShrink: 0,
                                                                    boxShadow: "0 4px 10px rgba(99,102,241,0.3)"
                                                                }, children: getInitials({ firstName: selectedUser.first_name, lastName: selectedUser.last_name, email: selectedUser.email }) }), _jsxs("div", { children: [_jsxs("div", { style: { fontSize: 18, fontWeight: 600, color: "var(--ink-1)", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }, children: [selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : "System User", _jsx("span", { className: `badge ${selectedUser.status === "active" ? "badge-active" : "badge-disabled"}`, style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }, children: selectedUser.status })] }), _jsx("div", { style: { fontSize: 14, color: "var(--ink-3)" }, children: selectedUser.email })] })] }), _jsx("button", { onClick: () => setSelectedUser(null), style: { background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }, onMouseEnter: e => { e.currentTarget.style.background = "var(--surface)"; e.currentTarget.style.color = "var(--ink-1)"; }, onMouseLeave: e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--ink-3)"; }, children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }) })] }), _jsxs("div", { style: { padding: "24px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", maxHeight: "65vh" }, children: [_jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }, children: "Edit User Details" }), _jsxs("div", { style: { display: "flex", gap: 16, marginBottom: 16 }, children: [_jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 6 }, children: [_jsx("label", { style: { fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }, children: "First Name" }), _jsx("input", { className: "modal-input", type: "text", placeholder: "First Name", value: editUserFirstName, onChange: (e) => setEditUserFirstName(e.target.value), style: { margin: 0 } })] }), _jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 6 }, children: [_jsx("label", { style: { fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }, children: "Last Name" }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Last Name", value: editUserLastName, onChange: (e) => setEditUserLastName(e.target.value), style: { margin: 0 } })] })] }), _jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [_jsx("label", { style: { fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }, children: "Email Address" }), _jsx("input", { className: "modal-input", type: "email", placeholder: "Email address", value: editUserEmail, onChange: (e) => setEditUserEmail(e.target.value), style: { margin: 0 } })] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }, children: "Manage Access Role" }), _jsxs("div", { className: "shad-select-wrapper", style: { width: "100%" }, children: [_jsxs("select", { className: "shad-select modal-input", style: { width: "100%", margin: 0 }, value: Array.from(selectedRoleIds)[0] || "", onChange: (e) => onRequestUserAccessRoleChange(e.target.value), disabled: isBusy, children: [_jsx("option", { value: "", disabled: true, children: "Select a role..." }), roles.filter(r => ["viewer", "editor"].includes(r.name)).map(role => (_jsx("option", { value: role.id, children: role.name.charAt(0).toUpperCase() + role.name.slice(1) }, role.id)))] }), _jsx(ChevronIcon, { size: 16, className: "shad-select-caret" })] })] }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }, children: "Account Management" }), _jsxs("div", { className: "shad-select-wrapper", style: { width: "100%" }, children: [_jsxs("select", { className: "shad-select modal-input", style: { width: "100%", margin: 0 }, value: "", onChange: (e) => {
                                                                            const val = e.target.value;
                                                                            if (val === "reset")
                                                                                onResetPassword(selectedUser.id);
                                                                            else if (val === "logout")
                                                                                void onForceLogoutUser(selectedUser);
                                                                            else if (val === "remove")
                                                                                setDeleteUserId(selectedUser.id);
                                                                            e.target.value = "";
                                                                        }, disabled: isBusy, children: [_jsx("option", { value: "", disabled: true, children: "Select an action..." }), _jsx("option", { value: "reset", children: "Reset Password" }), _jsx("option", { value: "logout", disabled: selectedUser.id === session?.user?.id || !canControlSecurity, children: "Force Logout" }), (() => {
                                                                                const isAdminUser = !selectedUser.roles || selectedUser.roles.length === 0;
                                                                                const isSelf = selectedUser.id === session?.user?.id;
                                                                                if (!isAdminUser) {
                                                                                    return _jsx("option", { value: "remove", disabled: isSelf, children: "Remove User" }, "remove");
                                                                                }
                                                                                return null;
                                                                            })()] }), _jsx(ChevronIcon, { size: 16, className: "shad-select-caret" })] }), (() => {
                                                                const isAdminUser = !selectedUser.roles || selectedUser.roles.length === 0;
                                                                if (isAdminUser) {
                                                                    return (_jsxs("div", { style: { marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", fontSize: 12, color: "var(--accent)", fontWeight: 600 }, children: [_jsx(ShieldIcon, { size: 14 }), " Admin account \u2014 cannot be removed"] }));
                                                                }
                                                                return null;
                                                            })()] })] }), _jsxs("footer", { style: { padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--panel-bg)", display: "flex", justifyContent: "flex-end", gap: 12 }, children: [_jsx("button", { className: "btn btn-ghost", onClick: () => setSelectedUser(null), children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: () => { void onDoneUserDetails(); }, disabled: isBusy || !editUserEmail.trim(), children: isBusy ? "Saving..." : isUserProfileDirty ? "Save Changes" : "Save" })] })] }) })), resetUserId && (_jsx("div", { className: "modal-overlay", onClick: () => setResetUserId(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 400 }, children: [_jsx("div", { className: "modal-title", children: "Reset Password" }), _jsx("div", { className: "modal-desc", children: "Enter a new password for this user." }), _jsxs("div", { style: { fontSize: 12, color: "var(--ink-4)", marginBottom: 14, padding: "10px 14px", background: "var(--surface)", borderRadius: 10, lineHeight: 1.6 }, children: ["\uD83D\uDD12 Must be ", _jsx("strong", { children: "8+ characters" }), " with uppercase, lowercase, number and special character (e.g. ", _jsx("code", { children: "Secure@123" }), ")."] }), _jsxs("div", { className: "input-group", style: { marginBottom: 20 }, children: [_jsx("span", { className: "input-icon", children: _jsx(LockIcon, {}) }), _jsx("input", { type: showResetPassword ? "text" : "password", placeholder: "New password", value: resetNewPassword, onChange: (e) => setResetNewPassword(e.target.value), required: true, autoFocus: true }), _jsx("button", { type: "button", className: "input-action-btn", onClick: () => setShowResetPassword(!showResetPassword), children: showResetPassword ? _jsx(EyeOffIcon, { size: 18 }) : _jsx(EyeIcon, { size: 18 }) })] }), _jsxs("div", { style: { display: "flex", gap: 12 }, children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setResetUserId(null), style: { flex: 1 }, children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: onConfirmResetPassword, disabled: isBusy || Boolean(resetPasswordError), style: { flex: 1 }, children: isBusy ? "Resetting..." : "Reset Password" })] })] }) })), pendingRoleChange && selectedUser && (_jsx("div", { className: "modal-overlay", onClick: () => (!isBusy ? setPendingRoleChange(null) : undefined), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 420 }, children: [_jsx("div", { className: "modal-title", children: "Confirm role change" }), _jsxs("div", { className: "modal-desc", style: { lineHeight: 1.6 }, children: ["Change ", _jsx("strong", { children: selectedUser.email }), " from", " ", _jsx("strong", { children: pendingRoleChange.currentRoleName ?? "no role" }), " to", " ", _jsx("strong", { children: pendingRoleChange.roleName }), "?"] }), _jsxs("div", { style: { display: "flex", gap: 12 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setPendingRoleChange(null), disabled: isBusy, style: { flex: 1 }, children: "Cancel" }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: () => {
                                                            void onConfirmUserAccessRoleChange();
                                                        }, disabled: isBusy, style: { flex: 1 }, children: isBusy ? "Updating..." : "Confirm" })] })] }) })), deleteUserId && (_jsx("div", { className: "modal-overlay", onClick: () => (!isBusy ? setDeleteUserId(null) : undefined), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 420 }, children: [_jsx("div", { className: "modal-title", children: "Remove user" }), _jsxs("div", { className: "modal-desc", style: { lineHeight: 1.6 }, children: ["This will permanently remove ", _jsx("strong", { children: deleteUserTarget?.email ?? "this user" }), " and all owned data. This action cannot be undone."] }), _jsxs("div", { style: { display: "flex", gap: 12 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setDeleteUserId(null), disabled: isBusy, style: { flex: 1 }, children: "Cancel" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: onConfirmRemoveUser, disabled: isBusy, style: { flex: 1 }, children: isBusy ? "Removing..." : "Remove User" })] })] }) }))] }) })), tab === "Roles" && (_jsx(RolesPage, { roles: roles, KeyIcon: KeyIcon, EditIcon: EditIcon, EyeIcon: EyeIcon })), tab === "Permissions" && (_jsx(PermissionsPage, { roles: roles, rolePermMap: rolePermMap, permissions: permissions, isBusy: isBusy, ShieldIcon: ShieldIcon, getPermissionDisplayLabel: getPermissionDisplayLabel, onToggleRolePermission: onToggleRolePermission })), tab === "Files" && (_jsx(FilesPage, { children: _jsxs(_Fragment, { children: [viewerItem ? (_jsxs("div", { className: "file-viewer-shell", children: [_jsxs("div", { className: "file-viewer-header", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsxs("button", { className: "btn btn-secondary btn-sm", onClick: closeViewer, children: [_jsx(ArrowLeftIcon, {}), " Back to Files"] }), _jsx("span", { className: "file-viewer-title", children: viewerItem.name })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsxs("button", { className: "btn btn-secondary btn-sm", onClick: () => onDownload(viewerItem), children: [_jsx(DownloadIcon, {}), " Download"] }), viewerUrl && (_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => window.open(viewerUrl, "_blank", "noopener,noreferrer"), children: "Open Raw" })), canWrite && (_jsxs("button", { className: "btn btn-secondary btn-sm", onClick: () => onOpenEdit(viewerItem), children: [_jsx(EditIcon, {}), " Edit name"] })), canDelete && (_jsxs("button", { className: "btn btn-danger btn-sm", onClick: () => setDeleteTarget(viewerItem), children: [_jsx(TrashIcon, {}), " Delete"] }))] })] }), viewerLoading ? (_jsx("div", { className: "file-viewer-loading", children: "Loading file preview..." })) : viewerError ? (_jsx("div", { className: "file-viewer-error", children: viewerError })) : !viewerUrl ? (_jsx("div", { className: "file-viewer-error", children: "Preview unavailable." })) : isCurrentViewerPdf ? (_jsxs("div", { className: "pdf-editor-layout", children: [_jsxs("div", { className: "pdf-preview-pane", children: [_jsxs("div", { className: "pdf-preview-toolbar", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setViewerPdfPage((prev) => Math.max(1, prev - 1)), disabled: selectedPdfPage <= 1, children: "Previous" }), _jsxs("div", { className: "pdf-page-indicator", children: ["Page ", selectedPdfPage, " of ", viewerPdfPages] }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setViewerPdfPage((prev) => Math.min(viewerPdfPages, prev + 1)), disabled: selectedPdfPage >= viewerPdfPages, children: "Next" })] }), _jsxs("div", { className: "pdf-preview-meta", children: [_jsx("span", { children: "Fit to width" }), _jsxs("strong", { children: [pdfScalePercent, "%"] })] }), _jsxs("div", { className: "pdf-canvas-wrap", ref: pdfCanvasWrapRef, children: [_jsx("canvas", { ref: pdfCanvasRef, className: "pdf-preview-canvas" }), pdfRendering && (_jsx("div", { className: "pdf-render-overlay", children: "Rendering page\u2026" })), pdfRenderError && (_jsx("div", { className: "pdf-render-overlay pdf-render-overlay-error", children: pdfRenderError }))] })] }), _jsxs("div", { className: "file-details-pane", children: [_jsx("h3", { children: "PDF Details" }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Name" }), _jsx("strong", { children: viewerItem.name })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Type" }), _jsx("strong", { children: viewerContentType || viewerItem.content_type || "application/pdf" })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Size" }), _jsx("strong", { children: formatBytes(viewerItem.size_bytes) })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Total pages" }), _jsx("strong", { children: viewerPdfPages })] }), viewerItem.updated_at && (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Updated" }), _jsx("strong", { children: formatDate(viewerItem.updated_at) })] })), viewerItem.owner_user_id && (() => {
                                                            const owner = users.find(u => u.id === viewerItem.owner_user_id);
                                                            const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                                                            return (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Uploaded by" }), _jsxs("strong", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("span", { style: { width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }, children: display[0]?.toUpperCase() }), display] })] }));
                                                        })()] })] })) : viewerTextPreview !== null ? (_jsxs("div", { className: "file-viewer-generic", children: [_jsx("div", { className: "file-text-preview", children: _jsx("pre", { children: viewerTextPreview || "(No preview available.)" }) }), _jsxs("div", { className: "file-details-pane", children: [_jsx("h3", { children: "File Details" }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Name" }), _jsx("strong", { children: viewerItem.name })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Type" }), _jsx("strong", { children: viewerContentType || viewerItem.content_type || "Unknown" })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Size" }), _jsx("strong", { children: formatBytes(viewerItem.size_bytes) })] }), viewerItem.updated_at && (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Updated" }), _jsx("strong", { children: formatDate(viewerItem.updated_at) })] })), viewerItem.owner_user_id && (() => {
                                                            const owner = users.find(u => u.id === viewerItem.owner_user_id);
                                                            const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                                                            return (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Uploaded by" }), _jsxs("strong", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("span", { style: { width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }, children: display[0]?.toUpperCase() }), display] })] }));
                                                        })(), viewerPreviewNote && _jsx("div", { className: "file-preview-note", children: viewerPreviewNote })] })] })) : (_jsxs("div", { className: "file-viewer-generic", children: [_jsx("div", { className: "file-generic-preview", children: viewerContentType.startsWith("image/") ? (_jsx("img", { src: viewerUrl, alt: viewerItem.name, className: "file-image-preview" })) : canEmbedCurrentViewer ? (_jsx("object", { data: viewerUrl, type: viewerContentType || "application/octet-stream", className: "file-generic-frame", children: _jsx("iframe", { title: viewerItem.name, src: viewerUrl, className: "file-generic-frame" }) })) : (_jsx("div", { style: {
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            height: "100%",
                                                            padding: "24px",
                                                            color: "var(--ink-3)",
                                                            textAlign: "center",
                                                            lineHeight: 1.6
                                                        }, children: "This file type cannot be previewed in the browser. Use Download to view it in the native app." })) }), _jsxs("div", { className: "file-details-pane", children: [_jsx("h3", { children: "File Details" }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Name" }), _jsx("strong", { children: viewerItem.name })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Type" }), _jsx("strong", { children: viewerContentType || viewerItem.content_type || "Unknown" })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Size" }), _jsx("strong", { children: formatBytes(viewerItem.size_bytes) })] }), viewerItem.updated_at && (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Updated" }), _jsx("strong", { children: formatDate(viewerItem.updated_at) })] })), viewerItem.owner_user_id && (() => {
                                                            const owner = users.find(u => u.id === viewerItem.owner_user_id);
                                                            const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                                                            return (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Uploaded by" }), _jsxs("strong", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [_jsx("span", { style: { width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }, children: display[0]?.toUpperCase() }), display] })] }));
                                                        })(), viewerPreviewNote && _jsx("div", { className: "file-preview-note", children: viewerPreviewNote })] })] }))] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "breadcrumb", children: [_jsxs("button", { className: `breadcrumb-item ${path.length === 0 ? "current" : ""}`, onClick: goToRoot, children: [_jsx(HomeIcon, {}), " Root"] }), path.map((crumb, index) => (_jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("span", { className: "breadcrumb-sep", children: _jsx(ChevronIcon, {}) }), _jsx("button", { className: `breadcrumb-item ${index === path.length - 1 ? "current" : ""}`, onClick: () => goToBreadcrumb(index), children: crumb.name })] }, crumb.id)))] }), canWrite ? (_jsxs("div", { className: "file-toolbar", children: [_jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => { setFolderName(""); setShowFolderModal(true); }, disabled: isBusy, children: [_jsx(PlusIcon, {}), " New Folder"] }), _jsxs("label", { className: "upload-label", children: [_jsx(UploadIcon, {}), " Upload Files", _jsx("input", { type: "file", multiple: true, disabled: isBusy, onChange: (e) => {
                                                                const files = e.target.files;
                                                                if (files?.length)
                                                                    queueFileUploadConfirmation(files);
                                                                e.currentTarget.value = "";
                                                            } })] }), _jsxs("label", { className: "upload-label", children: [_jsx(FolderIcon, {}), " Upload Folder", _jsx("input", { type: "file", multiple: true, disabled: isBusy, ...{ webkitdirectory: "", directory: "" }, onChange: (e) => {
                                                                const files = e.target.files;
                                                                if (files?.length)
                                                                    queueFolderUploadConfirmation(files);
                                                                e.currentTarget.value = "";
                                                            } })] })] })) : (_jsxs("div", { style: { padding: "8px 16px", fontSize: 13, color: "var(--ink-4)", display: "flex", alignItems: "center", gap: 6 }, children: [_jsx(KeyIcon, {}), " Read-only access \u2014 you can view and download files."] })), _jsx("div", { className: "panel", children: items.length === 0 ? (_jsxs("div", { style: { textAlign: "center", padding: "48px 0", color: "var(--ink-3)" }, children: [_jsx(FolderIcon, { size: 40 }), _jsx("p", { style: { marginTop: 12, fontSize: 15 }, children: "This folder is empty" }), _jsx("p", { style: { fontSize: 13, color: "var(--ink-4)" }, children: "Create a folder or upload a file to get started." })] })) : (_jsx("div", { className: "file-grid", children: items.map((item) => (_jsxs("div", { className: "file-row", children: [_jsx("div", { className: `file-icon-box ${item.type === "folder" ? "file-icon-folder" : "file-icon-file"}`, children: item.type === "folder" ? _jsx(FolderIcon, {}) : _jsx(FileIcon, {}) }), _jsxs("div", { children: [_jsx("div", { className: "file-name clickable", onClick: () => (item.type === "folder" ? openFolder(item) : onOpenFile(item)), children: item.name }), _jsxs("div", { className: "file-type", children: [item.type, " ", item.type === "file" ? `· ${formatBytes(item.size_bytes)}` : ""] })] }), _jsxs("div", { className: "file-actions", children: [item.type === "file" && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => onOpenFile(item), title: "Open", children: _jsx(EyeIcon, { size: 16 }) })), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => onDownload(item), title: "Download", children: _jsx(DownloadIcon, {}) }), canWrite && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => onOpenEdit(item), title: "Edit", children: _jsx(EditIcon, {}) })), canDelete && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setDeleteTarget(item), title: "Delete", style: { color: "var(--red)" }, children: _jsx(TrashIcon, {}) }))] })] }, item.id))) })) })] })), showFolderModal && (_jsx("div", { className: "modal-overlay", onClick: () => setShowFolderModal(false), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "modal-icon modal-icon-folder", children: _jsx(FolderIcon, { size: 24 }) }), _jsx("div", { className: "modal-title", children: "Create new folder" }), _jsx("div", { className: "modal-desc", children: "Enter a name for your new folder." }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); onCreateFolder(); }, children: [_jsx("input", { className: "modal-input", placeholder: "Folder name", value: folderName, onChange: (e) => setFolderName(e.target.value), autoFocus: true, required: true }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setShowFolderModal(false), children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: !folderName.trim() || isBusy, children: "Create" })] })] })] }) })), pendingUpload && (_jsx("div", { className: "modal-overlay", onClick: () => (!isBusy ? setPendingUpload(null) : undefined), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 460 }, children: [_jsx("div", { className: "modal-icon modal-icon-folder", children: _jsx(UploadIcon, { size: 22 }) }), _jsx("div", { className: "modal-title", children: pendingUpload.kind === "folder" ? "Confirm Folder Upload" : "Confirm File Upload" }), _jsx("div", { className: "modal-desc", style: { lineHeight: 1.7 }, children: pendingUpload.kind === "folder" ? (_jsxs(_Fragment, { children: ["Upload ", _jsx("strong", { children: pendingUpload.files.length }), " ", "file", pendingUpload.files.length === 1 ? "" : "s", " from", " ", _jsx("strong", { children: pendingUpload.folderName ?? "Selected Folder" }), "? The folder hierarchy will be preserved exactly."] })) : (_jsxs(_Fragment, { children: ["Upload ", _jsx("strong", { children: pendingUpload.files.length }), " ", "file", pendingUpload.files.length === 1 ? "" : "s", " to the current folder?"] })) }), _jsx("div", { style: {
                                                    marginTop: 12,
                                                    padding: "10px 12px",
                                                    borderRadius: 10,
                                                    border: "1px solid var(--border)",
                                                    background: "var(--surface)",
                                                    color: "var(--ink-4)",
                                                    fontSize: 12
                                                }, children: "Your browser may still show its own security confirmation before upload starts." }), _jsxs("div", { className: "modal-actions", style: { marginTop: 18 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setPendingUpload(null), disabled: isBusy, children: "Cancel" }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: () => {
                                                            void onConfirmPendingUpload();
                                                        }, disabled: isBusy, children: isBusy ? "Uploading..." : "Upload" })] })] }) })), deleteTarget && (_jsx("div", { className: "modal-overlay", onClick: () => setDeleteTarget(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "modal-icon modal-icon-danger", children: _jsx(TrashIcon, {}) }), _jsxs("div", { className: "modal-title", children: ["Delete ", deleteTarget.type] }), _jsxs("div", { className: "modal-desc", children: ["Are you sure you want to delete ", _jsxs("strong", { children: ["\u201C", deleteTarget.name, "\u201D"] }), "? This action cannot be undone."] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setDeleteTarget(null), children: "Cancel" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: onConfirmDelete, disabled: isBusy, children: "Delete" })] })] }) })), editTarget && (_jsx("div", { className: "modal-overlay", onClick: () => setEditTarget(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "modal-icon modal-icon-folder", children: _jsx(EditIcon, { size: 22 }) }), _jsxs("div", { className: "modal-title", children: ["Edit ", editTarget.type, " name"] }), _jsxs("div", { className: "modal-desc", children: ["Update the display name for this ", editTarget.type, "."] }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); onConfirmEdit(); }, children: [_jsx("input", { className: "modal-input", placeholder: "Enter new name", value: editName, onChange: (e) => setEditName(e.target.value), autoFocus: true, required: true }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setEditTarget(null), children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: !editName.trim() || isBusy, children: "Save" })] })] })] }) }))] }) })), tab === "Audit Logs" && (_jsx(AuditLogsPage, { auditLogs: auditLogs, auditPage: auditPage, setAuditPage: setAuditPage, auditLoading: auditLoading, auditError: auditError, auditExpandedRows: auditExpandedRows, setAuditExpandedRows: setAuditExpandedRows, refreshAuditLogs: refreshAuditLogs, getAuditCategory: getAuditCategory, AUDIT_CATEGORY_STYLES: AUDIT_CATEGORY_STYLES, formatDateGroup: formatDateGroup, formatDate: formatDate, formatActionLabel: formatActionLabel, summarizeAuditMetadata: summarizeAuditMetadata, formatAuditMetadataValue: formatAuditMetadataValue, DEFAULT_PAGE_SIZE: DEFAULT_PAGE_SIZE, RefreshCwIcon: RefreshCwIcon, CalendarIcon: CalendarIcon, ChevronIcon: ChevronIcon, navigateToTab: navigateToTab, setPath: setPath })), showSecurityStepUpModal && (_jsx("div", { className: "modal-overlay", onClick: () => (!stepUpBusy ? setShowSecurityStepUpModal(false) : undefined), children: _jsxs("div", { className: "modal", onClick: (event) => event.stopPropagation(), style: { maxWidth: 420 }, children: [_jsx("div", { className: "modal-title", children: "Verify identity" }), _jsx("div", { className: "modal-desc", children: "Confirm your password and OTP to unlock security controls." }), _jsxs("div", { className: "input-group", style: { marginBottom: 12 }, children: [_jsx("span", { className: "input-icon", children: _jsx(LockIcon, {}) }), _jsx("input", { type: "password", placeholder: "Current password", value: stepUpPassword, onChange: (event) => setStepUpPassword(event.target.value), disabled: stepUpBusy })] }), !stepUpOtpRequested ? (_jsx("button", { className: "btn btn-primary", onClick: () => void onRequestSecurityStepUpOtp(), disabled: stepUpBusy || !stepUpPassword, style: { width: "100%", marginBottom: 12 }, children: stepUpBusy ? "Requesting..." : "Send OTP" })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "input-group", style: { marginBottom: 12 }, children: [_jsx("span", { className: "input-icon", children: _jsx(MailIcon, {}) }), _jsx("input", { type: "text", placeholder: "Enter 6-digit OTP", value: stepUpOtp, onChange: (event) => setStepUpOtp(event.target.value), disabled: stepUpBusy, maxLength: 6 })] }), _jsx("button", { className: "btn btn-primary", onClick: () => void onVerifySecurityStepUpOtp(), disabled: stepUpBusy || !stepUpOtp, style: { width: "100%", marginBottom: 10 }, children: stepUpBusy ? "Verifying..." : "Verify & Unlock" }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => void onRequestSecurityStepUpOtp(), disabled: stepUpBusy, style: { width: "100%" }, children: "Resend OTP" })] }))] }) })), showCreateUser && (_jsx("div", { className: "modal-overlay", onClick: () => setShowCreateUser(false), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "modal-icon modal-icon-folder", children: _jsx(UsersIcon, {}) }), _jsx("div", { className: "modal-title", children: "Create new user" }), _jsx("div", { className: "modal-desc", children: "Add a new user to the system with their personal details and role." }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); onCreateUserSubmit(); }, children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }, children: [_jsx("input", { className: "modal-input", type: "text", placeholder: "First Name", value: newUserFirstName, onChange: (e) => setNewUserFirstName(e.target.value), required: true, style: { margin: 0 } }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Last Name", value: newUserLastName, onChange: (e) => setNewUserLastName(e.target.value), required: true, style: { margin: 0 } })] }), _jsx("input", { className: "modal-input", type: "email", placeholder: "Email address", value: newUserEmail, onChange: (e) => setNewUserEmail(e.target.value), required: true, style: { marginBottom: 12 } }), _jsxs("div", { style: { position: "relative", marginBottom: 6 }, children: [_jsx("input", { className: "modal-input", type: showNewUserPassword ? "text" : "password", placeholder: "Password", value: newUserPassword, onChange: (e) => setNewUserPassword(e.target.value), required: true, minLength: 8, style: { margin: 0, paddingRight: 40 } }), _jsx("button", { type: "button", onClick: () => setShowNewUserPassword(!showNewUserPassword), style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-4)", cursor: "pointer", display: "flex", alignItems: "center" }, children: showNewUserPassword ? _jsx(EyeOffIcon, { size: 18 }) : _jsx(EyeIcon, { size: 18 }) })] }), _jsxs("div", { style: { fontSize: 12, color: "var(--ink-4)", marginBottom: 12, padding: "8px 12px", background: "var(--surface)", borderRadius: 10, lineHeight: 1.6 }, children: ["\uD83D\uDD12 Min 8 chars \u00B7 Uppercase \u00B7 Lowercase \u00B7 Number \u00B7 Special char", _jsx("br", {}), _jsxs("span", { style: { color: "var(--ink-3)" }, children: ["e.g. ", _jsx("code", { children: "Secure@123" })] })] }), _jsxs("select", { className: "modal-input", value: newUserRole, onChange: (e) => setNewUserRole(e.target.value), style: { marginBottom: 12 }, children: [_jsx("option", { value: "viewer", children: "Viewer (read-only)" }), _jsx("option", { value: "editor", children: "Editor (read/write)" })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setShowCreateUser(false), children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: !newUserEmail.trim() || Boolean(newUserPasswordError) || isBusy, children: isBusy ? "Creating..." : "Create User" })] })] })] }) }))] }, tab)] }));
}
