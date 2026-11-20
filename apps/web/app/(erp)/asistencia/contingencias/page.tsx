import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { ListaContingencias, type Fila } from "./_componentes/lista";

export const metadata = { title: "Contingencias" };

type Datos = { items: Fila[]; zona: string };

export default function PaginaContingencias() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Contingencias"
      ruta="/asistencia/contingencias"
      cargar={async () => {
        const lista = await ejecutarComoUsuario<{ items: Fila[] }>("erp", "asistencia.contingencias.listar", {});
        const hoy = await ejecutarComoUsuario<{ zona: string }>("erp", "asistencia.dias.hoy", {});
        const zona = hoy.ok ? hoy.data.zona : "America/Santiago";
        return { state: estadoPantalla(lista), items: lista.ok ? lista.data.items : [], zona };
      }}
    >
      {({ state, items, zona }) => <ListaContingencias state={state} items={items} zona={zona} />}
    </PaginaPortal>
  );
}