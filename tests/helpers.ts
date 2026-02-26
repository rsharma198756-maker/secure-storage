const API_BASE = process.env.API_BASE ?? "http://localhost:3000";
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";
const MINIO_URL = process.env.MINIO_URL ?? "http://localhost:9000";

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForReady = async () => {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${API_BASE}/ready`);
      const minio = await fetch(`${MINIO_URL}/minio/health/ready`);
      if (res.ok && minio.ok) return;
    } catch {
      // ignore
    }
    await sleep(500);
  }
  throw new Error("Services not ready");
};

export const clearMailpit = async () => {
  try {
    await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: "DELETE" });
  } catch {
    // ignore if not supported
  }
};

const extractOtp = (text: string) => {
  const match = text.match(/\b\d{6}\b/);
  return match ? match[0] : null;
};

export const fetchLatestOtp = async (email: string) => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const listRes = await fetch(`${MAILPIT_URL}/api/v1/messages`);
    if (!listRes.ok) {
      await sleep(500);
      continue;
    }
    const listJson = await listRes.json();
    const messages = listJson.messages ?? listJson.Messages ?? listJson.items ?? [];

    const target = messages.find((msg: any) => {
      const raw = JSON.stringify(msg).toLowerCase();
      return raw.includes(email.toLowerCase());
    });

    if (target) {
      const id = target.ID ?? target.Id ?? target.id ?? target.IDs?.[0];
      if (id) {
        const detailRes = await fetch(`${MAILPIT_URL}/api/v1/messages/${id}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          const text =
            detail.Text ??
            detail.text ??
            detail.Snippet ??
            detail.snippet ??
            JSON.stringify(detail);
          const otp = extractOtp(text);
          if (otp) return otp;
        }
      }
    }

    await sleep(500);
  }
  throw new Error(
    "OTP not found in Mailpit. Ensure Mailpit is reachable or set RETURN_OTP_IN_RESPONSE=true in docker-compose.yml."
  );
};

export const requestLoginOtp = async (email: string, password: string) => {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`auth-login failed: ${res.status} ${JSON.stringify(body)}`);
  }
  const body = await res.json().catch(() => ({}));
  if (body?.otp) {
    return body.otp as string;
  }
  return null as string | null;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  accessExpiresInMinutes: number;
  refreshExpiresAt: string;
};

export const verifyOtp = async (email: string, otp: string): Promise<Session> => {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, otp })
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`verify-otp failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return res.json();
};

export const loginWithPasswordOtp = async (email: string, password: string) => {
  const maybeOtp = await requestLoginOtp(email, password);
  const otp = maybeOtp ?? (await fetchLatestOtp(email));
  return verifyOtp(email, otp);
};

export const authFetch = async (
  token: string,
  path: string,
  init?: RequestInit
) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`authFetch failed: ${path} ${res.status} ${JSON.stringify(body)}`);
  }
  return res.json();
};

export const randomEmail = (prefix: string) =>
  `${prefix}.${Date.now()}@example.com`;
