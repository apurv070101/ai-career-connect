import {
  decryptJson,
  deriveEncryptionKeyBytes,
  encryptJson,
  generateSalt,
  generateTotpCode,
  generateTotpSecret,
  hashPassword,
  verifyPassword,
  verifyTotpCode,
} from "@/lib/security";
import { authFetch, getCurrentUser } from "@/lib/auth";

export interface Job {
  id: number | string;
  title: string;
  company: string;
  location: string;
  type: string;
  tags: string[];
  postedBy?: string;
}

export interface Application {
  id: number | string;
  jobId: number | string;
  role: string;
  company: string;
  status: "Applied" | "Interview" | "Rejected" | "Offer";
  date: string;
}

export interface UserProfile {
  name: string;
  email: string;
  role: "candidate" | "recruiter";
  skills: string[];
  matchScore: number;
  resumeUploaded: boolean;
  detectedRole?: string;
}

export interface RecruiterStats {
  activeJobs: number;
  totalApplicants: number;
  interviewsScheduled: number;
}

export interface User {
  email: string;
  name: string;
  role: "candidate" | "recruiter";
  company?: string;
}

interface NewUserInput extends User {
  password: string;
}

interface SecureUserRecord {
  email: string;
  passwordSalt: string;
  passwordHash: string;
  encryptionSalt: string;
  encryptedIdentity: string;
  encryptedProfile: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string;
}

interface IdentityPayload {
  name: string;
  role: "candidate" | "recruiter";
  company?: string;
}

interface SessionPayload {
  email: string;
  keyBytes: string;
}

type Pending2FA = {
  user: User;
  keyBytes: string;
  profile: UserProfile;
  expiresAt: number;
  demoOtp: string;
};

export type StartLoginResult =
  | { status: "invalid_credentials" }
  | { status: "two_factor_required"; user: User; demoOtp: string; expiresAt: number; otpDelivery: "email_sent" | "email_failed" }
  | { status: "authenticated"; user: User };

export type RegisterResult =
  | { success: false; reason: "user_exists" }
  | { success: true; twoFactorSecret: string };

const SECURE_USERS_KEY = "secure_users_v1";
const LEGACY_USERS_KEY = "users";
const SESSION_KEY = "secure_session_v1";
const OTP_EMAIL_API_URL = "http://localhost:8000/send-otp-email";
const AUTH_SESSION_KEY = "auth_session_v1";
const FIREBASE_DB_API_BASE_URL = "http://localhost:8000/db";
const RECRUITER_JOBS_CACHE_PREFIX = "recruiter_jobs_cache:";
const RECRUITER_STATS_CACHE_PREFIX = "recruiter_stats_cache:";
const SHORTLISTED_CANDIDATES_CACHE_PREFIX = "shortlisted_candidates_cache:";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const getRecruiterJobsCacheKey = (email: string) => `${RECRUITER_JOBS_CACHE_PREFIX}${normalizeEmail(email)}`;
const getRecruiterStatsCacheKey = (email: string) => `${RECRUITER_STATS_CACHE_PREFIX}${normalizeEmail(email)}`;
const getShortlistedCandidatesCacheKey = (email: string) => `${SHORTLISTED_CANDIDATES_CACHE_PREFIX}${normalizeEmail(email)}`;

const readRecruiterJobsCache = (email: string): Job[] => {
  try {
    return JSON.parse(localStorage.getItem(getRecruiterJobsCacheKey(email)) || "[]") as Job[];
  } catch {
    return [];
  }
};

const writeRecruiterJobsCache = (email: string, jobs: Job[]) => {
  localStorage.setItem(getRecruiterJobsCacheKey(email), JSON.stringify(jobs));
};

const readRecruiterStatsCache = (email: string): RecruiterStats | null => {
  try {
    const raw = localStorage.getItem(getRecruiterStatsCacheKey(email));
    return raw ? (JSON.parse(raw) as RecruiterStats) : null;
  } catch {
    return null;
  }
};

const writeRecruiterStatsCache = (email: string, stats: RecruiterStats) => {
  localStorage.setItem(getRecruiterStatsCacheKey(email), JSON.stringify(stats));
};

const readShortlistedCandidatesCache = (email: string): UserProfile[] => {
  try {
    return JSON.parse(localStorage.getItem(getShortlistedCandidatesCacheKey(email)) || "[]") as UserProfile[];
  } catch {
    return [];
  }
};

const writeShortlistedCandidatesCache = (email: string, candidates: UserProfile[]) => {
  localStorage.setItem(getShortlistedCandidatesCacheKey(email), JSON.stringify(candidates));
};

const sendTwoFactorCodeEmail = async (email: string, name: string, otpCode: string): Promise<boolean> => {
  try {
    const response = await fetch(OTP_EMAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        name,
        otp_code: otpCode,
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
};

const pending2FA = new Map<string, Pending2FA>();
let activeSession: (SessionPayload & { user: User; profile: UserProfile }) | null = null;

const DEFAULT_JOBS: Job[] = [
  { id: 1, title: "Frontend Developer", company: "TechCorp India", location: "Bangalore", type: "Full-time", tags: ["React", "TypeScript"] },
  { id: 2, title: "Product Designer", company: "DesignStudio", location: "Mumbai", type: "Full-time", tags: ["Figma", "UI/UX"] },
  { id: 3, title: "Data Analyst", company: "FinTech Sol", location: "Pune", type: "Contract", tags: ["Python", "SQL"] },
  { id: 4, title: "Backend Engineer", company: "CloudSys", location: "Hyderabad", type: "Full-time", tags: ["Go", "AWS"] },
  { id: 5, title: "AI Engineer", company: "NextGen AI", location: "Gurgaon", type: "Full-time", tags: ["Python", "TensorFlow"] },
];

const loadSecureUsers = (): SecureUserRecord[] => {
  return JSON.parse(localStorage.getItem(SECURE_USERS_KEY) || "[]");
};

const saveSecureUsers = (users: SecureUserRecord[]) => {
  localStorage.setItem(SECURE_USERS_KEY, JSON.stringify(users));
};

const upsertSecureUser = (next: SecureUserRecord) => {
  const users = loadSecureUsers();
  const updated = users.filter((u) => normalizeEmail(u.email) !== normalizeEmail(next.email));
  updated.push(next);
  saveSecureUsers(updated);
};

const setLoggedInFlags = (role: "candidate" | "recruiter") => {
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userRole", role);
};

const clearLoggedInFlags = () => {
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("userRole");
};

const getCurrentAuthUser = (): User | null => {
  const raw = localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { user?: User };
    return parsed.user || null;
  } catch {
    return null;
  }
};

const getProfileStorageKey = (email: string) => `userProfile:${normalizeEmail(email)}`;

const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof (data as { detail?: unknown }).detail === "string" ? (data as { detail: string }).detail : "Request failed";
    throw new Error(message);
  }
  return data as T;
};

const setActiveSession = (payload: SessionPayload, user: User, profile: UserProfile) => {
  activeSession = { ...payload, user, profile };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  setLoggedInFlags(user.role);
};

const clearSession = () => {
  activeSession = null;
  sessionStorage.removeItem(SESSION_KEY);
  pending2FA.clear();
  clearLoggedInFlags();
};

const hydrateProfileFromLegacy = (user: NewUserInput): UserProfile => {
  const legacyProfile = JSON.parse(localStorage.getItem("userProfile") || "null") as UserProfile | null;
  if (legacyProfile && legacyProfile.email === user.email) {
    return legacyProfile;
  }
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    skills: [],
    matchScore: 0,
    resumeUploaded: false,
  };
};

const migrateLegacyUser = async (email: string): Promise<SecureUserRecord | null> => {
  const normalizedEmail = normalizeEmail(email);
  const legacyUsers = JSON.parse(localStorage.getItem(LEGACY_USERS_KEY) || "[]") as NewUserInput[];
  const legacy = legacyUsers.find((u) => normalizeEmail(u.email) === normalizedEmail);
  if (!legacy) return null;

  const passwordSalt = generateSalt();
  const passwordHash = await hashPassword(legacy.password, passwordSalt);
  const encryptionSalt = generateSalt();
  const keyBytes = await deriveEncryptionKeyBytes(legacy.password, encryptionSalt);
  const profile = hydrateProfileFromLegacy(legacy);
  const identity: IdentityPayload = {
    name: legacy.name,
    role: legacy.role,
    company: legacy.company,
  };

  const secure: SecureUserRecord = {
    email: normalizedEmail,
    passwordSalt,
    passwordHash,
    encryptionSalt,
    encryptedIdentity: await encryptJson(identity, keyBytes),
    encryptedProfile: await encryptJson(profile, keyBytes),
    twoFactorEnabled: true,
    twoFactorSecret: generateTotpSecret(),
  };

  upsertSecureUser(secure);
  return secure;
};

const ensureActiveSession = async (): Promise<void> => {
  if (activeSession) return;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return;

  try {
    const payload = JSON.parse(raw) as SessionPayload;
    const record = loadSecureUsers().find((u) => u.email === payload.email);
    if (!record) return;
    const identity = await decryptJson<IdentityPayload>(record.encryptedIdentity, payload.keyBytes);
    const profile = await decryptJson<UserProfile>(record.encryptedProfile, payload.keyBytes);
    activeSession = {
      ...payload,
      user: {
        email: payload.email,
        name: identity.name,
        role: identity.role,
        company: identity.company,
      },
      profile,
    };
  } catch {
    clearSession();
  }
};

export const store = {
  getJobs: async (): Promise<Job[]> => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      const stored = localStorage.getItem("jobs");
      return stored ? JSON.parse(stored) : DEFAULT_JOBS;
    }

    const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/jobs`);
    return parseJsonResponse<Job[]>(response);
  },

  getMyJobs: async (): Promise<Job[]> => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return [];
    }

    try {
      const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/jobs?mine=true`);
      const jobs = await parseJsonResponse<Job[]>(response);
      writeRecruiterJobsCache(currentUser.email, jobs);
      return jobs;
    } catch (error) {
      const cachedJobs = readRecruiterJobsCache(currentUser.email);
      if (cachedJobs.length > 0) {
        return cachedJobs;
      }
      throw error;
    }
  },

  addJob: async (job: Omit<Job, "id">) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      const jobs = await store.getJobs();
      const newJob: Job = { ...job, id: Date.now() };
      localStorage.setItem("jobs", JSON.stringify([newJob, ...jobs]));
      return newJob;
    }

    const optimisticJob: Job = {
      ...job,
      id: `temp-${Date.now()}`,
      postedBy: currentUser.email,
    };

    const cachedJobs = readRecruiterJobsCache(currentUser.email);
    writeRecruiterJobsCache(currentUser.email, [optimisticJob, ...cachedJobs]);

    const cachedStats = readRecruiterStatsCache(currentUser.email);
    if (cachedStats) {
      writeRecruiterStatsCache(currentUser.email, {
        ...cachedStats,
        activeJobs: cachedStats.activeJobs + 1,
      });
    }

    const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(job),
    });
    try {
      const savedJob = await parseJsonResponse<Job>(response);
      const updatedJobs = readRecruiterJobsCache(currentUser.email).map((cachedJob) =>
        cachedJob.id === optimisticJob.id ? savedJob : cachedJob
      );
      writeRecruiterJobsCache(currentUser.email, updatedJobs);
      return savedJob;
    } catch (error) {
      writeRecruiterJobsCache(
        currentUser.email,
        readRecruiterJobsCache(currentUser.email).filter((cachedJob) => cachedJob.id !== optimisticJob.id)
      );
      if (cachedStats) {
        writeRecruiterStatsCache(currentUser.email, cachedStats);
      }
      throw error;
    }
  },

  getApplications: async (): Promise<Application[]> => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      const apps = localStorage.getItem("applications");
      return apps ? JSON.parse(apps) : [];
    }

    const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/applications`);
    return parseJsonResponse<Application[]>(response);
  },

  applyToJob: async (job: Job) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      const apps = await store.getApplications();
      const newApp: Application = {
        id: Date.now(),
        jobId: job.id,
        role: job.title,
        company: job.company,
        status: "Applied",
        date: new Date().toISOString().split("T")[0],
      };
      localStorage.setItem("applications", JSON.stringify([newApp, ...apps]));
      return newApp;
    }

    const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/applications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: String(job.id),
        role: job.title,
        company: job.company,
      }),
    });
    return parseJsonResponse<Application>(response);
  },

  hasApplied: async (jobId: number | string): Promise<boolean> => {
    const applications = await store.getApplications();
    return applications.some((app) => String(app.jobId) === String(jobId));
  },

  registerUser: async (user: NewUserInput): Promise<RegisterResult> => {
    const normalizedEmail = normalizeEmail(user.email);
    const users = loadSecureUsers();
    if (users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
      return { success: false, reason: "user_exists" };
    }

    const passwordSalt = generateSalt();
    const passwordHash = await hashPassword(user.password, passwordSalt);
    const encryptionSalt = generateSalt();
    const keyBytes = await deriveEncryptionKeyBytes(user.password, encryptionSalt);
    const twoFactorSecret = generateTotpSecret();

    const identity: IdentityPayload = {
      name: user.name,
      role: user.role,
      company: user.company,
    };

    const profile: UserProfile = {
      name: user.name,
      email: user.email,
      role: user.role,
      skills: [],
      matchScore: 0,
      resumeUploaded: false,
    };

    const secureUser: SecureUserRecord = {
      email: normalizedEmail,
      passwordSalt,
      passwordHash,
      encryptionSalt,
      encryptedIdentity: await encryptJson(identity, keyBytes),
      encryptedProfile: await encryptJson(profile, keyBytes),
      twoFactorEnabled: true,
      twoFactorSecret,
    };

    users.push(secureUser);
    saveSecureUsers(users);
    return { success: true, twoFactorSecret };
  },

  startLogin: async (email: string, password: string): Promise<StartLoginResult> => {
    const normalizedEmail = normalizeEmail(email);
    let record = loadSecureUsers().find((u) => normalizeEmail(u.email) === normalizedEmail);
    if (!record) {
      record = await migrateLegacyUser(normalizedEmail);
    }
    if (!record) {
      return { status: "invalid_credentials" };
    }

    const valid = await verifyPassword(password, record.passwordSalt, record.passwordHash);
    if (!valid) {
      return { status: "invalid_credentials" };
    }

    const keyBytes = await deriveEncryptionKeyBytes(password, record.encryptionSalt);
    const identity = await decryptJson<IdentityPayload>(record.encryptedIdentity, keyBytes);
    const profile = await decryptJson<UserProfile>(record.encryptedProfile, keyBytes);
    const user: User = {
      email: normalizedEmail,
      name: identity.name,
      role: identity.role,
      company: identity.company,
    };

    if (!record.twoFactorEnabled) {
      setActiveSession({ email: record.email, keyBytes }, user, profile);
      return { status: "authenticated", user };
    }

    const demoOtp = await generateTotpCode(record.twoFactorSecret);
    const expiresAt = Date.now() + 5 * 60 * 1000;
    pending2FA.set(normalizedEmail, { user, keyBytes, profile, expiresAt, demoOtp });
    const otpDelivery = (await sendTwoFactorCodeEmail(user.email, user.name, demoOtp)) ? "email_sent" : "email_failed";
    return { status: "two_factor_required", user, demoOtp, expiresAt, otpDelivery };
  },

  verifyTwoFactor: async (email: string, otpCode: string): Promise<User | null> => {
    const normalizedEmail = normalizeEmail(email);
    const pending = pending2FA.get(normalizedEmail);
    if (!pending || pending.expiresAt < Date.now()) {
      pending2FA.delete(normalizedEmail);
      return null;
    }

    const record = loadSecureUsers().find((u) => normalizeEmail(u.email) === normalizedEmail);
    if (!record || !record.twoFactorEnabled) {
      return null;
    }

    const normalizedCode = otpCode.trim();
    const validTotp = await verifyTotpCode(record.twoFactorSecret, normalizedCode);
    const validDemoCode = normalizedCode === pending.demoOtp;
    const valid = validTotp || validDemoCode;
    if (!valid) {
      return null;
    }

    pending2FA.delete(normalizedEmail);
    setActiveSession({ email: normalizedEmail, keyBytes: pending.keyBytes }, pending.user, pending.profile);
    return pending.user;
  },

  logout: () => {
    clearSession();
  },

  getUserProfile: async (): Promise<UserProfile | null> => {
    const authUser = getCurrentAuthUser();
    if (authUser) {
      try {
        const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/profile`);
        const profile = await parseJsonResponse<UserProfile>(response);
        localStorage.setItem(getProfileStorageKey(authUser.email), JSON.stringify(profile));
        return profile;
      } catch {
        const storedProfile = localStorage.getItem(getProfileStorageKey(authUser.email));
        if (storedProfile) {
          return JSON.parse(storedProfile) as UserProfile;
        }

        return {
          name: authUser.name,
          email: authUser.email,
          role: authUser.role,
          skills: [],
          matchScore: 0,
          resumeUploaded: false,
        };
      }
    }

    await ensureActiveSession();
    return activeSession?.profile || null;
  },

  saveuserProfile: async (data: Partial<UserProfile>): Promise<void> => {
    const authUser = getCurrentAuthUser();
    if (authUser) {
      const currentProfile = await store.getUserProfile();
      if (!currentProfile) return;

      const updated = { ...currentProfile, ...data };
      const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const savedProfile = await parseJsonResponse<UserProfile>(response);
      localStorage.setItem(getProfileStorageKey(authUser.email), JSON.stringify(savedProfile));

      if (savedProfile.matchScore > 0) {
        const pool = JSON.parse(localStorage.getItem("candidate_pool") || "[]");
        const filtered = pool.filter((c: UserProfile) => c.email !== savedProfile.email);
        filtered.push(savedProfile);
        localStorage.setItem("candidate_pool", JSON.stringify(filtered));
      }
      return;
    }

    await ensureActiveSession();
    if (!activeSession) return;

    const updated = { ...activeSession.profile, ...data };
    activeSession = { ...activeSession, profile: updated };

    const users = loadSecureUsers();
    const record = users.find((u) => u.email === activeSession?.email);
    if (!record) return;
    record.encryptedProfile = await encryptJson(updated, activeSession.keyBytes);
    saveSecureUsers(users);

    if (updated.matchScore > 0) {
      const pool = JSON.parse(localStorage.getItem("candidate_pool") || "[]");
      const filtered = pool.filter((c: UserProfile) => c.email !== updated.email);
      filtered.push(updated);
      localStorage.setItem("candidate_pool", JSON.stringify(filtered));
    }
  },

  getShortlistedCandidates: async (): Promise<UserProfile[]> => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      try {
        const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/shortlisted-candidates`);
        const candidates = await parseJsonResponse<UserProfile[]>(response);
        writeShortlistedCandidatesCache(currentUser.email, candidates);
        return candidates;
      } catch {
        return readShortlistedCandidatesCache(currentUser.email);
      }
    }

    const pool = JSON.parse(localStorage.getItem("candidate_pool") || "[]");
    return pool.filter((c: UserProfile) => c.matchScore >= 80).sort((a: UserProfile, b: UserProfile) => b.matchScore - a.matchScore);
  },

  getRecruiterStats: async (): Promise<RecruiterStats> => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      return {
        activeJobs: 0,
        totalApplicants: 0,
        interviewsScheduled: 0,
      };
    }

    try {
      const response = await authFetch(`${FIREBASE_DB_API_BASE_URL}/recruiter/stats`);
      const stats = await parseJsonResponse<RecruiterStats>(response);
      writeRecruiterStatsCache(currentUser.email, stats);
      return stats;
    } catch (error) {
      const cachedStats = readRecruiterStatsCache(currentUser.email);
      if (cachedStats) {
        return cachedStats;
      }
      throw error;
    }
  },
};
