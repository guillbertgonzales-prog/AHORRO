/* Respaldos únicamente en Administración, sin duplicar sus controles. */
(() => {
  const download=document.getElementById('downloadBackup');
  const records=document.querySelector('#adminModal [data-pane="records"]');
  const box=download?.closest('section');if(!records||!box)return;
  box.classList.add('admin-backups');
  const title=box.querySelector('h3');if(title)title.textContent='💾 Mis respaldos';
  download.textContent='📥 Guardar respaldo';
  const hint=document.createElement('p');hint.className='admin-note';hint.textContent='El archivo se guarda en Descargas. Consérvalo fuera del navegador para no perderlo al borrar sus datos.';
  const github=document.createElement('a');github.textContent='🔒 Ver respaldos diarios en GitHub';github.href='https://github.com/guillbertgonzales-prog/AHORRO-RESPALDOS/tree/main/respaldos';github.target='_blank';github.rel='noopener noreferrer';
  box.append(hint,github);
  records.prepend(box);
})();
