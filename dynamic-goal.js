function dynamicGoalMetrics(balance, target) {
  const percent=target>0?Math.max(0,balance/target*100):0;
  const milestone=[25,50,75,100].find(value=>value>percent);
  return {percent:Math.min(percent,100),milestone:milestone||100,complete:percent>=100,remaining:milestone?Math.max(0,Math.round((target*milestone/100-balance)*100)/100):0};
}
(() => {
  const main=document.getElementById('goalTitle')?.closest('section');if(!main)return;
  main.classList.add('dynamic-goal-panel');
  const tabs=document.createElement('div');tabs.className='dynamic-goal-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Elegir meta');
  const scene=document.createElement('div');scene.className='dynamic-goal-scene';scene.setAttribute('aria-label','Sullivan y Boo avanzan hacia su meta');scene.setAttribute('role','img');
  scene.innerHTML='<div class="dynamic-goal-sun"></div><div class="dynamic-goal-mountains"></div><div class="dynamic-goal-mountains front"></div><span class="dynamic-goal-scene-label">Un camino que recorremos juntos</span><span class="dynamic-goal-destination" aria-hidden="true">🎯</span><div class="dynamic-goal-travelers" aria-hidden="true"></div><span class="dynamic-goal-heart" aria-hidden="true">💜</span>';
  const travelers=scene.querySelector('.dynamic-goal-travelers');
  if(window.makePersonAvatar)for(const profile of ['sullivan','boo'])travelers.append(window.makePersonAvatar('',profile));
  const pig=document.getElementById('pig');pig.before(tabs,scene);
  const milestone=document.createElement('div');milestone.className='dynamic-goal-next';const label=document.createElement('span'),remaining=document.createElement('strong');milestone.append(label,remaining);
  const today=document.createElement('div');today.className='dynamic-goal-today';
  const people=['sullivan','boo'].map(profile=>{const block=document.createElement('div');const name=document.createElement('strong');name.textContent=profile==='boo'?'🌸 Boo':'💙 Sullivan';const status=document.createElement('span');block.append(name,status);today.append(block);return{profile,status};});
  const add=document.createElement('button');add.type='button';add.className='dynamic-goal-add';add.textContent='＋ Agregar mi ahorro';add.onclick=()=>document.getElementById('mobileAddSaving').click();
  const feedback=document.createElement('p');feedback.className='dynamic-goal-feedback';feedback.setAttribute('role','status');feedback.hidden=true;
  main.append(milestone,today,add,feedback);
  let goalSignature='',initialized=false,seen=new Set(),timer;
  function update(){
    const goal=activeGoal();if(!goal)return;
    const signature=JSON.stringify(state.goals.map(g=>[g.id,g.name]));
    if(signature!==goalSignature){goalSignature=signature;tabs.replaceChildren();
      for(const item of state.goals){const button=document.createElement('button');button.type='button';button.textContent=item.name;button.dataset.goal=item.id;button.onclick=()=>{state.activeGoalId=item.id;syncActiveGoal();persist();render();update()};tabs.append(button);}
    }
    tabs.hidden=state.goals.length<2;tabs.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.goal===String(goal.id))));
    const m=dynamicGoalMetrics(goalBalance(goal.id),Number(goal.amount));
    scene.style.setProperty('--journey-position',settings.hideAmounts?'0':String(m.percent*.6));
    label.textContent=m.complete?'¡Meta alcanzada! 💜':'Próximo logro: '+m.milestone+' %';remaining.textContent=m.complete?'¡Lo lograron juntos!':'Faltan '+soles(m.remaining);
    const day=savingsPeruDay(new Date());people.forEach(({profile,status})=>{const paid=state.entries.some(e=>depositProfile(e)===profile&&Number(e.amount)>0&&savingsPeruDay(e.date)===day);status.textContent=paid?'✓ Depositó hoy':'Aún sin depósito hoy';status.dataset.paid=String(paid);});
    if(window.loveCloudStatus==='connecting'){initialized=false;return;}
    const ids=new Set(state.entries.map(e=>JSON.stringify([e.id,e.date,e.profileId,e.person,e.amount,e.goalId])));
    const visible=window.loveGateUnlocked&&document.getElementById('intro')?.hidden&&!document.hidden;
    const fresh=initialized&&visible&&state.entries.some(e=>(e.goalId||'original')===goal.id&&Number(e.amount)>0&&!seen.has(JSON.stringify([e.id,e.date,e.profileId,e.person,e.amount,e.goalId])));
    seen=ids;initialized=true;
    if(fresh){scene.classList.remove('celebrate');void scene.offsetWidth;scene.classList.add('celebrate');feedback.textContent='¡Un pasito más hacia su sueño! 💙💜';feedback.hidden=false;clearTimeout(timer);timer=setTimeout(()=>{feedback.hidden=true;scene.classList.remove('celebrate')},4500);}
  }
  setInterval(update,800);update();
})();
