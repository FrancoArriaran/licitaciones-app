import type { OrganizationRole } from "@licitaciones/core/accounts";

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Responsable",
  admin: "Administrador",
  member: "Miembro",
};

export const ROLE_DESCRIPTIONS: Record<OrganizationRole, string> = {
  owner: "Gestiona el equipo y la cuenta de la empresa.",
  admin: "Gestiona el equipo y las alertas.",
  member: "Ve oportunidades y hace seguimiento.",
};
