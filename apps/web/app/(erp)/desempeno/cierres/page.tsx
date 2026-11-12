import { Badge, ListScreen } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla, fechaCorta } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

import { cargarCierres, type MesCerrado } from "../_componentes/datos";
import { PestanasDesempeno } from "../_componentes/pestanas";
import { mesCorto } from "../_componentes/tipos";
import { CerrarMes } from "./_componentes/cerrar-mes";

export const metadata = { title: "Meses cerrados" };

const personas = (n: number) => (n === 1 ? "1 persona" : `${n} personas`);

function Origen({ m }: { m: MesCerrado }) {
  return m.origen === "manual" ? (
    <Badge tono="neutro">A mano</Badge>
  ) : (
    <Badge tono="info">Automático</Badge>
  );
}

/** Meses cerrados de Desempeño (ADR-094, CAR-322): el resultado de esos meses ya no cambia. */
export default function MesesCerrados() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Desempeño"
      ruta="/desempeno"
      completo
      cargar={async () => {
        const [r, identidad] = await Promise.all([cargarCierres(), identidadActual()]);
        const cierra = identidad
          ? // Con alcance acotado (supervisor) el permiso no basta: estas acciones son de toda la empresa.
            puedeDeIdentidad(identidad)("desempeno:scorecards.manage") &&
            identidad.acceso.instalaciones === null
          : false;
        return { r, cierra };
      }}
    >
      {({ r, cierra }) => {
        const porCerrar = r.ok ? r.data.porCerrar : null;
        return (
          <ListScreen<MesCerrado>
            state={estadoPantalla(r)}
            titulo="Desempeño"
            filtros={<PestanasDesempeno activa="cierres" />}
            accionPrincipal={cierra && porCerrar ? <CerrarMes periodo={porCerrar} /> : undefined}
            items={r.ok ? r.data.cerrados : []}
            clave={(m) => m.periodo}
            tarjeta={(m) => (
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-base font-medium text-fg">{mesCorto(m.periodo)}</span>
                <span className="t-caption">
                  Cerrado el {fechaCorta(m.cerradoEn)} · {personas(m.personas)}
                </span>
                <Origen m={m} />
              </span>
            )}
            columnas={[
              { id: "mes", etiqueta: "Mes", render: (m) => mesCorto(m.periodo) },
              { id: "cerrado", etiqueta: "Cerrado el", render: (m) => fechaCorta(m.cerradoEn) },
              { id: "origen", etiqueta: "Cómo", render: (m) => <Origen m={m} /> },
              { id: "personas", etiqueta: "Personas", render: (m) => m.personas },
            ]}
            textos={{
              vacio: {
                titulo: "Ningún mes cerrado todavía",
                descripcion:
                  "Cada mes se cierra solo el día de cierre configurado (por defecto el 5). Al cerrarlo, su resultado queda fijo.",
              },
            }}
          />
        );
      }}
    </PaginaPortal>
  );
}
