import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createFile, createFolder, createUser, deleteItem, downloadItem, fetchDashboardSummary, fetchUserDashboardSummary, listAuditLogs, listItems, listPermissions, listRolePermissions, listRoles, listUserRoles, listUsers, login, logout, removeUser, resetUserPassword, setUserRole, updateItemName, updateUserInfo, updateRolePermissions, verifyOtp } from "./api";
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
    "Audit Logs": ActivityIcon,
};
const tabDescriptions = {
    Dashboard: "High-level view of users, files, and security activity across your system.",
    Users: "Manage user accounts, assign roles, and control access permissions.",
    Roles: "View and manage the available roles in the system.",
    Permissions: "See which permissions are assigned to each role.",
    Files: "Browse, upload, and manage stored documents and folders.",
    "Audit Logs": "View a chronological log of all system activity.",
};
const getTabsForRole = (roles) => {
    if (roles.includes("admin"))
        return [...ALL_TABS];
    if (roles.some((role) => ["viewer", "editor"].includes(role))) {
        return ["Dashboard", "Files"];
    }
    return ["Files"];
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
const XSmall = ({ size = 14, ...props }) => (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", ...props, children: [_jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), _jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" })] }));
const CheckSmall = ({ size = 14, ...props }) => (_jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", ...props, children: _jsx("polyline", { points: "20 6 9 17 4 12" }) }));
const AlertSmall = ({ size = 14, ...props }) => (_jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round", ...props, children: [_jsx("circle", { cx: "12", cy: "12", r: "10" }), _jsx("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), _jsx("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })] }));
function ToastContainer({ toasts, onDismiss }) {
    if (toasts.length === 0)
        return null;
    return (_jsx("div", { className: "toast-container", children: toasts.map((t) => (_jsxs("div", { className: `toast toast-${t.type} ${t.leaving ? "leaving" : ""}`, children: [_jsx("div", { className: "toast-icon", children: t.type === "error" ? _jsx(AlertSmall, {}) : _jsx(CheckSmall, {}) }), _jsxs("div", { className: "toast-body", children: [_jsx("div", { className: "toast-title", children: t.title }), _jsx("div", { className: "toast-message", children: t.message })] }), _jsx("button", { className: "toast-close", onClick: () => onDismiss(t.id), children: _jsx(XSmall, {}) }), _jsx("div", { className: "toast-progress" })] }, t.id))) }));
}
/* =============================================
   App Component
   ============================================= */
export default function App() {
    const [email, setEmail] = useState(() => localStorage.getItem("securevault_last_email") ?? "");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [loginStep, setLoginStep] = useState(1);
    const [session, setSession] = useState(null);
    const [tab, setTab] = useState("Files");
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
    const [auditLoading, setAuditLoading] = useState(false);
    const [auditError, setAuditError] = useState(null);
    const [dashboard, setDashboard] = useState(null);
    const [userDashboard, setUserDashboard] = useState(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState(null);
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
    const [showNewUserPassword, setShowNewUserPassword] = useState(false);
    const [resetUserId, setResetUserId] = useState(null);
    const [deleteUserId, setDeleteUserId] = useState(null);
    const [pendingRoleChange, setPendingRoleChange] = useState(null);
    const [resetNewPassword, setResetNewPassword] = useState("");
    const [showResetPassword, setShowResetPassword] = useState(false);
    const [isSessionChecking, setIsSessionChecking] = useState(true);
    const [savedEmails, setSavedEmails] = useState(() => {
        try {
            const raw = localStorage.getItem("securevault_saved_emails");
            return raw ? JSON.parse(raw) : [];
        }
        catch {
            return [];
        }
    });
    const viewerUrlRef = useRef(null);
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
    // Restore session from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem("securevault_session");
        if (saved) {
            try {
                setSession(JSON.parse(saved));
            }
            catch (e) {
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
    const canWrite = isAdmin || userPerms.includes("items:write");
    const canDelete = isAdmin || userPerms.includes("items:delete");
    const visibleTabs = useMemo(() => getTabsForRole(userRolesList), [userRolesList]);
    const auditActionOptions = useMemo(() => Array.from(new Set(auditLogs.map((log) => log.action))).sort(), [auditLogs]);
    const showToast = useCallback((type, title, message) => {
        const id = ++toastId.current;
        setToasts((prev) => [...prev, { id, type, title, message }]);
        setTimeout(() => {
            setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
            setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
        }, 5000);
    }, []);
    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, []);
    const accessToken = session?.accessToken;
    const refreshDashboard = async () => {
        if (!accessToken)
            return;
        setDashboardLoading(true);
        setDashboardError(null);
        try {
            if (isAdmin) {
                const data = await fetchDashboardSummary(accessToken);
                setDashboard(data);
                setUserDashboard(null);
            }
            else {
                const data = await fetchUserDashboardSummary(accessToken);
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
            }
            else {
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
        setSession(data);
        if (rememberMe) {
            localStorage.setItem("securevault_session", JSON.stringify(data));
            localStorage.setItem("securevault_last_email", email);
            setSavedEmails((prev) => {
                const next = [email, ...prev.filter((value) => value !== email)].slice(0, 10);
                localStorage.setItem("securevault_saved_emails", JSON.stringify(next));
                return next;
            });
        }
        else {
            localStorage.removeItem("securevault_session");
        }
        setLoginStep(1);
        setOtp("");
        setPassword("");
        const userTabs = getTabsForRole(data.user?.roles ?? []);
        setTab(userTabs.includes("Dashboard") ? "Dashboard" : "Files");
    };
    const onLogin = async () => {
        if (isLoginSubmitting)
            return;
        setStatus(null);
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
            showToast("error", "Login failed", err?.message ?? "Please check your credentials.");
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
    }, [session?.accessToken]);
    const clearClientSession = useCallback(() => {
        localStorage.removeItem("securevault_session");
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
    useEffect(() => {
        if (!session?.accessToken)
            return;
        const expiryMs = getJwtExpiryTime(session.accessToken);
        if (!expiryMs)
            return;
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
                if (rememberMe) {
                    localStorage.setItem("securevault_session", JSON.stringify(nextSession));
                }
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
            const removed = users.find((u) => u.id === deleteUserId);
            await removeUser(accessToken, deleteUserId);
            setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
            setUserRoles([]);
            if (selectedUser?.id === deleteUserId) {
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
            await createUser(accessToken, newUserEmail, newUserPassword, newUserRole, newUserFirstName, newUserLastName);
            showToast("success", "User created", `${newUserEmail} has been created successfully.`);
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
    }, [tab, accessToken, isAdmin]);
    if (isSessionChecking) {
        return (_jsx("div", { style: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)" }, children: _jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }, children: [_jsx(VaultIcon, { size: 48, color: "var(--accent)" }), _jsx("div", { style: { width: 24, height: 24, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" } }), _jsx("style", { children: `@keyframes spin { to { transform: rotate(360deg); } }` })] }) }));
    }
    /* ---- LOGIN PAGE ---- */
    if (!session) {
        return (_jsxs("div", { className: "login-page", children: [_jsx(ToastContainer, { toasts: toasts, onDismiss: dismissToast }), loginStep === 1 && (_jsxs("div", { className: "login-card", children: [_jsxs("div", { className: "login-brand", children: [_jsx("div", { className: "login-brand-icon", children: _jsx(VaultIcon, { size: 24 }) }), _jsx("div", { className: "login-brand-text", children: "SecureVault" })] }), _jsxs("div", { className: "login-step-indicator", children: [_jsx("div", { className: "login-step-dot active" }), _jsx("div", { className: "login-step-dot" }), _jsx("div", { className: "login-step-dot" })] }), _jsx("h1", { className: "login-title", children: "Welcome back" }), _jsx("p", { className: "login-subtitle", children: "Enter your email address to continue." }), _jsxs("form", { className: "login-form", autoComplete: "on", onSubmit: (e) => { e.preventDefault(); if (email.trim())
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
                                            }, children: rememberMe && _jsx(CheckSmall, { size: 14, color: "white" }) }), _jsx("span", { style: { fontSize: 13, color: "var(--ink-3)", fontWeight: 500, userSelect: "none" }, children: "Remember me" })] }), _jsx("button", { className: "btn btn-primary", type: "submit", children: "Continue" })] })] }, "step-email")), loginStep === 2 && (_jsxs("div", { className: "login-card", children: [_jsxs("div", { className: "login-brand", children: [_jsx("div", { className: "login-brand-icon", children: _jsx(VaultIcon, { size: 24 }) }), _jsx("div", { className: "login-brand-text", children: "SecureVault" })] }), _jsxs("div", { className: "login-step-indicator", children: [_jsx("div", { className: "login-step-dot" }), _jsx("div", { className: "login-step-dot active" }), _jsx("div", { className: "login-step-dot" })] }), _jsx("h1", { className: "login-title", children: "Enter your password" }), _jsxs("p", { className: "login-subtitle", children: ["Signing in as ", _jsx("strong", { children: email })] }), _jsxs("form", { className: "login-form", autoComplete: "on", onSubmit: (e) => { e.preventDefault(); onLogin(); }, children: [_jsx("input", { type: "email", name: "username", autoComplete: "username", value: email, readOnly: true, style: { display: "none" } }), _jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-icon", children: _jsx(LockIcon, {}) }), _jsx("input", { type: showPassword ? "text" : "password", name: "password", autoComplete: "current-password", placeholder: "Enter your password", value: password, onChange: (e) => setPassword(e.target.value), disabled: isLoginSubmitting, required: true, autoFocus: true }), _jsx("button", { type: "button", className: "input-action-btn", onClick: () => setShowPassword(!showPassword), disabled: isLoginSubmitting, children: showPassword ? _jsx(EyeOffIcon, { size: 18 }) : _jsx(EyeIcon, { size: 18 }) })] }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: isLoginSubmitting, children: isLoginSubmitting ? "Signing in..." : "Continue" })] }), _jsx("div", { className: "login-footer", children: _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => { setLoginStep(1); setPassword(""); }, disabled: isLoginSubmitting, style: { width: "100%", marginTop: 8 }, children: "\u2190 Use a different email" }) })] }, "step-password")), loginStep === 3 && (_jsxs("div", { className: "login-card", children: [_jsxs("div", { className: "login-brand", children: [_jsx("div", { className: "login-brand-icon", children: _jsx(VaultIcon, { size: 24 }) }), _jsx("div", { className: "login-brand-text", children: "SecureVault" })] }), _jsxs("div", { className: "login-step-indicator", children: [_jsx("div", { className: "login-step-dot" }), _jsx("div", { className: "login-step-dot" }), _jsx("div", { className: "login-step-dot active" })] }), _jsx("h1", { className: "login-title", children: "Check your email" }), _jsxs("p", { className: "login-subtitle", children: ["We sent a 6-digit code to ", _jsx("strong", { children: email })] }), _jsxs("form", { className: "login-form", onSubmit: (e) => { e.preventDefault(); onVerifyOtp(); }, children: [_jsxs("div", { className: "input-group", children: [_jsx("span", { className: "input-icon", children: _jsx(LockIcon, {}) }), _jsx("input", { type: "text", placeholder: "Enter 6-digit OTP", value: otp, onChange: (e) => setOtp(e.target.value), disabled: isOtpSubmitting, required: true, maxLength: 6, autoFocus: true })] }), _jsx("button", { className: "btn btn-primary", type: "submit", disabled: isOtpSubmitting, children: isOtpSubmitting ? "Verifying..." : "Verify & Sign In" })] }), _jsx("div", { className: "login-footer", children: _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => { setLoginStep(1); setOtp(""); setPassword(""); setStatus(null); }, disabled: isOtpSubmitting, style: { width: "100%", marginTop: 8 }, children: "\u2190 Start over" }) }), status && _jsx("p", { className: "login-status", style: { marginTop: 12 }, children: status })] }, "step-otp"))] }));
    }
    /* ---- MAIN DASHBOARD ---- */
    return (_jsxs("div", { className: "app", children: [_jsx(ToastContainer, { toasts: toasts, onDismiss: dismissToast }), _jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "sidebar-brand", children: [_jsx("div", { className: "sidebar-brand-icon", children: _jsx(VaultIcon, { size: 22 }) }), _jsx("span", { className: "sidebar-brand-text", children: "SecureVault" })] }), _jsxs("div", { className: "sidebar-section", children: [_jsx("div", { className: "sidebar-label", children: "Main menu" }), _jsx("nav", { className: "sidebar-nav", children: visibleTabs.map((t) => {
                                    const Icon = tabIcons[t];
                                    return (_jsxs("button", { className: `sidebar-nav-item ${tab === t ? "active" : ""}`, onClick: () => setTab(t), children: [_jsx("span", { className: "nav-icon", children: _jsx(Icon, {}) }), t] }, t));
                                }) })] }), _jsx("div", { className: "sidebar-spacer" }), _jsxs("div", { className: "sidebar-profile", children: [_jsx("div", { className: "sidebar-avatar", children: getInitials({ firstName: session.user.firstName, lastName: session.user.lastName, email: session.user.email }) }), _jsxs("div", { className: "sidebar-profile-info", children: [_jsx("div", { className: "sidebar-profile-name", children: session.user.firstName ? `${session.user.firstName} ${session.user.lastName}` : session.user.email.split('@')[0] }), _jsx("div", { className: "sidebar-profile-role", style: { textTransform: "capitalize" }, children: session.user.roles.join(", ") })] }), _jsx("button", { className: "btn-logout", onClick: onLogout, title: "Sign out", style: { marginLeft: "auto", background: "none", border: "none", padding: 8, cursor: "pointer", color: "var(--ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(LogoutIcon, {}) })] })] }), _jsxs("main", { className: "content", children: [tab !== "Dashboard" && (_jsxs("div", { className: "page-header", children: [_jsx("h1", { className: "page-title", children: tab }), _jsx("p", { className: "page-subtitle", children: tabDescriptions[tab] })] })), tab === "Dashboard" && (_jsx("div", { style: { display: "flex", flexDirection: "column" }, children: dashboardLoading && !(isAdmin ? dashboard : userDashboard) ? (_jsx("div", { className: "panel", style: { textAlign: "center", padding: "56px 0", color: "var(--ink-3)" }, children: "Loading dashboard metrics..." })) : dashboardError && !(isAdmin ? dashboard : userDashboard) ? (_jsx("div", { className: "panel", style: { textAlign: "center", padding: "56px 0", color: "var(--red)" }, children: dashboardError })) : isAdmin && dashboard ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-v2-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "Security Overview" }), _jsx("p", { children: "High-level view of users, files, and system activity." })] }), _jsxs("div", { className: "time-range-picker", onClick: refreshDashboard, children: [_jsx(CalendarIcon, {}), _jsx("span", { children: "Last 7 Days" }), _jsx(ChevronIcon, {})] })] }), _jsxs("section", { className: "metrics-v2-grid", children: [_jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.1s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Total Users" }), _jsx(UsersIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: dashboard.users.total.toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { className: "text-green", children: [dashboard.users.active, " Active"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-4)" }, children: [dashboard.users.disabled, " Disabled"] })] })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.15s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Active Items" }), _jsx(LayersIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: dashboard.items.total_active.toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.items.files, " Files"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.items.folders, " Folders"] })] })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.2s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Role / Permission Sets" }), _jsx(KeyIcon, { size: 16, className: "m-v2-icon" })] }), _jsxs("div", { className: "m-v2-value", children: [dashboard.roles.total, _jsx("span", { style: { color: "var(--ink-4)", fontWeight: 400, margin: "0 4px" }, children: "/" }), dashboard.permissions.total] }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.shares.total, " Grants"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.items.deleted, " Deleted"] })] })] }), _jsxs("div", { className: "metric-v2-card bg-alert-subtle", style: { border: "1px solid rgba(248, 113, 113, 0.2)", transitionDelay: "0.25s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title text-alert", children: "Auth Security (24H)" }), _jsx(ShieldAlertIcon, { size: 16, className: "m-v2-icon text-alert" })] }), _jsx("div", { className: "m-v2-value text-alert", children: dashboard.activityLast24h.login_failed }), _jsxs("div", { className: "m-v2-footer", children: [_jsx("span", { className: "badge badge-disabled", style: { padding: "2px 6px", fontSize: 11 }, children: "Failed Logins" }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [dashboard.activityLast24h.logins, " total"] })] })] })] }), _jsxs("section", { className: "bento-v2-grid", children: [_jsxs("div", { className: "panel-v2", children: [_jsxs("div", { className: "panel-v2-header", children: [_jsx("h2", { children: "Top Actions (7 Days)" }), _jsx("button", { className: "btn-ghost", style: { padding: 4 }, children: _jsx(ActivityIcon, { size: 16 }) })] }), _jsx("div", { className: "action-v2-list", children: dashboard.topActions7d.length === 0 ? (_jsx("div", { style: { color: "var(--ink-4)", fontSize: 14, padding: "20px 0", textAlign: "center" }, children: "No recent activity." })) : (dashboard.topActions7d.map((row) => {
                                                        const max = Math.max(...dashboard.topActions7d.map((a) => a.count), 1);
                                                        const width = Math.max(8, Math.round((row.count / max) * 100));
                                                        const isAlert = row.action.includes("failed") || row.action.includes("delete");
                                                        return (_jsxs("div", { className: "action-v2-item", children: [_jsxs("div", { className: "a-v2-info", children: [_jsx("span", { className: `a-v2-name ${isAlert ? "text-alert" : ""}`, children: formatActionLabel(row.action) }), _jsx("span", { className: "a-v2-count", children: row.count })] }), _jsx("div", { className: "progress-v2-track", children: _jsx("div", { className: `progress-v2-fill ${isAlert ? "fill-red" : row.action.includes("create") || row.action.includes("upload") ? "fill-accent" : "fill-muted"}`, style: { width: `${width}%` } }) })] }, row.action));
                                                    })) })] }), _jsxs("div", { className: "panel-v2", children: [_jsxs("div", { className: "panel-v2-header", children: [_jsx("h2", { children: "Activity Snapshot" }), _jsx("span", { className: "badge badge-neutral", style: { fontSize: 11 }, children: "24h" })] }), _jsxs("div", { className: "snapshot-v2-grid", children: [_jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Logins" }), _jsx("span", { className: "s-v2-val", children: dashboard.activityLast24h.logins })] }), _jsxs("div", { className: "snap-v2-box bg-alert-subtle", children: [_jsx("span", { className: "s-v2-label text-alert", children: "Login Failed" }), _jsx("span", { className: "s-v2-val text-alert", children: dashboard.activityLast24h.login_failed })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Uploads" }), _jsx("span", { className: "s-v2-val", children: dashboard.activityLast24h.uploads })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Downloads" }), _jsx("span", { className: "s-v2-val", children: dashboard.activityLast24h.downloads })] })] })] })] }), _jsxs("div", { className: "panel-v2 table-panel-v2", children: [_jsxs("div", { className: "panel-v2-header", children: [_jsx("h2", { children: "Recent Security Activity" }), _jsxs("div", { style: { display: "flex", gap: 10 }, children: [_jsxs("div", { style: { position: "relative", display: "flex", alignItems: "center" }, children: [_jsx(SearchIcon, { style: { position: "absolute", left: 10, color: "var(--ink-4)" } }), _jsx("input", { type: "text", placeholder: "Search logs...", className: "modal-input", style: { margin: 0, paddingLeft: 34, width: 180, fontSize: 13, height: 34 } })] }), _jsx("button", { className: "btn-ghost", style: { border: "1px solid var(--border)", borderRadius: 8, height: 34, width: 34, padding: 0 }, children: _jsx(FilterIcon, { size: 14 }) })] })] }), dashboard.recentAudit.length === 0 ? (_jsx("div", { style: { color: "var(--ink-4)", fontSize: 14, padding: "40px 0", textAlign: "center" }, children: "No security entries yet." })) : (_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Time" }), _jsx("th", { children: "Action" }), _jsx("th", { children: "Actor" }), _jsx("th", { children: "Target" })] }) }), _jsx("tbody", { children: dashboard.recentAudit.map((log) => {
                                                        const isAlert = log.action.includes("failed") || log.action.includes("delete");
                                                        return (_jsxs("tr", { className: isAlert ? "row-danger" : "", children: [_jsx("td", { className: "cell-muted", style: { fontSize: 12 }, children: formatDate(log.created_at) }), _jsx("td", { children: _jsx("span", { className: `pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`, children: formatActionLabel(log.action) }) }), _jsx("td", { className: "t-main", style: { fontWeight: 600 }, children: log.actor_email ?? "system" }), _jsxs("td", { className: "cell-muted", style: { fontFamily: "ui-monospace, monospace", fontSize: 12 }, children: [log.target_type, log.target_id ? ` · ${String(log.target_id).slice(0, 8)}...` : ""] })] }, log.id));
                                                    }) })] }))] })] })) : !isAdmin && userDashboard ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "dashboard-v2-header", children: [_jsxs("div", { children: [_jsx("h1", { children: "My Dashboard" }), _jsx("p", { children: "Live usage and activity for your account." })] }), _jsxs("div", { className: "time-range-picker", onClick: refreshDashboard, children: [_jsx(CalendarIcon, {}), _jsx("span", { children: "Last 7 Days" }), _jsx(ChevronIcon, {})] })] }), _jsxs("section", { className: "metrics-v2-grid", children: [_jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.1s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Accessible Items" }), _jsx(LayersIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: userDashboard.items.total_accessible.toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.items.files, " Files"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.items.folders, " Folders"] })] })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.15s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Ownership" }), _jsx(UsersIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: userDashboard.items.owned.toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsx("span", { style: { color: "var(--ink-3)" }, children: "Owned by you" }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.items.shared_with_me, " Shared with you"] })] })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.2s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "Current Role" }), _jsx(ShieldIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", style: { textTransform: "capitalize" }, children: userDashboard.role }), _jsx("div", { className: "m-v2-footer", children: _jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.permissions.length, " Active permissions"] }) })] }), _jsxs("div", { className: "metric-v2-card", style: { transitionDelay: "0.25s" }, children: [_jsxs("div", { className: "m-v2-header", children: [_jsx("span", { className: "m-v2-title", children: "24H Actions" }), _jsx(ActivityIcon, { size: 16, className: "m-v2-icon" })] }), _jsx("div", { className: "m-v2-value", children: (userDashboard.activityLast24h.uploads + userDashboard.activityLast24h.downloads + userDashboard.activityLast24h.updates + userDashboard.activityLast24h.deletes).toLocaleString() }), _jsxs("div", { className: "m-v2-footer", children: [_jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.activityLast24h.logins, " Logins"] }), _jsx("span", { className: "m-divider" }), _jsxs("span", { style: { color: "var(--ink-3)" }, children: [userDashboard.activityLast24h.shares, " Shares"] })] })] })] }), _jsxs("section", { className: "bento-v2-grid", children: [_jsxs("div", { className: "panel-v2", children: [_jsxs("div", { className: "panel-v2-header", children: [_jsx("h2", { children: "Top Actions (7 Days)" }), _jsx("button", { className: "btn-ghost", style: { padding: 4 }, children: _jsx(ActivityIcon, { size: 16 }) })] }), _jsx("div", { className: "action-v2-list", children: userDashboard.topActions7d.length === 0 ? (_jsx("div", { style: { color: "var(--ink-4)", fontSize: 14, padding: "20px 0", textAlign: "center" }, children: "No recent activity." })) : (userDashboard.topActions7d.map((row) => {
                                                        const max = Math.max(...userDashboard.topActions7d.map((a) => a.count), 1);
                                                        const width = Math.max(8, Math.round((row.count / max) * 100));
                                                        const isAlert = row.action.includes("failed") || row.action.includes("delete");
                                                        return (_jsxs("div", { className: "action-v2-item", children: [_jsxs("div", { className: "a-v2-info", children: [_jsx("span", { className: `a-v2-name ${isAlert ? "text-alert" : ""}`, children: formatActionLabel(row.action) }), _jsx("span", { className: "a-v2-count", children: row.count })] }), _jsx("div", { className: "progress-v2-track", children: _jsx("div", { className: `progress-v2-fill ${isAlert ? "fill-red" : row.action.includes("create") || row.action.includes("upload") ? "fill-accent" : "fill-muted"}`, style: { width: `${width}%` } }) })] }, row.action));
                                                    })) })] }), _jsxs("div", { className: "panel-v2", children: [_jsxs("div", { className: "panel-v2-header", children: [_jsx("h2", { children: "Activity Snapshot" }), _jsx("span", { className: "badge badge-neutral", style: { fontSize: 11 }, children: "24h" })] }), _jsxs("div", { className: "snapshot-v2-grid", children: [_jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Logins" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.logins })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Uploads" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.uploads })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Downloads" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.downloads })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Updates" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.updates })] }), _jsxs("div", { className: "snap-v2-box bg-alert-subtle", children: [_jsx("span", { className: "s-v2-label text-alert", children: "Deletes" }), _jsx("span", { className: "s-v2-val text-alert", children: userDashboard.activityLast24h.deletes })] }), _jsxs("div", { className: "snap-v2-box", children: [_jsx("span", { className: "s-v2-label", children: "Shares" }), _jsx("span", { className: "s-v2-val", children: userDashboard.activityLast24h.shares })] })] })] })] }), _jsxs("div", { className: "panel-v2 table-panel-v2", children: [_jsx("div", { className: "panel-v2-header", children: _jsx("h2", { children: "Recent Activity" }) }), userDashboard.recentActivity.length === 0 ? (_jsx("div", { style: { color: "var(--ink-4)", fontSize: 14, padding: "40px 0", textAlign: "center" }, children: "No activity entries yet." })) : (_jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Time" }), _jsx("th", { children: "Action" }), _jsx("th", { children: "Actor" }), _jsx("th", { children: "Target" })] }) }), _jsx("tbody", { children: userDashboard.recentActivity.map((log) => {
                                                        const isAlert = log.action.includes("failed") || log.action.includes("delete");
                                                        return (_jsxs("tr", { className: isAlert ? "row-danger" : "", children: [_jsx("td", { className: "cell-muted", style: { fontSize: 12 }, children: formatDate(log.created_at) }), _jsx("td", { children: _jsx("span", { className: `pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`, children: formatActionLabel(log.action) }) }), _jsx("td", { className: "t-main", style: { fontWeight: 600 }, children: log.actor_email ?? session.user.email }), _jsxs("td", { className: "cell-muted", style: { fontFamily: "ui-monospace, monospace", fontSize: 12 }, children: [log.target_type, log.target_id ? ` · ${String(log.target_id).slice(0, 8)}...` : ""] })] }, log.id));
                                                    }) })] }))] })] })) : (_jsx("div", { className: "panel", style: { textAlign: "center", padding: "56px 0", color: "var(--ink-3)" }, children: "Dashboard data is unavailable." })) })), tab === "Users" && (_jsxs("div", { className: "panel", children: [_jsx("div", { style: { display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderBottom: "1px solid var(--border)" }, children: _jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => setShowCreateUser(true), children: [_jsx(PlusIcon, {}), " Create User"] }) }), _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "User / Name" }), _jsx("th", { children: "Roles" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Created" })] }) }), _jsx("tbody", { children: users.map((user) => (_jsxs("tr", { onClick: () => onSelectUser(user), style: { background: selectedUser?.id === user.id ? "var(--accent-light)" : undefined }, children: [_jsx("td", { children: _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [_jsx("div", { className: "sidebar-avatar", style: { width: 32, height: 32, fontSize: 12 }, children: getInitials({ firstName: user.first_name, lastName: user.last_name, email: user.email }) }), _jsxs("div", { style: { display: "flex", flexDirection: "column" }, children: [_jsx("span", { className: "cell-email", style: { marginBottom: 2 }, children: user.first_name ? `${user.first_name} ${user.last_name}` : "-" }), _jsx("span", { style: { fontSize: 12, color: "var(--ink-4)" }, children: user.email })] })] }) }), _jsx("td", { children: (() => {
                                                        const visibleRoles = (user.roles ?? []).filter((role) => ["viewer", "editor"].includes(role));
                                                        if (visibleRoles.length === 0) {
                                                            return _jsx("span", { className: "cell-muted", children: "-" });
                                                        }
                                                        return visibleRoles.map((role) => (_jsx("span", { className: `badge ${role === "editor" ? "badge-active" : "badge-disabled"}`, style: { marginRight: 4 }, children: role }, role)));
                                                    })() }), _jsx("td", { children: _jsx("span", { className: `badge ${user.status === "active" ? "badge-active" : "badge-disabled"}`, children: user.status }) }), _jsx("td", { className: "cell-muted", children: formatDate(user.created_at) })] }, user.id))) })] }), selectedUser && (_jsx("div", { className: "modal-overlay", onClick: () => setSelectedUser(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 440 }, children: [_jsxs("div", { className: "user-detail-header", children: [_jsx("div", { className: "user-detail-avatar", children: getInitials({ firstName: selectedUser.first_name, lastName: selectedUser.last_name, email: selectedUser.email }) }), _jsxs("div", { children: [_jsx("div", { className: "user-detail-name", children: selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : "System User" }), _jsxs("div", { className: "user-detail-sub", children: [_jsx("span", { children: selectedUser.email }), _jsx("span", { className: `badge ${selectedUser.status === "active" ? "badge-active" : "badge-disabled"}`, style: { marginLeft: 8 }, children: selectedUser.status })] })] })] }), _jsx("div", { className: "user-detail-section-title", children: "Edit User Details" }), _jsxs("div", { style: { display: "grid", gap: 10 }, children: [_jsx("input", { className: "modal-input", type: "text", placeholder: "First Name", value: editUserFirstName, onChange: (e) => setEditUserFirstName(e.target.value), style: { margin: 0 } }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Last Name", value: editUserLastName, onChange: (e) => setEditUserLastName(e.target.value), style: { margin: 0 } }), _jsx("input", { className: "modal-input", type: "email", placeholder: "Email address", value: editUserEmail, onChange: (e) => setEditUserEmail(e.target.value), style: { margin: 0 } })] }), _jsx("div", { style: { display: "flex", marginTop: 12, marginBottom: 12 }, children: _jsx("button", { className: "btn btn-primary btn-sm", onClick: onSaveUserProfile, disabled: isBusy || !editUserEmail.trim(), style: { width: "100%" }, children: isBusy ? "Saving..." : "Save Details" }) }), _jsx("div", { className: "user-detail-section-title", children: "Manage Access Roles" }), _jsx("div", { className: "role-grid", children: roles
                                                .filter((role) => ["viewer", "editor"].includes(role.name))
                                                .map((role) => (_jsxs("div", { className: `role-chip ${selectedRoleIds.has(role.id) ? "assigned" : ""}`, style: { padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: selectedRoleIds.has(role.id) ? "var(--accent-light)" : "transparent" }, children: [_jsx("span", { style: { fontWeight: 600, color: "var(--ink-1)", textTransform: "capitalize" }, children: role.name }), _jsx("button", { onClick: () => onRequestUserAccessRoleChange(role.id), disabled: isBusy || selectedRoleIds.has(role.id), title: selectedRoleIds.has(role.id) ? "Current role" : "Set role", style: { background: selectedRoleIds.has(role.id) ? "var(--green)" : "var(--accent)", color: "white", border: "none", width: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, opacity: isBusy ? 0.6 : 1 }, children: selectedRoleIds.has(role.id) ? "✓" : "+" })] }, role.id))) }), _jsxs("div", { className: "user-detail-actions", style: { display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 24 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => onResetPassword(selectedUser.id), children: "Reset Password" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: () => setDeleteUserId(selectedUser.id), disabled: isBusy || selectedUser.id === session?.user?.id, title: selectedUser.id === session?.user?.id ? "You cannot remove your own account" : "Remove user", children: "Remove User" })] }), _jsx("div", { style: { marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }, children: _jsx("button", { className: "btn btn-primary", onClick: () => {
                                                    void onDoneUserDetails();
                                                }, disabled: isBusy, style: { width: "100%" }, children: isBusy ? "Saving..." : isUserProfileDirty ? "Save & Done" : "Done" }) })] }) })), resetUserId && (_jsx("div", { className: "modal-overlay", onClick: () => setResetUserId(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 400 }, children: [_jsx("div", { className: "modal-title", children: "Reset Password" }), _jsx("div", { className: "modal-desc", children: "Enter a new password for this user." }), _jsxs("div", { style: { fontSize: 12, color: "var(--ink-4)", marginBottom: 14, padding: "10px 14px", background: "var(--surface)", borderRadius: 10, lineHeight: 1.6 }, children: ["\uD83D\uDD12 Must be ", _jsx("strong", { children: "8+ characters" }), " with uppercase, lowercase, number and special character (e.g. ", _jsx("code", { children: "Secure@123" }), ")."] }), _jsxs("div", { className: "input-group", style: { marginBottom: 20 }, children: [_jsx("span", { className: "input-icon", children: _jsx(LockIcon, {}) }), _jsx("input", { type: showResetPassword ? "text" : "password", placeholder: "New password", value: resetNewPassword, onChange: (e) => setResetNewPassword(e.target.value), required: true, autoFocus: true }), _jsx("button", { type: "button", className: "input-action-btn", onClick: () => setShowResetPassword(!showResetPassword), children: showResetPassword ? _jsx(EyeOffIcon, { size: 18 }) : _jsx(EyeIcon, { size: 18 }) })] }), _jsxs("div", { style: { display: "flex", gap: 12 }, children: [_jsx("button", { className: "btn btn-secondary", onClick: () => setResetUserId(null), style: { flex: 1 }, children: "Cancel" }), _jsx("button", { className: "btn btn-primary", onClick: onConfirmResetPassword, disabled: isBusy || Boolean(resetPasswordError), style: { flex: 1 }, children: isBusy ? "Resetting..." : "Reset Password" })] })] }) })), pendingRoleChange && selectedUser && (_jsx("div", { className: "modal-overlay", onClick: () => (!isBusy ? setPendingRoleChange(null) : undefined), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 420 }, children: [_jsx("div", { className: "modal-title", children: "Confirm role change" }), _jsxs("div", { className: "modal-desc", style: { lineHeight: 1.6 }, children: ["Change ", _jsx("strong", { children: selectedUser.email }), " from", " ", _jsx("strong", { children: pendingRoleChange.currentRoleName ?? "no role" }), " to", " ", _jsx("strong", { children: pendingRoleChange.roleName }), "?"] }), _jsxs("div", { style: { display: "flex", gap: 12 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setPendingRoleChange(null), disabled: isBusy, style: { flex: 1 }, children: "Cancel" }), _jsx("button", { className: "btn btn-primary btn-sm", onClick: () => {
                                                        void onConfirmUserAccessRoleChange();
                                                    }, disabled: isBusy, style: { flex: 1 }, children: isBusy ? "Updating..." : "Confirm" })] })] }) })), deleteUserId && (_jsx("div", { className: "modal-overlay", onClick: () => (!isBusy ? setDeleteUserId(null) : undefined), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 420 }, children: [_jsx("div", { className: "modal-title", children: "Remove user" }), _jsxs("div", { className: "modal-desc", style: { lineHeight: 1.6 }, children: ["This will permanently remove ", _jsx("strong", { children: deleteUserTarget?.email ?? "this user" }), " and all owned data. This action cannot be undone."] }), _jsxs("div", { style: { display: "flex", gap: 12 }, children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setDeleteUserId(null), disabled: isBusy, style: { flex: 1 }, children: "Cancel" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: onConfirmRemoveUser, disabled: isBusy, style: { flex: 1 }, children: isBusy ? "Removing..." : "Remove User" })] })] }) }))] })), tab === "Roles" && (_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }, children: roles
                            .filter((role) => ["viewer", "editor"].includes(role.name))
                            .map((role) => (_jsxs("div", { className: "panel", style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14 }, children: [_jsx("div", { style: { width: 42, height: 42, borderRadius: 12, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }, children: _jsx(ShieldIcon, {}) }), _jsxs("div", { children: [_jsx("div", { style: { fontSize: 16, fontWeight: 700, color: "var(--ink-1)", textTransform: "capitalize" }, children: role.name }), _jsxs("div", { style: { fontSize: 12, color: "var(--ink-4)", marginTop: 2, fontFamily: "monospace" }, children: ["ID: ", role.id.slice(0, 8), "..."] })] })] }), _jsx("div", { className: "badge badge-active", style: { fontSize: 11, fontWeight: 600 }, children: "Active" })] }, role.id))) })), tab === "Permissions" && (_jsxs("div", { className: "panel", style: { padding: 28 }, children: [_jsx("p", { style: { color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }, children: "Permission settings for each role are editable here. Changes are saved immediately." }), _jsxs("div", { style: {
                                    marginBottom: 20,
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    border: "1px solid var(--border)",
                                    background: "var(--surface)",
                                    color: "var(--ink-2)",
                                    fontSize: 13,
                                    lineHeight: 1.6
                                }, children: ["This can be edited: click any permission row to switch it between ", _jsx("strong", { children: "Enabled" }), " and ", _jsx("strong", { children: "Disabled" }), "."] }), _jsx("div", { style: { display: "grid", gap: 20 }, children: roles
                                    .filter((role) => ["viewer", "editor"].includes(role.name))
                                    .map((role) => {
                                    const assignedSet = new Set((rolePermMap.find((entry) => entry.role_name === role.name)?.permissions ?? []).filter(Boolean));
                                    return (_jsxs("div", { style: {
                                            background: "var(--bg)",
                                            borderRadius: 12,
                                            padding: "20px 24px",
                                            border: "1px solid var(--border)"
                                        }, children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }, children: [_jsx(ShieldIcon, {}), _jsx("span", { style: { fontSize: 16, fontWeight: 600, color: "var(--ink-1)", textTransform: "capitalize" }, children: role.name }), _jsxs("span", { style: {
                                                            fontSize: 12,
                                                            color: "var(--ink-4)",
                                                            background: "var(--surface)",
                                                            padding: "2px 10px",
                                                            borderRadius: 10
                                                        }, children: [assignedSet.size, " permission", assignedSet.size !== 1 ? "s" : ""] }), _jsx("span", { style: { marginLeft: "auto", fontSize: 12, color: "var(--accent)", fontWeight: 600 }, children: "Editable" })] }), permissions.length === 0 ? (_jsx("span", { style: { fontSize: 13, color: "var(--ink-4)", fontStyle: "italic" }, children: "No permissions available" })) : (_jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }, children: permissions.map((perm) => {
                                                    const [category] = perm.key.split(":");
                                                    const colorMap = {
                                                        items: "var(--accent)",
                                                        users: "var(--green)",
                                                        roles: "#e8912d",
                                                        audit: "#9b59b6"
                                                    };
                                                    const color = colorMap[category] ?? "var(--ink-3)";
                                                    const assigned = assignedSet.has(perm.key);
                                                    const label = getPermissionDisplayLabel(perm);
                                                    return (_jsxs("button", { type: "button", disabled: isBusy, onClick: () => {
                                                            void onToggleRolePermission(role.name, perm.key);
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
                                                            textAlign: "left"
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
                                                                    flexShrink: 0
                                                                }, children: assigned ? "✓" : "" }), _jsxs("span", { style: { display: "grid", gap: 2 }, children: [_jsx("span", { style: { fontWeight: 600, color: "var(--ink-1)" }, children: label }), _jsx("span", { style: { fontSize: 11, color: "var(--ink-4)", fontFamily: "ui-monospace, monospace" }, children: perm.key })] }), _jsx("span", { style: { marginLeft: "auto", fontSize: 12, opacity: 0.9 }, children: assigned ? "Enabled" : "Disabled" })] }, `${role.id}:${perm.id}`));
                                                }) }))] }, role.id));
                                }) })] })), tab === "Files" && (_jsxs(_Fragment, { children: [viewerItem ? (_jsxs("div", { className: "file-viewer-shell", children: [_jsxs("div", { className: "file-viewer-header", children: [_jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [_jsxs("button", { className: "btn btn-secondary btn-sm", onClick: closeViewer, children: [_jsx(ArrowLeftIcon, {}), " Back to Files"] }), _jsx("span", { className: "file-viewer-title", children: viewerItem.name })] }), _jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [_jsxs("button", { className: "btn btn-secondary btn-sm", onClick: () => onDownload(viewerItem), children: [_jsx(DownloadIcon, {}), " Download"] }), viewerUrl && (_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => window.open(viewerUrl, "_blank", "noopener,noreferrer"), children: "Open Raw" })), canWrite && (_jsxs("button", { className: "btn btn-secondary btn-sm", onClick: () => onOpenEdit(viewerItem), children: [_jsx(EditIcon, {}), " Edit name"] })), canDelete && (_jsxs("button", { className: "btn btn-danger btn-sm", onClick: () => setDeleteTarget(viewerItem), children: [_jsx(TrashIcon, {}), " Delete"] }))] })] }), viewerLoading ? (_jsx("div", { className: "file-viewer-loading", children: "Loading file preview..." })) : viewerError ? (_jsx("div", { className: "file-viewer-error", children: viewerError })) : !viewerUrl ? (_jsx("div", { className: "file-viewer-error", children: "Preview unavailable." })) : isCurrentViewerPdf ? (_jsxs("div", { className: "pdf-editor-layout", children: [_jsxs("div", { className: "pdf-preview-pane", children: [_jsxs("div", { className: "pdf-preview-toolbar", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setViewerPdfPage((prev) => Math.max(1, prev - 1)), disabled: selectedPdfPage <= 1, children: "Previous" }), _jsxs("div", { className: "pdf-page-indicator", children: ["Page ", selectedPdfPage, " of ", viewerPdfPages] }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setViewerPdfPage((prev) => Math.min(viewerPdfPages, prev + 1)), disabled: selectedPdfPage >= viewerPdfPages, children: "Next" })] }), _jsxs("div", { className: "pdf-preview-meta", children: [_jsx("span", { children: "Fit to width" }), _jsxs("strong", { children: [pdfScalePercent, "%"] })] }), _jsxs("div", { className: "pdf-canvas-wrap", ref: pdfCanvasWrapRef, children: [_jsx("canvas", { ref: pdfCanvasRef, className: "pdf-preview-canvas" }), pdfRendering && (_jsx("div", { className: "pdf-render-overlay", children: "Rendering page\u2026" })), pdfRenderError && (_jsx("div", { className: "pdf-render-overlay pdf-render-overlay-error", children: pdfRenderError }))] })] }), _jsxs("div", { className: "file-details-pane", children: [_jsx("h3", { children: "PDF Details" }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Name" }), _jsx("strong", { children: viewerItem.name })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Type" }), _jsx("strong", { children: viewerContentType || viewerItem.content_type || "application/pdf" })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Size" }), _jsx("strong", { children: formatBytes(viewerItem.size_bytes) })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Total pages" }), _jsx("strong", { children: viewerPdfPages })] }), viewerItem.updated_at && (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Updated" }), _jsx("strong", { children: formatDate(viewerItem.updated_at) })] }))] })] })) : viewerTextPreview !== null ? (_jsxs("div", { className: "file-viewer-generic", children: [_jsx("div", { className: "file-text-preview", children: _jsx("pre", { children: viewerTextPreview || "(No preview available.)" }) }), _jsxs("div", { className: "file-details-pane", children: [_jsx("h3", { children: "File Details" }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Name" }), _jsx("strong", { children: viewerItem.name })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Type" }), _jsx("strong", { children: viewerContentType || viewerItem.content_type || "Unknown" })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Size" }), _jsx("strong", { children: formatBytes(viewerItem.size_bytes) })] }), viewerItem.updated_at && (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Updated" }), _jsx("strong", { children: formatDate(viewerItem.updated_at) })] })), viewerPreviewNote && _jsx("div", { className: "file-preview-note", children: viewerPreviewNote })] })] })) : (_jsxs("div", { className: "file-viewer-generic", children: [_jsx("div", { className: "file-generic-preview", children: viewerContentType.startsWith("image/") ? (_jsx("img", { src: viewerUrl, alt: viewerItem.name, className: "file-image-preview" })) : canEmbedCurrentViewer ? (_jsx("object", { data: viewerUrl, type: viewerContentType || "application/octet-stream", className: "file-generic-frame", children: _jsx("iframe", { title: viewerItem.name, src: viewerUrl, className: "file-generic-frame" }) })) : (_jsx("div", { style: {
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        height: "100%",
                                                        padding: "24px",
                                                        color: "var(--ink-3)",
                                                        textAlign: "center",
                                                        lineHeight: 1.6
                                                    }, children: "This file type cannot be previewed in the browser. Use Download to view it in the native app." })) }), _jsxs("div", { className: "file-details-pane", children: [_jsx("h3", { children: "File Details" }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Name" }), _jsx("strong", { children: viewerItem.name })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Type" }), _jsx("strong", { children: viewerContentType || viewerItem.content_type || "Unknown" })] }), _jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Size" }), _jsx("strong", { children: formatBytes(viewerItem.size_bytes) })] }), viewerItem.updated_at && (_jsxs("div", { className: "file-detail-row", children: [_jsx("span", { children: "Updated" }), _jsx("strong", { children: formatDate(viewerItem.updated_at) })] })), viewerPreviewNote && _jsx("div", { className: "file-preview-note", children: viewerPreviewNote })] })] }))] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "breadcrumb", children: [_jsxs("button", { className: `breadcrumb-item ${path.length === 0 ? "current" : ""}`, onClick: goToRoot, children: [_jsx(HomeIcon, {}), " Root"] }), path.map((crumb, index) => (_jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [_jsx("span", { className: "breadcrumb-sep", children: _jsx(ChevronIcon, {}) }), _jsx("button", { className: `breadcrumb-item ${index === path.length - 1 ? "current" : ""}`, onClick: () => goToBreadcrumb(index), children: crumb.name })] }, crumb.id)))] }), canWrite ? (_jsxs("div", { className: "file-toolbar", children: [_jsxs("button", { className: "btn btn-primary btn-sm", onClick: () => { setFolderName(""); setShowFolderModal(true); }, disabled: isBusy, children: [_jsx(PlusIcon, {}), " New Folder"] }), _jsxs("label", { className: "upload-label", children: [_jsx(UploadIcon, {}), " Upload Files", _jsx("input", { type: "file", multiple: true, onChange: (e) => {
                                                            const files = e.target.files;
                                                            if (files?.length)
                                                                onUploadFiles(files);
                                                            e.currentTarget.value = "";
                                                        } })] })] })) : (_jsxs("div", { style: { padding: "8px 16px", fontSize: 13, color: "var(--ink-4)", display: "flex", alignItems: "center", gap: 6 }, children: [_jsx(KeyIcon, {}), " Read-only access \u2014 you can view and download files."] })), _jsx("div", { className: "panel", children: items.length === 0 ? (_jsxs("div", { style: { textAlign: "center", padding: "48px 0", color: "var(--ink-3)" }, children: [_jsx(FolderIcon, { size: 40 }), _jsx("p", { style: { marginTop: 12, fontSize: 15 }, children: "This folder is empty" }), _jsx("p", { style: { fontSize: 13, color: "var(--ink-4)" }, children: "Create a folder or upload a file to get started." })] })) : (_jsx("div", { className: "file-grid", children: items.map((item) => (_jsxs("div", { className: "file-row", children: [_jsx("div", { className: `file-icon-box ${item.type === "folder" ? "file-icon-folder" : "file-icon-file"}`, children: item.type === "folder" ? _jsx(FolderIcon, {}) : _jsx(FileIcon, {}) }), _jsxs("div", { children: [_jsx("div", { className: "file-name clickable", onClick: () => (item.type === "folder" ? openFolder(item) : onOpenFile(item)), children: item.name }), _jsxs("div", { className: "file-type", children: [item.type, " ", item.type === "file" ? `· ${formatBytes(item.size_bytes)}` : ""] })] }), _jsxs("div", { className: "file-actions", children: [item.type === "file" && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => onOpenFile(item), title: "Open", children: _jsx(EyeIcon, { size: 16 }) })), _jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => onDownload(item), title: "Download", children: _jsx(DownloadIcon, {}) }), canWrite && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => onOpenEdit(item), title: "Edit", children: _jsx(EditIcon, {}) })), canDelete && (_jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setDeleteTarget(item), title: "Delete", style: { color: "var(--red)" }, children: _jsx(TrashIcon, {}) }))] })] }, item.id))) })) })] })), showFolderModal && (_jsx("div", { className: "modal-overlay", onClick: () => setShowFolderModal(false), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "modal-icon modal-icon-folder", children: _jsx(FolderIcon, { size: 24 }) }), _jsx("div", { className: "modal-title", children: "Create new folder" }), _jsx("div", { className: "modal-desc", children: "Enter a name for your new folder." }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); onCreateFolder(); }, children: [_jsx("input", { className: "modal-input", placeholder: "Folder name", value: folderName, onChange: (e) => setFolderName(e.target.value), autoFocus: true, required: true }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setShowFolderModal(false), children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: !folderName.trim() || isBusy, children: "Create" })] })] })] }) })), deleteTarget && (_jsx("div", { className: "modal-overlay", onClick: () => setDeleteTarget(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "modal-icon modal-icon-danger", children: _jsx(TrashIcon, {}) }), _jsxs("div", { className: "modal-title", children: ["Delete ", deleteTarget.type] }), _jsxs("div", { className: "modal-desc", children: ["Are you sure you want to delete ", _jsxs("strong", { children: ["\u201C", deleteTarget.name, "\u201D"] }), "? This action cannot be undone."] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => setDeleteTarget(null), children: "Cancel" }), _jsx("button", { className: "btn btn-danger btn-sm", onClick: onConfirmDelete, disabled: isBusy, children: "Delete" })] })] }) })), editTarget && (_jsx("div", { className: "modal-overlay", onClick: () => setEditTarget(null), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "modal-icon modal-icon-folder", children: _jsx(EditIcon, { size: 22 }) }), _jsxs("div", { className: "modal-title", children: ["Edit ", editTarget.type, " name"] }), _jsxs("div", { className: "modal-desc", children: ["Update the display name for this ", editTarget.type, "."] }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); onConfirmEdit(); }, children: [_jsx("input", { className: "modal-input", placeholder: "Enter new name", value: editName, onChange: (e) => setEditName(e.target.value), autoFocus: true, required: true }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setEditTarget(null), children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: !editName.trim() || isBusy, children: "Save" })] })] })] }) }))] })), tab === "Audit Logs" && (_jsxs("div", { className: "panel", children: [_jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 16, flexWrap: "wrap" }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: 20, fontWeight: 800, color: "var(--ink-1)" }, children: "Audit Activity" }), _jsx("p", { style: { margin: "8px 0 0", fontSize: 14, color: "var(--ink-3)" }, children: "Track who did what, when it happened, and what target was affected." })] }), _jsxs("button", { className: "btn btn-secondary btn-sm", onClick: () => {
                                            void refreshAuditLogs();
                                        }, disabled: auditLoading, children: [_jsx(ActivityIcon, { size: 16 }), " ", auditLoading ? "Refreshing..." : "Refresh"] })] }), _jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 }, children: [_jsxs("div", { style: { display: "grid", gap: 6 }, children: [_jsx("label", { style: { fontSize: 12, color: "var(--ink-4)", fontWeight: 600 }, children: "Filter by User" }), _jsxs("select", { className: "modal-input", style: { margin: 0 }, value: auditFilterUserId, onChange: (e) => setAuditFilterUserId(e.target.value), children: [_jsx("option", { value: "", children: "All users" }), users.map((user) => (_jsx("option", { value: user.id, children: user.email }, user.id)))] })] }), _jsxs("div", { style: { display: "grid", gap: 6 }, children: [_jsx("label", { style: { fontSize: 12, color: "var(--ink-4)", fontWeight: 600 }, children: "Filter by Activity" }), _jsxs("select", { className: "modal-input", style: { margin: 0 }, value: auditFilterAction, onChange: (e) => setAuditFilterAction(e.target.value), children: [_jsx("option", { value: "", children: "All activities" }), auditActionOptions.map((action) => (_jsx("option", { value: action, children: formatActionLabel(action) }, action)))] })] }), _jsxs("div", { style: { display: "flex", alignItems: "end", gap: 8 }, children: [_jsx("button", { className: "btn btn-primary btn-sm", onClick: () => {
                                                    void refreshAuditLogs();
                                                }, disabled: auditLoading, children: auditLoading ? "Loading..." : "Apply Filters" }), _jsx("button", { className: "btn btn-secondary btn-sm", onClick: () => {
                                                    setAuditFilterUserId("");
                                                    setAuditFilterAction("");
                                                    void refreshAuditLogs({ action: undefined, userId: undefined });
                                                }, disabled: auditLoading || (!auditFilterUserId && !auditFilterAction), children: "Clear" })] })] }), _jsxs("div", { style: { fontSize: 12, color: "var(--ink-4)", marginBottom: 10 }, children: ["Showing ", auditLogs.length, " event", auditLogs.length === 1 ? "" : "s"] }), auditError ? (_jsx("div", { className: "panel", style: { color: "var(--red)", textAlign: "center", padding: "24px 0" }, children: auditError })) : auditLoading && auditLogs.length === 0 ? (_jsx("div", { className: "panel", style: { color: "var(--ink-3)", textAlign: "center", padding: "24px 0" }, children: "Loading activity logs..." })) : auditLogs.length === 0 ? (_jsx("div", { className: "panel", style: { color: "var(--ink-3)", textAlign: "center", padding: "24px 0" }, children: "No activity found for the selected filters." })) : (_jsx("div", { style: { overflowX: "auto" }, children: _jsxs("table", { className: "data-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { style: { minWidth: 180 }, children: "Time" }), _jsx("th", { style: { minWidth: 220 }, children: "User" }), _jsx("th", { style: { minWidth: 180 }, children: "Activity" }), _jsx("th", { style: { minWidth: 180 }, children: "Target" }), _jsx("th", { children: "Details" })] }) }), _jsx("tbody", { children: auditLogs.map((log) => {
                                                const isAlert = log.action.includes("failed") || log.action.includes("delete");
                                                return (_jsxs("tr", { className: isAlert ? "row-danger" : "", children: [_jsx("td", { className: "cell-muted", children: formatDate(log.created_at) }), _jsx("td", { style: { fontWeight: 600 }, children: log.actor_email ?? "System" }), _jsx("td", { children: _jsx("span", { className: `pill-v2 ${isAlert ? "pill-v2-red" : "pill-v2-blue"}`, children: formatActionLabel(log.action) }) }), _jsxs("td", { className: "cell-muted", style: { fontFamily: "ui-monospace, monospace", fontSize: 12 }, children: [log.target_type, log.target_id ? ` · ${String(log.target_id).slice(0, 8)}...` : ""] }), _jsx("td", { className: "cell-muted", style: { fontSize: 12 }, children: summarizeAuditMetadata(log.metadata) })] }, log.id));
                                            }) })] }) }))] })), showCreateUser && (_jsx("div", { className: "modal-overlay", onClick: () => setShowCreateUser(false), children: _jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "modal-icon modal-icon-folder", children: _jsx(UsersIcon, {}) }), _jsx("div", { className: "modal-title", children: "Create new user" }), _jsx("div", { className: "modal-desc", children: "Add a new user to the system with their personal details and role." }), _jsxs("form", { onSubmit: (e) => { e.preventDefault(); onCreateUserSubmit(); }, children: [_jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }, children: [_jsx("input", { className: "modal-input", type: "text", placeholder: "First Name", value: newUserFirstName, onChange: (e) => setNewUserFirstName(e.target.value), required: true, style: { margin: 0 } }), _jsx("input", { className: "modal-input", type: "text", placeholder: "Last Name", value: newUserLastName, onChange: (e) => setNewUserLastName(e.target.value), required: true, style: { margin: 0 } })] }), _jsx("input", { className: "modal-input", type: "email", placeholder: "Email address", value: newUserEmail, onChange: (e) => setNewUserEmail(e.target.value), required: true, style: { marginBottom: 12 } }), _jsxs("div", { style: { position: "relative", marginBottom: 6 }, children: [_jsx("input", { className: "modal-input", type: showNewUserPassword ? "text" : "password", placeholder: "Password", value: newUserPassword, onChange: (e) => setNewUserPassword(e.target.value), required: true, minLength: 8, style: { margin: 0, paddingRight: 40 } }), _jsx("button", { type: "button", onClick: () => setShowNewUserPassword(!showNewUserPassword), style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--ink-4)", cursor: "pointer", display: "flex", alignItems: "center" }, children: showNewUserPassword ? _jsx(EyeOffIcon, { size: 18 }) : _jsx(EyeIcon, { size: 18 }) })] }), _jsxs("div", { style: { fontSize: 12, color: "var(--ink-4)", marginBottom: 12, padding: "8px 12px", background: "var(--surface)", borderRadius: 10, lineHeight: 1.6 }, children: ["\uD83D\uDD12 Min 8 chars \u00B7 Uppercase \u00B7 Lowercase \u00B7 Number \u00B7 Special char", _jsx("br", {}), _jsxs("span", { style: { color: "var(--ink-3)" }, children: ["e.g. ", _jsx("code", { children: "Secure@123" })] })] }), _jsxs("select", { className: "modal-input", value: newUserRole, onChange: (e) => setNewUserRole(e.target.value), style: { marginBottom: 12 }, children: [_jsx("option", { value: "viewer", children: "Viewer (read-only)" }), _jsx("option", { value: "editor", children: "Editor (read/write)" })] }), _jsxs("div", { className: "modal-actions", children: [_jsx("button", { type: "button", className: "btn btn-secondary btn-sm", onClick: () => setShowCreateUser(false), children: "Cancel" }), _jsx("button", { type: "submit", className: "btn btn-primary btn-sm", disabled: !newUserEmail.trim() || Boolean(newUserPasswordError) || isBusy, children: isBusy ? "Creating..." : "Create User" })] })] })] }) }))] }, tab)] }));
}
