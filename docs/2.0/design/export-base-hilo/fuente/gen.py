#!/usr/bin/env python3
"""Genera los tres artboards de la base «Hilo» (escritorio, iPad, iPhone) desde una sola plantilla."""
import json, os, sys

OUT = sys.argv[1]

def ico(d, s=20):
    return ('<svg width="%d" height="%d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="%s"></path></svg>') % (s, s, d)

D_SPARK = "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"
D_PULSO = "M3 12h4l3-8 4 16 3-8h4"
D_GRID = "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"
D_LUNA = "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"
D_ATRAS = "M15 6l-6 6 6 6"
D_FLECHA = "M5 12h14M13 6l6 6-6 6"
D_CHECK = "M5 12.5l4.5 4.5L19 7.5"
D_SUBIR = "M12 19V5M6 11l6-6 6 6"
D_MIC = "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3"
D_DIALES = "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4"

MONO = "font-family:'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums"
OVER = "margin:0;font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)"
BTN_TINTA = "height:44px;padding:0 18px;border-radius:12px;font-weight:600;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;gap:8px;white-space:nowrap"
BTN_LINEA = "height:44px;padding:0 16px;border-radius:12px;font-weight:600;border:1px solid var(--line);background:var(--surface);display:inline-flex;align-items:center;gap:8px;white-space:nowrap"
BTN_FANT = "height:44px;padding:0 10px;border-radius:12px;font-weight:500;color:var(--muted);display:inline-flex;align-items:center;gap:6px;white-space:nowrap"
BTN_ICO = "width:44px;height:44px;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;color:var(--muted);flex:none"

HELMET = """<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap">
<style>
body{margin:0}
.t-claro{--bg:#FAFAF9;--surface:#FFFFFF;--fill:#F0F0EE;--line:#E3E3E0;--fg:#0D0D0E;--muted:#5A5A60;--agente:#4A3FD8;--agentebg:#EEEDFC;--agentefg:#FFFFFF;--ok:#166534;--okbg:#E6F4EA;--warn:#92400E;--warnbg:#FBF0DC;--bad:#B42318;--badbg:#FBE9E7;--shadow:0 14px 40px -14px rgba(13,13,14,0.28),0 2px 6px rgba(13,13,14,0.05)}
.t-oscuro{--bg:#0A0A0B;--surface:#141416;--fill:#1D1D20;--line:#29292D;--fg:#F4F4F5;--muted:#A1A1AA;--agente:#A9A4FF;--agentebg:#1D1B3A;--agentefg:#0A0A0B;--ok:#4ADE80;--okbg:#10261A;--warn:#FBBF24;--warnbg:#2A2009;--bad:#F87171;--badbg:#2C1313;--shadow:0 14px 40px -14px rgba(0,0,0,0.8),0 0 0 1px #29292D}
button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;text-align:inherit}
input{font:inherit;color:inherit;background:none;border:0;outline:0;min-width:0}
button:focus-visible{outline:2px solid var(--agente);outline-offset:2px}
form:focus-within{border-color:var(--agente)}
.sx{scrollbar-width:none}.sx::-webkit-scrollbar{display:none}
</style>
</helmet>"""

CABECERA = f"""<div style="flex:none;display:flex;align-items:center;gap:6px;padding:14px __PADX__px 4px __PADX__px">
<span style="width:32px;height:32px;border-radius:10px;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none">G</span>
<span style="font-weight:600;flex:1;min-width:0;padding-left:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Gard Security</span>
<button onClick="{{{{irHoy}}}}" aria-label="Ver el pulso de hoy" style="{BTN_ICO}">{ico(D_PULSO)}</button>
<button onClick="{{{{irIndice}}}}" aria-label="Abrir el índice de toda la aplicación" style="{BTN_ICO}">{ico(D_GRID)}</button>
<button onClick="{{{{irEquipo}}}}" aria-label="Agentes y autonomía" style="{BTN_ICO}">{ico(D_DIALES)}</button>
<button onClick="{{{{alternarTema}}}}" aria-label="Cambiar entre tema claro y oscuro" style="{BTN_ICO}">{ico(D_LUNA)}</button>
</div>"""

HILO = f"""<div style="flex:none;display:flex;flex-direction:column;gap:6px;padding:14px __PADX__px 14px __PADX__px">
<h1 style="margin:0;font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.02em">Buen día, Camilo.</h1>
<p style="margin:0;color:var(--muted);font-size:15px;line-height:22px">{{{{resumen}}}}</p>
</div>
<div style="flex:none;padding:0 __PADX__px 10px __PADX__px">
<div style="display:flex;gap:2px;padding:3px;border-radius:14px;background:var(--fill)">
<sc-for list="{{{{segmentos}}}}" as="s" hint-placeholder-count="3">
<button onClick="{{{{s.ir}}}}" style="flex:1;height:38px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-weight:{{{{s.peso}}}};background:{{{{s.bg}}}};color:{{{{s.fg}}}}"><span>{{{{s.nombre}}}}</span><span style="font-size:12px;{MONO};color:var(--muted)">{{{{s.cuenta}}}}</span></button>
</sc-for>
</div>
</div>
<div class="sx" style="flex:1;min-height:0;overflow-y:auto;padding:0 __PADX__px 16px __PADX__px">
<sc-if value="{{{{segDecide}}}}" hint-placeholder-val="{{{{true}}}}"><div style="display:flex;flex-direction:column">
<sc-for list="{{{{pendientes}}}}" as="d" hint-placeholder-count="3">
<div style="padding:16px 12px;margin:0 -12px;border-radius:16px;background:{{{{d.bg}}}};display:flex;flex-direction:column;gap:8px">
<div style="display:flex;align-items:center;gap:8px;font-size:12px;line-height:16px;font-weight:600;color:{{{{d.origenFg}}}}"><span style="width:8px;height:8px;border-radius:99px;background:{{{{d.origenFg}}}};flex:none"></span><span>{{{{d.origen}}}}</span><span style="font-weight:400;color:var(--muted)">{{{{d.area}}}}</span></div>
<button onClick="{{{{d.abrir}}}}" style="font-size:16px;line-height:22px;font-weight:600;min-height:44px;display:flex;align-items:center">{{{{d.titulo}}}}</button>
<div style="color:var(--muted)">{{{{d.contexto}}}}</div>
<div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:4px">
<button onClick="{{{{d.aprobar}}}}" style="{BTN_TINTA}">{ico(D_CHECK, 18)}<span>Aprobar</span></button>
<button onClick="{{{{d.rechazar}}}}" style="{BTN_LINEA}">Rechazar</button>
<button onClick="{{{{d.abrir}}}}" style="{BTN_FANT}"><span>Ver qué cambia</span>{ico(D_FLECHA, 16)}</button>
</div>
</div>
<div style="height:1px;background:var(--line)"></div>
</sc-for>
<sc-if value="{{{{sinPendientes}}}}" hint-placeholder-val="{{{{false}}}}"><div style="padding:40px 0;display:flex;flex-direction:column;gap:6px;align-items:flex-start">
<span style="color:var(--ok);display:inline-flex">{ico(D_CHECK, 28)}</span>
<div style="font-size:18px;line-height:26px;font-weight:600">Nada espera tu decisión.</div>
<div style="color:var(--muted)">Tus agentes siguen trabajando. Te avisan si aparece algo.</div>
</div></sc-if>
</div></sc-if>
<sc-if value="{{{{segPaso}}}}" hint-placeholder-val="{{{{false}}}}"><div style="display:flex;flex-direction:column">
<sc-for list="{{{{eventos}}}}" as="e" hint-placeholder-count="4">
<div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);align-items:flex-start">
<span style="width:64px;flex:none;font-size:12px;line-height:20px;color:var(--muted);{MONO}">{{{{e.hora}}}}</span>
<div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
<span style="font-size:12px;line-height:16px;font-weight:600;color:{{{{e.quienFg}}}}">{{{{e.quien}}}}</span>
<span>{{{{e.texto}}}}</span>
<sc-if value="{{{{e.reversible}}}}" hint-placeholder-val="{{{{false}}}}"><button onClick="{{{{e.deshacer}}}}" style="align-self:flex-start;height:44px;font-weight:600;text-decoration:underline;text-underline-offset:3px">Deshacer</button></sc-if>
</div>
</div>
</sc-for>
</div></sc-if>
<sc-if value="{{{{segViene}}}}" hint-placeholder-val="{{{{false}}}}"><div style="display:flex;flex-direction:column">
<sc-for list="{{{{proximos}}}}" as="p" hint-placeholder-count="4">
<button onClick="{{{{p.ir}}}}" style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);align-items:flex-start;min-height:44px">
<span style="width:64px;flex:none;font-size:12px;line-height:20px;color:var(--muted);{MONO}">{{{{p.cuando}}}}</span>
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span>{{{{p.texto}}}}</span><span style="font-size:12px;line-height:16px;font-weight:600;color:{{{{p.notaFg}}}}">{{{{p.nota}}}}</span></span>
</button>
</sc-for>
</div></sc-if>
</div>"""

BARRA = f"""<div style="flex:none;padding:8px __PADX__px __PADB__px __PADX__px;display:flex;flex-direction:column;gap:8px;background:var(--bg)">
<div class="sx" style="display:flex;gap:6px;overflow-x:auto">
<sc-for list="{{{{sugerencias}}}}" as="q" hint-placeholder-count="4">
<button onClick="{{{{q.ir}}}}" style="flex:none;height:44px;padding:0 14px;border-radius:99px;border:1px solid var(--line);background:var(--surface);font-size:13px;white-space:nowrap">{{{{q.texto}}}}</button>
</sc-for>
</div>
<form onSubmit="{{{{alEnviar}}}}" style="display:flex;align-items:center;gap:4px;height:56px;padding:0 6px 0 16px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)">
<span style="display:inline-flex;color:var(--agente);flex:none">{ico(D_SPARK)}</span>
<input value="{{{{texto}}}}" onChange="{{{{alEscribir}}}}" aria-label="Pide o pregunta algo a OPAI" placeholder="Pide o pregunta. OPAI lo prepara." style="flex:1;height:44px;padding:0 8px;font-size:16px">
<button type="button" aria-label="Dictar por voz" style="{BTN_ICO}">{ico(D_MIC)}</button>
<button type="submit" aria-label="Enviar" style="width:44px;height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;background:var(--agente);color:var(--agentefg);flex:none">{ico(D_SUBIR)}</button>
</form>
</div>"""

FILA = f"""<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);min-height:44px">
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-weight:500">{{{{f.a}}}}</span><span style="font-size:13px;line-height:18px;color:var(--muted)">{{{{f.b}}}}</span></span>
<span style="flex:none;font-weight:600;{MONO};color:{{{{f.vFg}}}}">{{{{f.v}}}}</span>
</div>"""

LIENZO_IN = f"""<header style="flex:none;min-height:64px;display:flex;align-items:center;gap:8px;padding:0 __LPADX__px;border-bottom:1px solid var(--line)">
<sc-if value="{{{{movil}}}}" hint-placeholder-val="{{{{false}}}}"><button onClick="{{{{cerrarLienzo}}}}" aria-label="Volver al hilo" style="{BTN_ICO};margin-left:-10px">{ico(D_ATRAS)}</button></sc-if>
<div style="flex:1;min-width:0;display:flex;flex-direction:column">
<span style="font-size:12px;line-height:16px;color:var(--muted)">{{{{lzSub}}}}</span>
<span style="font-size:17px;line-height:24px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{{{lzTitulo}}}}</span>
</div>
</header>
<main class="sx" style="flex:1;min-height:0;overflow-y:auto;padding:__LPADY__px __LPADX__px 40px __LPADX__px">

<sc-if value="{{{{esHoy}}}}" hint-placeholder-val="{{{{true}}}}"><div style="display:flex;flex-direction:column;gap:__GAP__px;max-width:860px">
<p style="margin:0;font-size:__DISPLAY__px;line-height:__DISPLAYLH__px;font-weight:600;letter-spacing:-0.02em">Hoy cubres <span style="{MONO}">146</span> de <span style="{MONO}">148</span> turnos, te deben <span style="{MONO}">$31.750.000</span> y tienes <span style="{MONO}">5</span> negocios por cerrar este mes.</p>
<section>
<h2 style="{OVER};padding-bottom:10px">Pulso</h2>
<div style="display:grid;grid-template-columns:repeat(__PULSOCOLS__, minmax(0, 1fr));gap:0 24px;border-top:1px solid var(--line)">
<sc-for list="{{{{pulso}}}}" as="k" hint-placeholder-count="4">
<button onClick="{{{{k.ir}}}}" style="display:flex;flex-direction:column;gap:4px;padding:16px 0;border-bottom:1px solid var(--line)">
<span style="font-size:13px;line-height:18px;color:var(--muted)">{{{{k.nombre}}}}</span>
<span style="font-size:__KPI__px;line-height:32px;font-weight:600;letter-spacing:-0.02em;{MONO}">{{{{k.valor}}}}</span>
<span style="font-size:12px;line-height:16px;font-weight:500;color:{{{{k.notaFg}}}}">{{{{k.nota}}}}</span>
</button>
</sc-for>
</div>
</section>
<section>
<h2 style="{OVER};padding-bottom:10px">Tu equipo de agentes</h2>
<div style="display:flex;flex-direction:column;border-top:1px solid var(--line)">
<sc-for list="{{{{agentes}}}}" as="g" hint-placeholder-count="4">
<button onClick="{{{{irEquipo}}}}" style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);min-height:44px">
<span style="width:36px;height:36px;border-radius:12px;background:var(--agentebg);color:var(--agente);display:inline-flex;align-items:center;justify-content:center;flex:none">{ico(D_SPARK, 18)}</span>
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-weight:600">{{{{g.nombre}}}}</span><span style="font-size:13px;line-height:18px;color:var(--muted)">{{{{g.ultimo}}}}</span></span>
<span style="flex:none;font-size:12px;line-height:16px;font-weight:600;padding:4px 10px;border-radius:99px;background:var(--fill)">{{{{g.nivelTexto}}}}</span>
</button>
</sc-for>
</div>
</section>
</div></sc-if>

<sc-if value="{{{{esDecision}}}}" hint-placeholder-val="{{{{false}}}}"><div style="display:flex;flex-direction:column;gap:24px;max-width:720px">
<div style="display:flex;flex-direction:column;gap:8px">
<div style="display:flex;align-items:center;gap:8px;font-size:12px;line-height:16px;font-weight:600;color:{{{{dz.origenFg}}}}"><span style="width:8px;height:8px;border-radius:99px;background:{{{{dz.origenFg}}}}"></span><span>{{{{dz.origen}}}}</span><span style="font-weight:400;color:var(--muted)">{{{{dz.area}}}}</span></div>
<h2 style="margin:0;font-size:__H2__px;line-height:__H2LH__px;font-weight:700;letter-spacing:-0.02em">{{{{dz.titulo}}}}</h2>
<p style="margin:0;font-size:15px;line-height:22px;color:var(--muted)">{{{{dz.contexto}}}}</p>
</div>
<section style="display:flex;flex-direction:column;gap:8px">
<h3 style="{OVER}">Por qué lo propone</h3>
<p style="margin:0;font-size:15px;line-height:22px">{{{{dz.porque}}}}</p>
</section>
<section style="display:flex;flex-direction:column;gap:10px">
<h3 style="{OVER}">Qué cambia si apruebas</h3>
<div style="background:var(--fill);border-radius:16px;padding:6px 16px">
<sc-for list="{{{{dz.cambios}}}}" as="c" hint-placeholder-count="2">
<div style="display:flex;flex-direction:column;gap:4px;padding:12px 0;border-bottom:1px solid var(--line)">
<span style="font-size:12px;line-height:16px;color:var(--muted)">{{{{c.campo}}}}</span>
<div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;{MONO};font-size:13px;line-height:18px"><span style="text-decoration:line-through;color:var(--muted)">{{{{c.antes}}}}</span><span style="display:inline-flex;color:var(--muted)">{ico(D_FLECHA, 16)}</span><span style="font-weight:600">{{{{c.despues}}}}</span></div>
</div>
</sc-for>
<div style="padding:12px 0;font-size:13px;line-height:18px;color:var(--muted)">Nada se escribe hasta que apruebes. Queda en la auditoría con tu nombre y el del agente.</div>
</div>
</section>
<section style="display:flex;flex-direction:column;gap:4px">
<h3 style="{OVER};padding-bottom:6px">{{{{dz.tituloFilas}}}}</h3>
<div style="border-top:1px solid var(--line)">
<sc-for list="{{{{dz.filas}}}}" as="f" hint-placeholder-count="3">
<button onClick="{{{{f.elegir}}}}" style="width:100%;display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line);min-height:44px">
<sc-if value="{{{{dz.elegible}}}}" hint-placeholder-val="{{{{false}}}}"><span style="width:20px;height:20px;border-radius:99px;border:2px solid {{{{f.aro}}}};display:inline-flex;align-items:center;justify-content:center;flex:none"><span style="width:10px;height:10px;border-radius:99px;background:{{{{f.punto}}}}"></span></span></sc-if>
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-weight:500">{{{{f.a}}}}</span><span style="font-size:13px;line-height:18px;color:var(--muted)">{{{{f.b}}}}</span></span>
<span style="flex:none;font-weight:600;{MONO}">{{{{f.v}}}}</span>
</button>
</sc-for>
</div>
</section>
<sc-if value="{{{{dz.pendiente}}}}" hint-placeholder-val="{{{{true}}}}"><div style="display:flex;flex-wrap:wrap;gap:8px">
<button onClick="{{{{dz.aprobar}}}}" style="{BTN_TINTA}">{ico(D_CHECK, 18)}<span>Aprobar</span></button>
<button onClick="{{{{dz.rechazar}}}}" style="{BTN_LINEA}">Rechazar</button>
</div></sc-if>
<sc-if value="{{{{dz.resuelta}}}}" hint-placeholder-val="{{{{false}}}}"><div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px">
<span style="display:inline-flex;align-items:center;gap:8px;font-weight:600;color:{{{{dz.resultadoFg}}}}">{ico(D_CHECK, 18)}<span>{{{{dz.resultado}}}}</span></span>
<button onClick="{{{{dz.deshacer}}}}" style="height:44px;font-weight:600;text-decoration:underline;text-underline-offset:3px">Deshacer</button>
</div></sc-if>
</div></sc-if>

<sc-if value="{{{{esRespuesta}}}}" hint-placeholder-val="{{{{false}}}}"><div style="display:flex;flex-direction:column;gap:24px;max-width:720px">
<div style="display:flex;flex-direction:column;gap:6px">
<span style="font-size:13px;line-height:18px;color:var(--muted)">Pediste: «{{{{rs.pregunta}}}}»</span>
<span style="font-size:__BIG__px;line-height:__BIGLH__px;font-weight:700;letter-spacing:-0.03em;{MONO}">{{{{rs.valor}}}}</span>
<span style="font-size:15px;line-height:22px;color:var(--muted)">{{{{rs.nota}}}}</span>
</div>
<div style="border-top:1px solid var(--line)">
<sc-for list="{{{{rs.filas}}}}" as="f" hint-placeholder-count="4">
{FILA}
</sc-for>
</div>
<sc-if value="{{{{rs.hecho}}}}" hint-placeholder-val="{{{{false}}}}"><span style="display:inline-flex;align-items:center;gap:8px;font-weight:600;color:var(--ok)">{ico(D_CHECK, 18)}<span>{{{{rs.hechoTexto}}}}</span></span></sc-if>
<sc-if value="{{{{rs.abierta}}}}" hint-placeholder-val="{{{{true}}}}"><div style="display:flex;flex-wrap:wrap;gap:8px">
<sc-for list="{{{{rs.acciones}}}}" as="x" hint-placeholder-count="2">
<button onClick="{{{{x.ir}}}}" style="height:44px;padding:0 18px;border-radius:12px;font-weight:600;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;background:{{{{x.bg}}}};color:{{{{x.fg}}}};border:1px solid {{{{x.borde}}}}">{{{{x.texto}}}}</button>
</sc-for>
</div></sc-if>
</div></sc-if>

<sc-if value="{{{{esIndice}}}}" hint-placeholder-val="{{{{false}}}}"><div style="display:grid;grid-template-columns:repeat(__INDCOLS__, minmax(0, 1fr));gap:28px 32px">
<sc-for list="{{{{indice}}}}" as="a" hint-placeholder-count="6">
<section style="display:flex;flex-direction:column">
<h2 style="{OVER};padding-bottom:8px;border-bottom:1px solid var(--line)">{{{{a.nombre}}}}</h2>
<sc-for list="{{{{a.entradas}}}}" as="n" hint-placeholder-count="5">
<button onClick="{{{{n.ir}}}}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:44px;border-bottom:1px solid var(--line);font-size:15px"><span>{{{{n.nombre}}}}</span><span style="display:inline-flex;color:var(--muted)">{ico(D_FLECHA, 16)}</span></button>
</sc-for>
</section>
</sc-for>
</div></sc-if>

<sc-if value="{{{{esLista}}}}" hint-placeholder-val="{{{{false}}}}"><div style="display:flex;flex-direction:column;gap:16px;max-width:860px">
<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center">
<span style="height:36px;padding:0 14px;border-radius:99px;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;font-size:13px;font-weight:600">Todos</span>
<span style="height:36px;padding:0 14px;border-radius:99px;border:1px solid var(--line);display:inline-flex;align-items:center;font-size:13px">Requieren atención</span>
<span style="height:36px;padding:0 14px;border-radius:99px;border:1px solid var(--line);display:inline-flex;align-items:center;font-size:13px">Míos</span>
<button onClick="{{{{irIndice}}}}" style="{BTN_FANT};margin-left:auto">{ico(D_GRID, 16)}<span>Índice</span></button>
</div>
<div style="border-top:1px solid var(--line)">
<sc-for list="{{{{lista}}}}" as="f" hint-placeholder-count="5">
{FILA}
</sc-for>
</div>
</div></sc-if>

<sc-if value="{{{{esEquipo}}}}" hint-placeholder-val="{{{{false}}}}"><div style="display:flex;flex-direction:column;gap:20px;max-width:720px">
<p style="margin:0;font-size:15px;line-height:22px;color:var(--muted)">Tú decides cuánto hace cada agente sin preguntarte. Lo irreversible siempre pasa por ti.</p>
<div style="border-top:1px solid var(--line)">
<sc-for list="{{{{agentes}}}}" as="g" hint-placeholder-count="4">
<div style="display:flex;flex-direction:column;gap:10px;padding:18px 0;border-bottom:1px solid var(--line)">
<div style="display:flex;align-items:center;gap:12px">
<span style="width:36px;height:36px;border-radius:12px;background:var(--agentebg);color:var(--agente);display:inline-flex;align-items:center;justify-content:center;flex:none">{ico(D_SPARK, 18)}</span>
<span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:16px;line-height:22px;font-weight:600">{{{{g.nombre}}}}</span><span style="font-size:13px;line-height:18px;color:var(--muted)">{{{{g.area}}}}</span></span>
</div>
<div style="display:flex;gap:2px;padding:3px;border-radius:14px;background:var(--fill)">
<sc-for list="{{{{g.niveles}}}}" as="n" hint-placeholder-count="3">
<button onClick="{{{{n.ir}}}}" style="flex:1;height:38px;border-radius:11px;font-size:13px;font-weight:{{{{n.peso}}}};background:{{{{n.bg}}}};color:{{{{n.fg}}}};text-align:center">{{{{n.nombre}}}}</button>
</sc-for>
</div>
<span style="font-size:13px;line-height:18px;color:var(--muted)">{{{{g.regla}}}}</span>
</div>
</sc-for>
</div>
</div></sc-if>

</main>"""

LOGICA = r"""
const MOVIL = __MOVIL__;
const AG = 'var(--agente)', FG = 'var(--fg)', MU = 'var(--muted)';
const DEC = [
  { id: 'd1', agente: true, origen: 'Agente Cobertura', area: '· Operaciones', titulo: 'Cubrir el turno de noche en Planta Norte',
    contexto: 'Marco Fuentes avisó su ausencia a las 18:40. El turno parte a las 20:00.',
    porque: 'Daniela Rojas es la más cercana, conoce la instalación y con este turno llega a 44 horas en la semana, bajo el máximo.',
    cambios: [{ campo: 'Acceso principal · hoy 20:00 a 08:00', antes: 'Sin cobertura', despues: 'Daniela Rojas · turno extra' }, { campo: 'Costo del turno extra', antes: '$0', despues: '$38.000 · tarifa de la instalación' }],
    tituloFilas: 'A quién asignar', elegible: true,
    filas: [{ a: 'Daniela Rojas', b: 'A 12 min · 32 h esta semana · recomendada', v: '$38.000' }, { a: 'Pedro Salinas', b: 'A 25 min · 40 h esta semana', v: '$38.000' }, { a: 'Externo con boleta', b: 'Disponible desde las 21:00', v: '$45.000' }],
    hecho: 'Turno cubierto en Planta Norte' },
  { id: 'd2', agente: true, origen: 'Agente Cobranza', area: '· Finanzas', titulo: 'Enviar recordatorio a 3 clientes con facturas vencidas',
    contexto: 'Suman $12.480.000. Ninguno ha recibido gestión de cobro este mes.',
    porque: 'Las tres facturas pasaron el plazo pactado y los contactos de pago están vigentes. El correo usa la plantilla de tu empresa.',
    cambios: [{ campo: 'Estado de cobranza de 3 facturas', antes: 'Sin gestión', despues: 'Recordatorio 1 enviado' }],
    tituloFilas: 'Facturas incluidas', elegible: false,
    filas: [{ a: 'Logística Andina SpA', b: 'Factura 2051 · 18 días vencida', v: '$6.200.000' }, { a: 'Inmobiliaria Costanera', b: 'Factura 2047 · 11 días vencida', v: '$3.980.000' }, { a: 'Minera Cerro Alto', b: 'Factura 2039 · 9 días vencida', v: '$2.300.000' }],
    hecho: 'Recordatorios enviados a 3 clientes' },
  { id: 'd3', agente: true, origen: 'Agente Conciliación', area: '· Finanzas', titulo: 'Confirmar 2 movimientos del banco que no calzaron solos',
    contexto: 'Anoche calzó 23 movimientos sin ayuda. Estos dos tienen una diferencia que prefiere mostrarte.',
    porque: 'El abono coincide en monto y RUT con una factura, pero llegó desde otra cuenta. El cargo difiere en $300 de la compra registrada.',
    cambios: [{ campo: 'Abono del 10-nov · $3.980.000', antes: 'Sin conciliar', despues: 'Factura 2047 · Inmobiliaria Costanera' }, { campo: 'Cargo del 10-nov · $412.300', antes: 'Sin conciliar', despues: 'Compra · Uniformes del Sur' }],
    tituloFilas: 'Movimientos', elegible: false,
    filas: [{ a: 'Abono Inmobiliaria Costanera', b: 'Monto exacto · RUT coincide · otra cuenta de origen', v: '$3.980.000' }, { a: 'Cargo Uniformes del Sur', b: 'Difiere en $300 de la compra', v: '$412.300' }],
    hecho: '2 movimientos conciliados' },
  { id: 'd4', agente: false, origen: 'Paula Riquelme', area: '· Comercial', titulo: 'Aprobar 6 % de descuento en la cotización de Minera Cerro Alto',
    contexto: 'El cliente lo pidió para cerrar esta semana. Supera el descuento que Paula puede dar sola.',
    porque: 'Paula indica que la competencia ofertó más bajo y que el contrato es a 24 meses.',
    cambios: [{ campo: 'Precio mensual', antes: '$9.840.000', despues: '$9.249.600' }, { campo: 'Margen', antes: '18,4 %', despues: '13,2 %' }],
    tituloFilas: 'La cotización', elegible: false,
    filas: [{ a: '6 puestos · 24 horas', b: 'Faena Cerro Alto · 14 guardias', v: '$9.249.600' }, { a: 'Plazo del contrato', b: 'Desde el 1 de diciembre', v: '24 meses' }],
    hecho: 'Descuento aprobado' },
];
const RESP = {
  q1: { pregunta: '¿Cuánto me deben?', valor: '$31.750.000', nota: 'Por cobrar hoy. $12.480.000 ya está vencido, en 3 clientes.',
    filas: [{ a: 'Logística Andina SpA', b: '$6.200.000 vencido hace 18 días', v: '$11.900.000' }, { a: 'Inmobiliaria Costanera', b: '$3.980.000 vencido hace 11 días', v: '$7.960.000' }, { a: 'Minera Cerro Alto', b: '$2.300.000 vencido hace 9 días', v: '$6.890.000' }, { a: 'Clínica del Valle', b: 'Al día', v: '$5.000.000' }],
    acciones: [{ texto: 'Revisar los recordatorios', dec: 'd2' }, { texto: 'Abrir Ventas', lista: ['Finanzas', 'Ventas'] }] },
  q2: { pregunta: '¿Quién falta hoy?', valor: '2 de 148', nota: 'Turnos con ausencia hoy. Uno ya está cubierto.',
    filas: [{ a: 'Planta Norte · noche', b: 'Marco Fuentes avisó a las 18:40', v: 'Sin cobertura', tono: 'bad' }, { a: 'Bodega Sur · día', b: 'Lo cubre Pedro Salinas desde las 08:00', v: 'Cubierto', tono: 'ok' }],
    acciones: [{ texto: 'Cubrir Planta Norte', dec: 'd1' }, { texto: 'Abrir Pauta', lista: ['Operaciones', 'Pauta'] }] },
  q3: { pregunta: 'Negocios por cerrar este mes', valor: '$28.300.000', nota: 'Al mes, en 5 negocios en negociación.',
    filas: [{ a: 'Minera Cerro Alto', b: 'Espera tu aprobación de descuento', v: '$9.840.000' }, { a: 'Clínica del Valle', b: 'Segundo seguimiento enviado ayer', v: '$6.400.000' }, { a: 'Puerto Sur', b: 'Visita técnica el jueves 12', v: '$5.100.000' }, { a: 'Colegio Los Robles', b: 'Cotización enviada', v: '$3.760.000' }, { a: 'Retail Centro', b: 'Cotización enviada', v: '$3.200.000' }],
    acciones: [{ texto: 'Ver el descuento pendiente', dec: 'd4' }, { texto: 'Abrir Negocios', lista: ['Comercial', 'Negocios'] }] },
  q4: { pregunta: 'Factura noviembre a Logística Andina', valor: '$6.200.000', nota: 'Vista previa de la factura. Todavía no se emite.',
    filas: [{ a: 'Servicio de vigilancia · noviembre', b: 'Centro de distribución Quilicura', v: '$5.210.084' }, { a: 'IVA 19 %', b: 'Factura electrónica afecta', v: '$989.916' }, { a: 'Vencimiento', b: '30 días desde la emisión', v: '11-dic' }],
    acciones: [{ texto: 'Aprobar y emitir', emitir: true }, { texto: 'Editar el borrador', lista: ['Finanzas', 'Ventas'] }],
    hechoTexto: 'Factura emitida y enviada al cliente' },
  q0: { pregunta: '', valor: 'Solo una maqueta', nota: 'Aquí responden las cuatro sugerencias de la barra. En la aplicación, OPAI busca entre todas las capacidades de tu empresa.', filas: [], acciones: [] },
};
const SUG = [['q1', '¿Cuánto me deben?'], ['q2', '¿Quién falta hoy?'], ['q3', 'Negocios por cerrar este mes'], ['q4', 'Factura noviembre a Logística Andina']];
const INDICE = [
  ['Comercial', ['Solicitudes', 'Negocios', 'Cotizaciones', 'Cuentas', 'Contactos']],
  ['Operaciones', ['Pauta', 'Turnos extra', 'Supervisión', 'Rondas', 'Novedades', 'Tickets']],
  ['Personas', ['Personas', 'Asistencia', 'Remuneraciones']],
  ['Finanzas', ['Ventas', 'Compras', 'Banca y conciliación', 'Flujo de caja', 'Rendiciones']],
  ['Documentos', ['Explorador', 'Firmas']],
  ['Configuración', ['Empresa', 'Personas y acceso', 'Agentes', 'Módulos']],
];
const LISTAS = {
  Comercial: RESP.q3.filas,
  Operaciones: [{ a: 'Planta Norte', b: '4 puestos · 1 turno sin cobertura hoy', v: '3 de 4', tono: 'bad' }, { a: 'Bodega Sur', b: '2 puestos · cubierta', v: '2 de 2', tono: 'ok' }, { a: 'Centro de distribución Quilicura', b: '6 puestos · cubierta', v: '6 de 6', tono: 'ok' }, { a: 'Clínica del Valle', b: '3 puestos · cubierta', v: '3 de 3', tono: 'ok' }, { a: 'Edificio Costanera', b: '2 puestos · cubierta', v: '2 de 2', tono: 'ok' }],
  Personas: [{ a: 'Daniela Rojas', b: 'Guardia · Planta Norte', v: 'Activa', tono: 'ok' }, { a: 'Marco Fuentes', b: 'Guardia · Planta Norte', v: 'Ausente hoy', tono: 'bad' }, { a: 'Pedro Salinas', b: 'Guardia · Bodega Sur', v: 'Activo', tono: 'ok' }, { a: 'Carla Muñoz', b: 'Supervisora · Zona norte', v: 'Activa', tono: 'ok' }, { a: 'Jorge Tapia', b: 'Guardia · Clínica del Valle', v: 'Curso por vencer', tono: 'warn' }],
  Finanzas: [{ a: 'Logística Andina SpA', b: 'Factura 2051 · vencida hace 18 días', v: '$6.200.000', tono: 'bad' }, { a: 'Inmobiliaria Costanera', b: 'Factura 2047 · vencida hace 11 días', v: '$3.980.000', tono: 'bad' }, { a: 'Minera Cerro Alto', b: 'Factura 2039 · vencida hace 9 días', v: '$2.300.000', tono: 'bad' }, { a: 'Clínica del Valle', b: 'Factura 2058 · vence el 28-nov', v: '$5.000.000' }, { a: 'Logística Andina SpA', b: 'Factura 2060 · vence el 5-dic', v: '$5.700.000' }],
  Documentos: [{ a: 'Curso OS-10 · Jorge Tapia', b: 'Vence el jueves 12', v: '1 día', tono: 'warn' }, { a: 'Curso OS-10 · Carla Muñoz', b: 'Vence el jueves 12', v: '1 día', tono: 'warn' }, { a: 'Contrato · Logística Andina SpA', b: 'Renovación el lunes 16', v: '5 días' }, { a: 'Anexo de contrato · Daniela Rojas', b: 'Espera firma', v: 'Pendiente' }],
  'Configuración': [{ a: 'Datos de la empresa', b: 'Razón social, marca y datos legales', v: '' }, { a: 'Usuarios y permisos', b: '12 personas con acceso', v: '' }, { a: 'Agentes y API keys', b: '4 agentes activos', v: '' }, { a: 'Módulos', b: '7 activos', v: '' }],
};
const AGENTES = [
  { id: 'cob', nombre: 'Cobertura', area: 'Operaciones · ausencias y turnos extra', ultimo: 'Propuso cubrir Planta Norte a las 18:52' },
  { id: 'cbr', nombre: 'Cobranza', area: 'Finanzas · facturas vencidas', ultimo: 'Preparó 3 recordatorios a las 07:30' },
  { id: 'con', nombre: 'Conciliación', area: 'Finanzas · banco y facturas', ultimo: 'Calzó 23 movimientos a las 06:15' },
  { id: 'seg', nombre: 'Seguimiento', area: 'Comercial · cotizaciones enviadas', ultimo: 'Envió 4 seguimientos ayer a las 19:02' },
];
const NIVELES = ['Observa', 'Propone', 'Actúa solo'];
const REGLAS = ['Solo te avisa lo que ve. No prepara cambios.', 'Prepara el cambio y espera tu aprobación.', 'Actúa sin preguntar hasta $50.000 por acción y te lo cuenta en «Pasó». Lo irreversible sigue pasando por ti.'];
const PASO = [
  { hora: '06:15', agente: true, quien: 'Agente Conciliación', texto: 'Calzó 23 movimientos del banco con sus facturas.' },
  { hora: '02:10', agente: true, quien: 'Agente Cobertura', texto: 'Rondas completas en 11 de 12 instalaciones. Falta un punto en Bodega Sur.' },
  { hora: 'Ayer 19:02', agente: true, quien: 'Agente Seguimiento', texto: 'Envió el segundo seguimiento de 4 cotizaciones.' },
  { hora: 'Ayer 17:30', agente: false, quien: 'Tú', texto: 'Emitiste 6 facturas de noviembre.' },
];
const VIENE = [
  { cuando: 'Hoy 20:00', texto: 'Turno de noche en Planta Norte', nota: 'Sin cobertura', tono: 'bad', dec: 'd1' },
  { cuando: 'Jue 12', texto: 'Vence el curso OS-10 de 2 guardias', nota: 'Renovación pendiente', tono: 'warn', lista: ['Documentos', 'Explorador'] },
  { cuando: 'Vie 13', texto: 'Pago a proveedores programado', nota: '$5.120.000', tono: '', lista: ['Finanzas', 'Flujo de caja'] },
  { cuando: 'Lun 16', texto: 'Renovación del contrato con Logística Andina SpA', nota: 'Agente Seguimiento prepara la propuesta', tono: 'ag', lista: ['Comercial', 'Cuentas'] },
];
const TONO = { bad: 'var(--bad)', ok: 'var(--ok)', warn: 'var(--warn)', ag: AG, '': MU };

class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { tema: null, seg: 'decide', lz: 'hoy', abierto: false, decId: 'd1', est: {}, elec: {}, resp: 'q1', preguntaLibre: '', emitida: false, listaArea: 'Comercial', listaNombre: 'Negocios', niv: { cob: 1, cbr: 1, con: 2, seg: 2 }, extra: [], texto: '' };
  }
  abrir(lz, mas) { this.setState(Object.assign({ lz: lz, abierto: true }, mas || {})); }
  resolver(id, como) {
    const d = DEC.find((x) => x.id === id);
    const est = Object.assign({}, this.state.est); est[id] = como;
    const texto = como === 'aprobada' ? 'Aprobaste: ' + d.hecho + '.' : 'Rechazaste: ' + d.titulo + '.';
    this.setState({ est: est, extra: [{ id: id, hora: 'Ahora', agente: false, quien: 'Tú', texto: texto }].concat(this.state.extra.filter((e) => e.id !== id)) });
  }
  deshacer(id) {
    const est = Object.assign({}, this.state.est); delete est[id];
    this.setState({ est: est, extra: this.state.extra.filter((e) => e.id !== id) });
  }
  preguntar(q, libre) { this.abrir('respuesta', { resp: q, preguntaLibre: libre || '', texto: '' }); }
  renderVals() {
    const s = this.state;
    const oscuro = s.tema ? s.tema === 'oscuro' : !!this.props.oscuro;
    const pend = DEC.filter((d) => !s.est[d.id]);
    const decVista = (d) => {
      const e = s.est[d.id];
      const sel = s.elec[d.id] || 0;
      return Object.assign({}, d, {
        origenFg: d.agente ? AG : FG,
        bg: (!MOVIL && s.lz === 'decision' && s.decId === d.id) ? 'var(--fill)' : 'transparent',
        abrir: () => this.abrir('decision', { decId: d.id }),
        aprobar: () => this.resolver(d.id, 'aprobada'),
        rechazar: () => this.resolver(d.id, 'rechazada'),
        deshacer: () => this.deshacer(d.id),
        pendiente: !e, resuelta: !!e,
        resultado: e === 'aprobada' ? d.hecho : 'Rechazada. No se cambió nada.',
        resultadoFg: e === 'aprobada' ? 'var(--ok)' : MU,
        filas: d.filas.map((f, i) => Object.assign({}, f, {
          aro: d.elegible && i === sel ? FG : 'var(--line)', punto: d.elegible && i === sel ? FG : 'transparent',
          elegir: () => { if (d.elegible) { const el = Object.assign({}, s.elec); el[d.id] = i; this.setState({ elec: el }); } },
        })),
      });
    };
    const fila = (f) => Object.assign({ vFg: f.tono ? TONO[f.tono] : FG }, f);
    const r0 = RESP[s.resp] || RESP.q0;
    const hecho = s.resp === 'q4' && s.emitida;
    const rs = Object.assign({}, r0, {
      pregunta: s.resp === 'q0' ? s.preguntaLibre : r0.pregunta,
      filas: r0.filas.map(fila), hecho: hecho, abierta: !hecho, hechoTexto: r0.hechoTexto || '',
      acciones: r0.acciones.map((x, i) => ({
        texto: x.texto, bg: i === 0 ? FG : 'var(--surface)', fg: i === 0 ? 'var(--bg)' : FG, borde: i === 0 ? FG : 'var(--line)',
        ir: () => {
          if (x.dec) this.abrir('decision', { decId: x.dec });
          else if (x.lista) this.abrir('lista', { listaArea: x.lista[0], listaNombre: x.lista[1] });
          else if (x.emitir) this.setState({ emitida: true, extra: [{ id: 'q4', hora: 'Ahora', agente: false, quien: 'Tú', texto: 'Emitiste la factura de noviembre a Logística Andina SpA por $6.200.000.' }].concat(s.extra) });
        },
      })),
    });
    const eventos = s.extra.concat(PASO).map((e) => ({
      hora: e.hora, quien: e.quien, texto: e.texto, quienFg: e.agente ? AG : FG,
      reversible: !!e.id && e.id !== 'q4', deshacer: () => this.deshacer(e.id),
    }));
    const titulos = { hoy: ['Miércoles 11 de noviembre', 'Pulso de hoy'], decision: ['Decisión', (DEC.find((d) => d.id === s.decId) || DEC[0]).origen], respuesta: ['Respuesta de OPAI', rs.pregunta || 'Tu pedido'], indice: ['Todo lo que hay en OPAI', 'Índice'], lista: [s.listaArea, s.listaNombre], equipo: ['Quién hace qué sin preguntarte', 'Agentes y autonomía'] };
    const t = titulos[s.lz];
    const n = pend.length;
    return {
      temaClase: oscuro ? 't-oscuro' : 't-claro',
      movil: MOVIL,
      lienzoDisplay: MOVIL ? (s.abierto ? 'flex' : 'none') : 'flex',
      resumen: n === 0 ? 'No tienes decisiones pendientes. Todo lo demás está en orden.' : (n === 1 ? 'Una decisión te espera.' : n + ' decisiones te esperan.') + ' Lo demás ya lo resolvieron tus agentes.',
      segmentos: [['decide', 'Decide', String(n)], ['paso', 'Pasó', String(eventos.length)], ['viene', 'Viene', String(VIENE.length)]].map((x) => ({
        nombre: x[1], cuenta: x[2], ir: () => this.setState({ seg: x[0] }),
        peso: s.seg === x[0] ? 600 : 500, bg: s.seg === x[0] ? 'var(--surface)' : 'transparent', fg: s.seg === x[0] ? FG : MU,
      })),
      segDecide: s.seg === 'decide', segPaso: s.seg === 'paso', segViene: s.seg === 'viene',
      pendientes: pend.map(decVista), sinPendientes: n === 0,
      eventos: eventos,
      proximos: VIENE.map((p) => ({ cuando: p.cuando, texto: p.texto, nota: p.nota, notaFg: TONO[p.tono], ir: () => (p.dec ? this.abrir('decision', { decId: p.dec }) : this.abrir('lista', { listaArea: p.lista[0], listaNombre: p.lista[1] })) })),
      sugerencias: SUG.map((q) => ({ texto: q[1], ir: () => this.preguntar(q[0]) })),
      texto: s.texto,
      alEscribir: (e) => this.setState({ texto: e.target.value }),
      alEnviar: (e) => {
        e.preventDefault();
        const v = s.texto.trim(); if (!v) return;
        const m = v.toLowerCase();
        const q = /deb|cobr/.test(m) ? 'q1' : /falt|ausen|turno/.test(m) ? 'q2' : /negocio|cerr|venta/.test(m) ? 'q3' : /factur/.test(m) ? 'q4' : 'q0';
        this.preguntar(q, v);
      },
      irHoy: () => this.abrir('hoy'), irIndice: () => this.abrir('indice'), irEquipo: () => this.abrir('equipo'),
      cerrarLienzo: () => this.setState({ abierto: false }),
      alternarTema: () => this.setState({ tema: oscuro ? 'claro' : 'oscuro' }),
      lzSub: t[0], lzTitulo: t[1],
      esHoy: s.lz === 'hoy', esDecision: s.lz === 'decision', esRespuesta: s.lz === 'respuesta', esIndice: s.lz === 'indice', esLista: s.lz === 'lista', esEquipo: s.lz === 'equipo',
      pulso: [
        { nombre: 'Turnos cubiertos', valor: '146/148', nota: '1 sin cobertura esta noche', notaFg: 'var(--bad)', ir: () => this.preguntar('q2') },
        { nombre: 'Por cobrar', valor: '$31,8 M', nota: '$12,5 M vencido', notaFg: 'var(--warn)', ir: () => this.preguntar('q1') },
        { nombre: 'Saldo en banco', valor: '$42,2 M', nota: 'Cartola de hoy 06:00', notaFg: MU, ir: () => this.abrir('lista', { listaArea: 'Finanzas', listaNombre: 'Banca y conciliación' }) },
        { nombre: 'Por cerrar', valor: '5', nota: '$28,3 M al mes', notaFg: MU, ir: () => this.preguntar('q3') },
      ],
      agentes: AGENTES.map((g) => ({
        nombre: g.nombre, area: g.area, ultimo: g.ultimo, nivelTexto: NIVELES[s.niv[g.id]], regla: REGLAS[s.niv[g.id]],
        niveles: NIVELES.map((nv, i) => ({ nombre: nv, peso: s.niv[g.id] === i ? 600 : 500, bg: s.niv[g.id] === i ? 'var(--surface)' : 'transparent', fg: s.niv[g.id] === i ? FG : MU, ir: () => { const niv = Object.assign({}, s.niv); niv[g.id] = i; this.setState({ niv: niv }); } })),
      })),
      dz: decVista(DEC.find((d) => d.id === s.decId) || DEC[0]),
      rs: rs,
      indice: INDICE.map((a) => ({ nombre: a[0], entradas: a[1].map((nm) => ({ nombre: nm, ir: () => this.abrir('lista', { listaArea: a[0], listaNombre: nm }) })) })),
      lista: (LISTAS[s.listaArea] || []).map(fila),
    };
  }
}
"""

VARIANTES = {
    "Main.dc.html": dict(titulo="OPAI 2.0 · Hilo en escritorio", W=1440, H=900, HILO=460, MOVIL="false", PADX=28, PADB=20, LPADX=48, LPADY=40, GAP=36, DISPLAY=34, DISPLAYLH=44, PULSOCOLS=4, KPI=26, H2=28, H2LH=34, BIG=56, BIGLH=64, INDCOLS=3),
    "iPad.dc.html": dict(titulo="OPAI 2.0 · Hilo en iPad", W=1024, H=768, HILO=400, MOVIL="false", PADX=22, PADB=16, LPADX=32, LPADY=28, GAP=28, DISPLAY=26, DISPLAYLH=34, PULSOCOLS=2, KPI=24, H2=24, H2LH=30, BIG=44, BIGLH=52, INDCOLS=2),
    "iPhone.dc.html": dict(titulo="OPAI 2.0 · Hilo en iPhone", W=390, H=844, HILO=390, MOVIL="true", PADX=18, PADB=22, LPADX=18, LPADY=20, GAP=24, DISPLAY=22, DISPLAYLH=30, PULSOCOLS=2, KPI=22, H2=22, H2LH=28, BIG=38, BIGLH=46, INDCOLS=1),
}

def armar(nombre, v):
    raiz = ('class="{{temaClase}}" style="width:%dpx;height:%dpx;box-sizing:border-box;position:relative;overflow:hidden;display:flex;'
            'flex-direction:%s;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:20px"')
    if v["MOVIL"] == "true":
        cuerpo = ('<div %s>\n<div style="flex:1;min-height:0;position:relative;display:flex;flex-direction:column">\n'
                  '<div style="flex:1;min-height:0;display:flex;flex-direction:column">\n%s\n%s\n</div>\n'
                  '<div style="position:absolute;top:0;left:0;right:0;bottom:0;display:{{lienzoDisplay}};flex-direction:column;background:var(--bg)">\n%s\n</div>\n'
                  '</div>\n%s\n</div>') % (raiz % (v["W"], v["H"], "column"), CABECERA, HILO, LIENZO_IN, BARRA)
    else:
        cuerpo = ('<div %s>\n<div style="width:%dpx;flex:none;min-height:0;display:flex;flex-direction:column;border-right:1px solid var(--line)">\n%s\n%s\n%s\n</div>\n'
                  '<div style="flex:1;min-width:0;min-height:0;display:{{lienzoDisplay}};flex-direction:column;background:var(--surface)">\n%s\n</div>\n</div>'
                  ) % (raiz % (v["W"], v["H"], "row"), v["HILO"], CABECERA, HILO, BARRA, LIENZO_IN)
    props = json.dumps({"oscuro": {"editor": "boolean", "default": False}, "$preview": {"width": v["W"], "height": v["H"]}}, ensure_ascii=False)
    html = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<title>%s</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n%s\n%s\n</x-dc>\n'
            '<script type="text/x-dc" data-dc-script data-props=\'%s\'>%s</script>\n</body>\n</html>\n') % (v["titulo"], HELMET, cuerpo, props, LOGICA)
    for k, val in v.items():
        html = html.replace("__%s__" % k, str(val))
    assert "__" not in html.replace("__proto__", ""), [x for x in html.split() if "__" in x][:5]
    open(os.path.join(OUT, nombre), "w", encoding="utf-8").write(html)
    open(os.path.join(OUT, nombre + ".logic.js"), "w", encoding="utf-8").write(
        "class DCLogic{constructor(p){this.props=p||{};}setState(s){Object.assign(this.state,s);}}\n" + LOGICA.replace("__MOVIL__", v["MOVIL"]) + "\nmodule.exports=Component;\n")

os.makedirs(OUT, exist_ok=True)
for n, v in VARIANTES.items():
    armar(n, v)

canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-11T14:10:00Z"}, "title": "OPAI 2.0 · Base agéntica «Hilo» (propuesta)",
          "launch": {"view": "canvas"}, "pages": [],
          "boards": {"Main.dc.html": {"x": 0, "y": 0, "w": 1440, "h": 900, "title": "Escritorio", "is_interactive": True},
                     "iPad.dc.html": {"x": 1520, "y": 0, "w": 1024, "h": 768, "title": "iPad", "is_interactive": True},
                     "iPhone.dc.html": {"x": 2624, "y": 0, "w": 390, "h": 844, "title": "iPhone", "is_interactive": True}},
          "order": ["Main.dc.html", "iPad.dc.html", "iPhone.dc.html"],
          "notes": {"titulo": {"x": 0, "y": -300, "text": "OPAI 2.0 · Base «Hilo»", "kind": "title1", "maxW": 3014}},
          "designSystems": []}
json.dump(canvas, open(os.path.join(OUT, "canvas.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("ok")
