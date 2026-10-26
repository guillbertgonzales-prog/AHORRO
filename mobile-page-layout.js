/* Menú móvil y secciones plegables: reutiliza los elementos y sus eventos. */
(() => {
  const nav=document.querySelector('.mobile-bottom-nav');if(!nav)return;
  const media=matchMedia('(max-width:700px)');
  const definitions=[['.multi-goals','🎯 Nuestras metas',false],['#savingsCalendar','📅 Calendario de ahorro',true],['#withdrawalsPanel','💰 Retiros de nuestra alcancía',false],['#historySection','📖 Movimientos de ahorro',false]];
  const sections=[];
  for(const [selector,label,initial] of definitions){
    const section=document.querySelector(selector);if(!section)continue;
    const details=document.createElement('details');details.className='mobile-page-fold';
    const summary=document.createElement('summary');summary.textContent=label;
    const content=document.createElement('div');content.className='mobile-page-fold-content';
    while(section.firstChild)content.append(section.firstChild);
    details.append(summary,content);section.append(details);
    const item={details,open:initial};sections.push(item);
    details.open=media.matches?initial:true;
    details.addEventListener('toggle',()=>{if(media.matches)item.open=details.open;});
  }
  media.addEventListener('change',()=>sections.forEach(item=>{item.details.open=media.matches?item.open:true}));
  const icons={home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',save:'<path d="M19 8.5c.8.5 1.5 1.5 1.5 3H22v4h-2l-1.5 4h-3l-.5-3H9l-.5 3h-3L4 15c-1.2-1-2-2.4-2-4 0-1 .5-2 1.5-2.5C5 6 8 5 12 5h2l3-3v5Z"/><path d="M7 5V3m0 7h.01M10 8h3"/>',withdraw:'<path d="M20 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><path d="M21 11h-5a2 2 0 0 0 0 4h5m-5-2h.01"/>',admin:'<path d="m9 3 1-2h4l1 2 2 1 2-.1 2 3-1 2v3l1 2-2 3-2-.1-2 1-1 2h-4l-1-2-2-1-2 .1-2-3 1-2V9L3 7l2-3 2 .1Z" transform="translate(0 1)"/><circle cx="12" cy="11.5" r="3"/>'};
  const entries=[[document.getElementById('mobileAddSaving'),'save','Ahorrar'],[document.getElementById('mobileOpenWithdrawal'),'withdraw','Retirar'],[document.getElementById('mobileOpenAdmin'),'admin','Administrar']];
  for(const [button,icon,label] of entries){
    if(!button)continue;
    button.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[icon]+'</svg>';
    const text=document.createElement('span');text.textContent=label;button.append(text);button.dataset.mobilePage=icon;
  }
  function active(){
    const opened=id=>document.getElementById(id)?.hidden===false;
    const selected=opened('adminModal')?'admin':opened('withdrawalModal')?'withdraw':opened('mobileSavingModal')?'save':'home';
    for(const [button,icon] of entries){if(button)button.setAttribute('aria-pressed',String(icon===selected));}
  }
  const observer=new MutationObserver(active);
  for(const id of ['adminModal','withdrawalModal','mobileSavingModal']){const modal=document.getElementById(id);if(modal)observer.observe(modal,{attributes:true,attributeFilter:['hidden']});}
  active();
})();
