import type { RiskLevel } from "./risk";

export type RoleCode = "ADMIN" | "DIRECCION" | "EDITOR_SENIOR" | "EDITOR_MARCA" | "REPORTERO" | "LECTOR";
export type Permission = "trend:create" | "source:add" | "draft:edit" | "content:approve" | "critical:manage" | "config:manage" | "read";
const matrix: Record<RoleCode, Permission[]> = {
  ADMIN: ["trend:create", "source:add", "draft:edit", "content:approve", "critical:manage", "config:manage", "read"],
  DIRECCION: ["trend:create", "source:add", "draft:edit", "content:approve", "critical:manage", "read"],
  EDITOR_SENIOR: ["trend:create", "source:add", "draft:edit", "content:approve", "read"],
  EDITOR_MARCA: ["trend:create", "source:add", "draft:edit", "content:approve", "read"],
  REPORTERO: ["trend:create", "source:add", "read"], LECTOR: ["read"],
};
export function hasPermission(role: RoleCode, permission: Permission) { return matrix[role].includes(permission); }
export function canApprove(role: RoleCode, risk: RiskLevel, sameOutlet = true) {
  if (role === "ADMIN" || role === "DIRECCION") return true;
  if (risk === "CRITICAL") return false;
  if (risk === "HIGH") return role === "EDITOR_SENIOR";
  if (risk === "MEDIUM" || risk === "LOW") return role === "EDITOR_SENIOR" || (role === "EDITOR_MARCA" && sameOutlet);
  return false;
}
export function validateApproval(input: { role: RoleCode; risk: RiskLevel; comment?: string; confirmed?: boolean; sameOutlet?: boolean }) {
  if (!canApprove(input.role, input.risk, input.sameOutlet)) throw new Error("El usuario no tiene permiso para aprobar este nivel de riesgo.");
  if (input.risk === "HIGH" && !input.comment?.trim()) throw new Error("El comentario es obligatorio para riesgo alto.");
  if (input.risk === "HIGH" && !input.confirmed) throw new Error("Se requiere confirmación adicional para riesgo alto.");
  if (input.risk === "CRITICAL" && !["ADMIN", "DIRECCION"].includes(input.role)) throw new Error("Solo Dirección puede decidir sobre riesgo crítico.");
}
