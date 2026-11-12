// Formas de salida de las capacidades de maestros que usan las pantallas (subconjunto).
import type { ConEtiquetas } from "./tipos-etiquetas";
import type { ConFacturar } from "./tipos-facturar";

export type Pagina<T> = { items: T[]; siguiente: string | null };

export type Cuenta = {
  id: string;
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  giro: string | null;
  estado: string;
  origen: string | null;
  sitioWeb: string | null;
  calle: string | null;
  comuna: string | null;
  region: string | null;
  ciudad: string | null;
  emailDte: string | null;
  escrituraFecha: string | null;
  escrituraNotaria: string | null;
  notas: string | null;
  clienteDesde: string | null;
  clienteHasta: string | null;
};
export type CuentaFila = ConEtiquetas<ConFacturar<Cuenta & { instalaciones: number; contactoPrincipal: string | null }>>;
export type CuentaDetalle = Cuenta & {
  representantes: { id: string; nombre: string; rut: string; email: string | null }[];
  contactos: { id: string; nombre: string; email: string | null; esPrincipal: boolean }[];
  instalaciones: { id: string; nombre: string; estado: string; comuna: string | null }[];
  documentos: number;
};

export type Contacto = {
  id: string;
  cuentaId: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  esPrincipal: boolean;
  roles: string[];
  notas: string | null;
};

export type Puesto = {
  id: string;
  instalacionId: string;
  cargoId: string;
  funcionId: string | null;
  funcion: string | null;
  patronId: string | null;
  patron: string | null;
  patronResumen: string | null;
  nombre: string;
  diasTrabajo: number;
  diasDescanso: number;
  horaInicio: string;
  horaFin: string;
  horario: string;
  horaInicioNoche: string | null;
  horaFinNoche: string | null;
  horarioNoche: string | null;
  jornada: string;
  horasSemanales: number | null;
  colacionMin: number;
  colacionFuera: boolean;
  cobertura: string;
  coberturaMotivo: string | null;
  dotacion: number;
  estado: string;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  notas: string | null;
};

// prettier-ignore
export type PatronTurnoOpcion = { id: string; nombre: string; resumen: string; diasTrabajo: number; diasDescanso: number };
export type FuncionPuestoOpcion = { id: string; nombre: string };

export type Instalacion = {
  id: string;
  cuentaId: string;
  cuenta: string | null;
  nombre: string;
  estado: string;
  calle: string | null;
  comuna: string | null;
  region: string | null;
  direccionFormateada: string | null;
  lat: number | null;
  lng: number | null;
  geocercaM: number;
  vigenteDesde: string | null;
  vigenteHasta: string | null;
  notas: string | null;
};
export type InstalacionFila = Instalacion & { puestos: number; dotacion: number };
export type InstalacionDetalle = Instalacion & { puestos: Puesto[]; documentos: number };

export type VinculoResumen = {
  id: string;
  cargoId: string;
  cargo: string;
  tipo: string;
  inicio: string;
  termino: string | null;
  instalacion?: string | null | undefined;
};
export type Persona = {
  id: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  rut: string;
  emailPersonal: string | null;
  emailLaboral: string | null;
  telefono: string | null;
  fechaNacimiento: string | null;
  sexo: string | null;
  nacionalidad: string;
  calle: string | null;
  comuna: string | null;
  region: string | null;
  direccionFormateada: string | null;
  lat: number | null;
  lng: number | null;
  estado: string;
  bloqueada: boolean;
  bloqueoMotivo: string | null;
  usuarioId: string | null;
  vinculoVigente: VinculoResumen | null;
};
export type PersonaFila = Persona & { documentos: { vencidos: number; porVencer: number } };
export type PersonaDetalle = Persona & { documentos: number };

export type Cargo = {
  id: string;
  nombre: string;
  descripcion: string | null;
  clase: string;
  sueldoSensible: boolean;
  activo: boolean;
  personasVigentes: number;
  puestosActivos: number;
};

export type Actividad = {
  items: {
    id: string;
    cuando: string;
    capability: string;
    actor: { tipo: string; nombre: string; agente: boolean };
    via: string | null;
    accion: string;
    cambios: { campo: string; valor: string }[];
    detalle: unknown;
  }[];
  siguiente: string | null;
};
