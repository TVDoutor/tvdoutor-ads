import type { UserRole } from "@/contexts/AuthContext";

/** Menu + `ProtectedRoute` para /venue-catalogs (super_admin incluído via `hasRole`). */
export const VENUE_CATALOGS_REQUIRED_ROLE: UserRole = "admin";
