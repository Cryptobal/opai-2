const VERBOS: Record<string, string> = {
  create: "Crear",
  update: "Editar",
  delete: "Eliminar",
  set: "Configurar",
  revoke: "Revocar",
  invite: "Invitar",
  approve: "Aprobar",
  reject: "Rechazar",
  upload: "Subir",
  replace: "Reemplazar",
  suspend: "Suspender",
  reactivate: "Reactivar",
};

const RECURSOS: Record<string, string> = {
  cuentas: "Cuentas",
  contactos: "Contactos",
  instalaciones: "Instalaciones",
  puestos: "Puestos",
  personas: "Personas",
  vinculos: "Vínculos",
  estructuras: "Sueldos",
  documentos: "Documentos",
  users: "Usuarios",
  apikeys: "API keys",
  aprobaciones: "Aprobaciones",
  integraciones: "Integraciones",
  config: "Ajustes",
  marca: "Marca",
  empresa: "Empresa",
  tenant: "Empresa",
};

const humanizar = (t: string) => {
  const s = t.replace(/[_-]+/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** «core.marca.update» → «Marca · Editar»: el código técnico no se muestra al usuario. */
export function etiquetaCapacidad(codigo: string): string {
  const [, recurso, verbo] = codigo.split(".");
  if (!recurso) return codigo;
  const r = RECURSOS[recurso] ?? humanizar(recurso);
  return verbo ? `${r} · ${VERBOS[verbo] ?? humanizar(verbo)}` : r;
}
