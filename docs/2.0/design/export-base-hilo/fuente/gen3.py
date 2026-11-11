#!/usr/bin/env python3
"""Prototipo completo de la base «Hilo»: una plantilla, tres tamaños."""
import json, os, re, sys
OUT = sys.argv[1]
sys.argv = ["gen", "/tmp/hilo_tmp"]
import gen as G

ICONOS = dict(spark=G.D_SPARK, luna=G.D_LUNA, atras=G.D_ATRAS, flecha=G.D_FLECHA, check=G.D_CHECK, subir=G.D_SUBIR, mic=G.D_MIC, pulso=G.D_PULSO, grid=G.D_GRID,
              hilo="M4 6h16M4 12h16M4 18h10", cambio="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7",
              rostro="M9 10v1M15 10v1M9.5 15a3.5 3.5 0 0 0 5 0M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2")
CONST = dict(MONO=G.MONO, OVER=G.OVER, BTN_TINTA=G.BTN_TINTA, BTN_LINEA=G.BTN_LINEA, BTN_FANT=G.BTN_FANT, BTN_ICO=G.BTN_ICO,
             FORM="display:flex;align-items:center;gap:4px;height:56px;padding:0 6px 0 16px;border-radius:18px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow)",
             ENVIAR="width:44px;height:44px;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;background:var(--agente);color:var(--agentefg);flex:none",
             CHIP="flex:none;height:44px;padding:0 14px;border-radius:99px;border:1px solid var(--line);background:var(--surface);font-size:13px;white-space:nowrap")
def T(s):
    s = re.sub(r"\[\[i:(\w+):(\d+)\]\]", lambda m: G.ico(ICONOS[m.group(1)], int(m.group(2))), s)
    for k, v in CONST.items():
        s = s.replace("[[%s]]" % k, v)
    assert "[[" not in s, s[s.index("[["):][:80]
    return s
def si(cond, cuerpo, ph="false"):
    return '<sc-if value="{{%s}}" hint-placeholder-val="{{%s}}">%s</sc-if>' % (cond, ph, cuerpo)

CABECERA = """<div style="flex:none;display:flex;align-items:center;gap:4px;padding:14px __PADX__px 4px __PADX__px">
<button onClick="{{irPortales}}" aria-label="Cambiar de portal" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;min-height:44px">
<span style="min-width:34px;height:34px;padding:0 6px;border-radius:10px;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex:none">{{mono}}</span>
<span style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{sujeto}}</span><span style="font-size:12px;line-height:16px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{sujetoSub}}</span></span>
</button>
<button onClick="{{irPortales}}" style="flex:none;height:44px;padding:0 14px;border-radius:99px;border:1px solid var(--line);background:var(--surface);display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;white-space:nowrap">[[i:cambio:16]]<span>Portales</span></button>
<button onClick="{{irInicio}}" aria-label="Inicio del portal" style="[[BTN_ICO]]">[[i:pulso:20]]</button>
<button onClick="{{irIndice}}" aria-label="Índice de todo el portal" style="[[BTN_ICO]]">[[i:grid:20]]</button>
__TEMABTN__
</div>"""

HILO = """<div style="flex:none;display:flex;flex-direction:column;gap:6px;padding:12px __PADX__px 12px __PADX__px">
<h1 style="margin:0;font-size:26px;line-height:32px;font-weight:700;letter-spacing:-0.02em">{{saludo}}</h1>
<p style="margin:0;color:var(--muted);font-size:15px;line-height:22px">{{resumen}}</p>
</div>
<div style="flex:none;padding:0 __PADX__px 10px __PADX__px">
<div style="display:flex;gap:2px;padding:3px;border-radius:14px;background:var(--fill)">
<sc-for list="{{segmentos}}" as="s" hint-placeholder-count="3">
<button onClick="{{s.ir}}" style="flex:1;height:38px;border-radius:11px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-weight:{{s.peso}};background:{{s.bg}};color:{{s.fg}}"><span>{{s.nombre}}</span><span style="font-size:12px;[[MONO]];color:var(--muted)">{{s.cuenta}}</span></button>
</sc-for>
</div>
</div>
<div class="sx" style="flex:1;min-height:0;overflow-y:auto;padding:0 __PADX__px 16px __PADX__px">
""" + si("segDecide", """<div style="display:flex;flex-direction:column">
<sc-for list="{{decide}}" as="d" hint-placeholder-count="3">
<div style="padding:14px 12px;margin:0 -12px;border-radius:16px;background:{{d.bg}};display:flex;flex-direction:column;gap:8px">
<div style="display:flex;align-items:center;gap:8px;font-size:12px;line-height:16px;font-weight:600;color:{{d.origenFg}}"><span style="width:8px;height:8px;border-radius:99px;background:{{d.origenFg}};flex:none"></span><span>{{d.origen}}</span><span style="font-weight:400;color:var(--muted)">{{d.area}}</span></div>
<button onClick="{{d.abrir}}" style="font-size:16px;line-height:22px;font-weight:600;min-height:44px;display:flex;align-items:center">{{d.titulo}}</button>
<div style="color:var(--muted)">{{d.contexto}}</div>
<div style="display:flex;flex-wrap:wrap;gap:8px;padding-top:4px">
<button onClick="{{d.si}}" style="[[BTN_TINTA]]">{{d.siTxt}}</button>
""" + si("d.hayNo", """<button onClick="{{d.no}}" style="[[BTN_LINEA]]">Rechazar</button><button onClick="{{d.abrir}}" style="[[BTN_FANT]]"><span>Ver qué cambia</span>[[i:flecha:16]]</button>""", "true") + """
</div>
</div>
<div style="height:1px;background:var(--line)"></div>
</sc-for>
""" + si("sinPendientes", """<div style="padding:36px 0;display:flex;flex-direction:column;gap:6px;align-items:flex-start"><span style="color:var(--ok);display:inline-flex">[[i:check:28]]</span><div style="font-size:18px;line-height:26px;font-weight:600">Nada espera tu decisión.</div><div style="color:var(--muted)">Te avisamos si aparece algo.</div></div>""") + """
</div>""", "true") + si("segPaso", """<div style="display:flex;flex-direction:column">
<sc-for list="{{eventos}}" as="e" hint-placeholder-count="4">
<button onClick="{{e.ir}}" style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);align-items:flex-start;min-height:44px">
<span style="width:64px;flex:none;font-size:12px;line-height:20px;color:var(--muted);[[MONO]]">{{e.hora}}</span>
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;line-height:16px;font-weight:600;color:{{e.quienFg}}">{{e.quien}}</span><span>{{e.txt}}</span></span>
</button>
</sc-for>
""" + si("sinEventos", """<div style="padding:28px 0;color:var(--muted)">Todavía no hay registros en este turno. Lo que hagas aparece aquí.</div>""") + """
</div>""") + si("segViene", """<div style="display:flex;flex-direction:column">
<sc-for list="{{proximos}}" as="p" hint-placeholder-count="4">
<button onClick="{{p.ir}}" style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);align-items:flex-start;min-height:44px">
<span style="width:64px;flex:none;font-size:12px;line-height:20px;color:var(--muted);[[MONO]]">{{p.cuando}}</span>
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span>{{p.txt}}</span><span style="font-size:12px;line-height:16px;font-weight:600;color:{{p.notaFg}}">{{p.nota}}</span></span>
</button>
</sc-for>
</div>""") + """
</div>"""

BARRA_IN = """<div class="sx" style="display:flex;gap:6px;overflow-x:auto;align-items:center">
<span style="flex:none;height:32px;line-height:32px;padding:0 12px;border-radius:99px;background:var(--agentebg);color:var(--agente);font-size:12px;font-weight:600;white-space:nowrap;max-width:230px;overflow:hidden;text-overflow:ellipsis">Sobre: {{ctxNombre}}</span>
<sc-for list="{{sugerencias}}" as="q" hint-placeholder-count="4">
<button onClick="{{q.ir}}" style="[[CHIP]]">{{q.txt}}</button>
</sc-for>
</div>
<form onSubmit="{{alEnviar}}" style="[[FORM]]">
<span style="display:inline-flex;color:var(--agente);flex:none">[[i:spark:20]]</span>
<input value="{{texto}}" onChange="{{alEscribir}}" aria-label="Pide o busca algo en OPAI" placeholder="{{ph}}" style="flex:1;height:44px;padding:0 8px;font-size:16px">
<button type="button" aria-label="Dictar por voz" style="[[BTN_ICO]]">[[i:mic:20]]</button>
<button type="submit" aria-label="Enviar" style="[[ENVIAR]]">[[i:subir:20]]</button>
</form>"""
BARRA = '<div style="flex:none;padding:8px __PADX__px __PADB__px __PADX__px;display:flex;flex-direction:column;gap:8px;background:var(--bg)">\n' + BARRA_IN + '\n</div>'

FILA = """<div style="display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line);min-height:52px">
<button onClick="{{f.ir}}" style="flex:1;min-width:0;display:flex;align-items:center;gap:12px;padding:10px 0;min-height:44px">
""" + si("f.hayHora", """<span style="width:58px;flex:none;font-size:12px;color:var(--muted);[[MONO]]">{{f.hora}}</span>""") + """
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-weight:500">{{f.a}}</span><span style="font-size:13px;line-height:18px;color:var(--muted)">{{f.b}}</span></span>
<span style="flex:none;max-width:46%;text-align:right;font-weight:600;[[MONO]];color:{{f.vFg}}">{{f.v}}</span>
""" + si("f.flecha", """<span style="display:inline-flex;color:var(--muted);flex:none">[[i:flecha:16]]</span>""") + """
</button>
""" + si("f.hayAccion", """<button onClick="{{f.hacer}}" style="[[BTN_LINEA]];flex:none">{{f.accion}}</button>""") + """
</div>"""

def bloque(tipo, cuerpo):
    return si("b.es_" + tipo, cuerpo)

BLOQUES = "".join([
 si("b.hayH", '<h3 style="[[OVER]]">{{b.h}}</h3>'),
 bloque("frase", '<p style="margin:0;font-size:__DISPLAY__px;line-height:__DISPLAYLH__px;font-weight:600;letter-spacing:-0.02em;max-width:860px">{{b.txt}}</p>'),
 bloque("nota", '<p style="margin:0;font-size:15px;line-height:22px;color:var(--muted);max-width:760px">{{b.txt}}</p>'),
 bloque("cabeza", """<div style="display:flex;flex-direction:column;gap:8px;max-width:760px"><div style="display:flex;align-items:center;gap:8px;font-size:12px;line-height:16px;font-weight:600;color:{{b.origenFg}}"><span style="width:8px;height:8px;border-radius:99px;background:{{b.origenFg}}"></span><span>{{b.origen}}</span><span style="font-weight:400;color:var(--muted)">{{b.area}}</span></div><h2 style="margin:0;font-size:__H2__px;line-height:__H2LH__px;font-weight:700;letter-spacing:-0.02em">{{b.titulo}}</h2><p style="margin:0;font-size:15px;line-height:22px;color:var(--muted)">{{b.contexto}}</p></div>"""),
 bloque("cifra", """<div style="display:flex;flex-direction:column;gap:6px;max-width:760px">""" + si("b.hayPregunta", """<span style="font-size:13px;line-height:18px;color:var(--muted)">Pediste: «{{b.pregunta}}»</span>""") + """<span style="font-size:__BIG__px;line-height:__BIGLH__px;font-weight:700;letter-spacing:-0.03em;[[MONO]]">{{b.valor}}</span><span style="font-size:15px;line-height:22px;color:var(--muted)">{{b.nota}}</span></div>"""),
 bloque("kpis", """<div style="display:grid;grid-template-columns:repeat(__KCOLS__, minmax(0, 1fr));gap:0 24px;border-top:1px solid var(--line)"><sc-for list="{{b.items}}" as="k" hint-placeholder-count="4"><button onClick="{{k.ir}}" style="display:flex;flex-direction:column;gap:4px;padding:14px 0;border-bottom:1px solid var(--line);min-width:0"><span style="font-size:13px;line-height:18px;color:var(--muted)">{{k.nombre}}</span><span style="font-size:__KPI__px;line-height:30px;font-weight:600;letter-spacing:-0.02em;[[MONO]];white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">{{k.valor}}</span><span style="font-size:12px;line-height:16px;font-weight:500;color:{{k.notaFg}}">{{k.nota}}</span></button></sc-for></div>"""),
 bloque("lista", """<div style="border-top:1px solid var(--line);max-width:900px"><sc-for list="{{b.items}}" as="f" hint-placeholder-count="4">""" + FILA + """</sc-for>""" + si("b.vacia", """<div style="padding:18px 0;color:var(--muted)">{{b.vacio}}</div>""") + """</div>"""),
 bloque("pares", """<div style="display:grid;grid-template-columns:repeat(__PCOLS__, minmax(0, 1fr));gap:0 32px;border-top:1px solid var(--line);max-width:900px"><sc-for list="{{b.items}}" as="x" hint-placeholder-count="4"><div style="display:flex;flex-direction:column;gap:2px;padding:10px 0;border-bottom:1px solid var(--line);min-width:0"><span style="font-size:12px;line-height:16px;color:var(--muted)">{{x.k}}</span><span style="font-weight:500">{{x.v}}</span></div></sc-for></div>"""),
 bloque("campos", """<div style="display:grid;grid-template-columns:repeat(__PCOLS__, minmax(0, 1fr));gap:12px 20px;max-width:900px"><sc-for list="{{b.items}}" as="x" hint-placeholder-count="3"><div style="display:flex;flex-direction:column;gap:6px;min-width:0"><span style="font-size:13px;line-height:18px;font-weight:500">{{x.k}}</span><span style="min-height:44px;padding:10px 14px;border-radius:12px;border:1px solid var(--muted);background:var(--surface);display:flex;align-items:center;color:{{x.vFg}};box-sizing:border-box">{{x.v}}</span></div></sc-for></div>"""),
 bloque("acciones", """<div style="display:flex;flex-wrap:wrap;gap:8px"><sc-for list="{{b.items}}" as="x" hint-placeholder-count="2"><button onClick="{{x.ir}}" style="min-height:44px;padding:0 18px;border-radius:12px;font-weight:600;display:inline-flex;align-items:center;background:{{x.bg}};color:{{x.fg}};border:1px solid {{x.borde}}">{{x.txt}}</button></sc-for></div>"""),
 bloque("aviso", """<div style="display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:{{b.bg}};max-width:900px"><span style="flex:1;min-width:200px;font-weight:500;color:{{b.fg}}">{{b.txt}}</span><sc-for list="{{b.items}}" as="x" hint-placeholder-count="1"><button onClick="{{x.ir}}" style="min-height:44px;padding:0 16px;border-radius:12px;font-weight:600;background:{{x.bg}};color:{{x.fg}};border:1px solid {{x.borde}}">{{x.txt}}</button></sc-for></div>"""),
 bloque("cambios", """<div style="background:var(--fill);border-radius:16px;padding:6px 16px;max-width:760px"><sc-for list="{{b.items}}" as="c" hint-placeholder-count="2"><div style="display:flex;flex-direction:column;gap:4px;padding:12px 0;border-bottom:1px solid var(--line)"><span style="font-size:12px;line-height:16px;color:var(--muted)">{{c.campo}}</span><div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;[[MONO]];font-size:13px;line-height:18px"><span style="text-decoration:line-through;color:var(--muted)">{{c.antes}}</span><span style="display:inline-flex;color:var(--muted)">[[i:flecha:16]]</span><span style="font-weight:600">{{c.despues}}</span></div></div></sc-for><div style="padding:12px 0;font-size:13px;line-height:18px;color:var(--muted)">Nada se escribe hasta que lo confirmes. Queda en la auditoría.</div></div>"""),
 bloque("linea", """<div style="border-top:1px solid var(--line);max-width:900px"><sc-for list="{{b.items}}" as="e" hint-placeholder-count="4"><div style="display:flex;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)"><span style="width:76px;flex:none;font-size:12px;line-height:20px;color:var(--muted);[[MONO]]">{{e.hora}}</span><span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-size:12px;line-height:16px;font-weight:600;color:{{e.fg}}">{{e.quien}}</span><span>{{e.txt}}</span></span></div></sc-for></div>"""),
 bloque("seg", """<div class="sx" style="display:flex;gap:6px;overflow-x:auto"><sc-for list="{{b.items}}" as="x" hint-placeholder-count="3"><button onClick="{{x.ir}}" style="flex:none;height:40px;padding:0 14px;border-radius:99px;font-size:13px;font-weight:600;white-space:nowrap;background:{{x.bg}};color:{{x.fg}};border:1px solid {{x.borde}}">{{x.nombre}}</button></sc-for></div>"""),
 bloque("papel", """<div style="background:#FFFFFF;color:#111111;border:1px solid var(--line);border-radius:6px;padding:28px;max-width:560px;display:flex;flex-direction:column;gap:4px;box-shadow:var(--shadow)"><span style="font-size:18px;line-height:24px;font-weight:700;padding-bottom:12px">{{b.titulo}}</span><sc-for list="{{b.items}}" as="x" hint-placeholder-count="4"><div style="display:flex;justify-content:space-between;gap:16px;padding:8px 0;border-bottom:1px solid #DDDDDD"><span>{{x.a}}</span><span style="[[MONO]];font-weight:600;text-align:right">{{x.v}}</span></div></sc-for><span style="font-size:12px;line-height:16px;color:#555555;padding-top:12px">{{b.pie}}</span></div>"""),
 bloque("progreso", """<div style="display:flex;flex-direction:column;gap:8px;max-width:760px"><span style="font-weight:600">{{b.txt}}</span><div style="height:6px;border-radius:99px;background:var(--fill);overflow:hidden"><div style="height:6px;border-radius:99px;background:var(--fg);width:{{b.pct}}"></div></div></div>"""),
 bloque("mapa", """<div style="height:180px;border-radius:16px;background:var(--fill);border:1px dashed var(--muted);display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:13px;max-width:900px;text-align:center;padding:0 16px">{{b.txt}}</div>"""),
 bloque("camara", """<div style="display:flex;flex-direction:column;align-items:center;gap:14px"><div style="width:280px;height:320px;border-radius:28px;background:#0D0D0E;display:flex;align-items:center;justify-content:center;position:relative"><div style="width:180px;height:230px;border-radius:50%;border:3px solid #A9A4FF"></div><span style="position:absolute;bottom:14px;font-size:12px;color:#A1A1AA;[[MONO]]">cámara del dispositivo</span></div><span style="font-size:18px;line-height:24px;font-weight:600;text-align:center">{{b.txt}}</span></div>"""),
 bloque("agente", """<div style="display:flex;align-items:center;gap:12px;padding-top:12px;border-top:1px solid var(--line);max-width:760px"><span style="width:36px;height:36px;border-radius:12px;background:var(--agentebg);color:var(--agente);display:inline-flex;align-items:center;justify-content:center;flex:none">[[i:spark:18]]</span><span style="display:flex;flex-direction:column"><span style="font-size:16px;line-height:22px;font-weight:600">{{b.nombre}}</span><span style="font-size:13px;color:var(--muted)">{{b.area}}</span></span></div>"""),
 bloque("indice", """<div style="display:grid;grid-template-columns:repeat(__ICOLS__, minmax(0, 1fr));gap:28px 32px"><sc-for list="{{b.items}}" as="a" hint-placeholder-count="6"><section style="display:flex;flex-direction:column"><h2 style="[[OVER]];padding-bottom:8px;border-bottom:1px solid var(--line)">{{a.nombre}}</h2><sc-for list="{{a.entradas}}" as="n" hint-placeholder-count="5"><button onClick="{{n.ir}}" style="display:flex;align-items:center;gap:8px;min-height:44px;border-bottom:1px solid var(--line);font-size:15px"><span style="flex:1">{{n.nombre}}</span>""" + si("n.plan", """<span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--warnbg);color:var(--warn)">Planificado</span>""") + """<span style="display:inline-flex;color:var(--muted)">[[i:flecha:16]]</span></button></sc-for></section></sc-for></div>"""),
 bloque("columnas", """<div class="sx" style="display:flex;gap:12px;overflow-x:auto;align-items:flex-start"><sc-for list="{{b.items}}" as="k" hint-placeholder-count="5"><div style="width:230px;flex:none;display:flex;flex-direction:column;gap:8px;background:var(--fill);border-radius:16px;padding:12px"><div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px"><span style="font-weight:600;font-size:13px">{{k.nombre}}</span><span style="font-size:12px;color:var(--muted);[[MONO]]">{{k.n}}</span></div><span style="font-size:13px;[[MONO]];color:var(--muted)">{{k.total}}</span><sc-for list="{{k.tarjetas}}" as="t" hint-placeholder-count="1"><button onClick="{{t.ir}}" style="display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:12px;background:var(--surface);border:1px solid var(--line)"><span style="font-weight:600">{{t.a}}</span><span style="font-size:12px;line-height:16px;color:var(--muted)">{{t.b}}</span><span style="[[MONO]];font-weight:600">{{t.v}}</span></button></sc-for></div></sc-for></div>"""),
 bloque("grilla", """<div class="sx" style="overflow-x:auto"><div style="display:flex;flex-direction:column;gap:2px;min-width:{{b.minW}}"><div style="display:flex;gap:2px;align-items:flex-end;padding-bottom:6px"><span style="width:{{b.wN}};flex:none;[[OVER]]">{{b.esquina}}</span><sc-for list="{{b.cab}}" as="c" hint-placeholder-count="6"><span style="width:{{c.w}};flex:{{c.flex}};text-align:{{c.al}};padding:{{c.pad}};box-sizing:border-box;font-size:11px;line-height:14px;font-weight:600;color:{{c.fg}};[[MONO]];white-space:pre-line">{{c.t}}</span></sc-for></div><sc-for list="{{b.filas}}" as="r" hint-placeholder-count="5"><div style="display:flex;gap:2px;align-items:center;border-bottom:{{r.borde}}"><span style="width:{{r.wN}};flex:none;display:flex;flex-direction:column;padding:4px 0;min-width:0"><span style="font-weight:{{r.peso}};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{r.nombre}}</span><span style="font-size:12px;line-height:16px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{r.sub}}</span></span><sc-for list="{{r.celdas}}" as="c" hint-placeholder-count="6"><button onClick="{{c.ir}}" style="width:{{c.w}};flex:{{c.flex}};height:40px;border-radius:8px;box-sizing:border-box;padding:{{c.pad}};text-align:{{c.al}};font-size:{{c.tam}};font-weight:{{c.peso}};[[MONO]];background:{{c.bg}};color:{{c.fg}};cursor:{{c.cur}}">{{c.t}}</button></sc-for></div></sc-for></div></div>"""),
])

LIENZO = """<header style="flex:none;min-height:64px;display:flex;align-items:center;gap:6px;padding:0 __LPADX__px;border-bottom:1px solid var(--line)">
""" + si("hayAtras", """<button onClick="{{atras}}" aria-label="Volver" style="[[BTN_ICO]];margin-left:-10px">[[i:atras:20]]</button>""") + """
<div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:12px;line-height:16px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{lzSub}}</span><span style="font-size:17px;line-height:24px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{lzTitulo}}</span></div>
</header>
""" + si("hayTabs", """<div class="sx" style="flex:none;display:flex;gap:4px;overflow-x:auto;padding:0 __LPADX__px;border-bottom:1px solid var(--line)"><sc-for list="{{tabs}}" as="t" hint-placeholder-count="5"><button onClick="{{t.ir}}" style="flex:none;height:46px;padding:0 10px;font-weight:{{t.peso}};color:{{t.fg}};border-bottom:2px solid {{t.raya}};white-space:nowrap">{{t.nombre}}</button></sc-for></div>""") + """
<main class="sx" style="flex:1;min-height:0;overflow-y:auto;padding:__LPADY__px __LPADX__px 40px __LPADX__px">
<div style="display:flex;flex-direction:column;gap:__GAP__px">
<sc-for list="{{bloques}}" as="b" hint-placeholder-count="3">
<section style="display:flex;flex-direction:column;gap:10px;min-width:0">""" + BLOQUES + """</section>
</sc-for>
</div>
</main>"""

RAIL = """<nav aria-label="Volver al hilo" style="width:72px;flex:none;display:{{railDisplay}};flex-direction:column;align-items:center;gap:8px;padding:14px 0;border-right:1px solid var(--line)">
<button onClick="{{irPortales}}" aria-label="Cambiar de portal" style="min-width:36px;height:36px;padding:0 6px;border-radius:11px;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;margin-bottom:8px">{{mono}}</button>
<button onClick="{{irRaiz}}" aria-label="Volver al hilo" style="width:56px;height:56px;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;position:relative">[[i:hilo:20]]<span style="font-size:11px;line-height:14px">Hilo</span><span style="position:absolute;top:4px;right:4px;min-width:18px;height:18px;border-radius:99px;background:var(--agente);color:var(--agentefg);font-size:11px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;[[MONO]]">{{nDec}}</span></button>
<button onClick="{{irIndice}}" aria-label="Índice" style="[[BTN_ICO]]">[[i:grid:20]]</button>
<button onClick="{{alternarTema}}" aria-label="Cambiar entre tema claro y oscuro" style="[[BTN_ICO]];margin-top:auto">[[i:luna:20]]</button>
</nav>"""
