import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
  addUserRole,
  createFile,
  createFolder,
  createUser,
  deleteItem,
  downloadItem,
  listAuditLogs,
  listItems,
  listPermissions,
  listRolePermissions,
  listRoles,
  listUserRoles,
  listUsers,
  login,
  logout,
  replaceFile,
  removeUserRole,
  resetUserPassword,
  resetUserRoles,
  updateItemName,
  updateUserStatus,
  verifyOtp
} from "./api";
import type { AuditLog, Item, UserProfile } from "./api";
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

/* =============================================
   Types
   ============================================= */

const ALL_TABS = ["Users", "Roles", "Permissions", "Files", "Audit Logs"] as const;
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

const getInitials = (user: { firstName?: string; lastName?: string; email: string }) => {
  if (user.firstName && user.lastName) {
    return (user.firstName[0] + user.lastName[0]).toUpperCase();
  }
  const name = user.email.split("@")[0] ?? "";
  return name.slice(0, 2).toUpperCase();
};

const tabIcons: Record<Tab, (props: IconProps) => JSX.Element> = {
  Users: UsersIcon,
  Roles: ShieldIcon,
  Permissions: KeyIcon,
  Files: FolderIcon,
  "Audit Logs": ActivityIcon,
};

const tabDescriptions: Record<Tab, string> = {
  Users: "Manage user accounts, assign roles, and control access permissions.",
  Roles: "View and manage the available roles in the system.",
  Permissions: "See which permissions are assigned to each role.",
  Files: "Browse, upload, and manage stored documents and folders.",
  "Audit Logs": "View a chronological log of all system activity.",
};

const getTabsForRole = (roles: string[]): Tab[] => {
  if (roles.includes("admin")) return [...ALL_TABS];
  return ["Files"];
};

/* =============================================
   Toast System
   ============================================= */

type Toast = {
  id: number;
  type: "error" | "success";
  title: string;
  message: string;
  leaving?: boolean;
};

const XSmall = ({ size = 14, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckSmall = ({ size = 14, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const AlertSmall = ({ size = 14, ...props }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type} ${t.leaving ? "leaving" : ""}`}>
          <div className="toast-icon">
            {t.type === "error" ? <AlertSmall /> : <CheckSmall />}
          </div>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            <div className="toast-message">{t.message}</div>
          </div>
          <button className="toast-close" onClick={() => onDismiss(t.id)}>
            <XSmall />
          </button>
          <div className="toast-progress" />
        </div>
      ))}
    </div>
  );
}

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
  const [replaceUploadingId, setReplaceUploadingId] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");
  const [newUserFirstName, setNewUserFirstName] = useState("");
  const [newUserLastName, setNewUserLastName] = useState("");
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("securevault_remember") === "true");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
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
  const selectedPdfPage = Math.max(1, Math.min(viewerPdfPage, viewerPdfPages));

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
    viewerUrlRef.current = viewerUrl;
  }, [viewerUrl]);

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
  const canWrite = isAdmin || userPerms.includes("items:write");
  const canDelete = isAdmin || userPerms.includes("items:delete");
  const visibleTabs = useMemo(() => getTabsForRole(userRolesList), [userRolesList]);

  const showToast = useCallback((type: Toast["type"], title: string, message: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 300);
  }, []);

  const accessToken = session?.accessToken;

  const refreshData = async () => {
    if (!accessToken) return;
    // Only admins can access admin endpoints
    if (isAdmin) {
      const [usersRes, rolesRes, permsRes, rolePermsRes] = await Promise.all([
        listUsers(accessToken),
        listRoles(accessToken),
        listPermissions(accessToken),
        listRolePermissions(accessToken)
      ]);
      setUsers(usersRes);
      setRoles(rolesRes);
      setPermissions(permsRes);
      setRolePermMap(rolePermsRes);
    }
  };

  const refreshItems = async (parentId?: string | null) => {
    if (!accessToken) return;
    const data = await listItems(accessToken, parentId ?? null);
    setItems(data);
  };

  const onLogin = async () => {
    setStatus(null);
    try {
      await login(email, password);
      setLoginStep(3);
      setStatus("OTP sent! Check your email inbox.");
    } catch (err: any) {
      showToast("error", "Login failed", err?.message ?? "Please check your credentials.");
    }
  };

  const onVerifyOtp = async () => {
    setStatus(null);
    try {
      const data = await verifyOtp(email, otp);
      setSession(data);
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
      // Set initial tab based on role
      const userTabs = getTabsForRole(data.user?.roles ?? []);
      setTab(userTabs.includes("Users") ? "Users" : "Files");
    } catch (err: any) {
      showToast("error", "Verification failed", err?.message ?? "Invalid OTP code. Please try again.");
    }
  };

  // Load data after session is set
  useEffect(() => {
    if (session?.accessToken) {
      refreshData();
      refreshItems(null);
    }
  }, [session?.accessToken]);

  const onLogout = async () => {
    if (session) {
      try { await logout(session.refreshToken); } catch (e) { }
    }
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
  };

  const onSelectUser = async (user: User) => {
    if (!accessToken) return;
    setSelectedUser(user);
    const data = await listUserRoles(accessToken, user.id);
    setUserRoles(data);
  };

  const onAddRole = async (roleId: string) => {
    if (!accessToken || !selectedUser) return;
    await addUserRole(accessToken, selectedUser.id, roleId);
    await onSelectUser(selectedUser);
  };

  const onRemoveRole = async (roleId: string) => {
    if (!accessToken || !selectedUser) return;
    await removeUserRole(accessToken, selectedUser.id, roleId);
    await onSelectUser(selectedUser);
  };

  const onResetRoles = async () => {
    if (!accessToken || !selectedUser) return;
    await resetUserRoles(accessToken, selectedUser.id);
    await onSelectUser(selectedUser);
  };

  const onToggleStatus = async (user: User) => {
    if (!accessToken) return;
    const nextStatus = user.status === "active" ? "disabled" : "active";
    await updateUserStatus(accessToken, user.id, nextStatus as "active" | "disabled");
    await refreshData();
    if (selectedUser?.id === user.id) {
      const updated = users.find((u) => u.id === user.id);
      if (updated) setSelectedUser(updated);
    }
  };

  const selectedRoleIds = useMemo(
    () => new Set(userRoles.map((role) => role.id)),
    [userRoles]
  );

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

  const onUploadFile = async (file: File) => {
    if (!accessToken) return;
    setIsBusy(true);
    try {
      await createFile(accessToken, file, currentFolderId);
      await refreshItems(currentFolderId);
      showToast("success", "File uploaded", `${file.name} uploaded successfully.`);
    } catch (error: any) {
      showToast("error", "Upload failed", error?.message ?? "Could not upload file.");
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

  const onReplaceFile = async (item: Item, file: File) => {
    if (!accessToken || item.type !== "file") return;
    setReplaceUploadingId(item.id);
    try {
      const updated = await replaceFile(accessToken, item.id, file, file.name);
      await refreshItems(currentFolderId);
      if (viewerItem?.id === item.id) {
        await onOpenFile(updated);
      }
      showToast("success", "File replaced", `${file.name} uploaded as the latest version.`);
    } catch (error: any) {
      showToast("error", "Replace failed", error?.message ?? "Could not replace file.");
    } finally {
      setReplaceUploadingId(null);
    }
  };

  const onCreateUserSubmit = async () => {
    if (!accessToken) return;
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
      showToast("success", "User created", `Welcome email invitation sent to ${newUserEmail}`);
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
    if (resetNewPassword.length < 6) {
      showToast("error", "Too short", "Password must be at least 6 characters.");
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

  const refreshAuditLogs = async () => {
    if (!accessToken) return;
    try {
      const logs = await listAuditLogs(accessToken, { limit: 100 });
      setAuditLogs(logs);
    } catch {
      // User might not have audit:read permission — silently ignore
    }
  };

  useEffect(() => {
    if (tab === "Audit Logs" && accessToken) {
      refreshAuditLogs();
    }
  }, [tab, accessToken]);

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
                  required
                  autoFocus
                />
                <button type="button" className="input-action-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              <button className="btn btn-primary" type="submit">Continue</button>
            </form>
            <div className="login-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => { setLoginStep(1); setPassword(""); }} style={{ width: "100%", marginTop: 8 }}>
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
                <input type="text" placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} autoFocus />
              </div>
              <button className="btn btn-primary" type="submit">Verify &amp; Sign In</button>
            </form>
            <div className="login-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => { setLoginStep(1); setOtp(""); setPassword(""); setStatus(null); }} style={{ width: "100%", marginTop: 8 }}>
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
              {session.user.roles.join(", ")}
            </div>
          </div>
          <button className="btn-logout" onClick={onLogout} title="Sign out" style={{ marginLeft: "auto", background: "none", border: "none", padding: 8, cursor: "pointer", color: "var(--ink-4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogoutIcon />
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="content" key={tab}>
        <div className="page-header">
          <h1 className="page-title">{tab}</h1>
          <p className="page-subtitle">{tabDescriptions[tab]}</p>
        </div>

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
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => onSelectUser(user)}
                    style={{ background: selectedUser?.id === user.id ? "var(--accent-light)" : undefined }}
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
                      {(user.roles ?? []).map((r) => (
                        <span key={r} className={`badge ${r === 'admin' ? 'badge-accent' : r === 'editor' ? 'badge-active' : 'badge-disabled'}`} style={{ marginRight: 4 }}>{r}</span>
                      ))}
                    </td>
                    <td>
                      <span className={`badge ${user.status === "active" ? "badge-active" : "badge-disabled"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="cell-muted">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedUser && (
              <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
                  <div className="user-detail-header">
                    <div className="user-detail-avatar">
                      {getInitials({ firstName: selectedUser.first_name, lastName: selectedUser.last_name, email: selectedUser.email })}
                    </div>
                    <div>
                      <div className="user-detail-name">
                        {selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : "System User"}
                      </div>
                      <div className="user-detail-sub">
                        <span>{selectedUser.email}</span>
                        <span className={`badge ${selectedUser.status === "active" ? "badge-active" : "badge-disabled"}`} style={{ marginLeft: 8 }}>
                          {selectedUser.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="user-detail-section-title">Manage Access Roles</div>
                  <div className="role-grid">
                    {roles
                      .filter(r => ["editor", "viewer"].includes(r.name))
                      .map((role) => (
                        <div
                          key={role.id}
                          className={`role-chip ${selectedRoleIds.has(role.id) ? "assigned" : ""}`}
                          style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: selectedRoleIds.has(role.id) ? "var(--accent-light)" : "transparent" }}
                        >
                          <span style={{ fontWeight: 600, color: "var(--ink-1)", textTransform: "capitalize" }}>{role.name}</span>
                          {selectedRoleIds.has(role.id) ? (
                            <button onClick={() => onRemoveRole(role.id)} title="Remove role" style={{ background: "var(--red)", color: "white", border: "none", width: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>×</button>
                          ) : (
                            <button onClick={() => onAddRole(role.id)} title="Add role" style={{ background: "var(--accent)", color: "white", border: "none", width: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>+</button>
                          )}
                        </div>
                      ))}
                  </div>

                  <div className="user-detail-actions" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 24 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => onResetPassword(selectedUser.id)}>
                      Reset Password
                    </button>
                    <button
                      className={`btn btn-sm ${selectedUser.status === "active" ? "btn-danger" : "btn-primary"}`}
                      onClick={() => onToggleStatus(selectedUser)}
                    >
                      {selectedUser.status === "active" ? "Disable User" : "Enable User"}
                    </button>
                  </div>

                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                    <button className="btn btn-primary" onClick={() => setSelectedUser(null)} style={{ width: "100%" }}>
                      Done
                    </button>
                  </div>
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
                    <button className="btn btn-primary" onClick={onConfirmResetPassword} disabled={isBusy || resetNewPassword.length < 8} style={{ flex: 1 }}>
                      {isBusy ? "Resetting..." : "Reset Password"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---- ROLES TAB ---- */}
        {tab === "Roles" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {roles.map((role) => (
              <div key={role.id} className="panel" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--accent-light)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ShieldIcon />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-1)", textTransform: "capitalize" }}>{role.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-4)", marginTop: 2, fontFamily: "monospace" }}>ID: {role.id.slice(0, 8)}...</div>
                  </div>
                </div>
                <div className="badge badge-active" style={{ fontSize: 11, fontWeight: 600 }}>Active</div>
              </div>
            ))}
          </div>
        )}

        {/* ---- PERMISSIONS TAB ---- */}
        {tab === "Permissions" && (
          <div className="panel" style={{ padding: 28 }}>
            <p style={{ color: "var(--ink-3)", fontSize: 14, marginBottom: 24 }}>
              This matrix shows which permissions are granted to each role. Permissions determine what actions users with a given role can perform.
            </p>
            <div style={{ display: "grid", gap: 20 }}>
              {rolePermMap
                .filter(rp => rp.role_name !== "user")
                .map((rp) => (
                  <div key={rp.role_name} style={{
                    background: "var(--bg)",
                    borderRadius: 12,
                    padding: "20px 24px",
                    border: "1px solid var(--border)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <ShieldIcon />
                      <span style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-1)", textTransform: "capitalize" }}>
                        {rp.role_name}
                      </span>
                      <span style={{
                        fontSize: 12,
                        color: "var(--ink-4)",
                        background: "var(--surface)",
                        padding: "2px 10px",
                        borderRadius: 10
                      }}>
                        {rp.permissions.filter(Boolean).length} permission{rp.permissions.filter(Boolean).length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {rp.permissions.filter(Boolean).length === 0 ? (
                        <span style={{ fontSize: 13, color: "var(--ink-4)", fontStyle: "italic" }}>No permissions assigned</span>
                      ) : (
                        rp.permissions.filter(Boolean).map((perm) => {
                          const category = perm.split(":")[0];
                          const action = perm.split(":")[1];
                          const colorMap: Record<string, string> = {
                            items: "var(--accent)",
                            users: "var(--green)",
                            roles: "#e8912d",
                            audit: "#9b59b6"
                          };
                          const color = colorMap[category] ?? "var(--ink-3)";
                          return (
                            <span key={perm} style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 12px",
                              borderRadius: 8,
                              fontSize: 13,
                              fontWeight: 500,
                              color,
                              background: `color-mix(in srgb, ${color} 12%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`
                            }}>
                              <span style={{ fontWeight: 600 }}>{category}</span>
                              <span style={{ opacity: 0.5 }}>:</span>
                              <span>{action}</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
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
                      {canWrite && (
                        <label className="upload-label" style={{ marginTop: 14, justifyContent: "center", width: "100%" }}>
                          <UploadIcon /> {replaceUploadingId === viewerItem.id ? "Replacing..." : "Replace PDF"}
                          <input
                            type="file"
                            accept=".pdf,application/pdf"
                            disabled={replaceUploadingId === viewerItem.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onReplaceFile(viewerItem, file);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
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
                      {viewerPreviewNote && <div className="file-preview-note">{viewerPreviewNote}</div>}
                      {canWrite && viewerItem.type === "file" && (
                        <label className="upload-label" style={{ marginTop: 14, justifyContent: "center", width: "100%" }}>
                          <UploadIcon /> {replaceUploadingId === viewerItem.id ? "Replacing..." : "Replace File"}
                          <input
                            type="file"
                            disabled={replaceUploadingId === viewerItem.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onReplaceFile(viewerItem, file);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="file-viewer-generic">
                    <div className="file-generic-preview">
                      {viewerContentType.startsWith("image/") ? (
                        <img src={viewerUrl} alt={viewerItem.name} className="file-image-preview" />
                      ) : (
                        <object
                          data={viewerUrl}
                          type={viewerContentType || "application/octet-stream"}
                          className="file-generic-frame"
                        >
                          <iframe title={viewerItem.name} src={viewerUrl} className="file-generic-frame" />
                        </object>
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
                      {viewerPreviewNote && <div className="file-preview-note">{viewerPreviewNote}</div>}
                      {canWrite && viewerItem.type === "file" && (
                        <label className="upload-label" style={{ marginTop: 14, justifyContent: "center", width: "100%" }}>
                          <UploadIcon /> {replaceUploadingId === viewerItem.id ? "Replacing..." : "Replace File"}
                          <input
                            type="file"
                            disabled={replaceUploadingId === viewerItem.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) onReplaceFile(viewerItem, file);
                              e.currentTarget.value = "";
                            }}
                          />
                        </label>
                      )}
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
                      <UploadIcon /> Upload File
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadFile(file);
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

        {/* ---- AUDIT LOGS TAB ---- */}
        {tab === "Audit Logs" && (
          <div className="panel" style={{ background: "transparent", border: "none", boxShadow: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "0 4px" }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--ink-1)", marginBottom: 4 }}>System Activity</h2>
                <p style={{ fontSize: 14, color: "var(--ink-3)" }}>Monitoring all administrative and user actions in real-time.</p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={refreshAuditLogs} style={{ borderRadius: 12, padding: "10px 20px" }}>
                <ActivityIcon size={16} /> Refresh logs
              </button>
            </div>

            {auditLogs.length === 0 ? (
              <div className="panel" style={{ textAlign: "center", padding: "80px 0", borderRadius: 24 }}>
                <ActivityIcon size={48} opacity={0.1} />
                <p style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: "var(--ink-2)" }}>No activity found</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {(() => {
                  const groups: Record<string, AuditLog[]> = {};
                  auditLogs.forEach(log => {
                    const date = new Date(log.created_at);
                    const label = date.toDateString() === new Date().toDateString() ? "Today" :
                      date.toDateString() === new Date(Date.now() - 86400000).toDateString() ? "Yesterday" :
                        date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
                    if (!groups[label]) groups[label] = [];
                    groups[label].push(log);
                  });

                  return Object.entries(groups).map(([date, logs]) => (
                    <div key={date}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink-4)", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                        {date}
                        <div style={{ flex: 1, height: 1, background: "var(--border)", opacity: 0.5 }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                        {logs.map((log) => {
                          const actionThemes: Record<string, { color: string; bg: string; icon: any }> = {
                            "auth.login": { color: "#27ae60", bg: "#eef9f1", icon: KeyIcon },
                            "auth.login_failed": { color: "#e74c3c", bg: "#fdf2f1", icon: ShieldIcon },
                            "item.created": { color: "#3498db", bg: "#ebf5fb", icon: FolderIcon },
                            "user.created": { color: "#8e44ad", bg: "#f5eef8", icon: UsersIcon },
                            "item.deleted": { color: "#e67e22", bg: "#fdf5ed", icon: TrashIcon },
                            "item.download": { color: "#16a085", bg: "#e8f6f3", icon: DownloadIcon }
                          };
                          const theme = actionThemes[log.action] ?? { color: "var(--ink-3)", bg: "var(--bg)", icon: ActivityIcon };
                          const Icon = theme.icon;

                          return (
                            <div key={log.id} className="panel" style={{
                              padding: "20px",
                              borderRadius: 20,
                              display: "flex",
                              gap: 16,
                              alignItems: "start",
                              border: `1px solid ${theme.bg}`,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
                              transition: "transform 0.2s, box-shadow 0.2s",
                              cursor: "pointer"
                            }} onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.02)"; }}>

                              <div style={{
                                width: 50,
                                height: 50,
                                borderRadius: 16,
                                background: theme.bg,
                                color: theme.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0
                              }}>
                                <Icon size={24} />
                              </div>

                              <div style={{ flex: 1 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>
                                    {log.action.replace(/\./g, ' ').toUpperCase()}
                                  </div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-4)" }}>
                                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>

                                <div style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 500, marginBottom: 12 }}>
                                  {log.actor_email ?? "System"}
                                </div>

                                {log.metadata && (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {Object.entries(log.metadata).slice(0, 3).map(([k, v]) => (
                                      <div key={k} style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: "4px 8px",
                                        borderRadius: 6,
                                        background: "var(--surface)",
                                        color: "var(--ink-3)",
                                        border: "1px solid var(--border)",
                                        textTransform: "uppercase"
                                      }}>
                                        {k}: {String(v).slice(0, 15)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
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
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!newUserEmail.trim() || newUserPassword.length < 8 || isBusy}>
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
