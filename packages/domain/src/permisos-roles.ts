export const ROLES = ["owner", "admin", "gerente", "supervisor", "viewer"] as const;
export type Rol = (typeof ROLES)[number];

export const ROLES_PLATAFORMA = ["owner", "support"] as const;
export type RolPlataforma = (typeof ROLES_PLATAFORMA)[number];
