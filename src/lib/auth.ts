export type UserRole = "candidate" | "recruiter";

export interface AuthUser {
  email: string;
  name: string;
  role: UserRole;
  company?: string;
  emailVerified: boolean;
}

interface AuthSession {
  user: AuthUser;
  idToken: string;
  refreshToken: string;
}

interface RegisterRequestInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  company?: string;
}

const AUTH_API_BASE_URL = "http://localhost:8000/auth";
const AUTH_SESSION_KEY = "auth_session_v1";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mapAuthErrorMessage = (detail: string): string => {
  if (detail === "FIREBASE_WEB_API_KEY not set") {
    return "Backend Firebase login is not configured. Add FIREBASE_WEB_API_KEY in model/.env and restart python main.py.";
  }

  if (detail === "EMAIL_NOT_FOUND" || detail === "INVALID_PASSWORD" || detail === "INVALID_LOGIN_CREDENTIALS") {
    return "Invalid email or password.";
  }

  return detail;
};

const storeSession = (session: AuthSession) => {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userRole", session.user.role);
};

export const getAuthSession = (): AuthSession | null => {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
};

export const getAuthToken = (): string | null => {
  return getAuthSession()?.idToken || null;
};

export const getCurrentUser = (): AuthUser | null => {
  return getAuthSession()?.user || null;
};

export const getCurrentUserRole = (): UserRole | null => {
  return getCurrentUser()?.role || null;
};

export const isAuthenticated = (): boolean => {
  return Boolean(getAuthSession()?.idToken);
};

export const logoutAuth = () => {
  localStorage.removeItem(AUTH_SESSION_KEY);
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userRole");
};

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = new Headers(init.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
};

const postJson = async <T>(path: string, payload: unknown): Promise<T> => {
  const response = await fetch(`${AUTH_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "Authentication request failed";
    throw new Error(mapAuthErrorMessage(detail));
  }
  return data as T;
};

export const requestRegistrationOtp = async (
  input: RegisterRequestInput,
): Promise<{ email: string; expiresInSeconds: number; otpDelivery: "email_sent" | "dev_fallback"; devOtp?: string | null }> => {
  return postJson<{ email: string; expiresInSeconds: number; otpDelivery: "email_sent" | "dev_fallback"; devOtp?: string | null }>("/register/request-otp", {
    ...input,
    email: normalizeEmail(input.email),
  });
};

export const verifyRegistrationOtp = async (email: string, otpCode: string): Promise<{ user: AuthUser }> => {
  return postJson<{ user: AuthUser }>("/register/verify-otp", {
    email: normalizeEmail(email),
    otpCode: otpCode.trim(),
  });
};

export const loginWithFirebase = async (email: string, password: string, expectedRole: UserRole): Promise<AuthUser> => {
  const result = await postJson<AuthSession>("/login", {
    email: normalizeEmail(email),
    password,
  });

  if (result.user.role !== expectedRole) {
    throw new Error(`This account is registered as ${result.user.role}.`);
  }

  if (!result.user.emailVerified) {
    throw new Error("Your email is not verified yet. Complete registration OTP verification first.");
  }

  storeSession(result);
  return result.user;
};
