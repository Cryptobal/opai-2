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
ICONOS.update(selector="M8 10l4-4 4 4M8 14l4 4 4-4", lupa="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.9-3.9", chevron="M6 9l6 6 6-6",
              alerta="M12 8v5M12 16.5v.5M10.3 3.9L2.6 17.5a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
              candado="M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3", bandeja="M4 13l2.5-8h11L20 13M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
              sinred="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 3-2M12 20h.01M19 13a10 10 0 0 0-5.6-2.8")
def T(s):
    s = re.sub(r"\[\[i:(\w+):(\d+)\]\]", lambda m: G.ico(ICONOS[m.group(1)], int(m.group(2))), s)
    for k, v in CONST.items():
        s = s.replace("[[%s]]" % k, v)
    assert "[[" not in s, s[s.index("[["):][:80]
    return s
def si(cond, cuerpo, ph="false"):
    return '<sc-if value="{{%s}}" hint-placeholder-val="{{%s}}">%s</sc-if>' % (cond, ph, cuerpo)

CABECERA = """<div style="flex:none;display:flex;align-items:center;gap:8px;padding:12px __PADX__px 2px __PADX__px">
<button onClick="{{irPortales}}" aria-label="Cambiar de portal o de empresa" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;min-height:48px;box-sizing:border-box;margin-left:-6px;padding:4px 4px 4px 6px;border-radius:14px">
<span style="min-width:36px;height:36px;box-sizing:border-box;padding:0 7px;border-radius:10px;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none">{{mono}}</span>
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:1px">
<span style="display:flex;align-items:center;gap:4px;min-width:0"><span style="font-size:15px;line-height:20px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{sujeto}}</span><span style="flex:none;display:inline-flex;color:var(--muted)">[[i:selector:14]]</span></span>
<span style="font-size:12px;line-height:16px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{sujetoSub}}</span>
</span>
</button>
<div style="flex:none;display:flex;align-items:center">
<button onClick="{{irInicio}}" aria-label="Inicio del portal" style="[[BTN_ICO]]">[[i:pulso:20]]</button>
<button onClick="{{irIndice}}" aria-label="Índice de todo el portal" style="[[BTN_ICO]]">[[i:grid:20]]</button>
__TEMABTN__
</div>
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
""" + si("f.hayHora", """<span style="width:58px;flex:none;font-size:12px;color:var(--muted);[[MONO]]">{{f.hora}}</span>""") + si("f.hayMono", """<span style="width:36px;height:36px;border-radius:10px;background:var(--fill);color:var(--muted);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex:none">{{f.mono}}</span>""") + """
<span style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px"><span style="font-weight:500">{{f.a}}</span><span style="font-size:13px;line-height:18px;color:var(--muted)">{{f.b}}</span></span>
""" + si("f.hayEst", """<span style="font-size:11px;line-height:14px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap;flex:none;background:{{f.estBg}};color:{{f.estFg}}">{{f.est}}</span>""") + """<span style="flex:none;max-width:46%;text-align:right;font-weight:600;[[MONO]];color:{{f.vFg}}">{{f.v}}</span>
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
 bloque("buscar", """<form onSubmit="{{b.nada}}" style="display:flex;align-items:center;gap:8px;height:48px;padding:0 14px;border-radius:14px;border:1px solid var(--muted);background:var(--surface);max-width:900px;box-sizing:border-box"><span style="display:inline-flex;color:var(--muted);flex:none">[[i:lupa:18]]</span><input value="{{b.q}}" onChange="{{b.alEscribir}}" aria-label="{{b.ph}}" placeholder="{{b.ph}}" style="flex:1;height:44px;font-size:16px"></form>"""),
 bloque("conteo", """<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;line-height:16px;color:var(--muted);max-width:900px"><span>{{b.txt}}</span><span>{{b.orden}}</span></div>"""),
 bloque("etiquetas", """<div style="display:flex;flex-wrap:wrap;gap:8px"><sc-for list="{{b.items}}" as="x" hint-placeholder-count="4"><span style="font-size:11px;line-height:14px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap;flex:none;background:{{x.bg}};color:{{x.fg}}">{{x.txt}}</span></sc-for></div>"""),
 bloque("formulario", """<div style="display:grid;grid-template-columns:repeat(__PCOLS__, minmax(0, 1fr));gap:16px 20px;max-width:900px"><sc-for list="{{b.items}}" as="x" hint-placeholder-count="4"><div style="display:flex;flex-direction:column;gap:6px;min-width:0;grid-column:{{x.col}}"><span style="font-size:13px;line-height:18px;font-weight:500">{{x.k}}<span style="color:var(--bad)">{{x.req}}</span></span>""" + si("x.esTexto", """<span class="campo" style="min-height:{{x.minH}};padding:0 14px;border-radius:12px;border:1px solid {{x.borde}};background:{{x.bg}};display:flex;align-items:{{x.alin}};gap:8px;box-sizing:border-box"><input value="{{x.val}}" onChange="{{x.alEscribir}}" aria-label="{{x.k}}" placeholder="{{x.ph}}" style="flex:1;height:42px;font-size:16px;text-align:{{x.al}};font-family:{{x.fam}}"></span>""", "true") + si("x.esSelect", """<button onClick="{{x.ir}}" style="min-height:{{x.minH}};padding:0 14px;border-radius:12px;border:1px solid {{x.borde}};background:{{x.bg}};display:flex;align-items:{{x.alin}};gap:8px;box-sizing:border-box;color:{{x.vFg}}"><span style="flex:1;min-width:0;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{x.v}}</span><span style="display:inline-flex;color:var(--muted);flex:none">[[i:chevron:16]]</span></button>""") + si("x.abierto", """<div style="border:1px solid var(--line);border-radius:12px;background:var(--surface);box-shadow:var(--shadow);padding:4px;display:flex;flex-direction:column"><sc-for list="{{x.opciones}}" as="o" hint-placeholder-count="3"><button onClick="{{o.ir}}" style="min-height:44px;padding:0 12px;border-radius:8px;text-align:left;font-weight:{{o.peso}};background:{{o.bg}}">{{o.txt}}</button></sc-for></div>""") + si("x.esSwitch", """<button onClick="{{x.ir}}" style="display:flex;align-items:center;gap:12px;min-height:44px;text-align:left"><span style="width:44px;height:26px;border-radius:99px;background:{{x.pista}};position:relative;flex:none"><span style="position:absolute;top:3px;left:{{x.perilla}};width:20px;height:20px;border-radius:99px;background:var(--surface);box-shadow:0 1px 2px rgba(0,0,0,0.25)"></span></span><span style="color:var(--muted)">{{x.v}}</span></button>""") + si("x.esCheck", """<button onClick="{{x.ir}}" style="display:flex;align-items:center;gap:12px;min-height:44px;text-align:left"><span style="width:22px;height:22px;border-radius:{{x.radio}};border:2px solid {{x.cajaBorde}};background:{{x.cajaBg}};color:var(--bg);display:inline-flex;align-items:center;justify-content:center;flex:none;box-sizing:border-box">""" + si("x.on", "[[i:check:14]]") + """</span><span>{{x.v}}</span></button>""") + si("x.hayAyuda", """<span style="font-size:12px;line-height:16px;color:{{x.ayudaFg}}">{{x.ayuda}}</span>""") + """</div></sc-for></div>"""),
 bloque("estado", """<div style="display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:20px 0;max-width:560px"><span style="width:44px;height:44px;border-radius:14px;background:{{b.icoBg}};color:{{b.icoFg}};display:inline-flex;align-items:center;justify-content:center">""" + si("b.esVacio", "[[i:bandeja:22]]") + si("b.esError", "[[i:alerta:22]]") + si("b.esPermiso", "[[i:candado:22]]") + si("b.esRed", "[[i:sinred:22]]") + """</span><div style="font-size:18px;line-height:26px;font-weight:600">{{b.titulo}}</div><div style="color:var(--muted)">{{b.txt}}</div>""" + si("b.hayAccion", """<button onClick="{{b.ir}}" style="[[BTN_LINEA]];margin-top:6px">{{b.accion}}</button>""") + """</div>"""),
 bloque("skeleton", """<div style="display:flex;flex-direction:column;max-width:900px;border-top:1px solid var(--line)"><sc-for list="{{b.items}}" as="k" hint-placeholder-count="4"><div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--line)"><span style="width:36px;height:36px;border-radius:10px;background:var(--fill);flex:none"></span><span style="flex:1;display:flex;flex-direction:column;gap:8px"><span style="height:12px;width:{{k.a}};border-radius:6px;background:var(--fill)"></span><span style="height:10px;width:{{k.b}};border-radius:6px;background:var(--fill)"></span></span></div></sc-for></div>"""),
 bloque("tabla", """<div class="sx" style="overflow-x:auto;max-width:900px"><div style="display:flex;flex-direction:column;min-width:{{b.minW}}"><div style="display:flex;gap:12px;padding-bottom:8px;border-bottom:1px solid var(--line)"><sc-for list="{{b.cab}}" as="c" hint-placeholder-count="4"><span style="flex:{{c.flex}};min-width:0;text-align:{{c.al}};font-size:12px;line-height:16px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted)">{{c.t}}</span></sc-for></div><sc-for list="{{b.filas}}" as="r" hint-placeholder-count="4"><button onClick="{{r.ir}}" style="display:flex;gap:12px;align-items:center;min-height:48px;border-bottom:1px solid var(--line)"><sc-for list="{{r.celdas}}" as="c" hint-placeholder-count="4"><span style="flex:{{c.flex}};min-width:0;text-align:{{c.al}};font-weight:{{c.peso}};font-family:{{c.fam}};color:{{c.fg}};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{c.t}}</span></sc-for></button></sc-for></div></div>"""),
 bloque("dialogo", """<div style="max-width:420px;border-radius:20px;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);padding:22px;display:flex;flex-direction:column;gap:10px"><div style="font-size:18px;line-height:26px;font-weight:600">{{b.titulo}}</div><div style="color:var(--muted)">{{b.txt}}</div><div style="display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;padding-top:8px"><span style="[[BTN_LINEA]]">Cancelar</span><span style="[[BTN_TINTA]]">{{b.si}}</span></div></div>"""),
 bloque("toast", """<div style="display:inline-flex;align-items:center;gap:10px;padding:12px 16px;border-radius:14px;background:var(--fg);color:var(--bg);box-shadow:var(--shadow);max-width:420px;align-self:flex-start">[[i:check:18]]<span style="font-weight:500">{{b.txt}}</span></div>"""),
])

LIENZO = """<header style="flex:none;min-height:64px;display:flex;align-items:center;gap:6px;padding:0 __LPADX__px;border-bottom:1px solid var(--line)">
""" + si("hayAtras", """<button onClick="{{atras}}" aria-label="Volver" style="[[BTN_ICO]];margin-left:-10px">[[i:atras:20]]</button>""") + """
<div style="flex:1;min-width:0;display:flex;flex-direction:column"><span style="font-size:12px;line-height:16px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{lzSub}}</span><span style="font-size:17px;line-height:24px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{lzTitulo}}</span></div>
""" + si("hayEstCab", """<span style="font-size:11px;line-height:14px;font-weight:600;padding:3px 9px;border-radius:99px;white-space:nowrap;flex:none;background:{{estCabBg}};color:{{estCabFg}}">{{estCab}}</span>""") + """<sc-for list="{{accionesCab}}" as="x" hint-placeholder-count="1"><button onClick="{{x.ir}}" style="flex:none;height:44px;padding:0 16px;border-radius:12px;font-weight:600;white-space:nowrap;background:{{x.bg}};color:{{x.fg}};border:1px solid {{x.borde}}">{{x.txt}}</button></sc-for>
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

# ───────────────────────── ensamblado de los tableros de la aplicación ─────────────────────────
BARRA_L = ('<div style="flex:none;border-top:1px solid var(--line);background:var(--surface)"><div style="max-width:900px;box-sizing:border-box;padding:10px __LPADX__px 16px __LPADX__px;display:flex;flex-direction:column;gap:8px">\n'
           + BARRA_IN + '\n</div></div>')
TEMA_BTN = '<button onClick="{{alternarTema}}" aria-label="Cambiar entre tema claro y oscuro" style="[[BTN_ICO]]">[[i:luna:20]]</button>'
PERFIL = {
 "desk": dict(W=1440, H=900, HILO=440, MOVIL="false", PADX=26, PADB=18, LPADX=44, LPADY=32, GAP=28, DISPLAY=30, DISPLAYLH=40, KCOLS=4, PCOLS=2, ICOLS=3, KPI=24, H2=28, H2LH=34, BIG=52, BIGLH=60),
 "ipad": dict(W=1024, H=768, HILO=370, MOVIL="false", PADX=20, PADB=14, LPADX=28, LPADY=24, GAP=24, DISPLAY=24, DISPLAYLH=32, KCOLS=2, PCOLS=2, ICOLS=2, KPI=22, H2=24, H2LH=30, BIG=42, BIGLH=50),
 "fono": dict(W=390, H=844, HILO=390, MOVIL="true", PADX=18, PADB=22, LPADX=18, LPADY=18, GAP=22, DISPLAY=22, DISPLAYLH=30, KCOLS=2, PCOLS=1, ICOLS=1, KPI=20, H2=22, H2LH=28, BIG=36, BIGLH=44),
}
TABLEROS = [("Main.dc.html", "desk", "erp", "ERP · escritorio"), ("iPad.dc.html", "ipad", "erp", "ERP · iPad"), ("iPhone.dc.html", "fono", "erp", "ERP · iPhone"),
            ("Supervisor.dc.html", "fono", "supervisor", "Portal Supervisor · iPhone"), ("Terreno.dc.html", "ipad", "terreno", "Portal Terreno · tablet de la instalación"),
            ("Guardia.dc.html", "fono", "guardia", "Portal del guardia · iPhone"), ("Cliente.dc.html", "fono", "cliente", "Portal del cliente · iPhone"),
            ("ClienteEscritorio.dc.html", "desk", "cliente", "Portal del cliente · escritorio"), ("Plataforma.dc.html", "desk", "plataforma", "Plataforma · escritorio")]
LOGICA = open("app_logic.js", encoding="utf-8").read()
RAIZ = 'class="{{temaClase}}" style="width:%dpx;height:%dpx;box-sizing:border-box;position:relative;overflow:hidden;display:flex;flex-direction:%s;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:20px"'
os.makedirs(OUT, exist_ok=True); os.makedirs("scratch", exist_ok=True)

def escribir(nombre, titulo, w, h, cuerpo_html, js, extra_css=""):
    props = json.dumps({"oscuro": {"editor": "boolean", "default": False}, "$preview": {"width": w, "height": h}})
    helmet = G.HELMET.replace("</style>", extra_css + "</style>") if extra_css else G.HELMET
    html = ('<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<title>%s</title>\n<script src="./support.js"></script>\n</head>\n<body>\n<x-dc>\n%s\n%s\n</x-dc>\n'
            '<script type="text/x-dc" data-dc-script data-props=\'%s\'>\n%s</script>\n</body>\n</html>\n') % (titulo, helmet, cuerpo_html, props, js)
    assert not re.search(r"__[A-Z0-9]+__", html), re.findall(r"__[A-Z0-9]+__", html)[:5]
    open(os.path.join(OUT, nombre), "w", encoding="utf-8").write(html)

for nombre, perfil, portal, titulo in TABLEROS:
    v = dict(PERFIL[perfil]); v["PORTAL"] = portal
    movil = v["MOVIL"] == "true"
    v["TEMABTN"] = "" if movil else T(TEMA_BTN)
    if movil:
        cuerpo = ('<div %s>\n<div style="flex:1;min-height:0;position:relative;display:flex;flex-direction:column">\n<div style="flex:1;min-height:0;display:flex;flex-direction:column">\n%s\n%s\n</div>\n'
                  '<div style="position:absolute;top:0;left:0;right:0;bottom:0;display:{{lienzoDisplay}};flex-direction:column;background:var(--bg)">\n%s\n</div>\n</div>\n%s\n</div>'
                  ) % (RAIZ % (v["W"], v["H"], "column"), CABECERA, HILO, LIENZO, BARRA)
    else:
        cuerpo = ('<div %s>\n%s\n<div style="width:%dpx;flex:none;min-height:0;display:{{hiloDisplay}};flex-direction:column;border-right:1px solid var(--line)">\n%s\n%s\n</div>\n'
                  '<div style="flex:1;min-width:0;min-height:0;display:flex;flex-direction:column;background:var(--surface)">\n%s\n%s\n</div>\n</div>'
                  ) % (RAIZ % (v["W"], v["H"], "row"), RAIL, v["HILO"], CABECERA, HILO, LIENZO, BARRA_L)
    cuerpo, js = T(cuerpo), LOGICA
    for k, val in v.items():
        cuerpo = cuerpo.replace("__%s__" % k, str(val)); js = js.replace("__%s__" % k, str(val))
    escribir(nombre, "OPAI 2.0 · " + titulo, v["W"], v["H"], cuerpo, js)
    open(os.path.join("scratch", nombre + ".app.js"), "w", encoding="utf-8").write("class DCLogic{constructor(p){this.props=p||{};}setState(s){Object.assign(this.state,s);}}\n" + js + "\nmodule.exports={Component,PORTALES,TIPOS,X};\n")

# ───────────────────────── acceso al sistema ─────────────────────────
CAMPO = ('<label style="display:flex;flex-direction:column;gap:6px"><span style="font-size:13px;line-height:18px;font-weight:500">%s</span>'
         '<span class="campo" style="height:52px;border-radius:14px;border:1px solid var(--muted);background:var(--surface);display:flex;align-items:center;padding:0 14px;box-sizing:border-box">'
         '<input type="%s" placeholder="%s" style="flex:1;height:44px;font-size:16px"></span></label>')
B_LG = "height:52px;border-radius:14px;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;box-sizing:border-box"
B_TINTA = B_LG + ";background:var(--fg);color:var(--bg)"
B_LINEA = B_LG + ";border:1px solid var(--line);background:var(--surface);color:var(--fg)"
B_FANT = "min-height:44px;font-weight:600;color:var(--muted);text-align:center;display:flex;align-items:center;justify-content:center;text-decoration:underline;text-underline-offset:3px"
H1 = '<h1 style="margin:0;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.02em">%s</h1>'
P = '<p style="margin:0;font-size:15px;line-height:22px;color:var(--muted)">%s</p>'
def paso(clave, *partes):
    return si("es_" + clave, '<div style="display:flex;flex-direction:column;gap:16px">' + "".join(partes) + "</div>", "true" if clave == "equipo_form" else "false")
def boton(txt, accion, estilo=B_TINTA):
    return '<button onClick="{{%s}}" style="%s">%s</button>' % (accion, estilo, txt)
def enlace(txt, href, estilo=B_TINTA):
    return '<a href="%s" style="%s">%s</a>' % (href, estilo, txt)
def fila_portal(nombre, quien, href):
    return ('<a href="%s" style="display:flex;align-items:center;gap:12px;min-height:60px;padding:8px 0;border-bottom:1px solid var(--line);text-decoration:none;color:var(--fg)">'
            '<span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:600">%s</span><span style="font-size:13px;color:var(--muted)">%s</span></span>'
            '<span style="display:inline-flex;color:var(--muted)">[[i:flecha:16]]</span></a>') % (href, nombre, quien)

def acceso(movil):
    erp, cli = ("iPhone.dc.html", "Cliente.dc.html") if movil else ("Main.dc.html", "ClienteEscritorio.dc.html")
    pasos = "".join([
        paso("equipo_form", H1 % "Entra a OPAI", CAMPO % ("Correo", "email", "tu@empresa.cl"), CAMPO % ("Contraseña", "password", "Tu contraseña"), boton("Entrar", "irEmpresa"), boton("Continuar con Google", "irEmpresa", B_LINEA), boton("¿Olvidaste tu contraseña?", "irRecuperar", B_FANT)),
        paso("equipo_recuperar", H1 % "Recupera tu contraseña", P % "Escribe tu correo y te enviamos un enlace para crear una nueva.", CAMPO % ("Correo", "email", "tu@empresa.cl"), boton("Enviarme el enlace", "irEnviado"), boton("Volver", "irForm", B_FANT)),
        paso("equipo_enviado", H1 % "Revisa tu correo", P % "Si existe una cuenta con ese correo, te enviamos un enlace para crear una contraseña nueva.", boton("Volver a entrar", "irForm", B_LINEA)),
        paso("equipo_empresa", H1 % "Elige la empresa", P % "Tu cuenta tiene acceso a más de una.",
             '<sc-for list="{{empresas}}" as="e" hint-placeholder-count="2"><button onClick="{{irPortal}}" style="display:flex;align-items:center;gap:12px;min-height:64px;padding:8px 0;border-bottom:1px solid var(--line)"><span style="width:40px;height:40px;border-radius:12px;background:var(--fg);color:var(--bg);display:inline-flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex:none">{{e.mono}}</span><span style="flex:1;display:flex;flex-direction:column;gap:2px"><span style="font-size:16px;font-weight:600">{{e.nombre}}</span><span style="font-size:13px;color:var(--muted)">{{e.rol}}</span></span><span style="display:inline-flex;color:var(--muted)">[[i:flecha:16]]</span></button></sc-for>'),
        paso("equipo_portal", H1 % "¿Dónde quieres entrar?", P % "Gard Security · tu rol te da acceso a tres portales.",
             '<div style="border-top:1px solid var(--line)">' + fila_portal("ERP", "Dueños, gerencia y administración", erp) + fila_portal("Supervisor", "Tus instalaciones en terreno", "Supervisor.dc.html") + fila_portal("Plataforma", "Operación de OPAI", "Plataforma.dc.html") + "</div>",
             P % "OPAI recuerda tu portal de inicio. Lo cambias cuando quieras con el botón «Portales»."),
        paso("guardia_form", H1 % "Hola. Tu RUT y tu PIN", CAMPO % ("RUT", "text", "12.345.678-9"),
             '<div style="display:flex;flex-direction:column;align-items:center;gap:14px"><div style="display:flex;gap:12px"><sc-for list="{{puntosPin}}" as="d" hint-placeholder-count="6"><span style="width:16px;height:16px;border-radius:99px;border:2px solid var(--fg);background:{{d.bg}}"></span></sc-for></div>'
             '<div style="display:grid;grid-template-columns:repeat(3, minmax(0, 1fr));gap:10px;width:264px"><sc-for list="{{teclas}}" as="k" hint-placeholder-count="12"><button onClick="{{k.ir}}" aria-label="{{k.aria}}" style="height:60px;border-radius:18px;background:var(--fill);font-size:22px;font-weight:600;[[MONO]];text-align:center;opacity:{{k.op}}">{{k.t}}</button></sc-for></div></div>',
             boton("[[i:rostro:20]]<span>Usar Face ID</span>", "irListo", B_LINEA)),
        paso("guardia_listo", '<span style="width:64px;height:64px;border-radius:99px;background:var(--okbg);color:var(--ok);display:inline-flex;align-items:center;justify-content:center">[[i:check:32]]</span>', H1 % "Hola, Daniela", P % "Tu turno de hoy parte a las 20:00 en Planta Norte.", enlace("Entrar a mi portal", "Guardia.dc.html")),
        paso("cliente_form", H1 % "Portal de clientes", P % "Te enviamos un enlace a tu correo. Sin contraseña.", CAMPO % ("Correo", "email", "tu@empresa.cl"), boton("Enviarme el enlace", "irMagico"), boton("Entrar con RUT y PIN de empresa", "irRutPin", B_FANT)),
        paso("cliente_magico", H1 % "Revisa tu correo", P % "El enlace vale 15 minutos y sirve una sola vez.", enlace("Simular que abrí el enlace", cli), boton("Volver", "irForm", B_FANT)),
        paso("cliente_rutpin", H1 % "RUT y PIN de empresa", CAMPO % ("RUT de la empresa", "text", "77.222.333-4"), CAMPO % ("PIN de empresa", "password", "6 dígitos"), enlace("Entrar", cli), boton("Volver", "irForm", B_FANT)),
        paso("terreno_form", H1 % "Emparejar este dispositivo", P % "Escribe el código que entrega el ERP. Se hace una sola vez, en la tablet o el teléfono de la instalación.", CAMPO % ("Código de 6 caracteres", "text", "K7M2QD"), CAMPO % ("Nombre del dispositivo", "text", "Tablet de portería"), boton("Emparejar", "irListo")),
        paso("terreno_listo", '<span style="[[OVER]]">Dispositivo emparejado con</span>', '<span style="font-size:40px;line-height:46px;font-weight:700;letter-spacing:-0.02em">PLANTA NORTE</span>', P % "Tablet de portería · Alimentos del Maipo S.A. El guardia de turno entra eligiendo su nombre.", enlace("Abrir el puesto", "Terreno.dc.html")),
    ])
    seg = ('<div style="display:flex;gap:2px;padding:3px;border-radius:14px;background:var(--fill)"><sc-for list="{{modos}}" as="m" hint-placeholder-count="4">'
           '<button onClick="{{m.ir}}" style="flex:1;height:40px;border-radius:11px;font-size:13px;text-align:center;font-weight:{{m.peso}};background:{{m.bg}};color:{{m.fg}}">{{m.nombre}}</button></sc-for></div>')
    cabeza = ('<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:22px;font-weight:800;letter-spacing:0.04em">OPAI</span>'
              '<button onClick="{{alternarTema}}" aria-label="Cambiar entre tema claro y oscuro" style="[[BTN_ICO]]">[[i:luna:20]]</button></div>')
    interior = cabeza + '<div style="display:flex;flex-direction:column;gap:8px"><span style="[[OVER]]">¿Quién entra?</span>' + seg + "</div>" + pasos
    if movil:
        w, h = 390, 844
        cuerpo = '<div %s><div class="sx" style="flex:1;min-height:0;overflow-y:auto;padding:16px 22px 28px 22px;display:flex;flex-direction:column;gap:22px">%s</div></div>' % (RAIZ % (w, h, "column"), interior)
    else:
        w, h = 1440, 900
        cuerpo = ('<div %s><div style="flex:1;display:flex;align-items:center;justify-content:center"><div style="width:460px;box-sizing:border-box;padding:36px;border-radius:24px;background:var(--surface);border:1px solid var(--line);display:flex;flex-direction:column;gap:22px">%s</div></div></div>'
                  ) % (RAIZ % (w, h, "column"), interior)
    return w, h, T(cuerpo)

ACC_JS = r"""
const FG = 'var(--fg)', MU = 'var(--muted)';
const PASOS = ['equipo_form', 'equipo_recuperar', 'equipo_enviado', 'equipo_empresa', 'equipo_portal', 'guardia_form', 'guardia_listo', 'cliente_form', 'cliente_magico', 'cliente_rutpin', 'terreno_form', 'terreno_listo'];
class Component extends DCLogic {
  constructor(props) { super(props); this.state = { tema: null, modo: 'equipo', paso: 'form', pin: '' }; }
  renderVals() {
    const s = this.state, oscuro = s.tema ? s.tema === 'oscuro' : !!this.props.oscuro;
    const ir = (paso) => () => this.setState({ paso: paso, pin: '' });
    const o = { temaClase: oscuro ? 't-oscuro' : 't-claro', alternarTema: () => this.setState({ tema: oscuro ? 'claro' : 'oscuro' }),
      modos: [['equipo', 'Equipo'], ['guardia', 'Guardia'], ['cliente', 'Cliente'], ['terreno', 'Dispositivo']].map((m) => ({ nombre: m[1], ir: () => this.setState({ modo: m[0], paso: 'form', pin: '' }), peso: s.modo === m[0] ? 600 : 500, bg: s.modo === m[0] ? 'var(--surface)' : 'transparent', fg: s.modo === m[0] ? FG : MU })),
      irForm: ir('form'), irEmpresa: ir('empresa'), irPortal: ir('portal'), irRecuperar: ir('recuperar'), irEnviado: ir('enviado'), irListo: ir('listo'), irMagico: ir('magico'), irRutPin: ir('rutpin'),
      empresas: [{ mono: 'G', nombre: 'Gard Security', rol: 'Dueño' }, { mono: 'AS', nombre: 'Aseo Integral del Sur', rol: 'Administrador' }],
      puntosPin: [0, 1, 2, 3, 4, 5].map((i) => ({ bg: i < s.pin.length ? FG : 'transparent' })),
      teclas: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '←'].map((k) => ({ t: k, op: k ? 1 : 0, aria: k === '←' ? 'Borrar' : (k || 'Sin tecla'),
        ir: () => { if (!k) return; if (k === '←') { this.setState({ pin: s.pin.slice(0, -1) }); return; } const p = s.pin + k; if (p.length >= 6) this.setState({ paso: 'listo', pin: '' }); else this.setState({ pin: p }); } })) };
    PASOS.forEach((p) => { o['es_' + p] = p === s.modo + '_' + s.paso; });
    return o;
  }
}
"""
CSS_ACC = ".campo:focus-within{border-color:var(--agente);box-shadow:0 0 0 3px var(--agentebg)}a:focus-visible{outline:2px solid var(--agente);outline-offset:2px}"
for nombre, movil in [("Acceso.dc.html", False), ("AccesoMovil.dc.html", True)]:
    w, h, cuerpo = acceso(movil)
    escribir(nombre, "OPAI 2.0 · Acceso" + (" en iPhone" if movil else " en escritorio"), w, h, cuerpo, ACC_JS, CSS_ACC)
    open(os.path.join("scratch", nombre + ".acc.js"), "w", encoding="utf-8").write("class DCLogic{constructor(p){this.props=p||{};}setState(s){Object.assign(this.state,s);}}\n" + ACC_JS + "\nmodule.exports=Component;\n")

# ───────────────────────── lienzo ─────────────────────────
def fila(y, items):
    x, out = 0, {}
    for nombre, w, h, titulo in items:
        out[nombre] = {"x": x, "y": y, "w": w, "h": h, "title": titulo, "is_interactive": True}; x += w + 80
    return out, x - 80
b1, w1 = fila(-1500, [("Acceso.dc.html", 1440, 900, "Acceso · escritorio"), ("AccesoMovil.dc.html", 390, 844, "Acceso · iPhone")])
b2, w2 = fila(0, [("Main.dc.html", 1440, 900, "ERP · escritorio"), ("iPad.dc.html", 1024, 768, "ERP · iPad"), ("iPhone.dc.html", 390, 844, "ERP · iPhone")])
b3, w3 = fila(1500, [("Supervisor.dc.html", 390, 844, "Supervisor · iPhone"), ("Terreno.dc.html", 1024, 768, "Terreno · tablet de la instalación"), ("Guardia.dc.html", 390, 844, "Guardia · iPhone"), ("Cliente.dc.html", 390, 844, "Cliente · iPhone"), ("ClienteEscritorio.dc.html", 1440, 900, "Cliente · escritorio"), ("Plataforma.dc.html", 1440, 900, "Plataforma · escritorio")])
boards = {}; boards.update(b2); boards.update(b1); boards.update(b3)
canvas = {"v": 3, "createdOnFiles": {"v": 1, "at": "2026-11-11T14:10:00Z"}, "title": "OPAI 2.0 · Base agéntica «Hilo» (propuesta)", "launch": {"view": "canvas"}, "pages": [],
          "boards": boards, "order": list(b2) + list(b1) + list(b3),
          "notes": {"acceso": {"x": 0, "y": -1800, "text": "1 · Acceso al sistema", "kind": "title1", "maxW": w1},
                    "titulo": {"x": 0, "y": -300, "text": "2 · ERP · aplicación completa", "kind": "title1", "maxW": w2},
                    "portales": {"x": 0, "y": 1200, "text": "3 · Portales · cada uno en su dispositivo", "kind": "title1", "maxW": w3}},
          "designSystems": []}
json.dump(canvas, open(os.path.join(OUT, "canvas.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("ok", {n: os.path.getsize(os.path.join(OUT, n)) for n in sorted(os.listdir(OUT))})
