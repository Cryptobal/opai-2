// Recorre todas las pantallas alcanzables de cada portal y ejecuta cada acción.
for (const f of ['Main','iPhone','Terreno']) {
  const M = require('./'+f+'.dc.html.app.js'); let total = new Set(), acciones = 0, tipos = new Set();
  for (const portal of Object.keys(M.PORTALES)) {
    const c = new M.Component({}); c.hacer('portal:'+portal);
    const P = M.PORTALES[portal]; const cola = [P.inicio, 'x:indice', 'x:portales'].concat(P.sug.map(q=>q[1]), P.paso.map(e=>e[4]), P.viene.map(e=>e[4]), P.dec.map(d=>'x:dec:'+d));
    const vistos = new Set();
    while (cola.length) { const r = cola.shift(); if (!r || vistos.has(r)) continue; vistos.add(r); total.add(portal+'|'+r);
      c.state.pila = [r]; let v;
      try { v = c.renderVals(); } catch (e) { throw new Error('FALLA '+portal+' '+r+': '+e.message); }
      const s = JSON.stringify(v, (k,x)=> typeof x==='function' ? 'fn' : x); if (/undefined|NaN|\[object/.test(s)) throw new Error('valor malo en '+portal+' '+r+' → '+(s.match(/.{60}(undefined|NaN|\[object).{30}/)||[''])[0]);
      if (!v.lzTitulo) throw new Error('sin título '+r);
      v.bloques.forEach(b=>Object.keys(b).filter(k=>k.startsWith('es_')&&b[k]).forEach(k=>tipos.add(k)));
      if (!v.bloques.some(b=>Object.keys(b).some(k=>k.startsWith('es_')&&b[k]))) throw new Error('vista sin bloques '+r);
      for (const cmd of v._rutas) { acciones++; cmd.split(';').forEach(x=>{ if (x.startsWith('ir:')||x.startsWith('ver:')) cola.push(x.slice(x.indexOf(':')+1)); });
        if (!/portal:/.test(cmd)) { const c2 = new M.Component({}); c2.hacer('portal:'+portal); c2.state.pila=[r]; c2.hacer(cmd); c2.renderVals(); } }
    }
    // flujos con estado
    P.dec.forEach(d=>{ c.state.pila=['x:dec:'+d]; c.hacer('set:'+d+'=ok;log:Tú|ok.'); const v=c.renderVals(); JSON.stringify(v); });
    c.state.texto='pauta'; let v=c.renderVals(); v.alEnviar({preventDefault(){}}); v=c.renderVals(); c.state.texto='zzzz'; v=c.renderVals(); v.alEnviar({preventDefault(){}}); c.renderVals();
    console.log(f, portal, 'pantallas:', vistos.size);
  }
  console.log(f, 'TOTAL pantallas', total.size, 'acciones probadas', acciones, 'bloques usados', tipos.size);
}
