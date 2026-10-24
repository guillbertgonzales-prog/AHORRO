/* Avisos locales: fechas de Perú y recibos independientes por usuario. */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    #depositNotices{position:fixed;left:18px;top:78px;z-index:9999;width:min(370px,calc(100vw - 28px));display:grid;gap:10px;pointer-events:none;max-height:75vh;overflow:auto}
    #depositNotices[hidden]{display:none}
    .deposit-notice{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:16px;border:1px solid #d7c6ee;border-radius:20px;background:linear-gradient(135deg,#f0fbff,#fff0f8);box-shadow:0 8px 30px #7053b933;color:#574174;font:inherit}
    .deposit-notice-copy{flex:1;min-width:0}.deposit-notice strong{display:block;font-size:15px}.deposit-notice p{margin:5px 0 0;font-size:13px;line-height:1.5}
    .deposit-notice-close{align-self:flex-start;border:0;background:transparent;color:#7053b9;padding:3px 7px;font-size:21px;cursor:pointer}
    .deposit-notice-action{margin-top:10px;padding:8px 12px;border:0;border-radius:12px;background:#7053b9;color:white;cursor:pointer;font:inherit;font-size:13px}
    #depositBell{position:fixed;left:18px;top:max(18px,env(safe-area-inset-top));z-index:9998;border:1px solid #d7c6ee;border-radius:50%;background:#fff3fc;color:#7053b9;width:44px;height:44px;padding:10px;display:grid;place-items:center;box-shadow:0 4px 15px #7053b926;cursor:pointer}
    #depositBell svg{width:24px;height:24px;display:block}#depositBell:focus-visible{outline:3px solid #7053b9;outline-offset:3px}
    #depositNoticeHistory{position:fixed;left:18px;top:78px;z-index:10000;width:min(390px,calc(100vw - 28px));max-height:70vh;overflow:auto;background:#fff9fd;border:1px solid #d7c6ee;border-radius:20px;padding:16px;box-sizing:border-box;box-shadow:0 8px 30px #7053b933;color:#574174}
    #depositNoticeHistory[hidden],#depositBell[hidden]{display:none}
    #depositNoticeHistory .deposit-notice{margin-top:12px;box-shadow:none}#depositNoticeHistory h3{margin:0;font-size:18px}
    #depositNoticePreview{display:grid;gap:10px;margin:12px 0}#depositNoticePreview .deposit-notice{box-shadow:none}
    @media(max-width:600px){#depositNotices,#depositNoticeHistory{left:14px;top:calc(max(14px,env(safe-area-inset-top)) + 58px)}#depositBell{left:14px}}
    #depositHeaderActions{position:fixed;top:max(10px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));display:flex;align-items:center;gap:10px;z-index:170}
    #depositHeaderActions #depositBell,#depositHeaderActions #leaveAlcancia{position:static;margin:0;flex-shrink:0}
    #depositHeaderActions #depositBell{position:relative;left:auto;top:auto}
    #depositBell[data-unread="true"]::after{content:'';position:absolute;top:3px;right:3px;width:10px;height:10px;background:#ad42d1;border:2px solid #fff;border-radius:50%}
    #depositNotices .deposit-notice{animation:depositNoticeEnter .3s ease-out}
    .deposit-notice-time{display:block;margin-top:6px;font-size:12px;color:#756582}
    @keyframes depositNoticeEnter{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
    @media(prefers-reduced-motion:reduce){#depositNotices .deposit-notice{animation:none}}
    #depositNotices,#depositNoticeHistory{left:auto;right:max(12px,env(safe-area-inset-right))}
    @media(max-width:700px){#depositHeaderActions{right:max(10px,env(safe-area-inset-right));gap:8px}}
  `;
  document.head.append(style);
  const container = document.createElement('aside');
  container.id = 'depositNotices';
  container.hidden = true;
  container.setAttribute('aria-label', 'Avisos de depósitos');
  container.setAttribute('aria-live', 'polite');
  document.body.append(container);
  const bell = document.createElement('button');
  bell.id = 'depositBell'; bell.type = 'button'; bell.hidden = true;
  bell.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a1 1 0 0 1 1 1v1.08A6 6 0 0 1 18 10v4l2 3v1H4v-1l2-3v-4a6 6 0 0 1 5-5.92V3a1 1 0 0 1 1-1Zm-2 18h4a2 2 0 0 1-4 0Z"/></svg>';
  bell.setAttribute('aria-label', 'Abrir avisos'); bell.title = 'Avisos'; bell.setAttribute('aria-expanded', 'false');
  bell.setAttribute('aria-controls', 'depositNoticeHistory');
  const history = document.createElement('section');
  history.id = 'depositNoticeHistory'; history.hidden = true;
  history.setAttribute('aria-label', 'Avisos recientes');
  document.body.append(bell, history);
  const exit = document.getElementById('leaveAlcancia');
  if (exit) {
    const actions = document.createElement('div'); actions.id = 'depositHeaderActions';
    exit.before(actions); actions.append(bell, exit);
  }
  function closeHistory() { history.hidden = true; bell.setAttribute('aria-expanded', 'false'); }
  bell.onclick = () => {
    if (!history.hidden) { closeHistory(); return; }
    renderHistory(); history.hidden = false; bell.setAttribute('aria-expanded', 'true');
    markHistoryRead();
  };
  document.addEventListener('click', event => {
    if (!history.hidden && !history.contains(event.target) && !bell.contains(event.target)) closeHistory();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !history.hidden) { closeHistory(); bell.focus(); } });
  function historyKey() { return 'alcancia_notice_history_v1:' + window.loveActiveUser; }
  function readHistory() {
    try {
      const key = historyKey();
      const items = JSON.parse(localStorage.getItem(key) || '[]');
      if (!Array.isArray(items)) return [];
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = items.filter(item => item && ['boo','sullivan'].includes(item.profile)
        && Number.isFinite(Date.parse(item.date)) && Date.parse(item.date) > cutoff).slice(0,30);
      if (recent.length !== items.length) localStorage.setItem(key, JSON.stringify(recent));
      return recent;
    } catch { return []; }
  }
  function updateUnread() {
    const unread = readHistory().some(item => item.read !== true);
    bell.dataset.unread = String(unread);
    bell.setAttribute('aria-label', unread ? 'Abrir avisos, hay novedades sin leer' : 'Abrir avisos');
  }
  function markHistoryRead() {
    const items = readHistory().map(item => ({...item, read:true}));
    try { localStorage.setItem(historyKey(), JSON.stringify(items)); } catch {}
    updateUnread();
  }
  function archive(profile, reminder, amount, extra = {}) {
    const items = readHistory();
    items.unshift({profile, reminder:!!reminder, amount, date:new Date().toISOString(), read:!history.hidden,...extra});
    try { localStorage.setItem(historyKey(), JSON.stringify(items.slice(0,30))); } catch {}
    if (!history.hidden) renderHistory();
    updateUnread();
  }
  function openDeposit() {
    if (!specialEligible(window.loveActiveUser)) return;
    closeHistory();
    const select = document.getElementById('depositType');
    select.value = 'special'; updateSpecialControls();
    document.getElementById('mobileAddSaving')?.click();
    select.value = 'special'; updateSpecialControls();
    const amount = document.getElementById('amount');
    amount.scrollIntoView({behavior:'smooth',block:'center'}); amount.focus({preventScroll:true});
  }
  function renderHistory() {
    history.replaceChildren();
    const title = document.createElement('h3'); title.textContent = '🔔 Avisos recientes';
    history.append(title);
    const items = readHistory();
    if (!items.length) { const empty=document.createElement('p'); empty.textContent='Todavía no hay avisos. Aquí podrás volver a leerlos.'; history.append(empty); }
    for (const item of items) {
      const name = item.profile === 'boo' ? 'Boo' : 'Sullivan';
      if (item.kind === 'missed') {
        const paid=state.entries.some(entry=>depositProfile(entry)===item.profile&&entry.recoveryFor===item.missedDay);
        show(item.profile,name+': día sin depósito',paid ? 'Aporte adicional registrado ✓' : 'No registraste depósito el '+item.missedDay+'. El siguiente día corresponde agregar S/ 5 al ahorro diario.',true,{target:history,static:true,action:false});
        continue;
      }
      const pending = item.profile === window.loveActiveUser && specialEligible(item.profile);
      const sameMonth = specialToday(new Date(item.date)).period === specialToday().period;
      const message = item.reminder ? (hasSpecialPayment(item.profile,specialToday(new Date(item.date)).period) ? 'Pago realizado ✓' : 'Recordatorio del pago especial de ese mes.')
        : (settings.hideAmounts ? 'Un aporte a nuestros sueños 💖' : 'Aporte: '+soles(Number(item.amount)||0));
      const card=show(item.profile,item.reminder ? name+': pago especial' : name+' registró un depósito',message,item.reminder,{target:history,static:true,action:item.reminder&&pending&&sameMonth});
      const date=document.createElement('small');date.textContent=new Date(item.date).toLocaleString('es-PE',{timeZone:'America/Lima'});card.querySelector('.deposit-notice-copy').append(date);
    }
  }
  let storageKey = '', receipts = {}, timers = [], queue = [], activeNotice = null;
  function nextNotice() {
    if (activeNotice || container.hidden) return;
    const next = queue.shift();
    if (!next) return;
    activeNotice = next;
    container.append(next.card);
    timers.push(setTimeout(() => dismissNotice(next), next.reminder ? 18000 : 12000));
  }
  function dismissNotice(notice) {
    notice.card.remove();
    if (activeNotice === notice) activeNotice = null;
    nextNotice();
  }
  const dateKey = value => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const t = specialToday(date);
    return t.period + '-' + String(t.day).padStart(2, '0');
  };
  function clear() {
    timers.forEach(clearTimeout); timers = [];
    queue = []; activeNotice = null;
    container.replaceChildren();
  }
  function save() { try { localStorage.setItem(storageKey, JSON.stringify(receipts)); } catch {} }
  function show(profile, title, message, reminder, options = {}) {
    const card = document.createElement('section');
    card.className = 'deposit-notice';
    card.dataset.profile = profile;
    card.dataset.reminder = String(!!reminder);
    const person = profile === 'sullivan' ? settings.person1 : settings.person2;
    if (window.makePersonAvatar) card.append(window.makePersonAvatar(person, profile));
    const copy = document.createElement('div'); copy.className = 'deposit-notice-copy';
    const heading = document.createElement('strong'); heading.textContent = title;
    const text = document.createElement('p'); text.textContent = message;
    copy.append(heading, text);
    if (!reminder && (!options.static || options.target?.id === 'depositNoticePreview')) {
      const time=document.createElement('small');time.className='deposit-notice-time';
      const date=new Date(options.date || Date.now());
      time.textContent='Hoy, '+date.toLocaleTimeString('es-PE',{timeZone:'America/Lima',hour:'2-digit',minute:'2-digit'});
      if (options.count > 1) time.textContent='Último depósito: '+time.textContent;
      copy.append(time);
    }
    if (reminder && (options.action !== false) && (!options.static || options.action)) {
      const action=document.createElement('button'); action.type='button'; action.className='deposit-notice-action';
      action.textContent='Hacer mi depósito'; action.onclick=options.onAction || openDeposit; copy.append(action);
    }
    const close = document.createElement('button'); close.type = 'button';
    close.className = 'deposit-notice-close'; close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar aviso');
    card.append(copy); if (!options.static) card.append(close);
    if (options.static) (options.target || container).append(card);
    else {
      const notice={card,reminder,profile,kind:options.kind};
      close.onclick=()=>dismissNotice(notice);
      queue.push(notice);nextNotice();
    }
    return card;
  }
  function check() {
    const viewer = window.loveActiveUser;
    const visible = window.loveGateUnlocked === true && ['sullivan', 'boo'].includes(viewer)
      && document.getElementById('loveGate')?.hidden && document.getElementById('intro')?.hidden
      && document.visibilityState !== 'hidden';
    container.hidden = !visible;
    bell.hidden = !visible;
    if (!visible) { clear(); closeHistory(); return; }
    updateUnread();
    const today = dateKey(new Date());
    const key = 'alcancia_deposit_notices_v1:' + viewer + ':' + today;
    if (storageKey !== key) {
      clear(); closeHistory(); storageKey = key;
      try { receipts = JSON.parse(localStorage.getItem(key) || '{}') || {}; } catch { receipts = {}; }
      if (!receipts || typeof receipts !== 'object' || Array.isArray(receipts)) receipts = {};
    }
    for (const profile of ['sullivan', 'boo']) {
      const name = profile === 'sullivan' ? 'Sullivan' : 'Boo';
      const missed=typeof missedDepositDay==='function' && profile===viewer ? missedDepositDay(profile) : null;
      if (!missed) {
        queue=queue.filter(notice=>!(notice.kind==='missed'&&notice.profile===profile));
        if(activeNotice?.kind==='missed'&&activeNotice.profile===profile) dismissNotice(activeNotice);
      }
      if (missed && !receipts['missed:'+profile]) {
        show(profile,'¡'+name+', ayer olvidaste depositar!','Hoy debes agregar S/ 5 al ahorro diario. Total: de S/ 6.00 a S/ 6.50. 💜',true,{kind:'missed',onAction:()=>{
          closeHistory();document.getElementById('depositType').value='daily';updateSpecialControls();
          document.getElementById('mobileAddSaving')?.click();
          const input=document.getElementById('amount');input.value='6';input.focus();
        }});
        archive(profile,true,5,{kind:'missed',missedDay:missed});
        receipts['missed:'+profile]=true;save();
      }
      const deposits = state.entries.filter(item => depositProfile(item) === profile && dateKey(item.date) === today);
      const unseen = deposits.filter(item => !receipts['deposit:' + JSON.stringify([item.id, item.date, item.profileId, item.person, item.amount])]);
      if (unseen.length) {
        const amount = unseen.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const message = settings.hideAmounts ? '¡Un nuevo aporte a nuestros sueños! 💖' : 'Nuevo aporte de hoy: ' + soles(amount) + ' 💖';
        const latest=new Date(Math.max(...unseen.map(item=>new Date(item.date).getTime())));
        show(profile, '¡' + name + ' depositó hoy!', message, false, {date:latest,count:unseen.length});
        archive(profile, false, amount);
        unseen.forEach(item => { receipts['deposit:' + JSON.stringify([item.id, item.date, item.profileId, item.person, item.amount])] = true; });
        save();
      }
      const pending = profile === viewer && specialEligible(profile);
      if (!pending) {
        queue=queue.filter(notice=>!(notice.reminder&&notice.kind!=='missed'&&notice.profile===profile));
        if (activeNotice?.reminder && activeNotice.kind!=='missed' && activeNotice.profile===profile) dismissNotice(activeNotice);
      }
      if (pending && !receipts['reminder:' + profile]) {
        show(profile, '¡' + name + ', recuerda tu depósito especial!', 'Te falta registrar el pago especial de este mes. Está disponible ' + specialRangeLabel() + '. 💜', true);
        archive(profile, true);
        receipts['reminder:' + profile] = true; save();
      }
    }
  }
  const admin = document.querySelector('[data-pane="general"]');
  if (admin) {
    const section=document.createElement('section');
    const title=document.createElement('h3');title.textContent='🔔 Probar las notificaciones';
    const note=document.createElement('p');note.className='admin-note';note.textContent='Vista previa de ejemplo. No registra depósitos ni consume tus avisos.';
    const preview=document.createElement('div');preview.id='depositNoticePreview';preview.setAttribute('aria-live','polite');
    section.append(title,note);
    for (const [label,reminder] of [['Ver aviso de depósito',false],['Ver recordatorio especial',true]]) {
      const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent=label;
      button.onclick=()=>{
        preview.replaceChildren();
        for (const profile of ['boo','sullivan']) {
          const name=profile==='boo'?'Boo':'Sullivan';
          const card=show(profile,reminder ? name+', recuerda tu depósito especial' : '¡'+name+' depositó hoy!',reminder ? 'Ejemplo: te falta registrar el pago especial de este mes. 💜' : 'Ejemplo: nuevo aporte de hoy de S/ 1.50 💖',reminder,{target:preview,static:true,action:false});
          if(reminder){const example=document.createElement('button');example.type='button';example.className='deposit-notice-action';example.textContent='Hacer mi depósito · ejemplo';example.onclick=()=>{note.textContent='En un aviso real, este botón abre el formulario de pago especial. Esta vista previa no modifica tus datos.'};card.querySelector('.deposit-notice-copy').append(example)}
        }
      };
      section.append(button);
    }
    section.append(preview); admin.append(section);
  }
  setInterval(check, 1000);
  window.addEventListener('focus', check);
  document.addEventListener('visibilitychange', check);
  check();
})();
