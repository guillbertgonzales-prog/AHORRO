/* Acceso a respaldos desde la página principal; reutiliza el formato existente. */
(() => {
  const wrap=document.querySelector('.wrap'),download=document.getElementById('downloadBackup');if(!wrap||!download)return;
  const panel=document.createElement('section');panel.className='panel main-backups';panel.hidden=true;
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='💾 Mis respaldos';
  const text=document.createElement('p');text.textContent='Guarda una copia de tus metas, depósitos, retiros y configuración. Las fotos no se incluyen.';
  const actions=document.createElement('div');actions.className='main-backup-actions';
  const save=document.createElement('button');save.type='button';save.textContent='📥 Guardar respaldo';
  const restore=document.createElement('button');restore.type='button';restore.className='secondary';restore.textContent='📂 Restaurar una copia';
  const github=document.createElement('a');github.textContent='🔒 Ver respaldos diarios en GitHub';github.href='https://github.com/guillbertgonzales-prog/AHORRO-RESPALDOS/tree/main/respaldos';github.target='_blank';github.rel='noopener noreferrer';
  const status=document.createElement('p');status.className='main-backup-status';status.setAttribute('role','status');
  const hint=document.createElement('small');hint.textContent='El archivo se guarda en las descargas de tu navegador. Consérvalo fuera del navegador para no perderlo al borrar sus datos.';
  save.onclick=()=>{
    if(!window.loveGateUnlocked)return;
    download.click();
    const message=document.getElementById('backupStatus')?.textContent||'';
    status.textContent=message.includes('No se pudo')?message:'Descarga iniciada. Revisa la carpeta Descargas de tu dispositivo.';
  };
  restore.onclick=()=>{
    if(!window.loveGateUnlocked)return;
    document.getElementById('openAdmin').click();selectAdminTab('records');document.getElementById('restoreBackup').scrollIntoView({block:'center',behavior:'smooth'});document.getElementById('restoreBackup').focus({preventScroll:true});
  };
  actions.append(save,restore);details.append(summary,text,actions,hint,github,status);panel.append(details);
  const footer=wrap.querySelector('footer');if(footer)footer.before(panel);else wrap.append(panel);
  function update(){panel.hidden=!(window.loveGateUnlocked===true&&document.getElementById('loveGate')?.hidden&&document.getElementById('intro')?.hidden);}
  const observer=new MutationObserver(update);for(const id of ['loveGate','intro']){const target=document.getElementById(id);if(target)observer.observe(target,{attributes:true,attributeFilter:['hidden']});}
  update();
})();
