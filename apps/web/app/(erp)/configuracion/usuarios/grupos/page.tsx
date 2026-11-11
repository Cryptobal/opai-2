import { Plus } from "lucide-react";

import { Alerta, Estado } from "@opai/ds";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { estadoPantalla } from "@/lib/formato";

import { PaginaConfig } from "../../_centro/pagina-config";
import { PestanasUsuarios } from "../_permisos/pestanas";
import { cargarGrupos } from "./datos";
import { HojasGrupo } from "./diferidas";
import { GruposLista } from "./grupos-lista";

export const metadata = { title: "Grupos · Usuarios y permisos" };

/**
 * Configuración → Usuarios y permisos → Grupos (CAR-251): grupos o equipos de trabajo que las
 * políticas de aprobación (CAR-252) podrán nombrar como aprobadores. Crear, editar, archivar y
 * cambiar miembros es de owner y admin; el resto ve la lista en solo lectura.
 */
export default function Grupos() {
  return (
    <PaginaConfig
      seccion="usuarios"
      titulo="Usuarios y permisos"
      cargar={cargarGrupos}
      cabecera={({ grupos, gestiona }) => {
        const n = grupos.ok ? grupos.data.length : 0;
        return {
          subtitulo: n === 1 ? "1 grupo" : `${n} grupos`,
          ...(gestiona && grupos.ok
            ? {
                acciones: (
                  <EnlaceBotonHoja href="?nuevo=1" icono={Plus}>
                    Nuevo grupo
                  </EnlaceBotonHoja>
                ),
              }
            : {}),
        };
      }}
    >
      {({ grupos, gestiona }) => (
        <div className="flex flex-col gap-4">
          <PestanasUsuarios activa="grupos" />
          {!gestiona && grupos.ok ? (
            <Alerta tono="neutral" titulo="Solo lectura">
              Crean y editan grupos solo el owner y los administradores de la empresa.
            </Alerta>
          ) : null}
          <Estado
            state={estadoPantalla(grupos)}
            variante="lista"
            textos={{
              error: {
                titulo: "No pudimos cargar los grupos",
                descripcion: "Revisa tu conexión e inténtalo de nuevo.",
              },
            }}
          >
            <GruposLista grupos={grupos.ok ? grupos.data : []} gestiona={gestiona} />
          </Estado>
          {grupos.ok ? <HojasGrupo grupos={grupos.data} gestiona={gestiona} /> : null}
        </div>
      )}
    </PaginaConfig>
  );
}
