/* Sincronización con ahorro de consultas y conservación de cambios pendientes. */
(() => {
  const absent=Symbol('absent');
  const clone=value=>JSON.parse(JSON.stringify(value));
  function canonical(value){
    if(value===absent)return '#absent';
    if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(key=>JSON.stringify(key)+':'+canonical(value[key])).join(',')+'}';
    return JSON.stringify(value);
  }
  const equal=(a,b)=>canonical(a)===canonical(b);
  function keyed(items,name){const result=new Map(),counts=new Map();for(const item of items){
    const raw=item.id?String(item.id):JSON.stringify([item.date,item.profileId||item.person,item.goalId||'original']);
    const count=counts.get(raw)||0;counts.set(raw,count+1);result.set(raw+'#'+count,item);
  }return result;}
  function merge(base,local,remote,path=''){
    if(equal(local,base))return remote;if(equal(remote,base)||equal(local,remote))return local;
    if(path==='noticeSync'&&window.mergeNoticeSync)return window.mergeNoticeSync(remote===absent?{}:remote,local===absent?{}:local);
    if(Array.isArray(base)&&Array.isArray(local)&&Array.isArray(remote)&&['entries','withdrawals','goals','adminAudit'].includes(path)){
      const b=keyed(base,path),l=keyed(local,path),r=keyed(remote,path),out=[];
      for(const key of new Set([...b.keys(),...l.keys(),...r.keys()])){const item=merge(b.has(key)?b.get(key):absent,l.has(key)?l.get(key):absent,r.has(key)?r.get(key):absent,path+'.'+key);if(item!==absent)out.push(item);}
      return path==='adminAudit'?out.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,500):out;
    }
    if([base,local,remote].every(value=>value!==absent&&value&&typeof value==='object'&&!Array.isArray(value))){
      const out={};for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
        const value=merge(Object.hasOwn(base,key)?base[key]:absent,Object.hasOwn(local,key)?local[key]:absent,Object.hasOwn(remote,key)?remote[key]:absent,path?path+'.'+key:key);if(value!==absent)out[key]=value;
      }return out;
    }
    if(path.startsWith('awards.')&&[local,remote].every(Array.isArray))return [...new Set([...local,...remote])];
    throw Error('CONFLICT:'+path);
  }
  function business(value){const out={...value};delete out.noticeSync;return canonical(out);}
  window.SavingsSyncTools={merge,equal,business};
  window.createSavingsSync=function(options){
    const storage=options.storage||localStorage,request=options.request;
    const clock=options.clock||{
      now:()=>Date.now(),
      setTimeout:(...args)=>window.setTimeout(...args),
      clearTimeout:(...args)=>window.clearTimeout(...args),
      setInterval:(...args)=>window.setInterval(...args)
    };
    const journalKey='alcancia_sync_queue_v3:'+options.bin;
    let base=null,pending=false,metadata=false,busy=false,conflict=null,failed=0,cooldown=0,lastCheck=0,timer=null,started=false,latestRemote=null;
    const starting=clone(options.getState());let lastLocal=business(starting);
    try{const journal=JSON.parse(storage.getItem(journalKey)||'null');if(journal?.base){base=journal.base;pending=!!journal.pending;metadata=!!journal.metadata;}}catch{}
    const valid=data=>data&&Array.isArray(data.entries)&&Array.isArray(data.goals)&&data.goals.length&&data.goals.every(g=>g&&typeof g.id==='string'&&Number.isFinite(Number(g.amount))&&Number(g.amount)>0)&&Array.isArray(data.withdrawals||[])&&[...data.entries,...(data.withdrawals||[])].every(e=>e&&Number.isFinite(Number(e.amount))&&Number(e.amount)>0&&Number.isFinite(Date.parse(e.date)));
    function status(kind,text){options.onStatus?.({kind,text,pending,metadata,conflict:!!conflict,lastCheck});}
    function journal(){storage.setItem(journalKey,JSON.stringify({base,pending,metadata}));}
    function preserve(local,remote){
      if(equal(local,remote))return;
      const key='alcancia_sync_recovery_v3:'+options.bin;let prior=[];
      try{const saved=JSON.parse(storage.getItem(key)||'[]');prior=Array.isArray(saved)?saved:[];}catch{}
      storage.setItem(key,JSON.stringify([{savedAt:new Date(clock.now()).toISOString(),local,remote},...prior].slice(0,5)));
    }
    function schedule(){clock.clearTimeout(timer);timer=clock.setTimeout(()=>sync('save'),1800);}
    function changed(){
      const current=options.getState(),fingerprint=business(current);
      if(fingerprint!==lastLocal){pending=true;lastLocal=fingerprint;failed=0;}
      else metadata=true;
      try{journal();}catch{status('error','Guardado en este navegador. No se pudo preparar el envío; descarga un respaldo.');return;}
      if(pending&&!conflict)schedule();
      status(pending?'pending':'local',pending?'Guardado en este navegador. Pendiente de enviar.':'Avisos guardados; se agruparán con la próxima sincronización.');
    }
    async function sync(reason='auto'){
      const manual=reason==='manual';
      if(busy||conflict&&!manual||!options.visible()||options.online?.()===false)return;
      if(!manual&&clock.now()<cooldown)return;
      if(reason==='focus'&&lastCheck&&clock.now()-lastCheck<5000&&!pending)return;
      busy=true;status('connecting','Comprobando los ahorros…');
      try{
        const remote=await request('GET');if(!valid(remote))throw Error('INVALID_STATE');latestRemote=clone(remote);lastCheck=clock.now();
        const local=clone(options.getState());let next;
        if(base){next=merge(base,local,remote);}
        else if(business(local)===business(remote)){next={...remote};if(window.mergeNoticeSync)next.noticeSync=window.mergeNoticeSync(remote.noticeSync,local.noticeSync);}
        else if(!pending&&!starting.entries.length&&!(starting.withdrawals||[]).length&&business(local)===business(starting)){next=remote;}
        else {preserve(local,remote);conflict=remote;status('conflict','Las copias de este navegador y de la nube difieren. Se conservaron ambas para revisarlas.');return;}
        if(!valid(next))throw Error('INVALID_STATE');preserve(local,remote);
        base=clone(remote);
        // El usuario pudo editar durante la lectura: se usa el estado más reciente.
        if(!equal(next,local))options.applyState(clone(next));
        lastLocal=business(options.getState());
        pending=!equal(next,remote);metadata=false;journal();
        if(pending){
          const snapshot=clone(options.getState());
          await request('PUT',snapshot);base=clone(snapshot);
          pending=!equal(options.getState(),snapshot);lastLocal=business(options.getState());journal();
          options.onSaved?.();
        }else{pending=false;journal();}
        conflict=null;failed=0;cooldown=0;
        status(pending?'pending':'connected',pending?'Hay cambios nuevos pendientes de enviar.':'Datos guardados y sincronizados.');
        options.onReady?.();
      }catch(error){
        if(error.message.startsWith('CONFLICT:')){
          conflict=latestRemote||true;try{preserve(options.getState(),latestRemote||base)}catch{}
          status('conflict','Otro dispositivo modificó el mismo dato. Se conservan los cambios locales; revisa las copias antes de continuar.');
        }else{
          failed++;const blocked=error.status===401||error.status===403||error.status===429;
          cooldown=clock.now()+(blocked?1800000:Math.min(300000,30000*Math.pow(2,failed-1)));
          status('error',blocked?'JSONBin rechazó el acceso o agotó su cuota. Los datos locales se conservan.':'No se pudo sincronizar. Los datos siguen guardados en este navegador.');
        }
      }finally{busy=false;if(pending&&!conflict&&!cooldown)schedule();}
    }
    async function recoverCloud(){
      if(busy||!options.visible())return false;
      busy=true;
      try{const remote=await request('GET');if(!valid(remote))throw Error('INVALID_STATE');preserve(options.getState(),remote);options.applyState(clone(remote));base=clone(remote);pending=false;metadata=false;conflict=null;lastLocal=business(remote);lastCheck=clock.now();journal();status('connected','Se recuperó la copia de la nube. Se conservó una copia local anterior.');options.onReady?.();return true;}
      catch{status('error','No se pudo recuperar la nube. No se cambiaron tus datos.');return false;}finally{busy=false;}
    }
    function start(){if(started)return;started=true;const hint=window.document?.querySelector('.sync-saving-tools small');if(hint)hint.textContent='Las consultas automáticas se realizan cada 5 segundos mientras usas la página. Los cambios se guardan primero en este navegador.';clock.setInterval(()=>sync('auto'),5000);clock.setTimeout(()=>sync('initial'),0);}
    return {changed,sync,recoverCloud,start,inspect:()=>({pending,metadata,busy,conflict:!!conflict,lastCheck})};
  };
})();
