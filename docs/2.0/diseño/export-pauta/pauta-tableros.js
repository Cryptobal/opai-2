window.PautaTableros=function(cfg){
  const D={desktop:[1280,800],tablet:[1024,768],phone:[375,812]};
  const ST={vacio:'vacío',cargando:'cargando',error:'error',sinpermiso:'sin permiso'};
  const mk=(dev,theme,extra,label)=>({wpx:D[dev][0]+'px',hpx:D[dev][1]+'px',label:D[dev][0]+' · '+(theme==='dark'?'oscuro':'claro')+(label?' · '+label:''),cfg:Object.assign({},cfg.base||{},{device:dev,theme},extra||{})});
  const order=cfg.phoneFirst?['phone','tablet','desktop']:['desktop','tablet','phone'];
  const devs=cfg.devices||order;
  const rows=[{t:'Claro',b:devs.map(d=>mk(d,'light'))},{t:'Oscuro',b:devs.map(d=>mk(d,'dark'))}];
  const sd=cfg.stateDevices||[['desktop','light'],['phone','dark']];
  sd.forEach(([dev,th])=>rows.push({t:'Estados · '+D[dev][0]+' '+(th==='dark'?'oscuro':'claro'),b:Object.keys(ST).map(s=>mk(dev,th,{estado:s},ST[s]))}));
  (cfg.extra||[]).forEach(r=>rows.push({t:r.t,note:r.note||'',b:r.b.map(x=>mk(x[0],x[1],x[2],x[3]))}));
  return rows;
};
