import { Badge } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { datosSiHayPermiso, exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ConexionSlack } from "./_componentes/conexion";
import { FormSlack } from "./_componentes/form-slack";
import { ResultadoConexion } from "./_componentes/resultado";
import { SeccionPersonas } from "./_componentes/seccion-personas";
import { type EstadoSlack, type Grupo, type PersonaSlack } from "./_componentes/tipos";

export const metadata = { title: "Slack" };

async function cargar(searchParams: SearchParams) {
  const [estado, grupos, personas, p] = await Promise.all([
    ejecutarComoUsuario<EstadoSlack>("erp", "core.slack.estado", {}),
    ejecutarComoUsuario<Grupo[]>("erp", "core.grupos.list", {}),
    ejecutarComoUsuario<{ conectada: boolean; personas: PersonaSlack[] }>(
      "erp",
      "core.slack.usuarios",
      {},
    ),
    leerParametros(searchParams),
  ]);
  return {
    estado: exigirDatos(estado),
    // Sin permiso para ver grupos, el escalamiento muestra la lista vacía; el resto sigue.
    grupos: datosSiHayPermiso(grupos, [] as Grupo[]),
    // Vínculo de personas (CAR-292): solo con Slack conectado; un error no tumba la pantalla.
    personas: datosSiHayPermiso(personas, { conectada: false, personas: [] as PersonaSlack[] }),
    slack: typeof p["slack"] === "string" ? p["slack"] : undefined,
    motivo: typeof p["motivo"] === "string" ? p["motivo"] : undefined,
  };
}

/**
 * Configuración › Integraciones › Slack (CAR-291, ADR-093): conectar el espacio de Slack de la empresa
 * (OAuth, solo owner y admin) y elegir qué anomalías se avisan, a qué canal, el margen de atraso, el
 * pánico y el resumen. Sin Slack conectado, OPAI no envía nada y funciona igual.
 */
export default function Slack({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Slack"
      ruta="/configuracion"
      cargando="detalle"
      volver={{ href: "/configuracion/integraciones", etiqueta: "Integraciones" }}
      cargar={() => cargar(searchParams)}
      opciones={({ estado }) => ({
        titulo: "Slack",
        insignia: estado.conectada ? (
          <Badge tono="success">Conectado</Badge>
        ) : (
          <Badge>Sin conectar</Badge>
        ),
      })}
    >
      {({ estado, grupos, personas, slack, motivo }) => (
        <div className="flex flex-col gap-4">
          <ResultadoConexion {...(slack ? { slack } : {})} {...(motivo ? { motivo } : {})} />
          <ConexionSlack estado={estado} />
          <FormSlack estado={estado} grupos={grupos} />
          {personas.conectada ? <SeccionPersonas personas={personas.personas} /> : null}
        </div>
      )}
    </PaginaPortal>
  );
}
