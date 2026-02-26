const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

export type UserProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInMinutes: number;
  refreshExpiresAt: string;
  user: UserProfile;
};

export type Item = {
  id: string;
  name: string;
  type: "folder" | "file";
  parent_id: string | null;
  size_bytes?: number | null;
  content_type?: string | null;
  created_at?: string;
  updated_at?: string;
};

const inferContentTypeFromFilename = (name: string) => {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  const types: Record<string, string> = {
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

const resolveUploadContentType = (file: File) =>
  file.type || inferContentTypeFromFilename(file.name) || "application/octet-stream";

export const login = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "invalid_credentials") throw new Error("Invalid email or password");
    if (data.error === "user_disabled") throw new Error("Your account has been disabled");
    if (data.error === "rate_limited") throw new Error("Too many attempts. Please wait.");
    throw new Error("Login failed");
  }

  return res.json() as Promise<{ status: string; otp?: string }>;
};

export const verifyOtp = async (email: string, otp: string) => {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, otp })
  });

  if (!res.ok) {
    throw new Error("Invalid OTP");
  }

  return (await res.json()) as AuthSession;
};

export const refreshSession = async (refreshToken: string) => {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });

  if (!res.ok) {
    throw new Error("Refresh failed");
  }

  return (await res.json()) as AuthSession;
};

export const logout = async (refreshToken: string) => {
  await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
};

const authFetch = async (token: string, path: string) => {
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

export const listUsers = (token: string) => authFetch(token, "/admin/users");
export const listRoles = (token: string) => authFetch(token, "/admin/roles");
export const listPermissions = (token: string) =>
  authFetch(token, "/admin/permissions");
export const listRolePermissions = (token: string) =>
  authFetch(token, "/admin/role-permissions") as Promise<{ role_name: string; permissions: string[] }[]>;
export const fetchMyProfile = (token: string) =>
  authFetch(token, "/auth/me") as Promise<UserProfile>;
export const listUserRoles = (token: string, userId: string) =>
  authFetch(token, `/admin/users/${userId}/roles`);

export const addUserRole = async (
  token: string,
  userId: string,
  roleId: string
) => {
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

export const removeUserRole = async (
  token: string,
  userId: string,
  roleId: string
) => {
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

export const updateUserStatus = async (
  token: string,
  userId: string,
  status: "active" | "disabled"
) => {
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

export const resetUserRoles = async (token: string, userId: string) => {
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

export const listItems = async (token: string, parentId?: string | null) => {
  const query = parentId ? `?parentId=${parentId}` : "";
  return (await authFetch(token, `/items${query}`)) as Item[];
};

export const createFolder = async (
  token: string,
  name: string,
  parentId?: string | null
) => {
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

export const createFile = async (
  token: string,
  file: File,
  parentId?: string | null
) => {
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
  const item = payload.item as Item;

  const uploadRes = await fetch(`${API_BASE}/items/${item.id}/content`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": resolveUploadContentType(file),
      "x-file-name": file.name
    },
    body: file
  });

  if (!uploadRes.ok) {
    const body = await uploadRes.json().catch(() => ({}));
    if (body.error === "duplicate_name") {
      throw new Error("A file with this name already exists.");
    }
    throw new Error("File upload failed");
  }

  const uploaded = await uploadRes.json();
  return uploaded.item as Item;
};

export const updateItemName = async (
  token: string,
  itemId: string,
  name: string
) => {
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

  return (await res.json()) as Item;
};

export const replaceFile = async (
  token: string,
  itemId: string,
  file: File,
  nextName?: string
) => {
  const res = await fetch(`${API_BASE}/items/${itemId}/content`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": resolveUploadContentType(file),
      ...(nextName ? { "x-file-name": nextName } : {})
    },
    body: file
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body.error === "duplicate_name") {
      throw new Error("A file with this name already exists.");
    }
    throw new Error("File replacement upload failed");
  }

  const payload = await res.json();
  return payload.item as Item;
};

export const deleteItem = async (token: string, itemId: string) => {
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

const getFilenameFromDisposition = (disposition: string | null, fallback: string) => {
  if (!disposition) return fallback;
  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const simpleMatch = disposition.match(/filename="([^"]+)"/i);
  if (simpleMatch?.[1]) return simpleMatch[1];
  return fallback;
};

export const downloadItem = async (
  token: string,
  itemId: string,
  opts?: { disposition?: "attachment" | "inline"; fallbackName?: string }
) => {
  const disposition = opts?.disposition ?? "attachment";
  const res = await fetch(
    `${API_BASE}/items/${itemId}/download?disposition=${disposition}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!res.ok) {
    throw new Error("Failed to download item");
  }

  const blob = await res.blob();
  const filename = getFilenameFromDisposition(
    res.headers.get("content-disposition"),
    opts?.fallbackName ?? "download"
  );

  return {
    blob,
    filename,
    contentType: res.headers.get("content-type") ?? blob.type
  };
};

// ---------- Admin: Create/manage users ----------

export type AuditLog = {
  id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor_email: string | null;
};

export const createUser = async (
  token: string,
  email: string,
  password: string,
  role: string,
  firstName: string,
  lastName: string
) => {
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
    if (data.error === "email_already_exists") throw new Error("A user with this email already exists");
    throw new Error(data.error ?? "Failed to create user");
  }

  return res.json();
};

export const resetUserPassword = async (token: string, userId: string, password: string) => {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });

  if (!res.ok) throw new Error("Failed to reset password");
};

export const listAuditLogs = async (token: string, opts?: { limit?: number; offset?: number; action?: string }) => {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.action) params.set("action", opts.action);
  const qs = params.toString();
  return (await authFetch(token, `/admin/audit-logs${qs ? `?${qs}` : ""}`)) as AuditLog[];
};
