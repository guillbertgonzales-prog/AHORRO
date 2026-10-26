(() => {
  const modal=document.getElementById('withdrawalModal'),form=document.getElementById('withdrawalForm');
  if(!modal||!form)return;
  const dialog=modal.querySelector('.withdrawal-dialog'),head=dialog.querySelector('.withdrawal-top'),actions=form.querySelector('.actions');
  if(!actions)return;
  dialog.tabIndex=-1;
  const handle=document.createElement('div');handle.className='withdrawal-sheet-handle';handle.setAttribute('aria-hidden','true');dialog.prepend(handle);
  const content=document.createElement('div');content.className='withdrawal-sheet-content';
  const nodes=[...dialog.children].filter(node=>node!==handle&&node!==head);
  nodes.forEach(node=>content.append(node));dialog.append(content);
  const footer=document.createElement('div');footer.className='withdrawal-sheet-footer';
  const submit=actions.querySelector('button[type="submit"]');submit.setAttribute('form','withdrawalForm');footer.append(actions);dialog.append(footer);
  document.getElementById('withdrawalAmount').inputMode='decimal';
  let lastFocus=null;
  function viewport(){modal.style.setProperty('--withdrawal-viewport',(window.visualViewport?.height||window.innerHeight)+'px');}
  function sync(){viewport();if(!modal.hidden){lastFocus=document.activeElement;dialog.focus({preventScroll:true});}else if(lastFocus?.isConnected){lastFocus.focus({preventScroll:true});}}
  new MutationObserver(sync).observe(modal,{attributes:true,attributeFilter:['hidden']});
  window.visualViewport?.addEventListener('resize',viewport);window.addEventListener('resize',viewport);
  modal.addEventListener('keydown',event=>{
    if(event.key!=='Tab'||modal.hidden)return;
    const items=[...dialog.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary')].filter(node=>node.getClientRects().length>0);
    const first=items[0],last=items[items.length-1];if(!first)return;
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||document.activeElement===dialog)){event.preventDefault();first.focus();}
  });
  viewport();
})();
