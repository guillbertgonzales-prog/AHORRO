/* Presentación del formulario; los controles originales conservan los datos. */
(() => {
  const form=document.getElementById('form');if(!form)return;
  const el=id=>document.getElementById(id),amount=el('amount'),method=el('depositMethod'),type=el('depositType');
  form.classList.add('saving-designed');
  const heading=form.parentElement.querySelector('h2');if(heading)heading.hidden=true;
  const header=document.createElement('div');header.className='saving-design-header';
  const avatar=document.createElement('span'),copy=document.createElement('div');
  const title=document.createElement('h2');title.textContent='Agregar ahorro';
  const characters=document.createElement('span');characters.className='saving-title-characters';characters.setAttribute('aria-label','Sullivan y Boo');
  if(window.makePersonAvatar){for(const profile of ['sullivan','boo'])characters.append(window.makePersonAvatar('',profile));}
  else characters.textContent='💙 💜';
  title.prepend(characters);
  const subtitle=document.createElement('p');copy.append(title,subtitle);header.append(copy);form.prepend(header);
  const chips=document.createElement('div');chips.className='saving-amount-options';chips.setAttribute('role','group');chips.setAttribute('aria-label','Montos rápidos de ahorro diario');
  [1,1.2,1.5].forEach(value=>{
    const button=document.createElement('button');button.type='button';button.textContent=soles(value);button.dataset.base=String(value);button.setAttribute('aria-pressed','false');
    button.onclick=()=>{const limits=dailyDepositLimits(selectedDepositProfile());amount.value=String(Math.round((Number(button.dataset.base)+limits.surcharge)*100)/100);amount.dispatchEvent(new Event('input',{bubbles:true}));};chips.append(button);
  });amount.before(chips);
  const amountLabel=form.querySelector('label[for="amount"]');amountLabel.textContent='¿Cuánto quieres ahorrar?';
  const methods=document.createElement('div');methods.className='saving-method-options';methods.setAttribute('role','group');methods.setAttribute('aria-label','Método de depósito');
  [['yape','📲','Yape'],['transferencia','🏦','Transferencia'],['efectivo','💵','Efectivo']].forEach(([value,icon,label])=>{
    const button=document.createElement('button');button.type='button';button.dataset.method=value;button.setAttribute('aria-pressed','false');
    const symbol=document.createElement('span');symbol.textContent=icon;symbol.setAttribute('aria-hidden','true');const name=document.createElement('span');name.textContent=label;button.append(symbol,name);
    button.onclick=()=>{method.value=value;method.dispatchEvent(new Event('change',{bubbles:true}));};methods.append(button);
  });
  method.before(methods);method.hidden=true;method.required=false;
  const label=form.querySelector('label[for="depositMethod"]');label.removeAttribute('for');
  const receipt=document.createElement('div');receipt.className='saving-design-receipt';receipt.setAttribute('aria-live','polite');
  function row(label){const node=document.createElement('div');node.className='saving-receipt-row';const text=document.createElement('span');text.textContent=label;const value=document.createElement('strong');node.append(text,value);receipt.append(node);return{node,text,value};}
  const base=row('Ahorro diario'),extra=row('Adicional por ayer'),total=row('Total a registrar');total.node.classList.add('saving-receipt-total');
  const message=el('message').closest('.field');
  const dedication=document.createElement('details');dedication.className='saving-design-dedication';const summary=document.createElement('summary');summary.textContent='💌 Agregar una dedicatoria';dedication.append(summary);message.before(receipt,dedication);dedication.append(message);
  const submit=form.querySelector('button[type="submit"]');submit.textContent='Guardar mi ahorro 💜';submit.classList.add('saving-design-submit');
  let identity='';
  function update(){
    const profile=selectedDepositProfile(),name=profile==='boo'?settings.person2:settings.person1;
    const signature=profile+':'+name;
    if(signature!==identity){identity=signature;avatar.replaceChildren();if(window.makePersonAvatar)avatar.append(window.makePersonAvatar(name,profile));subtitle.textContent=(profile==='boo'?'Boo':'Sullivan')+', un aporte más a nuestro sueño 💜';}
    const special=type.value==='special',limits=dailyDepositLimits(profile),surcharge=!special&&limits.recoveryFor?limits.surcharge:0;
    const rules=dailySavingRules();
    chips.querySelectorAll('button').forEach((button,i)=>{const choices=[rules.min,Math.round((rules.min+rules.max)/2*100)/100,rules.max];button.dataset.base=String(choices[i]);button.textContent=soles(choices[i]);});
    chips.hidden=special;
    const entered=amount.value===''?null:Number(amount.value),valid=Number.isFinite(entered)&&entered>=Number(amount.min)&&entered<=Number(amount.max);
    chips.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(entered!==null&&Math.abs(entered-(Number(button.dataset.base)+surcharge))<0.001)));
    methods.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(method.value===button.dataset.method)));
    if(form.dataset.withdrawalReturn==='true'){chips.hidden=true;base.text.textContent='Devolución de retiro';extra.node.hidden=true;base.value.textContent=entered>0?soles(entered):'—';total.value.textContent=entered>0?soles(entered):'Selecciona un retiro';return;}
    base.text.textContent=special?'Pago especial':'Ahorro diario';extra.node.hidden=!surcharge;extra.value.textContent=soles(surcharge);
    base.value.textContent=valid?soles(entered-surcharge):'—';total.value.textContent=valid?soles(entered):'Elige un monto';
  }
  form.addEventListener('input',update);form.addEventListener('change',update);
  form.addEventListener('submit',()=>setTimeout(update,0));
  setInterval(update,1000);update();
})();

/* Devolución de retiros desde el mismo formulario de ahorro. */
(() => {
  const form=document.getElementById('form');if(!form)return;
  const el=id=>document.getElementById(id),amount=el('amount'),goal=el('savingGoalSelect'),type=el('depositType');
  const make=(tag,text)=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
  const box=make('section');box.className='saving-return-option';
  const label=make('label'),toggle=make('input');toggle.type='checkbox';toggle.id='returnWithdrawalToggle';
  label.htmlFor=toggle.id;label.append(toggle,make('span','Reponer dinero retirado'));
  const detail=make('div');detail.id='returnWithdrawalDetail';detail.hidden=true;toggle.setAttribute('aria-controls',detail.id);
  const selectLabel=make('label','Retiro que vas a devolver'),select=make('select');select.id='returnWithdrawalSelect';selectLabel.htmlFor=select.id;
  const note=make('p','Se registrará el mismo monto en la meta del retiro. Esta devolución es independiente de tu ahorro diario.');
  const status=make('p');status.id='returnWithdrawalStatus';status.setAttribute('role','status');detail.append(selectLabel,select,note,status);box.append(label,detail);type.closest('.field').after(box);
  const style=make('style');style.textContent='.saving-return-option{box-sizing:border-box;width:100%;max-width:100%;min-width:0;padding:14px;margin:12px 0 20px;border:1px solid #d7c6ee;border-radius:15px;background:#f5efff}.saving-return-option>label{display:grid;grid-template-columns:20px minmax(0,1fr);align-items:center;gap:10px;width:100%;min-height:44px;margin:0!important;cursor:pointer;text-align:left}.saving-return-option>label>span{min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.4;font-size:15px}.saving-return-option input[type=checkbox]{box-sizing:border-box;width:20px!important;height:20px!important;min-width:20px!important;min-height:20px!important;max-width:20px!important;max-height:20px!important;padding:0!important;margin:0!important;box-shadow:none!important;accent-color:#7053b9;align-self:center}.saving-return-option[hidden],.saving-return-option [hidden]{display:none!important}.saving-return-option select{box-sizing:border-box;width:100%;max-width:100%;min-width:0;min-height:44px;margin-top:6px}.saving-return-option p{font-size:13px;line-height:1.5;color:#756582}.saving-return-option #returnWithdrawalDetail{margin-top:14px}';document.head.append(style);
  const baseUpdate=updateSpecialControls;
  let signature='',busy=false,savedFields=null,lastProfile=selectedDepositProfile();
  const cents=n=>Math.round(Number(n)*100);
  function available(){return (state.withdrawals||[]).filter(w=>w.id&&depositProfile(w)===selectedDepositProfile()&&state.goals.some(g=>g.id===w.goalId)&&cents(w.amount)>0&&!state.entries.some(e=>e.withdrawalReturnId===w.id));}
  function selected(){return available().find(w=>w.id===select.value);}
  function configure(){
    const w=selected();amount.readOnly=true;amount.min='0.01';amount.max='100000000';amount.value=w?String(cents(w.amount)/100):'';
    if(w){if(![...goal.options].some(option=>option.value===w.goalId))renderGoalSelect();goal.value=w.goalId;}
    el('depositAmountHint').textContent=w?'Devolución completa: '+soles(Number(w.amount))+'. No reemplaza tu aporte diario.':'No tienes retiros pendientes para devolver con este perfil.';
  }
  updateSpecialControls=function(){baseUpdate();if(toggle.checked)configure();};
  function mode(){
    const on=toggle.checked;detail.hidden=!on;type.closest('.field').hidden=on;select.required=on;type.disabled=on;goal.disabled=on;form.dataset.withdrawalReturn=String(on);
    if(on){if(!savedFields)savedFields={amount:amount.value,goal:goal.value,type:type.value};configure();}
    else{amount.readOnly=false;if(savedFields){amount.value=savedFields.amount;goal.value=savedFields.goal;type.value=savedFields.type;savedFields=null;}baseUpdate();}
    form.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function refresh(){
    const profile=selectedDepositProfile();if(profile!==lastProfile){lastProfile=profile;toggle.checked=false;savedFields=null;mode();}
    const list=available(),next=JSON.stringify([selectedDepositProfile(),state.goals.map(g=>[g.id,g.name]),list.map(w=>[w.id,w.amount,w.goalId,w.date,w.reason])]);box.hidden=!list.length;if(!list.length&&toggle.checked){toggle.checked=false;mode();}if(next===signature)return;signature=next;
    const chosen=select.value;select.replaceChildren();const blank=make('option',list.length?'Selecciona el retiro':'No hay retiros pendientes');blank.value='';select.append(blank);
    for(const w of list){const g=state.goals.find(g=>g.id===w.goalId);const option=make('option',soles(Number(w.amount))+' · '+new Date(w.date).toLocaleDateString('es-PE',{timeZone:'America/Lima'})+' · '+g.name+(w.reason?' · '+w.reason:''));option.value=w.id;select.append(option);}
    select.value=list.some(w=>w.id===chosen)?chosen:list.length===1?list[0].id:'';
    if(toggle.checked)configure();
  }
  toggle.addEventListener('change',()=>{status.textContent='';mode();refresh();});select.addEventListener('change',()=>{status.textContent='';configure();form.dispatchEvent(new Event('input',{bubbles:true}));});
  window.addEventListener('alcancia-state-loaded',refresh);window.addEventListener('alcancia-payment-saved',refresh);
  setInterval(refresh,1000);
  form.addEventListener('submit',event=>{
    if(!toggle.checked)return;
    event.preventDefault();event.stopImmediatePropagation();if(busy)return;
    if(!window.loveGateUnlocked){status.textContent='Ingresa con tu perfil antes de guardar.';return;}
    const w=selected();if(!w){refresh();status.textContent='Selecciona un retiro pendiente. Si ya fue devuelto, no se registrará otra vez.';return;}
    const method=el('depositMethod').value;if(!['yape','transferencia','efectivo'].includes(method)){status.textContent='Selecciona Yape, transferencia o efectivo.';return;}
    if(cents(amount.value)!==cents(w.amount)){configure();status.textContent='El monto debe coincidir con el retiro seleccionado.';return;}
    const profile=selectedDepositProfile(),person=profile==='boo'?settings.person2:settings.person1;
    const payment={id:'return-'+w.id,withdrawalReturnId:w.id,depositType:'withdrawal-return',recoveryFor:null,specialPeriod:null,goalId:w.goalId,profileId:profile,person,amount:cents(w.amount)/100,depositMethod:method,message:'Devolución de retiro'+(el('message').value.trim()?' · '+el('message').value.trim():''),date:new Date().toISOString()};
    const previous=state.entries,previousGoal=state.activeGoalId;busy=true;
    state.entries=[...previous,payment];state.activeGoalId=w.goalId;syncActiveGoal();
    try{persist();}catch{state.entries=previous;state.activeGoalId=previousGoal;syncActiveGoal();busy=false;status.textContent='No se pudo guardar. El retiro sigue pendiente de devolución.';return;}
    try{localStorage.removeItem('alcancia_saving_draft_v1:'+profile);}catch{}
    toggle.checked=false;savedFields=null;mode();amount.value='';el('message').value='';el('depositMethod').value='';
    settings.showHistory=true;try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}
    applySettings();render();if(typeof renderAdminRecords==='function')renderAdminRecords();closeMobileSaving();
    showSaveCelebration(payment.amount,person,payment.message);window.dispatchEvent(new Event('alcancia-payment-saved'));notify('↩️ Devolución registrada: '+soles(payment.amount));refresh();
    const button=document.querySelector('button[type=submit][form=form]')||form.querySelector('button[type=submit]');if(button)button.disabled=true;
    setTimeout(()=>{busy=false;if(button)button.disabled=false;},1200);
  },true);
  refresh();mode();
})();

