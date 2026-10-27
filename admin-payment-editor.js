function validateAdminPayment(values, editingIndex=-1, now=new Date()) {
  if(!['sullivan','boo'].includes(values.profile))throw Error('Selecciona Sullivan o Boo.');
  if(!state.goals.some(goal=>goal.id===values.goal))throw Error('Selecciona una meta válida.');
  if(!['daily','special'].includes(values.type))throw Error('Selecciona el tipo de pago.');
  if(!['yape','transferencia','efectivo'].includes(values.method))throw Error('Selecciona cómo se realizó el depósito.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(values.day)||!/^\d{2}:\d{2}$/.test(values.time))throw Error('Indica fecha y hora.');
  const date=new Date(values.day+'T'+values.time+':00-05:00');
  if(!Number.isFinite(date.getTime())||savingsPeruDay(date)!==values.day||date>now)throw Error('Usa una fecha y hora válidas, hasta el momento actual.');
  const amount=Number(values.amount);
  if(!Number.isFinite(amount)||amount<=0||amount>100000000||Math.abs(amount*100-Math.round(amount*100))>0.000001)throw Error('Ingresa un monto positivo con hasta dos decimales.');
  if(!values.reason.trim())throw Error('Indica el motivo del registro o la corrección.');
  const period=values.day.slice(0,7);
  if(values.type==='special'&&state.entries.some((entry,index)=>index!==editingIndex&&entry.depositType==='special'&&(entry.specialPeriod||savingsPeruDay(entry.date).slice(0,7))===period&&depositProfile(entry)===values.profile))throw Error('Esa persona ya tiene un pago especial registrado en ese mes.');
  return {amount:Math.round(amount*100)/100,date:date.toISOString(),period};
}
(() => {
  const modal=document.getElementById('adminModal'),pane=modal?.querySelector('[data-pane="movements"]')||modal?.querySelector('[data-pane="records"]');if(!pane)return;
  const make=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
  const section=make('section');section.className='admin-payment-editor';
  const title=make('h3','🗓️ Registrar pago de otro día');
  const explanation=make('p','Usa la fecha real del depósito: aparecerá en ese día del calendario y en los totales del mes. El registro conserva también cuándo se agregó o corrigió.');
  const form=make('form');form.className='admin-payment-form';
  const fields={};
  function field(name,label,type,options){const wrap=make('label',label),input=make(options?'select':'input');input.id='adminPayment-'+name;if(options)for(const [value,text]of options){const option=make('option',text);option.value=value;input.append(option)}else input.type=type;input.required=true;wrap.htmlFor=input.id;wrap.append(input);form.append(wrap);fields[name]=input;return input;}
  field('profile','Persona',null,[['sullivan','Sullivan'],['boo','Boo']]);
  field('goal','Meta',null,[]);
  field('day','Fecha del depósito (Perú)','date');field('time','Hora del depósito (Perú)','time');
  const amount=field('amount','Monto realmente depositado (S/)','number');amount.min='0.01';amount.step='0.01';amount.max='100000000';amount.inputMode='decimal';
  field('type','Tipo de pago',null,[['daily','Ahorro diario'],['special','Pago especial']]);
  field('method','Método',null,[['','Seleccionar'],['yape','Yape'],['transferencia','Transferencia'],['efectivo','Efectivo']]);
  const message=field('message','Dedicatoria (opcional)','text');message.required=false;message.maxLength=120;
  const reason=field('reason','Motivo del registro o corrección','text');reason.maxLength=250;
  const actions=make('div');actions.className='admin-payment-actions';const save=make('button','Guardar pago');save.type='submit';const cancel=make('button','Cancelar edición');cancel.type='button';cancel.className='secondary';cancel.hidden=true;actions.append(save,cancel);
  const status=make('p');status.setAttribute('role','status');status.className='admin-payment-status';
  form.append(actions,status);section.append(title,explanation,form);pane.prepend(section);
  const selection=make('select');selection.id='adminPaymentEditSelect';const selectionLabel=make('label','Editar un pago existente');selectionLabel.htmlFor=selection.id;selectionLabel.append(selection);section.append(selectionLabel);
  let editing=null,baseline='',busy=false,signature='';
  const calendar=make('div');calendar.className='admin-payment-mini-calendar';calendar.hidden=true;
  const calendarHead=make('div');calendarHead.className='admin-payment-calendar-head';
  const previousMonth=make('button','‹'),nextMonth=make('button','›'),monthLabel=make('strong');
  previousMonth.type=nextMonth.type='button';previousMonth.setAttribute('aria-label','Mes anterior');nextMonth.setAttribute('aria-label','Mes siguiente');monthLabel.setAttribute('aria-live','polite');
  calendarHead.append(previousMonth,monthLabel,nextMonth);
  const week=make('div');week.className='admin-payment-calendar-week';week.setAttribute('aria-hidden','true');for(const day of ['L','M','M','J','V','S','D'])week.append(make('span',day));
  const days=make('div');days.className='admin-payment-calendar-days';days.setAttribute('role','group');days.setAttribute('aria-label','Elegir fecha del pago');
  calendar.append(calendarHead,week,days);fields.day.after(calendar);
  let calendarYear=0,calendarMonth=0;
  function renderPaymentCalendar(followSelection=false){
    calendar.hidden=!editing;if(!editing)return;
    if(followSelection||!calendarYear){const selected=fields.day.value.split('-').map(Number);calendarYear=selected[0];calendarMonth=selected[1]-1;}
    const today=savingsPeruDay(new Date()),first=new Date(Date.UTC(calendarYear,calendarMonth,1));
    monthLabel.textContent=first.toLocaleDateString('es-PE',{timeZone:'UTC',month:'long',year:'numeric'});
    const nextKey=String(calendarYear).padStart(4,'0')+'-'+String(calendarMonth+1).padStart(2,'0');nextMonth.disabled=nextKey>=today.slice(0,7);
    days.replaceChildren();
    const offset=(first.getUTCDay()+6)%7,count=new Date(Date.UTC(calendarYear,calendarMonth+1,0)).getUTCDate();
    for(let i=0;i<offset;i++){const blank=make('span');blank.setAttribute('aria-hidden','true');days.append(blank);}
    for(let day=1;day<=count;day++){
      const key=nextKey+'-'+String(day).padStart(2,'0'),button=make('button',String(day));button.type='button';button.disabled=key>today;
      button.setAttribute('aria-pressed',String(fields.day.value===key));button.setAttribute('aria-label',day+' de '+monthLabel.textContent+(key===today?', hoy':''));
      if(key===today)button.setAttribute('aria-current','date');
      button.onclick=()=>{fields.day.value=key;fields.day.dispatchEvent(new Event('change',{bubbles:true}));};days.append(button);
    }
  }
  previousMonth.onclick=()=>{if(calendarYear<=1900&&calendarMonth===0)return;calendarMonth--;if(calendarMonth<0){calendarMonth=11;calendarYear--;}renderPaymentCalendar();};
  nextMonth.onclick=()=>{calendarMonth++;if(calendarMonth>11){calendarMonth=0;calendarYear++;}renderPaymentCalendar();};
  fields.day.addEventListener('change',()=>{if(/^\d{4}-\d{2}-\d{2}$/.test(fields.day.value))renderPaymentCalendar(true);});
  cancel.addEventListener('click',()=>{calendar.hidden=true;});
  function goals(){const chosen=fields.goal.value;fields.goal.replaceChildren();state.goals.forEach(goal=>{const option=make('option',goal.name);option.value=goal.id;fields.goal.append(option)});fields.goal.value=state.goals.some(g=>g.id===chosen)?chosen:state.activeGoalId;}
  function reset(){editing=null;baseline='';calendar.hidden=true;form.reset();goals();fields.day.max=savingsPeruDay(new Date());fields.day.value=fields.day.max;fields.time.value=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());fields.profile.value=window.loveActiveUser||'sullivan';title.textContent='🗓️ Registrar pago de otro día';save.textContent='Guardar pago';cancel.hidden=true;selection.value='';}
  function edit(entry){
    if(!state.entries.includes(entry))return;
    reset();editing=entry;baseline=JSON.stringify(entry);
    fields.profile.value=depositProfile(entry)||'sullivan';fields.goal.value=entry.goalId||'original';fields.day.value=savingsPeruDay(entry.date);fields.time.value=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(entry.date));fields.amount.value=entry.amount;fields.type.value=entry.depositType==='special'?'special':'daily';fields.method.value=entry.depositMethod||'';fields.message.value=entry.message||'';
    renderPaymentCalendar(true);
    title.textContent='✏️ Editar pago registrado';save.textContent='Guardar cambios del pago';cancel.hidden=false;status.textContent='Modifica los datos e indica el motivo antes de guardar.';
    selectAdminTab(pane.dataset.pane);section.scrollIntoView({block:'start',behavior:'smooth'});fields.day.focus({preventScroll:true});
  }
  function refresh(){
    const next=JSON.stringify(state.entries.map(e=>[e.id,e.date,e.person,e.amount]));if(next===signature)return;signature=next;
    selection.replaceChildren();const empty=make('option','Selecciona un pago para editar');empty.value='';selection.append(empty);
    state.entries.map((entry,index)=>({entry,index})).sort((a,b)=>Date.parse(b.entry.date)-Date.parse(a.entry.date)).forEach(({entry,index})=>{const option=make('option',(depositProfile(entry)==='boo'?'Boo':'Sullivan')+' · '+soles(Number(entry.amount))+' · '+new Date(entry.date).toLocaleString('es-PE',{timeZone:'America/Lima'}));option.value=String(index);selection.append(option)});
    if(editing)selection.value=String(state.entries.indexOf(editing));
  }
  selection.onchange=()=>{if(selection.value!=='')edit(state.entries[Number(selection.value)])};cancel.onclick=()=>{reset();status.textContent='Edición cancelada.'};
  form.onsubmit=event=>{
    event.preventDefault();if(busy)return;if(!window.loveGateUnlocked){status.textContent='Ingresa con tu perfil antes de guardar.';return;}
    const index=editing?state.entries.indexOf(editing):-1;
    if(editing&&(index<0||JSON.stringify(editing)!==baseline)){status.textContent='El registro cambió. Vuelve a seleccionarlo antes de editar.';return;}
    const values=Object.fromEntries(Object.entries(fields).map(([key,input])=>[key,input.value]));let checked;
    try{checked=validateAdminPayment(values,index)}catch(error){status.textContent=error.message;return;}
    busy=true;save.disabled=true;const recordedAt=new Date().toISOString(),profile=values.profile;
    const replacement={...(editing||{}),id:editing?.id||'saving-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),profileId:profile,person:profile==='boo'?settings.person2:settings.person1,goalId:values.goal,amount:checked.amount,date:checked.date,depositType:values.type,specialPeriod:values.type==='special'?checked.period:null,depositMethod:values.method,message:values.message.trim(),recordedAt:editing?(editing.recordedAt||null):recordedAt,registeredBy:editing?(editing.registeredBy||null):window.loveActiveUser,updatedAt:recordedAt,registrationMode:'administration',adminReason:values.reason.trim()};
    if(editing){replacement.edits=[...(editing.edits||[]),{from:Number(editing.amount),to:checked.amount,by:window.loveActiveUser,date:recordedAt,effectiveDateFrom:editing.date,effectiveDateTo:checked.date,reason:values.reason.trim()}];}
    if(!editing||editing.date!==replacement.date||editing.profileId!==replacement.profileId||values.type==='special')replacement.recoveryFor=null;
    const previousEntries=state.entries,previousAudit=state.adminAudit;
    state.entries=editing?state.entries.map((entry,i)=>i===index?replacement:entry):[...state.entries,replacement];
    const change={id:'payment-change-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),date:recordedAt,by:window.loveActiveUser,sections:[editing?'Corrección de pago':'Registro de pago de otra fecha'],payment:{id:replacement.id,reason:values.reason.trim(),effectiveDate:checked.date,from:editing?{amount:editing.amount,date:editing.date,profile:depositProfile(editing)}:null,to:{amount:checked.amount,date:checked.date,profile}}};
    state.adminAudit=[change,...(Array.isArray(previousAudit)?previousAudit:[])].slice(0,500);
    try{persist();}catch{state.entries=previousEntries;state.adminAudit=previousAudit;status.textContent='No se pudo guardar. El registro anterior se conserva.';busy=false;save.disabled=false;return;}
    render();if(typeof renderSavingsCalendar==='function')renderSavingsCalendar();renderAdminRecords();updateSpecialControls();
    const label=values.day;reset();refresh();status.textContent='Pago guardado en la fecha '+label+'. Se actualizaron el calendario y los totales. La sincronización depende de la conexión activa.';
    setTimeout(()=>{busy=false;save.disabled=false},900);
  };
  // Reutilizar también los registros existentes sin sustituir sus controles de eliminación.
  const oldRecords=renderAdminRecords;renderAdminRecords=function(){oldRecords();const cards=document.querySelectorAll('#adminRecordsList .admin-record-card');cards.forEach((card,reverseIndex)=>{const entry=state.entries[state.entries.length-1-reverseIndex];if(!entry)return;const button=make('button','✏️ Editar');button.type='button';button.className='secondary';button.onclick=()=>edit(entry);card.append(button)});refresh();};
  new MutationObserver(()=>{if(!modal.hidden){if(!editing)goals();refresh()}}).observe(modal,{attributes:true,attributeFilter:['hidden']});
  setInterval(()=>{if(!modal.hidden)refresh()},1000);reset();refresh();renderAdminRecords();
})();
