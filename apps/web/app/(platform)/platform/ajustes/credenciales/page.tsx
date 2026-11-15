import { Badge, SeccionTarjeta } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { Superadmin } from "../../_componentes/formato";
import { PestanasAjustes } from "../pestanas";

export const metadata = { title: "Credenciales de plataforma" };

const NOMBRE: Record<string, string> = {
  resend: "Resend",
  google_maps: "Google Maps",
  ia_anthropic: "Anthropic",
  ia_openai: "OpenAI",
  ia_google: "Google AI",
};

/** Plataforma → Ajustes › Credenciales: estado de las claves del entorno (solo lectura). */
export default function Credenciales() {
  return (
    <PaginaPortal
      portal="platform"
      titulo="Ajustes de plataforma"
      ruta="/platform/ajustes"
      opciones={() => ({ insignia: <Superadmin /> })}
      cargar={async () => {
        const r = await ejecutarComoUsuario<{ proveedor: string; credencialPlataforma: boolean }[]>(
          "platform",
          "platform.integraciones.estado",
          {},
        );
        return { items: exigirDatos(r) };
      }}
    >
      {(d) => (
        <>
          <h2 className="t-title mb-3 text-fg md:hidden">Ajustes de plataforma</h2>
          <PestanasAjustes activa="credenciales">
            <SeccionTarjeta titulo="Credenciales de plataforma" sinRelleno>
              <p className="t-caption border-b border-border px-4 py-3">
                Las credenciales de plataforma se cargan en el entorno; no se editan aquí. Aquí se
                ve si Google Maps, Anthropic y el resto están disponibles.
              </p>
              <ul>
                {d.items.map((c) => (
                  <li
                    key={c.proveedor}
                    className="flex items-center justify-between border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <span className="text-base text-fg">
                      {NOMBRE[c.proveedor] ?? c.proveedor}
                    </span>
                    {c.credencialPlataforma ? (
                      <Badge tono="success">Disponible</Badge>
                    ) : (
                      <Badge>No disponible</Badge>
                    )}
                  </li>
                ))}
              </ul>
            </SeccionTarjeta>
          </PestanasAjustes>
        </>
      )}
    </PaginaPortal>
  );
}
