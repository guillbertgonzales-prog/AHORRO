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
    base.text.textContent=special?'Pago especial':'Ahorro diario';extra.node.hidden=!surcharge;extra.value.textContent=soles(surcharge);
    base.value.textContent=valid?soles(entered-surcharge):'—';total.value.textContent=valid?soles(entered):'Elige un monto';
  }
  form.addEventListener('input',update);form.addEventListener('change',update);
  form.addEventListener('submit',()=>setTimeout(update,0));
  setInterval(update,1000);update();
})();
