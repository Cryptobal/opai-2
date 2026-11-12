import { formatearFecha } from "@opai/domain";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { PasswordCuenta } from "./cambiar-password";
import { EstadoSeguridad } from "./_seguridad/estado-seguridad";
import { AppsConectadas } from "./_seguridad/apps-conectadas";
import { MetodosAcceso } from "./_seguridad/metodos-acceso";
import type { AppConectadaVista, Metodos } from "./_seguridad/tipos";

type AppsSalida = {
  apps: {
    clientId: string;
    nombre: string | null;
    puedeEscribir: boolean;
    conectadaEn: string;
    ultimoUso: string | null;
  }[];
};

export const metadata = { title: "Mi cuenta" };

/**
 * Mi cuenta › Seguridad (NÚCLEO-F, CAR-286): contraseña, passkeys, app autenticadora y apps
 * conectadas por OAuth (CAR-247). Cada método es
 * opcional (salvo plataforma); los datos salen de `core.metodos_acceso.list`, la misma herramienta del
 * MCP, sin secretos.
 */
export default function MiCuenta() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Mi cuenta"
      ruta="/mi-cuenta"
      cargando="formulario"
      // Sin sesión va al login; si la lectura falla, el error.tsx del ERP (CAR-50) y no un aviso
      // engañoso sobre el segundo factor.
      cargar={async () => {
        await requerirIdentidad("/mi-cuenta");
        const [r, a] = await Promise.all([
          ejecutarComoUsuario<Metodos>("erp", "core.metodos_acceso.list"),
          ejecutarComoUsuario<AppsSalida>("erp", "core.apps_conectadas.list"),
        ]);
        if (!r.ok) throw new Error(r.error.message);
        if (!a.ok) throw new Error(a.error.message);
        // Apps conectadas por OAuth (CAR-247), con fechas formateadas aquí y no en el cliente.
        const apps: AppConectadaVista[] = a.data.apps.map((x) => ({
          clientId: x.clientId,
          nombre: x.nombre,
          puedeEscribir: x.puedeEscribir,
          conectadaEnTexto: formatearFecha(x.conectadaEn) ?? "—",
          ultimoUsoTexto: x.ultimoUso ? (formatearFecha(x.ultimoUso) ?? null) : null,
        }));
        const passkeys = r.data.passkeys.map((p) => ({
          ...p,
          creadaEnTexto: formatearFecha(p.creadaEn),
        }));
        return { ...r.data, passkeys, apps };
      }}
    >
      {(m) => (
        <div className="flex max-w-xl flex-col gap-6">
          <section aria-labelledby="t-seguridad" className="flex flex-col gap-4">
            <h2 id="t-seguridad" className="t-heading text-fg">
              Seguridad
            </h2>
            <EstadoSeguridad m={m} />
            <div className="flex flex-col gap-1">
              <h3 className="t-label text-fg">Contraseña</h3>
              <div>
                <PasswordCuenta />
              </div>
            </div>
            <MetodosAcceso m={m} />
            <AppsConectadas apps={m.apps} />
          </section>
        </div>
      )}
    </PaginaPortal>
  );
}
