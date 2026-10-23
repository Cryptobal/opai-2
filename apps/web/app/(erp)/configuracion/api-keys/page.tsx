import { listarModulos } from "@opai/capabilities";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type ApiKey, ApiKeysLista } from "./api-keys-lista";

export const metadata = { title: "API keys" };

async function Contenido() {
  const r = await ejecutarComoUsuario<ApiKey[]>("erp", "core.apikeys.list");
  const scopes = ["core", ...listarModulos().map((m) => m.id)];
  return (
    <ApiKeysLista state={estadoPantalla(r)} keys={r.ok ? r.data : []} scopesDisponibles={scopes} />
  );
}

export default function ApiKeys() {
  return (
    <PaginaPortal portal="erp" titulo="API keys" ruta="/configuracion/api-keys">
      <Contenido />
    </PaginaPortal>
  );
}
