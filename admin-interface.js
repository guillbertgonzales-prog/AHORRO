function adminInterfaceSummary(now = new Date()) {
  const today=savingsPeruDay(now),month=today.slice(0,7);
  const amount=items=>items.reduce((sum,item)=>sum+(Number(item.amount)||0),0);
  const monthly=state.entries.filter(e=>savingsPeruDay(e.date).startsWith(month));
  const withdrawals=(state.withdrawals||[]).filter(e=>savingsPeruDay(e.date).startsWith(month));
  const profiles=['sullivan','boo'].map(profile=>{
    const entries=state.entries.filter(e=>depositProfile(e)===profile);
    return {profile,today:amount(entries.filter(e=>savingsPeruDay(e.date)===today)),hasToday:entries.some(e=>savingsPeruDay(e.date)===today),month:amount(monthly.filter(e=>depositProfile(e)===profile)),special:specialEligible(profile,now),recovery:!!missedDepositDay(profile,now)};
  });
  return {monthTotal:amount(monthly),monthNet:amount(monthly)-amount(withdrawals),profiles,pending:profiles.filter(p=>!p.hasToday).length};
}
(() => {
  const dashboard=document.querySelector('[data-pane="dashboard"]');if(!dashboard)return;
  const style=document.createElement('style');style.textContent=`
    #adminModal .admin-dash-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
    #adminModal .admin-dash-stats>div{background:linear-gradient(140deg,#f2eaff,#f3fbff);border:1px solid #e0d2ef;border-radius:18px;padding:18px;box-shadow:0 4px 14px #7053b90a;display:flex;flex-direction:column;gap:9px;min-width:0}
    #adminModal .admin-dash-stats strong{font-size:25px;color:#624294;overflow-wrap:anywhere}
    #adminModal .admin-dash-stats small{font-size:12px;color:#756582;line-height:1.5}
    #adminModal .user-profile-grid{gap:18px}
    #adminModal .user-profile-card{border-radius:22px;background:linear-gradient(150deg,#f1fbff,#eee9ff);border:1px solid #d9d4ed;padding:20px;box-shadow:0 6px 18px #7053b90c}
    #adminModal .user-profile-card:nth-child(2){background:linear-gradient(150deg,#fff3f8,#f0eaff)}
    #adminModal .user-profile-heading{padding-bottom:12px;border-bottom:1px solid #d7c9e566}
    #adminModal .user-profile-total{font-size:30px;color:#644397}
    .admin-person-details{margin:10px 0;display:grid;gap:8px}.admin-person-details p{margin:0;line-height:1.5;font-size:13px}
    .admin-person-status{padding:8px 11px;border-radius:12px;background:#fff9;color:#5c457a}
    .admin-person-status[data-paid="true"]{background:#e3f6ed;color:#256b50}
    .admin-person-pending{color:#8b536c}
    @media(max-width:550px){#adminModal .user-profile-grid{grid-template-columns:1fr}#adminModal .admin-dash-stats{grid-template-columns:repeat(2,minmax(0,1fr))}#adminModal .admin-dash-stats>div{padding:13px}#adminModal .admin-dash-stats strong{font-size:21px}}
  `;document.head.append(style);
  const stats=dashboard.querySelector('.admin-dash-stats');
  function metric(title,description){const card=document.createElement('div');const label=document.createElement('span');label.textContent=title;const value=document.createElement('strong');const detail=document.createElement('small');detail.textContent=description;card.append(label,value,detail);stats.append(card);return {value,detail};}
  const month=metric('💜 Ahorro del mes','Aportes de todas las metas');
  const pending=metric('📅 Pendientes de hoy','Personas sin depósito registrado hoy');
  const details=['sullivan','boo'].map((profile,index)=>{
    const total=document.getElementById('userTotal'+(index+1));const card=total?.closest('.user-profile-card');
    if(!card)return null;
    const section=document.createElement('div');section.className='admin-person-details';
    const status=document.createElement('p');status.className='admin-person-status';
    const monthly=document.createElement('p');const due=document.createElement('p');due.className='admin-person-pending';
    section.append(status,monthly,due);card.insertBefore(section,document.getElementById('userHistoryButton'+(index+1)));
    return {status,monthly,due};
  });
  let signature='';
  function update(){
    if(document.getElementById('adminModal')?.hidden)return;
    const result=adminInterfaceSummary(),key=JSON.stringify(result);if(key===signature)return;signature=key;
    month.value.textContent=soles(result.monthTotal);month.detail.textContent='Saldo neto del mes: '+soles(result.monthNet);
    pending.value.textContent=result.pending+'/2';
    result.profiles.forEach((person,index)=>{
      const view=details[index];if(!view)return;
      view.status.dataset.paid=String(person.hasToday);
      view.status.textContent=person.hasToday?'✓ Hoy aportó '+soles(person.today):'○ Aún sin depósito hoy';
      view.monthly.textContent='Aportes de este mes: '+soles(person.month);
      const messages=[];if(person.special)messages.push('Pago especial pendiente');if(person.recovery)messages.push('Adicional de '+soles(dailySavingRules().surcharge)+' pendiente por ayer');
      view.due.textContent=messages.join(' · ');view.due.hidden=!messages.length;
    });
  }
  new MutationObserver(update).observe(document.getElementById('adminModal'),{attributes:true,attributeFilter:['hidden']});
  setInterval(update,1000);update();
})();
