import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentUserRole, isAuthenticated } from "@/lib/auth";

type Role = "candidate" | "recruiter";

interface RequireAuthProps {
  children: ReactNode;
  redirectTo?: string;
}

interface RequireRoleProps extends RequireAuthProps {
  role: Role;
}

const getUserRole = (): Role | null => {
  return getCurrentUserRole();
};

export const RequireAuth = ({ children, redirectTo = "/login" }: RequireAuthProps) => {
  if (!isAuthenticated()) {
    return <Navigate to={redirectTo} replace />;
  }
  return <>{children}</>;
};

export const RequireRole = ({ children, role, redirectTo = "/login" }: RequireRoleProps) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (getUserRole() !== role) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
