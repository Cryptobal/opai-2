import { DetailScreen, Pares } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";
import { puedeDeIdentidad } from "@/lib/permisos-ui";

import { cargarTurnoEstado } from "../_componentes/datos";
import { PanelTurno } from "./_componentes/panel-turno";

export const metadata = { title: "Turno de central" };

type Miembro = { userId: string; nombre: string; estado: string };
type ValorAjuste = { clave: string; valor: unknown };

/** Turno de central y control del agente (modulos/central.md §3, CAR-521). */
export default function TurnoCentral() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Turno de central"
      ruta="/central/turno"
      volver={{ href: "/central", etiqueta: "Central" }}
      cargar={async () => {
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
        const entregaPara = operador;
        const t = turno.ok ? turno.data : null;
        const operadorNombre = t?.turno ? (nombres.get(t.turno.operadorId) ?? "Operador") : null;
        return { turno, t, operador, entregaPara, lista, atender, gobernar, respaldo, operadorNombre };
      }}
    >
      {({ turno, t, operador, entregaPara, lista, atender, gobernar, respaldo, operadorNombre }) => (
        <DetailScreen
          state={estadoPantalla(turno)}
          titulo="Turno de central"
          subtitulo="Quién está a cargo y si el agente puede actuar"
        >
          {t ? (
            <div className="flex flex-col gap-4">
              <Pares
                items={[
                  {
                    etiqueta: "Estado del turno",
                    valor: t.turno ? (t.turno.estado === "abierto" ? "Abierto" : "En entrega") : "Sin turno abierto",
                  },
                  ...(operadorNombre ? [{ etiqueta: "Operador", valor: operadorNombre }] : []),
                  {
                    etiqueta: "Agente",
                    valor: t.pausadaEmpresa ? "En pausa (empresa)" : t.instalacionesPausadas > 0 ? `En pausa en ${t.instalacionesPausadas} instalaciones` : "Activo",
                  },
                ]}
              />
              <PanelTurno
                turno={t}
                operador={operador}
                entregaPara={entregaPara}
                usuarios={lista}
                gobernar={gobernar}
                atender={atender}
                respaldoId={respaldo}
              />
            </div>
          ) : null}
        </DetailScreen>
      )}
    </PaginaPortal>
  );
}