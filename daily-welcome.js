/* Saludo y celebración del ahorro compartido, con fechas de Perú. */
function bothSavedToday(now = new Date()) {
  const today=savingsPeruDay(now);
  return ['sullivan','boo'].every(profile=>state.entries.some(entry=>depositProfile(entry)===profile&&Number(entry.amount)>0&&savingsPeruDay(entry.date)===today));
}
(() => {
  const header=document.querySelector('.wrap>header');if(!header)return;
  const style=document.createElement('style');style.textContent=`
    .daily-greeting{display:flex;justify-content:center;align-items:center;gap:10px;margin:44px auto 18px;padding:12px 16px;max-width:480px;color:#644397;font-size:17px;font-weight:600;box-sizing:border-box}
    .daily-greeting .movement-avatar{width:40px!important;height:40px!important;flex-basis:40px!important}
    .daily-shared-celebration{position:relative;overflow:hidden;margin:0 auto 20px;padding:20px 36px;max-width:540px;border:1px solid #dfd0ee;border-radius:20px;background:linear-gradient(135deg,#e8f9fd,#f5e9fc);color:#624294;box-sizing:border-box;text-align:center}
    .daily-shared-celebration strong{display:block;font-size:18px;margin-bottom:7px}.daily-shared-celebration p{margin:0;font-size:14px;line-height:1.5}
    .daily-shared-celebration button{position:absolute;right:5px;top:5px;width:32px;min-height:32px;padding:0;border:0!important;background:transparent!important;color:#7053b9!important;box-shadow:none!important;font-size:21px}
    .daily-shared-celebration i{position:absolute;left:var(--x);top:-25px;font-size:16px;font-style:normal;pointer-events:none;animation:dailyHearts 3s ease-in var(--delay) both}
    .daily-greeting[hidden],.daily-shared-celebration[hidden]{display:none!important}
    @keyframes dailyHearts{from{transform:translateY(0) rotate(0);opacity:0}20%{opacity:.8}to{transform:translateY(150px) rotate(35deg);opacity:0}}
    @media(prefers-reduced-motion:reduce){.daily-shared-celebration i{display:none}}
    @media(max-width:400px){.daily-greeting{font-size:16px}.daily-shared-celebration{padding:18px 30px}}
  `;document.head.append(style);
  const greeting=document.createElement('div');greeting.className='daily-greeting';greeting.hidden=true;
  const avatar=document.createElement('span'),text=document.createElement('span');greeting.append(avatar,text);
  const celebration=document.createElement('div');celebration.className='daily-shared-celebration';celebration.hidden=true;celebration.setAttribute('role','status');
  const title=document.createElement('strong');title.textContent='¡Hoy ahorraron los dos! 💙💜';
  const description=document.createElement('p');description.textContent='Sullivan y Boo, un día más construyendo sus sueños juntos.';
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Cerrar celebración');
  const particles=document.createElement('span');particles.setAttribute('aria-hidden','true');celebration.append(title,description,close,particles);
  header.prepend(greeting,celebration);
  let identity='',timer=null;const shown=new Set();
  const hide=()=>{celebration.hidden=true;particles.replaceChildren();clearTimeout(timer)};close.onclick=hide;
  function update(){
    const profile=window.loveActiveUser;
    const visible=window.loveGateUnlocked===true&&['boo','sullivan'].includes(profile)&&document.getElementById('loveGate')?.hidden&&document.getElementById('intro')?.hidden&&!document.hidden;
    greeting.hidden=true;
    if(!visible){hide();return;}
    if(identity!==profile){identity=profile;hide();text.textContent=profile==='boo'?'¡Hola, Boo! 🌸':'¡Hola, Sullivan! 💙';avatar.replaceChildren();if(window.makePersonAvatar)avatar.append(window.makePersonAvatar('',profile));}
    if(window.loveCloudStatus==='connecting'||!bothSavedToday()){hide();return;}
    const key='alcancia_both_saved_v1:'+profile+':'+savingsPeruDay(new Date());
    if(shown.has(key))return;
    try{if(localStorage.getItem(key)){shown.add(key);return;}}catch{}
    shown.add(key);try{localStorage.setItem(key,'1')}catch{}
    particles.replaceChildren();
    for(let i=0;i<10;i++){const heart=document.createElement('i');heart.textContent=i%2?'💜':'💙';heart.style.setProperty('--x',(i*10)+'%');heart.style.setProperty('--delay',(i%4)*.15+'s');particles.append(heart);}
    celebration.hidden=false;timer=setTimeout(hide,8000);
  }
  setInterval(update,1000);window.addEventListener('focus',update);update();
})();
