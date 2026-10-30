// Generador de hojas de artboards (lo usa el agente; no lo carga ninguna pantalla).
function artboardSheet(s) {
  const VP = { phone: [375, 812, "375"], tablet: [1024, 768, "1024"], desktop: [1280, 800, "1280"] };
  const ab = (label, comp, attrs, vp) => {
    const [w, hh] = VP[vp];
    return `<div style="display:flex;flex-direction:column;gap:8px;flex:none"><span class="t-label-sm" style="color:var(--ds-fg-muted)">${label}</span><div style="width:${w}px;height:${hh}px;border-radius:var(--radius-lg);overflow:hidden;border:1px solid var(--ds-border-strong)"><dc-import name="${comp}" device="${vp}" ${s.attrs || ""} ${attrs} hint-size="${w}px,${hh}px"></dc-import></div></div>`;
  };
  const row = (title, items) => `<div style="display:flex;flex-direction:column;gap:12px"><span class="t-subheading">${title}</span><div style="display:flex;gap:32px;align-items:flex-start">${items.join("")}</div></div>`;
  const rows = [];
  if (s.first && s.first.length) rows.push(row(s.firstTitle || "Entrada", s.first.map((e) => ab(e.label, s.comp, e.attrs, e.vp))));
  rows.push(row("Claro", ["phone", "tablet", "desktop"].map((v) => ab("Claro · " + VP[v][2], s.comp, 'theme="light"', v))));
  rows.push(row("Oscuro", ["phone", "tablet", "desktop"].map((v) => ab("Oscuro · " + VP[v][2], s.comp, 'theme="dark"', v))));
  const st = [["vacio", "Vacío"], ["cargando", "Cargando"], ["error", "Error"], ["sinpermiso", "Sin permiso"]];
  rows.push(row("Estados · 375 claro", st.map(([k, l]) => ab(l + " · 375 claro", s.comp, `theme="light" state="${k}"`, "phone"))));
  rows.push(row("Estados · 1280 oscuro", st.map(([k, l]) => ab(l + " · 1280 oscuro", s.comp, `theme="dark" state="${k}"`, "desktop"))));
  if (s.extra && s.extra.length) rows.push(row("Por rol", s.extra.map((e) => ab(e.label, s.comp, e.attrs, e.vp))));
  const note = s.note ? `<span class="t-body-sm" style="color:var(--ds-fg)">${s.note}</span>` : "";
  const head = `<div style="display:flex;flex-direction:column;gap:4px;max-width:900px"><a href="Indice.dc.html" class="t-label-sm" style="text-decoration:none">← Índice · OPAI 2.0 Nómina v2</a><span class="t-title">${s.title}</span><span class="t-body-sm" style="color:var(--ds-fg-muted)">${s.roles}</span>${note}</div>`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script src="./support.js"></script>
</head>
<body>
<template id="__bundler_thumbnail"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#4a3fd8"/><text x="50" y="62" font-size="30" font-family="sans-serif" text-anchor="middle" fill="#ffffff">N</text></svg></template>
<x-dc>
<helmet><meta name="design_doc_mode" content="canvas"><script src="./ds-base.js"></script><script src="./nomina-data.js"></script><style>body{margin:0;background:var(--ds-n-200)}a{color:var(--ds-accent)}a:hover{color:var(--ds-fg)}</style></helmet>
<div data-theme="light" style="display:flex;flex-direction:column;gap:40px;padding:40px;width:max-content;background:var(--ds-n-200);color:var(--ds-fg)">
${head}
${rows.join("\n")}
</div>
</x-dc>
</body>
</html>
`;
}
