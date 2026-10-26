/* Borradores separados por perfil y protección de envíos repetidos. */
(() => {
  const form=document.getElementById('form');if(!form)return;
  const ids=['savingGoalSelect','depositType','amount','depositMethod','message'];
  const get=id=>document.getElementById(id);
  let activeKey='',busy=false,activeButton=null;
  const key=()=>window.loveGateUnlocked&&['boo','sullivan'].includes(window.loveActiveUser)?'alcancia_saving_draft_v1:'+window.loveActiveUser:'';
  function save(){
    const current=key();if(!current||current!==activeKey)return;
    const fields=Object.fromEntries(ids.map(id=>[id,get(id).value]));
    try{localStorage.setItem(current,JSON.stringify({fields,date:Date.now()}))}catch{}
  }
  function activate(){
    const current=key();if(current===activeKey)return;
    activeKey=current;
    if(!current)return;
    // Nunca trasladar el borrador de una persona a la otra.
    get('amount').value='';get('message').value='';get('depositMethod').value='';get('depositType').value='daily';
    try{
      const draft=JSON.parse(localStorage.getItem(current)||'null');
      if(draft?.fields&&Date.now()-draft.date<7*86400000){
        for(const id of ['savingGoalSelect','depositType']){
          const value=draft.fields[id];if([...get(id).options].some(o=>o.value===value))get(id).value=value;
        }
        updateSpecialControls();
        get('amount').value=String(draft.fields.amount||'').slice(0,20);
        get('message').value=String(draft.fields.message||'').slice(0,120);
        const method=draft.fields.depositMethod;if(['yape','transferencia','efectivo'].includes(method))get('depositMethod').value=method;
      }else if(draft)localStorage.removeItem(current);
    }catch{}
    updateSpecialControls();form.dispatchEvent(new Event('input',{bubbles:true}));
  }
  form.addEventListener('input',save);form.addEventListener('change',save);
  form.addEventListener('submit',event=>{
    if(busy){event.preventDefault();event.stopImmediatePropagation();return;}
    busy=true;
    const current=key(),before=state.entries.length;
    const button=document.querySelector('button[type="submit"][form="form"]')||form.querySelector('button[type="submit"]');
    activeButton=button;
    const text=button?.textContent;
    if(button){button.disabled=true;button.textContent='Guardando…';}
    queueMicrotask(()=>{
      const success=state.entries.length>before;
      if(success&&current){try{localStorage.removeItem(current)}catch{}}
      else save();
      setTimeout(()=>{
        busy=false;if(activeButton===button&&button){button.disabled=false;button.textContent=text;activeButton=null;}
      },success?1200:0);
    });
  },true);
  document.getElementById('mobileAddSaving')?.addEventListener('click',activate,true);
  window.addEventListener('pagehide',save);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
  // Al guardar, no volver a crear un borrador vacío al salir.
  function clearEmptyDraft(){
    const current=key();if(current&&!get('amount').value&&!get('message').value&&!get('depositMethod').value){try{localStorage.removeItem(current)}catch{}}
  }
  window.addEventListener('pagehide',clearEmptyDraft);
  setInterval(activate,500);activate();
})();
