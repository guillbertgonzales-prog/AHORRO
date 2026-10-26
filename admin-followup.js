/* Revisión de olvidos y excepciones sin modificar depósitos. */
function savingReview(profile, now = new Date()) {
  const today=savingsPeruDay(now), entries=state.entries.filter(e=>depositProfile(e)===profile);
  const first=entries.map(e=>savingsPeruDay(e.date)).filter(Boolean).sort()[0];
  if(!first)return [];
  const rows=[];
  for(let offset=1;offset<=30;offset++){
    const date=new Date(today+'T12:00:00-05:00');date.setUTCDate(date.getUTCDate()-offset);
    const day=savingsPeruDay(date);if(day<first)break;
    if(entries.some(e=>savingsPeruDay(e.date)===day))continue;
    const waiver=state.savingWaivers?.[profile+':'+day];
    const paid=entries.some(e=>e.recoveryFor===day);
    rows.push({day,waiver,paid,due:missedDepositDay(profile,now)===day});
  }
  return rows;
}
(() => {
  const users=document.querySelector('[data-pane="users"]');
  if(!users)return;
  const css=document.createElement('style');css.textContent='.saving-review{padding:16px;border:1px solid #d7c6ee;border-radius:18px;background:#fbf7ff;margin:18px 0}.saving-review-row{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #e7def2}.saving-review-row small{display:block;margin-top:5px;overflow-wrap:anywhere}.saving-review-reason{display:block;width:100%;box-sizing:border-box;margin:8px 0}.saving-review-status{white-space:pre-line}.saving-review h3{margin-top:0}';document.head.append(css);
  const panel=document.createElement('section');panel.className='saving-review';
  const title=document.createElement('h3');title.textContent='📅 Días sin depósito';
  const note=document.createElement('p');note.className='admin-note';note.textContent='Últimos 30 días, desde el primer ahorro de cada persona. El adicional vigente corresponde solo al olvido de ayer; los anteriores se muestran para revisión.';
  const list=document.createElement('div');
  const feedback=document.createElement('p');feedback.setAttribute('role','status');
  panel.append(title,note,list,feedback);users.append(panel);
  let signature='';
  function renderRows(){
    const data=['sullivan','boo'].map(profile=>({profile,rows:savingReview(profile)}));
    const current=JSON.stringify(data);if(current===signature)return;signature=current;list.replaceChildren();
    for(const {profile,rows} of data){
      const heading=document.createElement('h4');heading.textContent=profile==='boo'?'🌸 Boo':'💙 Sullivan';list.append(heading);
      if(!rows.length){const empty=document.createElement('p');empty.textContent='Sin días pendientes en este período.';list.append(empty);continue;}
      for(const item of rows){
        const row=document.createElement('div');row.className='saving-review-row';
        const info=document.createElement('div');const label=document.createElement('strong');label.textContent=new Date(item.day+'T12:00:00-05:00').toLocaleDateString('es-PE',{timeZone:'America/Lima'});
        const status=document.createElement('small');status.textContent=item.waiver?'Excepción concedida · '+item.waiver.reason:item.paid?'Adicional registrado ✓':item.due?'Pendiente: '+soles(dailySavingRules().surcharge)+' adicionales al ahorro de hoy':'Sin depósito registrado · sin adicional vigente';
        info.append(label,status);row.append(info);
        if(item.due&&!item.waiver&&!item.paid){
          const form=document.createElement('form');
          const reason=document.createElement('input');reason.type='text';reason.required=true;reason.maxLength=180;reason.className='saving-review-reason';reason.placeholder='Motivo de la excepción';reason.setAttribute('aria-label','Motivo de excepción para '+profile+' el '+item.day);
          const button=document.createElement('button');button.type='submit';button.className='secondary';button.textContent='Exonerar adicional de '+soles(dailySavingRules().surcharge);
          form.append(reason,button);form.onsubmit=event=>{
            event.preventDefault();if(!reason.value.trim())return;
            if(!window.loveGateUnlocked||missedDepositDay(profile)!==item.day){signature='';renderRows();return;}
            const key=profile+':'+item.day;
            const previous=state.savingWaivers;
            state.savingWaivers={...previous,[key]:{reason:reason.value.trim(),date:new Date().toISOString(),by:window.loveActiveUser}};
            try{persist();feedback.textContent='Excepción guardada. Se aplica el rango diario sin adicional.';updateSpecialControls();signature='';renderRows();}
            catch{state.savingWaivers=previous;feedback.textContent='No se pudo guardar la excepción. Intenta nuevamente.';}
          };row.append(form);
        }
        list.append(row);
      }
    }
  }
  function update(){
    const modal=document.getElementById('adminModal');if(modal?.hidden)return;
    renderRows();
  }
  setInterval(update,1000);update();
})();
