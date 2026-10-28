// Sugerencias de fusión para contactos sin correo (por teléfono E.164 y por nombre dentro de la
// cuenta). Son propuestas para revisión humana: el plan nunca las aplica.
import type { Decision, Propuesta } from "./comun";
import type { DatosContacto } from "./contactos-datos";
import type { CuentaResuelta } from "./cuentas";
import type { ContactoDestino, EstadoDestino } from "./destino-tipos";
import { nombreCanonico } from "./normalizar";

type Fila = { fila: { id: string }; datos: DatosContacto; cuenta: CuentaResuelta };
type Criterio = {
  nombre: string;
  clave: (datos: DatosContacto) => string | null;
  claveDestino: (c: ContactoDestino) => string | null;
};

const nombreCompleto = (nombres: string, apellidos: string) =>
  nombreCanonico(`${nombres} ${apellidos}`);

const CRITERIOS: Criterio[] = [
  {
    nombre: "telefono",
    clave: (d) => d.telefono,
    claveDestino: (c) => c.telefono,
  },
  {
    nombre: "nombre_en_cuenta",
    clave: (d) => `${d.cuentaId}|${nombreCompleto(d.nombres, d.apellidos)}`,
    claveDestino: (c) => `${c.cuentaId}|${nombreCompleto(c.nombres, c.apellidos)}`,
  },
];

export function propuestasContactos(
  filas: readonly Fila[],
  decisiones: readonly Decision<DatosContacto>[],
  destino: EstadoDestino,
): Propuesta[] {
  const porId = new Map(decisiones.map((d) => [d.idOpai1, d]));
  const canonicas = filas.filter((f) => {
    const d = porId.get(f.fila.id);
    return d && d.fusionaCon === null && d.accion !== "conflicto" && d.accion !== "omitido";
  });
  const propuestas: Propuesta[] = [];
  for (const criterio of CRITERIOS) {
    const claves = new Set(
      canonicas.filter((f) => f.datos.email === null).map((f) => criterio.clave(f.datos)),
    );
    for (const clave of [...claves].filter((c): c is string => c !== null).sort()) {
      const grupo = canonicas.filter((f) => criterio.clave(f.datos) === clave);
      const propios = new Set(grupo.map((f) => porId.get(f.fila.id)?.destinoId).filter(Boolean));
      const idsDestino = destino.contactos
        .filter((c) => criterio.claveDestino(c) === clave && !propios.has(c.id))
        .map((c) => c.id)
        .sort();
      if (grupo.length + idsDestino.length > 1)
        propuestas.push({
          entidad: "contacto",
          criterio: criterio.nombre,
          idsOpai1: grupo.map((f) => f.fila.id),
          idsDestino,
        });
    }
  }
  return propuestas;
}
