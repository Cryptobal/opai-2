/** Grupo de la lista (`core.grupos.list`, CAR-251). */
export type GrupoVista = {
  id: string;
  nombre: string;
  descripcion: string | null;
  archivado: boolean;
  miembros: number;
};

/** Miembro del detalle (`core.grupos.get`). */
export type MiembroGrupo = {
  userId: string;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
};

export type GrupoDetalle = Omit<GrupoVista, "miembros"> & { miembros: MiembroGrupo[] };

/** Usuario de la empresa elegible como miembro (`core.users.list`, solo lo necesario). */
export type UsuarioEmpresa = { userId: string; nombre: string; email: string; estado: string };

export const contarMiembros = (n: number) => (n === 1 ? "1 miembro" : `${n} miembros`);
