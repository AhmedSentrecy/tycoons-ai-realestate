import { createContext, useContext } from "react";
import type { AdminUser } from "../../lib/adminApi";

export interface AdminContextValue {
  token: string;
  user: AdminUser;
  isOwner: boolean;
  notify: (text: string, tone?: "ok" | "error") => void;
  handleError: (error: unknown) => void;
  /** Tell the shell that pending requests changed (refreshes the approvals badge). */
  refreshPending: () => void;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin must be used inside AdminContext");
  return value;
}
