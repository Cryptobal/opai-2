import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Segmentado «Usuarios | Roles» (A1): pestañas por ruta, server-first. */
export function PestanasUsuarios({ activa }: { activa: "usuarios" | "roles" }) {
  return (
    <Segmentado
      etiqueta="Usuarios y roles"
      activa={activa}
      Link={LinkNext}
      className="self-start"
      opciones={[
        { id: "usuarios", etiqueta: "Usuarios", href: "/configuracion/usuarios" },
        { id: "roles", etiqueta: "Roles", href: "/configuracion/usuarios/roles" },
      ]}
    />
  );
}
