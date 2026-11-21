import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import type { CadenaCentral } from "./tipos-cadena";
import { EditorCadenas } from "./editor-cadenas";

type Miembro = { userId: string; nombre: string; estado: string };

/** Pestaña «Cadenas de escalamiento» en Configuración → Central (CAR-751). */
export async function SeccionCadenas() {
  const [cadenas, usuarios] = await Promise.all([
    ejecutarComoUsuario<{ items: CadenaCentral[]; plantilla: CadenaCentral }>("erp", "central.cadenas.listar", { limite: 50 }),
    ejecutarComoUsuario<Miembro[]>("erp", "core.users.list", {}),
  ]);
  return (
    <Estado state={cadenas.ok ? "ready" : estadoPantalla(cadenas)} variante="formulario">
      {cadenas.ok ? (
        <EditorCadenas
          cadenas={cadenas.data.items}
          plantilla={cadenas.data.plantilla}
          usuarios={(usuarios.ok ? usuarios.data : []).filter((u) => u.estado === "activa")}
        />
      ) : null}
    </Estado>
  );
}