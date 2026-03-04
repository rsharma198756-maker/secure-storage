const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
const MAINTENANCE_FALLBACK =
  "We're performing routine service maintenance. Please try again shortly.";

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

export type LoginChallenge = {
  status: string;
  otp?: string;
};

export type LoginResponse = AuthSession | LoginChallenge;

export type Item = {
  id: string;
  name: string;
  type: "folder" | "file";
  parent_id: string | null;
  size_bytes?: number | null;
  content_type?: string | null;
  created_at?: string;
  updated_at?: string;
  owner_user_id?: string | null;
};

const parseSizeBytes = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  return null;
};

const normalizeItem = (value: any): Item => ({
  ...value,
  size_bytes: parseSizeBytes(value?.size_bytes)
});

export type AdminUserRecord = {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  created_at: string;
  roles?: string[];
};

export type SecurityState = {
  tapOffActive: boolean;
  globalLogoutAfter: string | null;
  tapOffStartedAt: string | null;
  tapOffBy: string | null;
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

const toApiErrorMessage = (data: any, fallback: string) => {
  if (data?.error === "service_temporarily_unavailable") {
    return data?.message ?? MAINTENANCE_FALLBACK;
  }
  return fallback;
};

export const login = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const maintenance = toApiErrorMessage(data, "");
    if (maintenance) {
      throw new Error(maintenance);
    }
    if (data.error === "invalid_credentials") throw new Error("Invalid email or password");
    if (data.error === "user_disabled") throw new Error("Your account has been disabled");
    if (data.error === "rate_limited") throw new Error("Too many attempts. Please wait.");
    throw new Error("Login failed");
  }

  return res.json() as Promise<LoginResponse>;
};

export const verifyOtp = async (email: string, otp: string) => {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, otp })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(toApiErrorMessage(data, "Invalid OTP"));
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
    const data = await res.json().catch(() => ({}));
    throw new Error(toApiErrorMessage(data, "Refresh failed"));
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

const authFetch = async (
  token: string,
  path: string,
  init?: RequestInit,
  securityActionToken?: string
) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(securityActionToken ? { "X-Security-Action-Token": securityActionToken } : {})
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(toApiErrorMessage(data, `Request failed: ${path}`));
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

export const requestSecurityStepUp = async (
  token: string,
  password: string
) => {
  const res = await fetch(`${API_BASE}/admin/security/step-up/request`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ password })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "password_required") throw new Error("Password is required");
    if (data.error === "invalid_credentials") throw new Error("Password is incorrect");
    if (data.error === "rate_limited") throw new Error("Too many attempts. Please wait.");
    throw new Error(toApiErrorMessage(data, "Could not request verification OTP"));
  }
};

export const verifySecurityStepUp = async (token: string, otp: string) => {
  const res = await fetch(`${API_BASE}/admin/security/step-up/verify`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ otp })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "otp_required") throw new Error("OTP is required");
    if (data.error === "otp_not_found") throw new Error("No active OTP found. Request a new code.");
    if (data.error === "otp_expired") throw new Error("OTP expired. Request a new code.");
    if (data.error === "otp_invalid") throw new Error("Invalid OTP");
    if (data.error === "otp_attempts_exceeded") throw new Error("Too many invalid OTP attempts.");
    if (data.error === "rate_limited") throw new Error("Too many attempts. Please wait.");
    throw new Error(toApiErrorMessage(data, "Could not verify OTP"));
  }
  return (await res.json()) as {
    securityActionToken: string;
    expiresInSeconds: number;
  };
};

export const getSecurityState = (
  token: string,
  securityActionToken: string
) =>
  authFetch(token, "/admin/security/state", undefined, securityActionToken) as Promise<SecurityState>;

export const forceLogoutUser = async (
  token: string,
  securityActionToken: string,
  userId: string,
  reason?: string
) => {
  const res = await fetch(`${API_BASE}/admin/security/logout-user`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Security-Action-Token": securityActionToken
    },
    body: JSON.stringify({ userId, reason })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "user_not_found") throw new Error("User not found");
    if (data.error === "security_action_token_required") throw new Error("Verification token required");
    if (data.error === "security_action_token_invalid") throw new Error("Verification expired. Verify again.");
    throw new Error(toApiErrorMessage(data, "Failed to logout user"));
  }
  return res.json();
};

export const forceLogoutEveryone = async (
  token: string,
  securityActionToken: string,
  reason?: string
) => {
  const res = await fetch(`${API_BASE}/admin/security/logout-all`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Security-Action-Token": securityActionToken
    },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "security_action_token_required") throw new Error("Verification token required");
    if (data.error === "security_action_token_invalid") throw new Error("Verification expired. Verify again.");
    throw new Error(toApiErrorMessage(data, "Failed to logout everyone"));
  }
  return res.json();
};

export const tapOffService = async (
  token: string,
  securityActionToken: string,
  reason: string
) => {
  const res = await fetch(`${API_BASE}/admin/security/tap-off`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Security-Action-Token": securityActionToken
    },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "reason_required") throw new Error("Reason is required");
    if (data.error === "security_action_token_required") throw new Error("Verification token required");
    if (data.error === "security_action_token_invalid") throw new Error("Verification expired. Verify again.");
    throw new Error(toApiErrorMessage(data, "Failed to activate emergency maintenance"));
  }
  return res.json();
};

export const tapOnService = async (
  token: string,
  securityActionToken: string,
  reason: string
) => {
  const res = await fetch(`${API_BASE}/admin/security/tap-on`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Security-Action-Token": securityActionToken
    },
    body: JSON.stringify({ reason })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "reason_required") throw new Error("Reason is required");
    if (data.error === "security_action_token_required") throw new Error("Verification token required");
    if (data.error === "security_action_token_invalid") throw new Error("Verification expired. Verify again.");
    throw new Error(toApiErrorMessage(data, "Failed to restore service"));
  }
  return res.json();
};

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
    const data = await res.json().catch(() => ({}));
    if (data.error === "user_not_found") throw new Error("User not found");
    if (data.error === "role_not_found") throw new Error("Role not found");
    if (data.error === "role_not_assignable") throw new Error("Only viewer/editor roles are assignable");
    if (data.error === "role_id_required") throw new Error("Role is required");
    throw new Error(data.error ?? "Failed to add role");
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
    const data = await res.json().catch(() => ({}));
    if (data.error === "user_not_found") throw new Error("User not found");
    if (data.error === "role_not_found") throw new Error("Role not found");
    if (data.error === "role_not_assignable") throw new Error("Only viewer/editor roles are assignable");
    if (data.error === "role_not_assigned") throw new Error("Role is not assigned to this user");
    if (data.error === "cannot_remove_own_admin_role") throw new Error("You cannot remove your own admin role");
    if (data.error === "cannot_remove_last_admin_role") throw new Error("Cannot remove admin role from the last admin");
    if (data.error === "role_id_required") throw new Error("Role is required");
    throw new Error(data.error ?? "Failed to remove role");
  }
};

export const setUserRole = async (
  token: string,
  userId: string,
  roleId: string
) => {
  const res = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ roleId })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "user_not_found") throw new Error("User not found");
    if (data.error === "role_not_found") throw new Error("Role not found");
    if (data.error === "role_not_assignable") throw new Error("Only viewer/editor roles are allowed");
    if (data.error === "cannot_modify_admin_user_roles") throw new Error("Admin user roles cannot be changed here");
    if (data.error === "role_id_required") throw new Error("Role is required");
    throw new Error(data.error ?? "Failed to update user role");
  }
};

export const updateRolePermissions = async (
  token: string,
  roleId: string,
  permissionIds: string[]
) => {
  const res = await fetch(`${API_BASE}/admin/roles/${roleId}/permissions`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ permissionIds })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "role_not_found") throw new Error("Role not found");
    if (data.error === "role_not_assignable") throw new Error("Only viewer/editor roles can be edited");
    if (data.error === "permission_ids_required") throw new Error("Permission list is required");
    if (data.error === "invalid_permission_ids") throw new Error("One or more permissions are invalid");
    throw new Error(data.error ?? "Failed to update role permissions");
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

export const updateUserInfo = async (
  token: string,
  userId: string,
  payload: {
    email?: string;
    firstName?: string;
    lastName?: string;
  }
) => {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "invalid_email") throw new Error("Please enter a valid email address");
    if (data.error === "email_already_exists") throw new Error("A user with this email already exists");
    if (data.error === "user_not_found") throw new Error("User not found");
    if (data.error === "no_fields_to_update") throw new Error("No changes to save");
    throw new Error(data.error ?? "Failed to update user");
  }

  return (await res.json()) as AdminUserRecord;
};

export const removeUser = async (token: string, userId: string) => {
  const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (data.error === "user_not_found") throw new Error("User not found");
    if (data.error === "cannot_delete_self") throw new Error("You cannot remove your own account");
    if (data.error === "cannot_delete_last_admin") throw new Error("Cannot remove the last admin user");
    throw new Error(data.error ?? "Failed to remove user");
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
  const data = await authFetch(token, `/items${query}`);
  if (!Array.isArray(data)) return [];
  return data.map((item) => normalizeItem(item));
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
  return normalizeItem(uploaded.item);
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

  return normalizeItem(await res.json());
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
  return normalizeItem(payload.item);
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

export type DashboardSummary = {
  users: {
    total: number;
    active: number;
    disabled: number;
  };
  roles: {
    total: number;
  };
  permissions: {
    total: number;
  };
  items: {
    total_active: number;
    files: number;
    folders: number;
    deleted: number;
  };
  shares: {
    total: number;
  };
  activityLast24h: {
    logins: number;
    login_failed: number;
    uploads: number;
    downloads: number;
  };
  topActions7d: Array<{
    action: string;
    count: number;
  }>;
  recentAudit: AuditLog[];
};

export type UserDashboardSummary = {
  role: string;
  permissions: string[];
  items: {
    total_accessible: number;
    files: number;
    folders: number;
    owned: number;
    shared_with_me: number;
  };
  activityLast24h: {
    logins: number;
    uploads: number;
    downloads: number;
    updates: number;
    deletes: number;
    shares: number;
  };
  topActions7d: Array<{
    action: string;
    count: number;
  }>;
  recentActivity: AuditLog[];
};

export type DashboardRange = "7d" | "today" | "yesterday";

const mapPasswordPolicyError = (code?: string): string | null => {
  if (code === "password_min_8_chars") return "Password must be at least 8 characters.";
  if (code === "password_needs_uppercase") return "Password must include at least one uppercase letter.";
  if (code === "password_needs_lowercase") return "Password must include at least one lowercase letter.";
  if (code === "password_needs_number") return "Password must include at least one number.";
  if (code === "password_needs_special_char") return "Password must include at least one special character.";
  return null;
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
    if (data.error === "invalid_email") throw new Error("Please enter a valid email address");
    const passwordError = mapPasswordPolicyError(data.error);
    if (passwordError) throw new Error(passwordError);
    throw new Error(data.error ?? "Failed to create user");
  }

  return res.json() as Promise<{
    id: string;
    email: string;
    status: string;
    role: string;
    reused?: boolean;
    previousStatus?: string;
  }>;
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

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const passwordError = mapPasswordPolicyError(data.error);
    if (passwordError) throw new Error(passwordError);
    throw new Error(data.error ?? "Failed to reset password");
  }
};

export const listAuditLogs = async (
  token: string,
  opts?: { limit?: number; offset?: number; action?: string; userId?: string }
) => {
  const params = new URLSearchParams();
  if (opts?.limit) params.set("limit", String(opts.limit));
  if (opts?.offset) params.set("offset", String(opts.offset));
  if (opts?.action) params.set("action", opts.action);
  if (opts?.userId) params.set("userId", opts.userId);
  const qs = params.toString();
  return (await authFetch(token, `/admin/audit-logs${qs ? `?${qs}` : ""}`)) as AuditLog[];
};

export const fetchDashboardSummary = (token: string, range: DashboardRange = "7d") =>
  authFetch(token, `/admin/dashboard?range=${encodeURIComponent(range)}`) as Promise<DashboardSummary>;

export const fetchUserDashboardSummary = (token: string, range: DashboardRange = "7d") =>
  authFetch(token, `/dashboard?range=${encodeURIComponent(range)}`) as Promise<UserDashboardSummary>;
