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
  function merge(base,local,remote,path='',onConflict){
    if(equal(local,base))return remote;if(equal(remote,base)||equal(local,remote))return local;
    if(path==='noticeSync'&&window.mergeNoticeSync)return window.mergeNoticeSync(remote===absent?{}:remote,local===absent?{}:local);
    if(Array.isArray(base)&&Array.isArray(local)&&Array.isArray(remote)&&['entries','withdrawals','goals','adminAudit'].includes(path)){
      const b=keyed(base,path),l=keyed(local,path),r=keyed(remote,path),out=[];
      for(const key of new Set([...b.keys(),...l.keys(),...r.keys()])){const item=merge(b.has(key)?b.get(key):absent,l.has(key)?l.get(key):absent,r.has(key)?r.get(key):absent,path+'.'+key,onConflict);if(item!==absent)out.push(item);}
      return path==='adminAudit'?out.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,500):out;
    }
    if([base,local,remote].every(value=>value!==absent&&value&&typeof value==='object'&&!Array.isArray(value))){
      const out={};for(const key of new Set([...Object.keys(base),...Object.keys(local),...Object.keys(remote)])){
        const value=merge(Object.hasOwn(base,key)?base[key]:absent,Object.hasOwn(local,key)?local[key]:absent,Object.hasOwn(remote,key)?remote[key]:absent,path?path+'.'+key:key,onConflict);if(value!==absent)out[key]=value;
      }return out;
    }
    if(path.startsWith('awards.')&&[local,remote].every(Array.isArray))return [...new Set([...local,...remote])];
    if(onConflict)return onConflict(path,local,remote);
    throw Error('CONFLICT:'+path);
  }
  // Una copia antigua sin cola pendiente puede ponerse al día si todos sus
  // movimientos siguen presentes e idénticos en la nube. No mezcla borrados.
  function contained(local,remote){
    return ['entries','withdrawals','goals'].every(name=>{
      const available=keyed(remote[name]||[],name);
      return [...keyed(local[name]||[],name)].every(([key,item])=>available.has(key)&&equal(item,available.get(key)));
    });
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
      if(busy||!options.visible()||options.online?.()===false)return;
      if(!manual&&clock.now()<cooldown)return;
      if(reason==='focus'&&lastCheck&&clock.now()-lastCheck<5000&&!pending)return;
      busy=true;status('connecting','Comprobando los ahorros…');
      try{
        const remote=await request('GET');if(!valid(remote))throw Error('INVALID_STATE');latestRemote=clone(remote);lastCheck=clock.now();
        const local=clone(options.getState());let next;
        if(base){next=merge(base,local,remote);}
        else if(business(local)===business(remote)){next={...remote};if(window.mergeNoticeSync)next.noticeSync=window.mergeNoticeSync(remote.noticeSync,local.noticeSync);}
        else if(!pending&&contained(local,remote)){next=remote;}
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
          // Seguir recibiendo los pagos independientes aunque otro campo
          // necesite revisión; nunca subir una resolución elegida a ciegas.
          if(base&&latestRemote){
            const preview=merge(base,options.getState(),latestRemote,'',(_path,local)=>local);
            if(valid(preview)&&!equal(preview,options.getState())){options.applyState(clone(preview));lastLocal=business(preview);journal();}
          }
          status('conflict','Los pagos sin conflicto se actualizan automáticamente. Hay una corrección pendiente de revisión; ambas copias se conservan.');
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


/* Firebase: inicio de sesión privado, escucha en tiempo real y traspaso explícito. */
(() => {
 const legacyCreate=window.createSavingsSync;
 const config={apiKey:'AIzaSyD6kqhyw1VHKo-eDvz-_PHwNWtDdFWp_po',authDomain:'nuestra-alcancia-c7498.firebaseapp.com',databaseURL:'https://nuestra-alcancia-c7498-default-rtdb.firebaseio.com',projectId:'nuestra-alcancia-c7498',appId:'1:798938490875:web:d17677d5366081612f8d5e'};
 const profiles={pXPjntfGRreZWGJmzE5JszQQxoG2:'sullivan',WRLRGK9heXNVQFZlcUXwPkiYF6F3:'boo'};
 const copy=x=>JSON.parse(JSON.stringify(x));
 function unpack(node){const s=node&&node.version===1&&typeof node.payload==='string'?JSON.parse(node.payload):null;if(!s||!Array.isArray(s.entries)||!Array.isArray(s.withdrawals)||!Array.isArray(s.goals)||!s.goals.length)throw Error('INVALID_FIREBASE_STATE');return s;}
 function pack(state,uid){return {version:1,payload:JSON.stringify(state),updatedBy:uid};}
 window.AlcanciaFirebaseTools={unpack,pack};
 window.createSavingsSync=options=>{
  let user=null,node=null,initialized=false,started=false,modules,auth,db,reference,stopListener=null,readBase=null,queued=false,seed=null,work=false,shownFor='';
  const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  const section=make('section');section.className='firebase-access';const title=make('h3','Conexión con Firebase');const note=make('p','Inicia sesión con la cuenta de tu perfil para compartir los ahorros en tiempo real.');note.setAttribute('role','status');
  const login=make('button','Iniciar sesión en Firebase'),logout=make('button','Cambiar cuenta'),prepare=make('button','Preparar traslado desde JSONBin'),confirmSeed=make('button','Confirmar traslado a Firebase');for(const b of [login,logout,prepare,confirmSeed]){b.type='button';b.className='secondary';}prepare.hidden=confirmSeed.hidden=logout.hidden=true;section.append(title,note,login,logout,prepare,confirmSeed);document.querySelector('[data-pane="records"]')?.prepend(section);
  const dialog=make('dialog');dialog.className='firebase-login';dialog.setAttribute('aria-label','Acceso privado a los ahorros');const form=make('form');const heading=make('h2','Conecta tu cuenta de ahorros');const who=make('p');
  const email=make('input');email.type='email';email.required=true;email.autocomplete='username';email.placeholder='Correo de tu cuenta de Firebase';email.setAttribute('aria-label','Correo electrónico');
  const password=make('input');password.type='password';password.required=true;password.autocomplete='current-password';password.placeholder='Contraseña de Firebase';password.setAttribute('aria-label','Contraseña');
  const error=make('p');error.setAttribute('role','alert');const enter=make('button','Entrar'),close=make('button','Continuar solo en este dispositivo');enter.type='submit';close.type='button';form.append(heading,who,email,password,error,enter,close);dialog.append(form);document.body.append(dialog);
  const style=make('style');style.textContent='.firebase-access{padding:16px;border:1px solid #d7c6ee;border-radius:16px;margin:16px 0;background:#fffaff}.firebase-access button{margin:5px;padding:12px;min-height:44px}.firebase-access [hidden]{display:none!important}.firebase-access p{line-height:1.5}.firebase-login{width:min(430px,92vw);max-height:90dvh;overflow:auto;padding:24px;border:1px solid #c5afe0;border-radius:22px;color:#574174;background:#fffaff}.firebase-login::backdrop{background:#182a58b3}.firebase-login form{display:grid;gap:12px}.firebase-login input{box-sizing:border-box;width:100%;min-width:0;padding:12px;font:inherit;border:1px solid #d7c6ee;border-radius:12px}.firebase-login button{padding:12px;min-height:44px;font:inherit;border-radius:12px}.firebase-login h2{font-size:21px;margin:0}';document.head.append(style);
  const allowed=()=>!!user&&profiles[user.uid]===window.loveActiveUser;
  const active=()=>options.visible()&&allowed()&&initialized&&node!==null;
  const notify=(kind,text)=>options.onStatus?.({kind,text,pending:api.inspect().pending});
  const api=legacyCreate({...options,onStatus:result=>options.onStatus?.({...result,text:result.text.replaceAll('JSONBin','Firebase')}),bin:'firebase:'+config.projectId,visible:active,clock:{now:()=>Date.now(),setTimeout:(...a)=>window.setTimeout(...a),clearTimeout:id=>window.clearTimeout(id),setInterval:()=>0},request:async(method,payload)=>{
   if(!allowed()||!node)throw Error('FIREBASE_LOGIN_REQUIRED');
   if(method==='GET'){readBase=copy(unpack(node));return copy(readBase);}
   const from=copy(readBase);const result=await modules.runTransaction(reference,current=>{if(!current)throw Error('FIREBASE_REMOVED');const latest=unpack(current);const merged=window.SavingsSyncTools.merge(from,payload,latest);return pack(merged,user.uid);},{applyLocally:false});
   if(!result.committed)throw Error('NOT_COMMITTED');node=result.snapshot.val();return unpack(node);
  }});
  function enqueue(){if(queued)return;queued=true;setTimeout(async function run(){if(api.inspect().busy){setTimeout(run,100);return;}queued=false;if(active())await api.sync('auto');},100);}
  function paint(){login.hidden=allowed();logout.hidden=!user;prepare.hidden=!allowed()||!initialized||node!==null;confirmSeed.hidden=!seed||!allowed()||node!==null;const hint=document.querySelector('.sync-saving-tools small');if(hint)hint.textContent='Firebase recibe los cambios automáticamente en tiempo real. Los pagos pendientes se conservan en este navegador.';}
  function open(){if(!options.visible())return;who.textContent='Usa el correo y contraseña de Firebase de '+(window.loveActiveUser==='boo'?'Boo':'Sullivan')+'. Tu código habitual de entrada se conserva.';error.textContent='';if(!dialog.open)dialog.showModal();}
  login.onclick=open;close.onclick=()=>{password.value='';dialog.close();};
  form.onsubmit=async e=>{e.preventDefault();if(!modules){error.textContent='Espera mientras se carga Firebase. Si no carga, comprueba tu conexión.';return;}enter.disabled=true;error.textContent='';try{const credential=await modules.signInWithEmailAndPassword(auth,email.value.trim(),password.value);password.value='';if(profiles[credential.user.uid]!==window.loveActiveUser){await modules.signOut(auth);error.textContent='Esa cuenta no corresponde al perfil abierto. Usa la cuenta correcta.';return;}dialog.close();}catch{password.value='';error.textContent='No se pudo iniciar sesión. Revisa tu correo, contraseña y conexión.';}finally{enter.disabled=false;}};
  logout.onclick=async()=>{if(auth)await modules.signOut(auth);seed=null;shownFor='';paint();open();};
  prepare.onclick=async()=>{if(!allowed()||work)return;work=true;prepare.disabled=true;try{const snapshot=await options.request('GET');unpack(pack(snapshot,user.uid));seed=copy(snapshot);const income=seed.entries.reduce((n,e)=>n+Number(e.amount||0),0),out=seed.withdrawals.reduce((n,e)=>n+Number(e.amount||0),0);note.textContent='Origen JSONBin: '+seed.entries.length+' depósitos, '+seed.withdrawals.length+' retiros y '+seed.goals.length+' metas. Saldo neto: S/ '+(income-out).toFixed(2)+'. Confirma solo si coincide con tus ahorros. Se descargará una copia local antes del traslado.';paint();}catch{note.textContent='No se pudo preparar el traslado. No se modificó ninguna copia.';}finally{work=false;prepare.disabled=false;}};
  confirmSeed.onclick=async()=>{if(!allowed()||!seed||work)return;work=true;confirmSeed.disabled=true;try{const backup=document.getElementById('downloadBackup');if(!backup)throw Error('BACKUP_REQUIRED');backup.click();const result=await modules.runTransaction(reference,current=>current===null?pack(seed,user.uid):undefined,{applyLocally:false});if(!result.committed)throw Error('ALREADY_INITIALIZED');node=result.snapshot.val();initialized=true;await api.recoverCloud();seed=null;note.textContent='Traslado completado. Firebase comparte los ahorros entre tus dispositivos. La copia anterior de JSONBin se conserva.';paint();}catch{note.textContent='No se completó el traslado. Firebase no se sobrescribió y las copias anteriores se conservan.';}finally{work=false;confirmSeed.disabled=false;}};
  async function connect(){try{const [appSdk,authSdk,dbSdk]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js')]);modules={...authSdk,...dbSdk};const app=appSdk.initializeApp(config,'alcancia-compartida');auth=authSdk.getAuth(app);db=dbSdk.getDatabase(app);reference=dbSdk.ref(db,'alcancia');dbSdk.onValue(dbSdk.ref(db,'.info/connected'),snapshot=>{if(snapshot.val()===true)enqueue();});authSdk.onAuthStateChanged(auth,current=>{stopListener?.();stopListener=null;user=current;node=null;initialized=false;seed=null;if(current&&profiles[current.uid]){stopListener=dbSdk.onValue(reference,snapshot=>{node=snapshot.val();initialized=true;if(node){note.textContent='Firebase conectado. Los cambios se reciben automáticamente.';enqueue();}else note.textContent='Firebase todavía está vacío. Prepara y confirma el traslado desde JSONBin una sola vez.';paint();},()=>{initialized=false;note.textContent='Firebase no permite leer los ahorros. Revisa las reglas publicadas y la cuenta utilizada.';notify('error',note.textContent);});}else note.textContent='Inicia sesión en Firebase con la cuenta del perfil abierto.';paint();});}catch{note.textContent='No se pudo cargar Firebase. Los datos locales se conservan; comprueba tu conexión.';notify('error',note.textContent);}}
  return {...api,start(){if(started)return;started=true;api.start();connect();paint();setInterval(()=>{paint();if(options.visible()&&!allowed()&&shownFor!==window.loveActiveUser){shownFor=window.loveActiveUser;open();}if(active()&&api.inspect().metadata)enqueue();},1000);},sync:async reason=>{if(!allowed()){if(options.visible())notify('local','Guardado local. Inicia sesión en Firebase para compartir los pagos.');return;}return api.sync(reason);},recoverCloud:()=>api.recoverCloud()};
 };
})();

