import { mesDeParametros } from "@/app/(erp)/pauta/_componentes/datos";
import type { Parametros } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

/** Salida de `pauta.dotacion.listar` en la ficha de instalación (CAR-596). */
export type DotacionInstalacion = {
  instalacionId: string;
  anio: number;
  mes: number;
  hoy: string;
  vinculos: { id: string; nombre: string }[];
  puestos: DotacionPuesto[];
};

export type DotacionPuesto = {
  id: string;
  nombre: string;
  funcion: string | null;
  horario: string;
  serie: { titularId: string | null; titular: string | null } | null;
  reemplazos: { personaId: string; persona: string; desde: string; hasta: string; dias: number }[];
  refuerzos: { personaId: string; persona: string; desde: string; hasta: string; dias: number }[];
  vacantes: {
    motivo: "sin_titular" | "ausencia" | "licencia" | "vacaciones" | "permiso";
    desde: string;
    hasta: string;
    dias: number;
  }[];
};

/** Dotación de la instalación según la Pauta del mes pedido en `?mes=` (o el mes en curso). */
export async function cargarDotacion(instalacionId: string, p: Parametros) {
  const { anio, mes } = mesDeParametros(p);
  return ejecutarComoUsuario<DotacionInstalacion>("erp", "pauta.dotacion.listar", {
    instalacionId,
    anio,
    mes,
  });
}