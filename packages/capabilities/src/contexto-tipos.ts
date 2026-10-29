import type { Acceso, Excepcion, EstadoMfa, Rol } from "@opai/domain";

import type { Actor, AgenteContexto, Alcance, Medidor, Principal, Servicios, UsuarioContexto } from "./types";

/**
 * API key que ejecuta: permisos finos (`null` = hereda los del responsable), si es de servicio y si
 * tiene el scope explícito "platform" (ADR-055).
 */
export type ClaveApi = {
  permisos: readonly string[] | null;
  servicio: boolean;
  plataforma?: boolean;
};

export type ParametrosContexto = {
  mfa?: EstadoMfa;
  /** null: sin tenant actual (plataforma sin empresa elegida, o usuario sin membresías). */
  tenantId: string | null;
  actor: Actor;
  usuario?: UsuarioContexto | null;
  rol?: Rol | null;
  /** Permisos del rol personalizado del tenant (null = el rol base de `rol`). ADR-022. */
  permisosRol?: readonly string[] | null;
  /** Excepciones de permiso por usuario sobre el rol. ADR-022. */
  excepciones?: readonly Excepcion[] | null;
  portal?: string | null;
  /** Solo servidor: membresía activa del usuario en este tenant; ausente = sin acceso. */
  portalesMembresia?: readonly string[];
  modulosActivos?: readonly string[];
  scopes?: readonly string[] | null;
  principal?: Principal | null;
  /**
   * Permisos finos de la API key (ids del catálogo), si ejecuta una (Identidad de servicio, t457u).
   * Presente (incluido `servicio`) ⇒ la autorización los cruza con los efectivos del responsable
   * (intersección); `permisos: null` ⇒ la key hereda los del responsable (compatibilidad). Un
   * principal `servicio` no hereda rol: sus permisos salen exclusivamente de esta lista.
   */
  claveApi?: ClaveApi | null;
  /**
   * Techo real de permisos del responsable humano de la API key (rol, personalizado y excepciones),
   * usado para intersectar con `claveApi` (H15): ni una key delegada ni una de servicio superan lo
   * que su responsable puede hacer ahora mismo. El borde lo calcula siempre desde la membresía
   * vigente del responsable, también para `servicio` (cuyo `rol`/`permisosRol`/`excepciones` de
   * arriba van en `null` porque el principal no hereda rol). Por defecto, el mismo
   * `rol`/`permisosRol`/`excepciones` de arriba (sesión humana sin key, donde no aplica distinción).
   */
  accesoResponsable?: Acceso | null;
  /** Alcance por filas del actor (null = ve todo). Lo resuelve el borde una vez (ADR-022, ADR-045). */
  alcance?: Alcance | null;
  agente?: AgenteContexto | null;
  medidor?: Medidor;
  /** Trabajo diferido (el borde usa `after()`). Por defecto, sin esperar y sin romper. */
  diferir?: (tarea: () => Promise<unknown>) => void;
  /** Despacho del outbox tras una escritura (lo implementa el borde). */
  despacharEventos?: () => void;
  servicios?: Partial<Servicios>;
};
