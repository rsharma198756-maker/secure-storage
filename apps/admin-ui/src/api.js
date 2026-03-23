const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";
const MAINTENANCE_FALLBACK = "We're performing routine service maintenance. Please try again shortly.";
const parseSizeBytes = (value) => {
    if (value === null || value === undefined)
        return null;
    if (typeof value === "number") {
        return Number.isFinite(value) && value >= 0 ? value : null;
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
    }
    return null;
};
const normalizeItem = (value) => ({
    ...value,
    size_bytes: parseSizeBytes(value?.size_bytes)
});
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
const toApiErrorMessage = (data, fallback) => {
    if (data?.error === "service_temporarily_unavailable") {
        return data?.message ?? MAINTENANCE_FALLBACK;
    }
    return fallback;
};
export const login = async (email, password) => {
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
        if (data.error === "invalid_credentials")
            throw new Error("Invalid email or password");
        if (data.error === "user_disabled")
            throw new Error("Your account has been disabled");
        if (data.error === "rate_limited")
            throw new Error("Too many attempts. Please wait.");
        if (data.error === "otp_delivery_failed")
            throw new Error("Could not send the verification code. Check your OTP delivery settings.");
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
        const data = await res.json().catch(() => ({}));
        throw new Error(toApiErrorMessage(data, "Invalid OTP"));
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
        const data = await res.json().catch(() => ({}));
        throw new Error(toApiErrorMessage(data, "Refresh failed"));
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
const authFetch = async (token, path, init, securityActionToken) => {
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
export const listUsers = (token) => authFetch(token, "/admin/users");
export const listRoles = (token) => authFetch(token, "/admin/roles");
export const listPermissions = (token) => authFetch(token, "/admin/permissions");
export const listRolePermissions = (token) => authFetch(token, "/admin/role-permissions");
export const fetchMyProfile = (token) => authFetch(token, "/auth/me");
export const listUserRoles = (token, userId) => authFetch(token, `/admin/users/${userId}/roles`);
export const requestSecurityStepUp = async (token, password) => {
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
        if (data.error === "password_required")
            throw new Error("Password is required");
        if (data.error === "invalid_credentials")
            throw new Error("Password is incorrect");
        if (data.error === "rate_limited")
            throw new Error("Too many attempts. Please wait.");
        if (data.error === "otp_delivery_failed")
            throw new Error("Could not send the verification code. Check your OTP delivery settings.");
        throw new Error(toApiErrorMessage(data, "Could not request verification OTP"));
    }
};
export const verifySecurityStepUp = async (token, otp) => {
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
        if (data.error === "otp_required")
            throw new Error("OTP is required");
        if (data.error === "otp_not_found")
            throw new Error("No active OTP found. Request a new code.");
        if (data.error === "otp_expired")
            throw new Error("OTP expired. Request a new code.");
        if (data.error === "otp_invalid")
            throw new Error("Invalid OTP");
        if (data.error === "otp_attempts_exceeded")
            throw new Error("Too many invalid OTP attempts.");
        if (data.error === "rate_limited")
            throw new Error("Too many attempts. Please wait.");
        throw new Error(toApiErrorMessage(data, "Could not verify OTP"));
    }
    return (await res.json());
};
export const getSecurityState = (token, securityActionToken) => authFetch(token, "/admin/security/state", undefined, securityActionToken);
export const forceLogoutUser = async (token, securityActionToken, userId, reason) => {
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
        if (data.error === "user_not_found")
            throw new Error("User not found");
        if (data.error === "security_action_token_required")
            throw new Error("Verification token required");
        if (data.error === "security_action_token_invalid")
            throw new Error("Verification expired. Verify again.");
        throw new Error(toApiErrorMessage(data, "Failed to logout user"));
    }
    return res.json();
};
export const forceLogoutEveryone = async (token, securityActionToken, reason) => {
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
        if (data.error === "security_action_token_required")
            throw new Error("Verification token required");
        if (data.error === "security_action_token_invalid")
            throw new Error("Verification expired. Verify again.");
        throw new Error(toApiErrorMessage(data, "Failed to logout everyone"));
    }
    return res.json();
};
export const tapOffService = async (token, securityActionToken, reason) => {
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
        if (data.error === "reason_required")
            throw new Error("Reason is required");
        if (data.error === "security_action_token_required")
            throw new Error("Verification token required");
        if (data.error === "security_action_token_invalid")
            throw new Error("Verification expired. Verify again.");
        throw new Error(toApiErrorMessage(data, "Failed to activate emergency maintenance"));
    }
    return res.json();
};
export const tapOnService = async (token, securityActionToken, reason) => {
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
        if (data.error === "reason_required")
            throw new Error("Reason is required");
        if (data.error === "security_action_token_required")
            throw new Error("Verification token required");
        if (data.error === "security_action_token_invalid")
            throw new Error("Verification expired. Verify again.");
        throw new Error(toApiErrorMessage(data, "Failed to restore service"));
    }
    return res.json();
};
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
        const data = await res.json().catch(() => ({}));
        if (data.error === "user_not_found")
            throw new Error("User not found");
        if (data.error === "role_not_found")
            throw new Error("Role not found");
        if (data.error === "role_not_assignable")
            throw new Error("Only viewer/editor roles are assignable");
        if (data.error === "role_id_required")
            throw new Error("Role is required");
        throw new Error(data.error ?? "Failed to add role");
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
        const data = await res.json().catch(() => ({}));
        if (data.error === "user_not_found")
            throw new Error("User not found");
        if (data.error === "role_not_found")
            throw new Error("Role not found");
        if (data.error === "role_not_assignable")
            throw new Error("Only viewer/editor roles are assignable");
        if (data.error === "role_not_assigned")
            throw new Error("Role is not assigned to this user");
        if (data.error === "cannot_remove_own_admin_role")
            throw new Error("You cannot remove your own admin role");
        if (data.error === "cannot_remove_last_admin_role")
            throw new Error("Cannot remove admin role from the last admin");
        if (data.error === "role_id_required")
            throw new Error("Role is required");
        throw new Error(data.error ?? "Failed to remove role");
    }
};
export const setUserRole = async (token, userId, roleId) => {
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
        if (data.error === "user_not_found")
            throw new Error("User not found");
        if (data.error === "role_not_found")
            throw new Error("Role not found");
        if (data.error === "role_not_assignable")
            throw new Error("Only viewer/editor roles are allowed");
        if (data.error === "cannot_modify_admin_user_roles")
            throw new Error("Admin user roles cannot be changed here");
        if (data.error === "role_id_required")
            throw new Error("Role is required");
        throw new Error(data.error ?? "Failed to update user role");
    }
};
export const updateRolePermissions = async (token, roleId, permissionIds) => {
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
        if (data.error === "role_not_found")
            throw new Error("Role not found");
        if (data.error === "role_not_assignable")
            throw new Error("Only viewer/editor roles can be edited");
        if (data.error === "permission_ids_required")
            throw new Error("Permission list is required");
        if (data.error === "invalid_permission_ids")
            throw new Error("One or more permissions are invalid");
        throw new Error(data.error ?? "Failed to update role permissions");
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
export const updateUserInfo = async (token, userId, payload) => {
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
        if (data.error === "invalid_email")
            throw new Error("Please enter a valid email address");
        if (data.error === "invalid_phone_number")
            throw new Error("Please enter a valid mobile number");
        if (data.error === "email_already_exists")
            throw new Error("A user with this email already exists");
        if (data.error === "user_not_found")
            throw new Error("User not found");
        if (data.error === "no_fields_to_update")
            throw new Error("No changes to save");
        throw new Error(data.error ?? "Failed to update user");
    }
    return (await res.json());
};
export const removeUser = async (token, userId) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "user_not_found")
            throw new Error("User not found");
        if (data.error === "cannot_delete_self")
            throw new Error("You cannot remove your own account");
        if (data.error === "cannot_delete_last_admin")
            throw new Error("Cannot remove the last admin user");
        throw new Error(data.error ?? "Failed to remove user");
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
    const data = await authFetch(token, `/items${query}`);
    if (!Array.isArray(data))
        return [];
    return data.map((item) => normalizeItem(item));
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
        const body = await res.json().catch(() => ({}));
        const maintenance = toApiErrorMessage(body, "");
        if (maintenance)
            throw new Error(maintenance);
        if (body.error === "duplicate_name") {
            throw new Error("A file or folder with this name already exists.");
        }
        if (body.error === "parent_not_found") {
            throw new Error("Parent folder was not found.");
        }
        if (body.error === "forbidden") {
            throw new Error("You do not have permission to create folders here.");
        }
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
    const item = payload.item;
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
    return normalizeItem(await res.json());
};
export const replaceFile = async (token, itemId, file, nextName) => {
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
const mapPasswordPolicyError = (code) => {
    if (code === "password_min_8_chars")
        return "Password must be at least 8 characters.";
    if (code === "password_needs_uppercase")
        return "Password must include at least one uppercase letter.";
    if (code === "password_needs_lowercase")
        return "Password must include at least one lowercase letter.";
    if (code === "password_needs_number")
        return "Password must include at least one number.";
    if (code === "password_needs_special_char")
        return "Password must include at least one special character.";
    return null;
};
export const createUser = async (token, email, password, role, firstName, lastName, phoneNumber) => {
    const res = await fetch(`${API_BASE}/admin/users`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email, password, role, firstName, lastName, phoneNumber })
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "email_already_exists")
            throw new Error("A user with this email already exists");
        if (data.error === "invalid_email")
            throw new Error("Please enter a valid email address");
        if (data.error === "invalid_phone_number")
            throw new Error("Please enter a valid mobile number");
        const passwordError = mapPasswordPolicyError(data.error);
        if (passwordError)
            throw new Error(passwordError);
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
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const passwordError = mapPasswordPolicyError(data.error);
        if (passwordError)
            throw new Error(passwordError);
        throw new Error(data.error ?? "Failed to reset password");
    }
};
export const listAuditLogs = async (token, opts) => {
    const params = new URLSearchParams();
    if (opts?.limit)
        params.set("limit", String(opts.limit));
    if (opts?.offset)
        params.set("offset", String(opts.offset));
    if (opts?.action)
        params.set("action", opts.action);
    if (opts?.userId)
        params.set("userId", opts.userId);
    const qs = params.toString();
    return (await authFetch(token, `/admin/audit-logs${qs ? `?${qs}` : ""}`));
};
export const fetchDashboardSummary = (token, range = "7d") => authFetch(token, `/admin/dashboard?range=${encodeURIComponent(range)}`);
export const fetchUserDashboardSummary = (token, range = "7d") => authFetch(token, `/dashboard?range=${encodeURIComponent(range)}`);
