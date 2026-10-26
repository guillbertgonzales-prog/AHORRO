/* Navegación clara para escritorio y celular. */
(() => {
  const modal=document.getElementById('adminModal');if(!modal)return;
  const dialog=modal.querySelector('.admin-dialog'),nav=modal.querySelector('.admin-tabs');
  const navigation=document.createElement('div');navigation.className='admin-section-picker';
  const groups=[['General',['dashboard','users']],['Ahorros',['movements','summary','goal']],['Configuración',['rules','general','video','photos']],['Control',['records','audit']]];
  const names={dashboard:'✨ Inicio',users:'👥 Usuarios',movements:'🔎 Movimientos',summary:'📊 Resumen mensual',goal:'🎯 Metas',rules:'⚙️ Reglas de ahorro',general:'🎨 Apariencia',video:'🎞️ Bienvenida',photos:'📸 Fotos',records:'💾 Respaldos y registros',audit:'📝 Historial de cambios'};
  const toggle=document.createElement('button');toggle.type='button';toggle.className='admin-sections-toggle';toggle.textContent='☰ Secciones';toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-controls','adminGroupedMobileMenu');
  const currentLabel=document.createElement('span');currentLabel.className='admin-current-section';
  const mobileMenu=document.createElement('nav');mobileMenu.id='adminGroupedMobileMenu';mobileMenu.hidden=true;mobileMenu.setAttribute('aria-label','Secciones de Administración');
  navigation.append(toggle,currentLabel,mobileMenu);nav.after(navigation);
  const mobileButtons=[];
  function closeMenu(restore=false){mobileMenu.hidden=true;toggle.setAttribute('aria-expanded','false');if(restore)toggle.focus();}
  groups.forEach(([name,keys])=>{
    const desktopHeading=document.createElement('span');desktopHeading.className='admin-nav-group-title';desktopHeading.textContent=name;desktopHeading.setAttribute('aria-hidden','true');
    const first=nav.querySelector('[data-admin-tab="'+keys[0]+'"]');if(first)first.before(desktopHeading);
    const mobileGroup=document.createElement('div');mobileGroup.className='admin-mobile-group';const heading=document.createElement('h4');heading.textContent=name;mobileGroup.append(heading);
    keys.forEach(key=>{
      const original=nav.querySelector('[data-admin-tab="'+key+'"]');if(!original)return;
      original.textContent=names[key];
      const button=document.createElement('button');button.type='button';button.textContent=names[key];button.dataset.section=key;
      button.onclick=()=>{selectAdminTab(key);closeMenu(true)};mobileButtons.push(button);mobileGroup.append(button);
    });mobileMenu.append(mobileGroup);
  });
  toggle.onclick=()=>{const expanded=mobileMenu.hidden;mobileMenu.hidden=!expanded;toggle.setAttribute('aria-expanded',String(expanded));if(expanded)(mobileButtons.find(button=>button.getAttribute('aria-current')==='page')||mobileButtons[0])?.focus();};
  document.addEventListener('click',event=>{if(!mobileMenu.hidden&&!navigation.contains(event.target))closeMenu()});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!mobileMenu.hidden){event.stopImmediatePropagation();event.preventDefault();closeMenu(true)}},true);
  window.addEventListener('resize',()=>{if(window.innerWidth>=900)closeMenu()});
  const descriptions={dashboard:'Un vistazo a su ahorro y accesos a las tareas principales.',users:'Aportes por persona, días sin depósito y excepciones justificadas.',movements:'Consulta depósitos y retiros con filtros, sin modificar los registros.',summary:'Compara los aportes y retiros de cada mes.',goal:'Crea y organiza los sueños para los que están ahorrando.',rules:'Configura el ahorro diario, los adicionales y el pago especial.',general:'Personaliza los textos y la información que muestra la página.',video:'Ajusta la presentación de bienvenida y sus efectos.',photos:'Administra las fotografías de sus recuerdos.',records:'Revisa los registros y administra sus copias de respaldo.',audit:'Consulta las modificaciones registradas desde esta versión.'};
  for(const pane of modal.querySelectorAll('.admin-pane')){
    const context=document.createElement('p');context.className='admin-section-context';context.textContent=descriptions[pane.dataset.pane]||'';pane.prepend(context);
  }
  const rules=modal.querySelector('[data-pane="rules"] .admin-complete-rule-form');
  if(rules){const title=document.createElement('h4');title.textContent='Depósito diario y adicional';rules.prepend(title);}
  const filter=modal.querySelector('.admin-complete-filters');
  if(filter){const reset=document.createElement('button');reset.type='button';reset.className='secondary admin-reset-filters';reset.textContent='Limpiar filtros';reset.onclick=()=>{filter.querySelectorAll('input,select').forEach(field=>field.value='');filter.querySelector('input').dispatchEvent(new Event('input',{bubbles:true}));};filter.after(reset);}
  const footer=modal.querySelector('.admin-footer'),status=document.getElementById('adminDraftStatus');
  function update(){
    const current=modal.querySelector('.admin-pane:not([hidden])')?.dataset.pane||'dashboard';
    currentLabel.textContent=names[current]||'Inicio';
    mobileButtons.forEach(button=>{if(button.dataset.section===current)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});
    if(modal.hidden)closeMenu();
    dialog.dataset.section=current;
    const hasDraft=status?.classList.contains('has-draft');
    if(footer)footer.hidden=!['general','users','goal','video'].includes(current)&&!hasDraft;
  }
  const observer=new MutationObserver(update);
  modal.querySelectorAll('.admin-pane').forEach(pane=>observer.observe(pane,{attributes:true,attributeFilter:['hidden']}));
  if(status)observer.observe(status,{attributes:true,attributeFilter:['class']});
  observer.observe(modal,{attributes:true,attributeFilter:['hidden']});
  update();
})();
