const KEY = "opai_live_••••";

/** Instrucción y configuración para agregar OPAI como servidor MCP en cada asistente (26). */
export function snippets(url: string, empresa: string) {
  const nombre = `OPAI · ${empresa}`;
  return [
    {
      id: "claude",
      etiqueta: "Claude",
      paso: "En Claude, abre Ajustes › Conectores › Agregar conector personalizado y pega:",
      codigo: JSON.stringify(
        { name: nombre, url, headers: { Authorization: `Bearer ${KEY}` } },
        null,
        2,
      ),
    },
    {
      id: "chatgpt",
      etiqueta: "ChatGPT",
      paso: "En ChatGPT, abre Ajustes › Conectores › Crear, elige MCP e ingresa la URL y la cabecera:",
      codigo: `URL: ${url}\nAuthorization: Bearer ${KEY}`,
    },
    {
      id: "grokbot",
      etiqueta: "Grokbot",
      paso: "En la configuración de Grokbot, agrega el servidor MCP:",
      codigo: JSON.stringify(
        { mcpServers: { opai: { url, headers: { Authorization: `Bearer ${KEY}` } } } },
        null,
        2,
      ),
    },
    {
      id: "codex",
      etiqueta: "Codex",
      paso: "En ~/.codex/config.toml agrega:",
      codigo: `[mcp_servers.opai]\nurl = "${url}"\nheaders = { Authorization = "Bearer ${KEY}" }`,
    },
  ];
}

export const MANUAL =
  "https://github.com/Cryptobal/opai-2/blob/main/docs/2.0/agentes/operar-el-nucleo.md";
