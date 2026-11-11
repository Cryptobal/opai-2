import { PaginaPortal } from "@/app/_components/pagina-portal";
import { ejecutarComoUsuario, requerirIdentidad } from "@/lib/servidor";

import { PasswordCuenta } from "./cambiar-password";
import { EstadoSeguridad } from "./_seguridad/estado-seguridad";
import { MetodosAcceso } from "./_seguridad/metodos-acceso";
import type { Metodos } from "./_seguridad/tipos";

export const metadata = { title: "Mi cuenta" };

/**
 * Mi cuenta › Seguridad (NÚCLEO-F, CAR-286): contraseña, passkeys y app autenticadora. Cada método es
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
        const r = await ejecutarComoUsuario<Metodos>("erp", "core.metodos_acceso.list");
        if (!r.ok) throw new Error(r.error.message);
        return r.data;
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
          </section>
        </div>
      )}
    </PaginaPortal>
  );
}
