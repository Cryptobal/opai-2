import { LogOut } from "lucide-react";

import { Button, Forbidden } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";

import { EnlaceBoton } from "./maestros/enlace-boton";

/**
 * Se muestra cuando alguien con sesión de la empresa (ERP o Plataforma) abre el Portal Cliente: su
 * cuenta no es de un cliente, así que ve un mensaje claro en vez del «sin permisos» genérico. Para
 * entrar como cliente debe cerrar sesión y volver con el correo del contacto. De servidor: no suma JS.
 */
export function CuentaDeEmpresaEnPortalCliente({ rutaErp }: { rutaErp: string }) {
  return (
    <Forbidden
      titulo="Esta cuenta es de la empresa, no de un cliente"
      descripcion="El Portal Cliente es para los contactos de tus clientes. Para entrar como cliente, cierra tu sesión y vuelve a entrar con el correo con el que te invitaron."
      accion={
        <div className="flex flex-wrap justify-center gap-3">
          <form action={accionSalir.bind(null, "/login?next=%2Fcliente")}>
            <Button type="submit">
              <LogOut className="size-4" aria-hidden />
              Cerrar sesión para entrar como cliente
            </Button>
          </form>
          <EnlaceBoton href={rutaErp} variante="secondary">
            Volver al ERP
          </EnlaceBoton>
        </div>
      }
    />
  );
}
