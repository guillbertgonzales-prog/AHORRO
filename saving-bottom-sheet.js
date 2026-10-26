(() => {
  const modal=document.getElementById('mobileSavingModal'),form=document.getElementById('form');
  if(!modal||!form)return;
  const dialog=modal.querySelector('.mobile-saving-dialog'),submit=form.querySelector('button[type="submit"]');
  if(!submit)return;
  dialog.tabIndex=-1;
  const handle=document.createElement('div');handle.className='saving-sheet-handle';handle.setAttribute('aria-hidden','true');dialog.prepend(handle);
  const footer=document.createElement('div');footer.className='saving-sheet-footer';dialog.append(footer);
  document.getElementById('amount').inputMode='decimal';
  function viewport(){modal.style.setProperty('--saving-viewport',(window.visualViewport?.height||window.innerHeight)+'px');}
  function sync(){
    viewport();
    if(!modal.hidden&&window.innerWidth<=700){submit.setAttribute('form','form');footer.append(submit);}
    else{submit.removeAttribute('form');form.append(submit);}
  }
  new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['hidden']});
  window.visualViewport?.addEventListener('resize',viewport);
  window.addEventListener('resize',sync);
  document.getElementById('closeMobileSaving').addEventListener('click',()=>document.getElementById('mobileAddSaving').focus());
  modal.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||modal.hidden)return;
    const controls=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')].filter(el=>el.getClientRects().length>0);
    const first=controls[0],last=controls[controls.length-1];if(!first)return;
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){event.preventDefault();first.focus();}
  });
  sync();
})();
