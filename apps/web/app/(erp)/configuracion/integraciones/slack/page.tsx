import { Badge, Button } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { datosSiHayPermiso, exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ConexionSlack } from "./_componentes/conexion";
import { FormSlack } from "./_componentes/form-slack";
import { ResultadoConexion } from "./_componentes/resultado";
import { type EstadoSlack, FORM_SLACK, type Grupo } from "./_componentes/tipos";

export const metadata = { title: "Slack" };

const guardar = (
  <Button type="submit" form={FORM_SLACK}>
    Guardar
  </Button>
);

async function cargar(searchParams: SearchParams) {
  const [estado, grupos, p] = await Promise.all([
    ejecutarComoUsuario<EstadoSlack>("erp", "core.slack.estado", {}),
    ejecutarComoUsuario<Grupo[]>("erp", "core.grupos.list", {}),
    leerParametros(searchParams),
  ]);
  return {
    estado: exigirDatos(estado),
    // Sin permiso para ver grupos, el escalamiento muestra la lista vacía; el resto sigue.
    grupos: datosSiHayPermiso(grupos, [] as Grupo[]),
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
      accionesTelefono={guardar}
      cargar={() => cargar(searchParams)}
      opciones={({ estado }) => ({
        titulo: "Slack",
        insignia: estado.conectada ? (
          <Badge tono="success">Conectado</Badge>
        ) : (
          <Badge>Sin conectar</Badge>
        ),
        acciones: guardar,
      })}
    >
      {({ estado, grupos, slack, motivo }) => (
        <div className="flex flex-col gap-4">
          <ResultadoConexion {...(slack ? { slack } : {})} {...(motivo ? { motivo } : {})} />
          <ConexionSlack estado={estado} />
          <FormSlack estado={estado} grupos={grupos} />
        </div>
      )}
    </PaginaPortal>
  );
}
