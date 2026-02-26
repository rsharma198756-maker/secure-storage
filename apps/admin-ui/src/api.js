const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
const inferContentTypeFromFilename = (name) => {
    const ext = name.toLowerCase().split(".").pop() ?? "";
    const types = {
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
    return types[ext];
};
const resolveUploadContentType = (file) => file.type || inferContentTypeFromFilename(file.name) || "application/octet-stream";
export const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "invalid_credentials")
            throw new Error("Invalid email or password");
        if (data.error === "user_disabled")
            throw new Error("Your account has been disabled");
        if (data.error === "rate_limited")
            throw new Error("Too many attempts. Please wait.");
        throw new Error("Login failed");
    }
    return res.json();
};
export const verifyOtp = async (email, otp) => {
    const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, otp })
    });
    if (!res.ok) {
        throw new Error("Invalid OTP");
    }
    return (await res.json());
};
export const refreshSession = async (refreshToken) => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken })
    });
    if (!res.ok) {
        throw new Error("Refresh failed");
    }
    return (await res.json());
};
export const logout = async (refreshToken) => {
    await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken })
    });
};
const authFetch = async (token, path) => {
    const res = await fetch(`${API_BASE}${path}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) {
        throw new Error(`Request failed: ${path}`);
    }
    return res.json();
};
export const listUsers = (token) => authFetch(token, "/admin/users");
export const listRoles = (token) => authFetch(token, "/admin/roles");
export const listPermissions = (token) => authFetch(token, "/admin/permissions");
export const listRolePermissions = (token) => authFetch(token, "/admin/role-permissions");
export const fetchMyProfile = (token) => authFetch(token, "/auth/me");
export const listUserRoles = (token, userId) => authFetch(token, `/admin/users/${userId}/roles`);
export const addUserRole = async (token, userId, roleId) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/roles`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ roleId })
    });
    if (!res.ok) {
        throw new Error("Failed to add role");
    }
};
export const removeUserRole = async (token, userId, roleId) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/roles`, {
        method: "DELETE",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ roleId })
    });
    if (!res.ok) {
        throw new Error("Failed to remove role");
    }
};
export const updateUserStatus = async (token, userId, status) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
        method: "PATCH",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
    });
    if (!res.ok) {
        throw new Error("Failed to update status");
    }
};
export const resetUserRoles = async (token, userId) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-roles`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) {
        throw new Error("Failed to reset roles");
    }
};
export const listItems = async (token, parentId) => {
    const query = parentId ? `?parentId=${parentId}` : "";
    return (await authFetch(token, `/items${query}`));
};
export const createFolder = async (token, name, parentId) => {
    const res = await fetch(`${API_BASE}/items/folder`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, parentId: parentId ?? null })
    });
    if (!res.ok) {
        throw new Error("Failed to create folder");
    }
    return res.json();
};
export const createFile = async (token, file, parentId) => {
    const res = await fetch(`${API_BASE}/items/file`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            name: file.name,
            parentId: parentId ?? null,
            contentType: resolveUploadContentType(file),
            sizeBytes: file.size
        })
    });
    if (!res.ok) {
        throw new Error("Failed to create file metadata");
    }
    const payload = await res.json();
    const upload = payload.upload;
    const uploadRes = await fetch(upload.url, {
        method: upload.method,
        headers: upload.headers,
        body: file
    });
    if (!uploadRes.ok) {
        throw new Error("File upload failed");
    }
    return payload.item;
};
export const updateItemName = async (token, itemId, name) => {
    const res = await fetch(`${API_BASE}/items/${itemId}`, {
        method: "PATCH",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name })
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "duplicate_name") {
            throw new Error("A file or folder with this name already exists.");
        }
        throw new Error("Failed to update item");
    }
    return (await res.json());
};
export const replaceFile = async (token, itemId, file, nextName) => {
    const res = await fetch(`${API_BASE}/items/${itemId}/presign-upload`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            name: nextName,
            contentType: resolveUploadContentType(file),
            sizeBytes: file.size
        })
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "duplicate_name") {
            throw new Error("A file with this name already exists.");
        }
        throw new Error("Failed to prepare replacement upload");
    }
    const payload = await res.json();
    const upload = payload.upload;
    const uploadRes = await fetch(upload.url, {
        method: upload.method,
        headers: upload.headers,
        body: file
    });
    if (!uploadRes.ok) {
        throw new Error("File replacement upload failed");
    }
    return payload.item;
};
export const deleteItem = async (token, itemId) => {
    const res = await fetch(`${API_BASE}/items/${itemId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) {
        throw new Error("Failed to delete item");
    }
};
export const presignDownload = async (token, itemId) => {
    const res = await fetch(`${API_BASE}/items/${itemId}/presign-download`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) {
        throw new Error("Failed to get download link");
    }
    return res.json();
};
const getFilenameFromDisposition = (disposition, fallback) => {
    if (!disposition)
        return fallback;
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (utfMatch?.[1]) {
        try {
            return decodeURIComponent(utfMatch[1]);
        }
        catch {
            return utfMatch[1];
        }
    }
    const simpleMatch = disposition.match(/filename="([^"]+)"/i);
    if (simpleMatch?.[1])
        return simpleMatch[1];
    return fallback;
};
export const downloadItem = async (token, itemId, opts) => {
    const disposition = opts?.disposition ?? "attachment";
    const res = await fetch(`${API_BASE}/items/${itemId}/download?disposition=${disposition}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
        throw new Error("Failed to download item");
    }
    const blob = await res.blob();
    const filename = getFilenameFromDisposition(res.headers.get("content-disposition"), opts?.fallbackName ?? "download");
    return {
        blob,
        filename,
        contentType: res.headers.get("content-type") ?? blob.type
    };
};
export const createUser = async (token, email, password, role, firstName, lastName) => {
    const res = await fetch(`${API_BASE}/admin/users`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, password, role, firstName, lastName })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "email_already_exists")
            throw new Error("A user with this email already exists");
        throw new Error(data.error ?? "Failed to create user");
    }
    return res.json();
};
export const resetUserPassword = async (token, userId, password) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ password })
    });
    if (!res.ok)
        throw new Error("Failed to reset password");
};
export const listAuditLogs = async (token, opts) => {
    const params = new URLSearchParams();
    if (opts?.limit)
        params.set("limit", String(opts.limit));
    if (opts?.offset)
        params.set("offset", String(opts.offset));
    if (opts?.action)
        params.set("action", opts.action);
    const qs = params.toString();
    return (await authFetch(token, `/admin/audit-logs${qs ? `?${qs}` : ""}`));
};
