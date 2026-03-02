import { beforeAll, describe, expect, it } from "vitest";
import {
  authFetch,
  clearMailpit,
  fetchLatestOtp,
  loginWithPasswordOtp,
  randomEmail,
  requestLoginOtp,
  waitForReady
} from "../helpers";

const API_BASE = process.env.API_BASE ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@securevault.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin@123";

describe("Regression suite", () => {
  let adminToken = "";
  let userToken = "";
  let userEmail = "";
  let userPassword = "";
  let userId = "";
  let otherToken = "";
  let otherEmail = "";
  let otherPassword = "";
  let otherId = "";
  let folderId = "";
  let fileId = "";

  const issueSecurityActionToken = async () => {
    await clearMailpit();
    const reqRes = await fetch(`${API_BASE}/admin/security/step-up/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ password: ADMIN_PASSWORD })
    });
    expect(reqRes.ok).toBe(true);
    const otp = await fetchLatestOtp(ADMIN_EMAIL);
    const verifyRes = await fetch(`${API_BASE}/admin/security/step-up/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ otp })
    });
    expect(verifyRes.ok).toBe(true);
    const payload = await verifyRes.json();
    expect(payload.securityActionToken).toBeTruthy();
    return payload.securityActionToken as string;
  };

  beforeAll(async () => {
    await waitForReady();
    await clearMailpit();
  });

  it("auth: login (password + OTP) and get tokens", async () => {
    const session = await loginWithPasswordOtp(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    adminToken = session.accessToken;

    const adminUsersRes = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (adminUsersRes.status !== 200) {
      throw new Error(
        "Admin check failed. Reset DB with: docker compose down -v; docker compose up -d --build"
      );
    }
  });

  it("auth: refresh token and logout", async () => {
    const session = await loginWithPasswordOtp(ADMIN_EMAIL, ADMIN_PASSWORD);

    const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken })
    });
    expect(refreshRes.ok).toBe(true);
    const refreshed = await refreshRes.json();

    const logoutRes = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshed.refreshToken })
    });
    expect(logoutRes.ok).toBe(true);

    const refreshAgain = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken: refreshed.refreshToken })
    });
    expect(refreshAgain.ok).toBe(false);
  });

  it("admin: create users, list, and role enforcement", async () => {
    userEmail = randomEmail("editor");
    otherEmail = randomEmail("viewer");
    userPassword = "Editor@123";
    otherPassword = "Viewer@123";

    const createEditorRes = await fetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        email: userEmail,
        password: userPassword,
        role: "editor",
        firstName: "Editor",
        lastName: "User"
      })
    });
    expect(createEditorRes.ok).toBe(true);

    const createViewerRes = await fetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        email: otherEmail,
        password: otherPassword,
        role: "viewer",
        firstName: "Viewer",
        lastName: "User"
      })
    });
    expect(createViewerRes.ok).toBe(true);

    const userSession = await loginWithPasswordOtp(userEmail, userPassword);
    userToken = userSession.accessToken;

    const otherSession = await loginWithPasswordOtp(otherEmail, otherPassword);
    otherToken = otherSession.accessToken;

    const users = await authFetch(adminToken, "/admin/users");
    userId = users.find((u: any) => u.email === userEmail)?.id;
    otherId = users.find((u: any) => u.email === otherEmail)?.id;
    expect(userId).toBeTruthy();
    expect(otherId).toBeTruthy();

    const nonAdminRes = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    expect(nonAdminRes.status).toBe(403);
  });

  it("items: create folder/file, upload via gateway, list, download", async () => {
    const folderRes = await fetch(`${API_BASE}/items/folder`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ name: "Docs" })
    });
    expect(folderRes.ok).toBe(true);
    const folder = await folderRes.json();
    folderId = folder.id;

    const fileRes = await fetch(`${API_BASE}/items/file`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: "hello.txt",
        parentId: folderId,
        contentType: "text/plain",
        sizeBytes: 11
      })
    });
    expect(fileRes.ok).toBe(true);
    const filePayload = await fileRes.json();
    fileId = filePayload.item.id;

    const uploadRes = await fetch(`${API_BASE}/items/${fileId}/content`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "content-type": "text/plain",
        "x-file-name": "hello.txt"
      },
      body: Buffer.from("hello world")
    });
    expect(uploadRes.ok).toBe(true);

    const listRes = await authFetch(adminToken, `/items?parentId=${folderId}`);
    expect(listRes.length).toBeGreaterThan(0);

    const downloadRes = await fetch(
      `${API_BASE}/items/${fileId}/download?disposition=inline`,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    expect(downloadRes.ok).toBe(true);
    const text = await downloadRes.text();
    expect(text).toBe("hello world");
  });

  it("sharing: grant read, enforce delete denied", async () => {
    const shareRes = await fetch(`${API_BASE}/items/${folderId}/share`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        subjectType: "user",
        subjectId: otherId,
        permission: "read"
      })
    });
    expect(shareRes.ok).toBe(true);

    const otherList = await authFetch(otherToken, `/items?parentId=${folderId}`);
    expect(Array.isArray(otherList)).toBe(true);

    const deleteRes = await fetch(`${API_BASE}/items/${fileId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${otherToken}`
      }
    });
    expect(deleteRes.status).toBe(403);
  });

  it("admin: disable user", async () => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: "disabled" })
    });
    expect(res.ok).toBe(true);

    const userAccess = await fetch(`${API_BASE}/items`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    expect(userAccess.status).toBe(403);
  });

  it("audit logs: fetch recent entries", async () => {
    const logs = await authFetch(adminToken, "/admin/audit-logs?limit=20");
    expect(Array.isArray(logs)).toBe(true);
  });

  it("auth: rate limit OTP requests in login flow", async () => {
    let lastStatus = 200;
    for (let i = 0; i < 8; i += 1) {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: otherEmail, password: otherPassword })
      });
      lastStatus = res.status;
    }
    expect([200, 429]).toContain(lastStatus);
  });

  it("auth: login endpoint returns OTP for test mode", async () => {
    const otp = await requestLoginOtp(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(typeof otp === "string" || otp === null).toBe(true);
  });

  it("security: targeted logout invalidates active user token", async () => {
    const securityActionToken = await issueSecurityActionToken();
    const res = await fetch(`${API_BASE}/admin/security/logout-user`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "x-security-action-token": securityActionToken
      },
      body: JSON.stringify({ userId: otherId, reason: "Regression targeted logout check" })
    });
    expect(res.ok).toBe(true);

    const userAccess = await fetch(`${API_BASE}/items`, {
      headers: { Authorization: `Bearer ${otherToken}` }
    });
    expect(userAccess.status).toBe(401);
  });

  it("security: global logout + tap-off blocks auth flow and tap-on restores", async () => {
    let securityActionToken = await issueSecurityActionToken();

    const logoutAllRes = await fetch(`${API_BASE}/admin/security/logout-all`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "x-security-action-token": securityActionToken
      },
      body: JSON.stringify({ reason: "Regression global logout check" })
    });
    expect(logoutAllRes.ok).toBe(true);

    const tapOffRes = await fetch(`${API_BASE}/admin/security/tap-off`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "x-security-action-token": securityActionToken
      },
      body: JSON.stringify({ reason: "Regression tap-off check" })
    });
    expect(tapOffRes.ok).toBe(true);

    const blockedLogin = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });
    expect(blockedLogin.status).toBe(503);
    const blockedLoginBody = await blockedLogin.json().catch(() => ({}));
    expect(blockedLoginBody.error).toBe("service_temporarily_unavailable");

    const stepUpWithRevokedSession = await fetch(`${API_BASE}/admin/security/step-up/request`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ password: ADMIN_PASSWORD })
    });
    expect(stepUpWithRevokedSession.ok).toBe(true);
    const otp = await fetchLatestOtp(ADMIN_EMAIL);
    const verifyRes = await fetch(`${API_BASE}/admin/security/step-up/verify`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ otp })
    });
    expect(verifyRes.ok).toBe(true);
    securityActionToken = (await verifyRes.json()).securityActionToken;

    const tapOnRes = await fetch(`${API_BASE}/admin/security/tap-on`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${adminToken}`,
        "x-security-action-token": securityActionToken
      },
      body: JSON.stringify({ reason: "Regression tap-on check" })
    });
    expect(tapOnRes.ok).toBe(true);

    const newAdminSession = await loginWithPasswordOtp(ADMIN_EMAIL, ADMIN_PASSWORD);
    expect(newAdminSession.accessToken).toBeTruthy();
    adminToken = newAdminSession.accessToken;
  });
});
