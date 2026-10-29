import { ShieldCheck } from "lucide-react";

import { Alerta, estilosBoton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { mfaObligatoriaPara } from "@/lib/mfa";
import { requerirIdentidad } from "@/lib/servidor";

import { DesactivarMfa } from "./desactivar-mfa";
import { RegenerarCodigosDeRespaldo } from "./regenerar-codigos";

export const metadata = { title: "Mi cuenta" };

/** Mi cuenta (NÚCLEO-F): estado y gestión del segundo factor (activar, desactivar con contraseña). */
export default function MiCuenta() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Mi cuenta"
      ruta="/mi-cuenta"
      cargando="formulario"
      // Sin sesión va al login; si leer la política falla, el error.tsx del ERP (CAR-50) y no un
      // «Protege tu cuenta» engañoso.
      cargar={async () => {
        const id = await requerirIdentidad("/mi-cuenta");
        return { activa: id.mfaActiva, obligatoria: await mfaObligatoriaPara(id) };
      }}
    >
      {({ activa, obligatoria }) => (
        <div className="flex max-w-xl flex-col gap-4">
          <section className="flex flex-col gap-3">
            <h2 className="t-heading text-fg">Segundo factor</h2>
            {activa ? (
              <>
                <Alerta
                  tono="success"
                  icono={ShieldCheck}
                  titulo="Tu cuenta está protegida con un segundo factor"
                >
                  Al entrar te pediremos un código de tu app de autenticación.
                </Alerta>
                <RegenerarCodigosDeRespaldo />
                {obligatoria ? (
                  <p className="text-sm text-fg-muted">Tu rol requiere el segundo factor.</p>
                ) : (
                  <DesactivarMfa />
                )}
              </>
            ) : (
              <>
                <Alerta
                  tono={obligatoria ? "warning" : "info"}
                  titulo={
                    obligatoria
                      ? "Tu rol requiere activar el segundo factor"
                      : "Protege tu cuenta con un segundo factor"
                  }
                >
                  Agrega un código de un solo uso de tu app de autenticación, además de la
                  contraseña.
                </Alerta>
                <LinkNext
                  href="/activar-mfa?next=/mi-cuenta"
                  className={estilosBoton({ variant: "primary" })}
                >
                  Activar segundo factor
                </LinkNext>
              </>
            )}
          </section>
        </div>
      )}
    </PaginaPortal>
  );
}
