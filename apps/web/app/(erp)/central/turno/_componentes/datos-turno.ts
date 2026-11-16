import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";
import { puedeDeIdentidad } from "@/lib/permisos-ui";

import { cargarTurnoEstado } from "../../_componentes/datos";

type Miembro = { userId: string; nombre: string; estado: string };
type ValorAjuste = { clave: string; valor: unknown };

export async function cargarPantallaTurno() {
  const [turno, identidad, usuarios, ajustes] = await Promise.all([
    cargarTurnoEstado(),
    identidadActual(),
    ejecutarComoUsuario<Miembro[]>("erp", "core.users.list", {}),
    ejecutarComoUsuario<ValorAjuste[]>("erp", "core.config.get", { modulo: "central" }),
  ]);
  const lista = usuarios.ok ? usuarios.data.filter((u) => u.estado === "activa") : [];
  const nombres = new Map(lista.map((u) => [u.userId, u.nombre]));
  const operador = identidad?.usuario?.id ?? null;
  const atender = identidad ? puedeDeIdentidad(identidad)("central:alertas.atender") : false;
  const gobernar = identidad ? puedeDeIdentidad(identidad)("central:agente.gobernar") : false;
  const respaldo =
    (ajustes.ok ? ajustes.data.find((v) => v.clave === "responsable_respaldo")?.valor : "")?.toString() ?? "";
  const t = turno.ok ? turno.data : null;
  const operadorNombre = t?.turno ? (nombres.get(t.turno.operadorId) ?? "Operador") : null;
  return { turno, t, operador, entregaPara: operador, lista, atender, gobernar, respaldo, operadorNombre };
}