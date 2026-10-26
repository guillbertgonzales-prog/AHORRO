/* Metadatos de avisos compartidos por la conexión existente de la alcancía. */
(() => {
  const prefixes = ['alcancia_notice_history_v1:', 'alcancia_deposit_notices_v1:'];
  const isNotice = key => prefixes.some(prefix => key.startsWith(prefix));
  function day(value) {
    const d=new Date(value);if(!Number.isFinite(d.getTime()))return '';
    const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).map(x=>[x.type,x.value]));
    return p.year+'-'+p.month+'-'+p.day;
  }
  function depositId(entry){return 'deposit:'+JSON.stringify(entry.id ? [depositProfile(entry),entry.id] : [depositProfile(entry),entry.date,Number(entry.amount)]);}
  function normalize(items) {
    const records=new Map();
    for(const item of Array.isArray(items)?items:[]) {
      if(!item||!['boo','sullivan'].includes(item.profile)||!day(item.date)||Date.parse(item.date)<=Date.now()-30*86400000)continue;
      let id;
      if(item.reminder) id=item.kind==='missed'?'missed:'+item.profile+':'+item.missedDay:'special:'+item.profile+':'+day(item.date);
      else {
        const entry=state.entries.find(e=>depositId(e)===item.id) || state.entries.find(e=>depositProfile(e)===item.profile&&e.date===item.date&&Number(e.amount)===Number(item.amount));
        // Los antiguos resúmenes se sustituyen por los depósitos originales.
        if(!entry)continue;
        id=depositId(entry);
      }
      const old=records.get(id);
      records.set(id,{...item,id,read:item.read===true||old?.read===true});
    }
    return [...records.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,30);
  }
  window.normalizeNoticeHistory=normalize;
  window.noticeDepositId=depositId;
  function combine(key, first, second) {
    if (key.startsWith(prefixes[0])) {
      return normalize([...(Array.isArray(first)?first:[]),...(Array.isArray(second)?second:[])]);
    }
    return {...first,...second};
  }
  function merge(first = {}, second = {}) {
    const merged = {};
    for (const key of new Set([...Object.keys(first),...Object.keys(second)])) {
      if (!isNotice(key)) continue;
      // Los recibos de ventanas caducan con el historial.
      if (key.startsWith(prefixes[1])) {
        const day=key.slice(-10);
        if (Date.parse(day+'T00:00:00-05:00') < Date.now()-31*86400000) continue;
      }
      merged[key]=combine(key,first[key],second[key]);
    }
    return merged;
  }
  window.mergeNoticeSync = merge;
  window.noticeStore = {
    getItem(key) {
      if (!isNotice(key)) return localStorage.getItem(key);
      const shared=state.noticeSync?.[key];
      if(shared!==undefined) return JSON.stringify(shared);
      return localStorage.getItem(key);
    },
    setItem(key, value) {
      if(!isNotice(key)) return localStorage.setItem(key,value);
      const parsed=JSON.parse(value);
      localStorage.setItem(key,value);
      if(window.loveCloudStatus!=='connected') return;
      const next=merge(state.noticeSync,{[key]:parsed});
      if(JSON.stringify(next)!==JSON.stringify(state.noticeSync)) {
        state.noticeSync=next;persist();
      }
    }
  };
  let migrated=false;
  function migrate() {
    if(window.loveCloudStatus!=='connected'||migrated) return;
    migrated=true;
    const local={};
    for(let i=0;i<localStorage.length;i++) {
      const key=localStorage.key(i);
      if(!key||!isNotice(key))continue;
      try{local[key]=JSON.parse(localStorage.getItem(key))}catch{}
    }
    const next=merge(state.noticeSync,local);
    if(JSON.stringify(next)!==JSON.stringify(state.noticeSync||{})){state.noticeSync=next;persist()}
  }
  window.addEventListener('alcancia-cloud-ready',migrate);
  migrate();
})();
