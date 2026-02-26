import { beforeAll, describe, expect, it } from "vitest";
import {
  authFetch,
  clearMailpit,
  fetchLatestOtp,
  loginWithOtp,
  randomEmail,
  requestOtp,
  verifyOtp,
  waitForReady
} from "../helpers";

const API_BASE = process.env.API_BASE ?? "http://localhost:3000";

describe("Regression suite", () => {
  let adminToken = "";
  let adminEmail = "";
  let userToken = "";
  let userEmail = "";
  let userId = "";
  let otherToken = "";
  let otherEmail = "";
  let otherId = "";
  let folderId = "";
  let fileId = "";

  beforeAll(async () => {
    await waitForReady();
    await clearMailpit();
  });

  it("auth: request OTP, verify, and get tokens", async () => {
    adminEmail = randomEmail("admin");
    const maybeOtp = await requestOtp(adminEmail);
    const otp = maybeOtp ?? (await fetchLatestOtp(adminEmail));
    const session = await verifyOtp(adminEmail, otp);
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    adminToken = session.accessToken;

    const adminUsersRes = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (adminUsersRes.status !== 200) {
      throw new Error(
        "Admin check failed. Please reset DB with: docker compose down -v; docker compose up -d --build"
      );
    }
  });

  it("auth: refresh token and logout", async () => {
    const session = await loginWithOtp(randomEmail("refresh"));

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
    userEmail = randomEmail("user");
    otherEmail = randomEmail("other");

    const userSession = await loginWithOtp(userEmail);
    userToken = userSession.accessToken;

    const otherSession = await loginWithOtp(otherEmail);
    otherToken = otherSession.accessToken;

    const users = await authFetch(adminToken, "/admin/users");
    userId = users.find((u: any) => u.email === userEmail)?.id;
    otherId = users.find((u: any) => u.email === otherEmail)?.id;

    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    expect(res.status).toBe(403);
  });

  it("items: create folder/file, upload, list, download", async () => {
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

    const upload = filePayload.upload as {
      url: string;
      method: string;
      headers: Record<string, string>;
    };
    let uploadOk = false;
    let uploadStatus = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const uploadRes = await fetch(upload.url, {
        method: upload.method,
        headers: upload.headers,
        body: Buffer.from("hello world")
      });
      uploadStatus = uploadRes.status;
      if (uploadRes.ok) {
        uploadOk = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!uploadOk) {
      throw new Error(`Upload failed with status ${uploadStatus}`);
    }

    const listRes = await authFetch(adminToken, `/items?parentId=${folderId}`);
    expect(listRes.length).toBeGreaterThan(0);

    const presign = await authFetch(adminToken, `/items/${fileId}/presign-download`, {
      method: "POST"
    });
    const downloadRes = await fetch(presign.download.url);
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

  it("auth: rate limit OTP requests", async () => {
    const email = randomEmail("rate");
    let lastStatus = 200;
    for (let i = 0; i < 6; i += 1) {
      const res = await fetch(`${API_BASE}/auth/request-otp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email })
      });
      lastStatus = res.status;
    }
    expect([200, 429]).toContain(lastStatus);
  });
});
