/* La credencial se introduce en cada navegador y nunca se publica en el código. */
(() => {
  const BIN='6ae0dab7ac6210605a56c83b',CONFIG='alcancia_cloud_key_v2:'+BIN;
  let key='',ready=false,busy=false,uploading=false,dirty=false,lastRemote='',attempts=0,retry=null;
  window.loveCloudStatus='disconnected';
  const el=id=>document.getElementById(id);
  const valid=d=>d&&Array.isArray(d.entries)&&Array.isArray(d.goals)&&d.goals.length>0&&Array.isArray(d.withdrawals||[]);
  const panel=document.createElement('section');panel.className='cloud-connect-panel';
  const title=document.createElement('h3');title.textContent='☁️ Conectar los ahorros';
  const note=document.createElement('p');note.textContent='Conecta este navegador a la alcancía recuperada. La clave se guarda únicamente aquí; si borras los datos del navegador tendrás que introducirla otra vez.';
  const form=document.createElement('form'),label=document.createElement('label'),input=document.createElement('input');
  label.textContent='Clave de acceso de JSONBin';label.htmlFor='cloudConnectionKey';input.id='cloudConnectionKey';input.type='password';input.required=true;input.autocomplete='off';
  const submit=document.createElement('button');submit.type='submit';submit.textContent='Guardar clave y conectar';
  const message=document.createElement('p');message.setAttribute('role','status');
  form.append(label,input,submit,message);panel.append(title,note,form);
  (document.querySelector('[data-pane="general"]')||document.body).append(panel);
  const launch=document.createElement('button');launch.type='button';launch.className='secondary cloud-connect-launch';launch.textContent='☁️ Conectar mis ahorros';launch.hidden=true;
  // Acceso retirado de la página principal; la configuración permanece en Administración.
  launch.onclick=()=>{el('openAdmin')?.click();selectAdminTab('general');panel.scrollIntoView({block:'center'});input.focus()};
  const style=document.createElement('style');style.textContent='.cloud-connect-panel{padding:20px;margin:20px 0;border:1px solid #dfd1ed;border-radius:18px;background:#fffaff;color:#624294}.cloud-connect-panel p{font-size:14px;line-height:1.6}.cloud-connect-panel label{display:block;margin-bottom:8px}.cloud-connect-panel input{width:100%;box-sizing:border-box;min-height:46px;font-size:16px;margin-bottom:12px}.cloud-connect-panel button{min-height:44px;padding:12px}.cloud-connect-launch{margin:16px 0}.cloud-connect-launch[hidden]{display:none!important}';document.head.append(style);
  function say(text){message.textContent=text;}
  async function request(method,data){
    const response=await fetch('https://api.jsonbin.io/v3/b/'+BIN,{method,headers:{'X-Access-Key':key,'Content-Type':'application/json',...(method==='GET'?{'X-Bin-Meta':'false'}:{})},...(method==='PUT'?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw Error(response.status===403?'JSONBin rechazó el acceso. Revisa la clave, sus permisos y las consultas disponibles.':'No se pudo sincronizar (HTTP '+response.status+').');
    const result=await response.json();return Object.hasOwn(result,'record')?result.record:result;
  }
  function apply(data){
    if(window.mergeNoticeSync)data.noticeSync=window.mergeNoticeSync(data.noticeSync,state.noticeSync);
    state=data;window.dispatchEvent(new Event('alcancia-state-loaded'));localStorage.setItem(KEY,JSON.stringify(state));syncActiveGoal();render();
    if(typeof renderSavingsCalendar==='function')renderSavingsCalendar();if(typeof renderAdminRecords==='function')renderAdminRecords();
  }
  function preserveLocal(){
    const stamp=new Date().toISOString();
    localStorage.setItem('alcancia_before_cloud_v2',JSON.stringify({date:stamp,state}));
  }
  async function upload(){
    if(!ready||uploading||!dirty||busy)return;
    uploading=true;const snapshot=JSON.stringify(state);
    try{
      await request('PUT',JSON.parse(snapshot));lastRemote=snapshot;attempts=0;
      dirty=JSON.stringify(state)!==snapshot;window.loveCloudPending=dirty;window.loveCloudSavedAt=Date.now();window.loveCloudStatus='connected';
      say('Cambios enviados a la alcancía recuperada.');
    }catch(error){window.loveCloudStatus='error';window.loveCloudPending=true;attempts++;say(error.message+' Los cambios siguen guardados en este navegador.');}
    finally{uploading=false;if(dirty&&attempts<3){clearTimeout(retry);retry=setTimeout(upload,attempts?30000:1000);}}
  }
  const localPersist=persist;
  persist=function(){const result=localPersist();dirty=true;window.loveCloudPending=true;if(ready)upload();return result;};
  async function connect(value){
    if(busy||uploading)return;
    const previousKey=key,wasReady=ready;key=value.trim();if(!key)return;
    busy=true;ready=false;window.loveCloudStatus='connecting';submit.disabled=true;say('Comprobando el acceso y recuperando tus depósitos…');
    try{
      const data=await request('GET');if(!valid(data))throw Error('El Bin todavía no contiene una alcancía válida.');
      if(state.entries.length>data.entries.length||(state.withdrawals||[]).length>(data.withdrawals||[]).length)throw Error('Este navegador tiene más movimientos que la nube. Exporta un respaldo y revisa las diferencias antes de conectar.');
      preserveLocal();localStorage.setItem(CONFIG,key);lastRemote=JSON.stringify(data);apply(data);dirty=false;ready=true;attempts=0;window.loveCloudPending=false;window.loveCloudCheckedAt=Date.now();window.loveCloudStatus='connected';
      input.value='';say('Conectado. Se recuperaron '+data.entries.length+' depósitos.');launch.hidden=true;window.dispatchEvent(new Event('alcancia-cloud-ready'));
    }catch(error){key=previousKey;ready=wasReady;window.loveCloudStatus='error';say(error.message);}
    finally{busy=false;submit.disabled=false;if(dirty&&ready)upload();}
  }
  async function poll(){
    if(!ready||busy||uploading||document.hidden)return;if(dirty){attempts=0;upload();return;}
    busy=true;
    try{const data=await request('GET');if(!valid(data))throw Error('La nube no devolvió una alcancía válida.');const serial=JSON.stringify(data);if(serial!==lastRemote){preserveLocal();lastRemote=serial;apply(data);}window.loveCloudCheckedAt=Date.now();window.loveCloudStatus='connected';}
    catch(error){window.loveCloudStatus='error';say(error.message);}finally{busy=false;if(dirty)upload();}
  }
  form.onsubmit=event=>{event.preventDefault();if(window.loveGateUnlocked)connect(input.value)};
  // Cinco minutos y al volver a la página: evita agotar la cuota por consultas cada 5 segundos.
  setInterval(poll,300000);window.addEventListener('focus',poll);document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});
  setInterval(()=>{launch.hidden=ready||!window.loveGateUnlocked||!el('intro')?.hidden;},1000);
  try{const saved=localStorage.getItem(CONFIG);if(saved)connect(saved)}catch{say('No se pudo leer la configuración local.');}
})();