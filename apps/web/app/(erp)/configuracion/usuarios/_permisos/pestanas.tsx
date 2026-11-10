import { Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

/** Segmentado «Usuarios | Roles | Grupos» (A1, CAR-251): pestañas por ruta, server-first. */
export function PestanasUsuarios({ activa }: { activa: "usuarios" | "roles" | "grupos" }) {
  return (
    <Segmentado
      etiqueta="Usuarios, roles y grupos"
      activa={activa}
      Link={LinkNext}
      className="self-start"
      opciones={[
        { id: "usuarios", etiqueta: "Usuarios", href: "/configuracion/usuarios" },
        { id: "roles", etiqueta: "Roles", href: "/configuracion/usuarios/roles" },
        { id: "grupos", etiqueta: "Grupos", href: "/configuracion/usuarios/grupos" },
      ]}
    />
  );
}
