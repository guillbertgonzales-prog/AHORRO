function filteredAdminMovements(filters) {
  const items=[...state.entries.map(item=>({...item,kind:'deposit'})),...(state.withdrawals||[]).map(item=>({...item,kind:'withdrawal'}))];
  const query=(filters.query||'').trim().toLocaleLowerCase('es');
  return items.filter(item=>{
    const day=savingsPeruDay(item.date);
    return (!filters.profile||depositProfile(item)===filters.profile)&&(!filters.kind||item.kind===filters.kind)
      &&(!filters.method||item.kind==='deposit'&&item.depositMethod===filters.method)
      &&(!filters.from||day>=filters.from)&&(!filters.to||day<=filters.to)
      &&(!query||[item.person,item.amount,item.message,item.reason,state.goals.find(g=>g.id===(item.goalId||'original'))?.name].join(' ').toLocaleLowerCase('es').includes(query));
  }).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
}
function savingsAuditSnapshot(){
  return {
    'Reglas de ahorro':JSON.stringify({daily:dailySavingRules(),special:specialConfig()}),
    'Metas':JSON.stringify(state.goals.map(g=>({id:g.id,name:g.name,amount:g.amount}))),
    'Excepciones':JSON.stringify(state.savingWaivers||{}),
    'Movimientos':JSON.stringify({entries:state.entries.map(e=>[e.id,e.profileId,e.person,e.date,e.amount,e.goalId,e.depositMethod]),withdrawals:(state.withdrawals||[]).map(e=>[e.id,e.person,e.date,e.amount,e.reason,e.goalId])}),
    'Apariencia y nombres':JSON.stringify(Object.fromEntries(Object.keys(defaultSettings).map(key=>[key,settings[key]])))
  };
}
(() => {
  const modal=document.getElementById('adminModal');if(!modal)return;
  let baseline=savingsAuditSnapshot();
  window.addEventListener('alcancia-state-loaded',()=>{baseline=savingsAuditSnapshot()});
  const originalPersist=persist;
  persist=function(){
    const next=savingsAuditSnapshot(),changes=Object.keys(next).filter(key=>next[key]!==baseline[key]);
    const previous=state.adminAudit;
    if(changes.length){
      const event={id:'change-'+Date.now()+'-'+Math.random().toString(36).slice(2),date:new Date().toISOString(),by:window.loveActiveUser||'Usuario local',sections:changes};
      if(changes.includes('Reglas de ahorro'))event.rules={before:JSON.parse(baseline['Reglas de ahorro']),after:JSON.parse(next['Reglas de ahorro'])};
      if(changes.includes('Metas'))event.goals={before:JSON.parse(baseline.Metas),after:JSON.parse(next.Metas)};
      state.adminAudit=[event,...(Array.isArray(previous)?previous:[])].slice(0,500);
    }
    try{const result=originalPersist();baseline=next;return result;}catch(error){if(changes.length)state.adminAudit=previous;throw error;}
  };
  const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
  const movements=modal.querySelector('[data-pane="movements"]'),rules=modal.querySelector('[data-pane="rules"]'),audit=modal.querySelector('[data-pane="audit"]');
  movements.append(node('h3','🔎 Buscar movimientos'));
  const controls=node('div');controls.className='admin-complete-filters';
  function input(label,id,type='text'){const wrap=node('label',label);const field=node('input');field.type=type;field.id=id;wrap.append(field);controls.append(wrap);return field;}
  function select(label,id,options){const wrap=node('label',label),field=node('select');field.id=id;for(const [value,text]of options){const option=node('option',text);option.value=value;field.append(option)}wrap.append(field);controls.append(wrap);return field;}
  const search=input('Buscar persona, meta, monto o mensaje','adminMovementSearch');search.type='search';
  const profile=select('Persona','adminMovementProfile',[['','Ambos'],['sullivan','Sullivan'],['boo','Boo']]);
  const kind=select('Movimiento','adminMovementKind',[['','Todos'],['deposit','Depósitos'],['withdrawal','Retiros']]);
  const method=select('Método de depósito','adminMovementMethod',[['','Todos'],['yape','Yape'],['transferencia','Transferencia'],['efectivo','Efectivo']]);
  const from=input('Desde','adminMovementFrom','date'),to=input('Hasta','adminMovementTo','date');
  const count=node('p');count.setAttribute('role','status');const results=node('div');results.className='admin-complete-results';
  const more=node('button','Ver más movimientos');more.type='button';more.className='secondary';let limit=30;
  let filtersChanged=true,signature='';const fields=[search,profile,kind,method,from,to];
  fields.forEach(field=>field.addEventListener('input',()=>{limit=30;filtersChanged=true;renderMovements()}));
  more.onclick=()=>{limit+=30;filtersChanged=true;renderMovements()};
  movements.append(controls,count,results,more);
  function renderMovements(){
    if(from.value&&to.value&&from.value>to.value){count.textContent='La fecha inicial debe ser anterior a la final.';results.replaceChildren();more.hidden=true;return;}
    const items=filteredAdminMovements({query:search.value,profile:profile.value,kind:kind.value,method:method.value,from:from.value,to:to.value});
    const next=JSON.stringify(items);if(!filtersChanged&&next===signature)return;signature=next;filtersChanged=false;
    count.textContent=items.length+' movimientos · Depósitos: '+soles(items.filter(i=>i.kind==='deposit').reduce((s,i)=>s+Number(i.amount),0))+' · Retiros: '+soles(items.filter(i=>i.kind==='withdrawal').reduce((s,i)=>s+Number(i.amount),0));
    results.replaceChildren();if(!items.length)results.append(node('p','No hay movimientos con estos filtros.'));
    items.slice(0,limit).forEach(item=>{const row=node('article');row.className='admin-complete-row';const text=node('div'),title=node('strong',(item.kind==='deposit'?'💜 Depósito · ':'💸 Retiro · ')+(item.person||'Usuario'));text.append(title,node('small',new Date(item.date).toLocaleString('es-PE',{timeZone:'America/Lima'})+' · '+(state.goals.find(g=>g.id===(item.goalId||'original'))?.name||'Meta anterior')));if(item.kind==='deposit')text.append(node('small',depositMethodLabel(item.depositMethod)));if(item.message||item.reason)text.append(node('small',item.message||item.reason));row.append(text,node('strong',(item.kind==='withdrawal'?'− ':'+ ')+soles(Number(item.amount))));results.append(row)});more.hidden=items.length<=limit;
  }
  rules.append(node('h3','⚙️ Reglas de ahorro'),node('p','Estos cambios se aplican a los próximos depósitos. Los movimientos ya registrados se conservan.'));
  const ruleForm=node('form');ruleForm.className='admin-complete-rule-form';const ruleFields={};
  for(const [key,label]of [['min','Depósito diario mínimo (S/)'],['max','Depósito diario máximo (S/)'],['surcharge','Adicional por olvidar ayer (S/)']]){const wrap=node('label',label),field=node('input');field.type='number';field.step='0.01';field.min=key==='surcharge'?'0':'0.01';field.max='100000';field.required=true;field.value=dailySavingRules()[key];field.inputMode='decimal';ruleFields[key]=field;wrap.append(field);ruleForm.append(wrap);}
  const save=node('button','Guardar reglas diarias');save.type='submit';const status=node('p');status.setAttribute('role','status');ruleForm.append(save,status);rules.append(ruleForm);
  const special=document.getElementById('adminSpecialPaymentSettings');if(special)rules.append(special);
  ruleForm.onsubmit=event=>{
    event.preventDefault();const config=Object.fromEntries(Object.entries(ruleFields).map(([key,input])=>[key,Number(input.value)]));
    if(!window.loveGateUnlocked)return;
    if(config.min<0.01||config.max>100000||config.surcharge<0||config.surcharge>100000||config.min>config.max||![config.min,config.max,config.surcharge].every(n=>Number.isFinite(n)&&Math.abs(n*100-Math.round(n*100))<0.000001)){status.textContent='Revisa el rango y usa como máximo dos decimales.';return;}
    const old=state.dailySavingRules;state.dailySavingRules=config;
    try{persist();updateSpecialControls();status.textContent='Reglas guardadas. Se aplicarán a los siguientes depósitos.';}catch{state.dailySavingRules=old;status.textContent='No se pudieron guardar las reglas.';}
  };
  function fillRules(){if(!modal.hidden&&!rules.hidden)for(const key of Object.keys(ruleFields))ruleFields[key].value=dailySavingRules()[key];}
  new MutationObserver(fillRules).observe(rules,{attributes:true,attributeFilter:['hidden']});
  new MutationObserver(fillRules).observe(modal,{attributes:true,attributeFilter:['hidden']});
  audit.append(node('h3','📝 Historial de cambios'),node('p','Registra cambios desde esta versión: persona, fecha y sección modificada. Conserva los últimos 500 registros.'));
  const log=node('div');log.className='admin-complete-results';audit.append(log);let lastAudit='';
  function renderAudit(){const items=Array.isArray(state.adminAudit)?state.adminAudit:[];const current=JSON.stringify(items);if(current===lastAudit)return;lastAudit=current;log.replaceChildren();if(!items.length)log.append(node('p','Todavía no hay cambios registrados desde esta versión.'));
    for(const item of items){const row=node('article');row.className='admin-complete-row';const body=node('div');body.append(node('strong',(item.by==='boo'?'Boo':item.by==='sullivan'?'Sullivan':item.by)+' · '+(item.sections||[]).join(', ')),node('small',new Date(item.date).toLocaleString('es-PE',{timeZone:'America/Lima'})));
      if(item.rules){const a=item.rules.before.daily,b=item.rules.after.daily;body.append(node('small','Diario: '+soles(a.min)+'–'+soles(a.max)+' → '+soles(b.min)+'–'+soles(b.max)+' · Adicional: '+soles(a.surcharge)+' → '+soles(b.surcharge)));}
      if(item.goals){const details=node('details');details.append(node('summary','Ver cambios en metas'));for(const [label,goals]of [['Antes',item.goals.before],['Después',item.goals.after]])details.append(node('p',label+': '+goals.map(g=>g.name+' ('+soles(g.amount)+')').join(' · ')));body.append(details);}
      row.append(body);log.append(row);
    }
  }
  setInterval(()=>{if(modal.hidden)return;if(!movements.hidden)renderMovements();if(!audit.hidden)renderAudit()},800);
  renderMovements();renderAudit();
})();
