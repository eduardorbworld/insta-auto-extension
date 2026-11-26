// Uses only the visible Instagram website. No private API, credentials or cookies.
export const MINUTE=60000, REST=900000, BLOCK=50, SCAN_INTERVAL=10000, SCAN_REST=120000;
export const statuses=['active','unavailable','notfollowing','unknown','removed'];
export function nextSlot(count,now=Date.now(),mode='remove') {const scan=mode==='scan';return {count:count+1>=BLOCK?0:count+1,nextAt:now+(count+1>=BLOCK?(scan?SCAN_REST:REST):(scan?SCAN_INTERVAL:MINUTE))};}
export function cleanChecks(value){return Array.isArray(value)?value.filter(x=>x&&typeof x.snapshotId==='string'&&/^[a-z0-9._]{1,30}$/.test(x.username)&&statuses.includes(x.status)&&typeof x.checkedAt==='string').map(({snapshotId,username,status,checkedAt})=>({snapshotId,username,status,checkedAt})):[];}
export function cleanProgress(v){return {count:Number.isInteger(v?.count)&&v.count>=0&&v.count<BLOCK?v.count:0,nextAt:Number.isFinite(v?.nextAt)&&v.nextAt>=0?v.nextAt:0};}
export function summarize(users,checks,snapshotId){const map=new Map(checks.filter(x=>x.snapshotId===snapshotId).map(x=>[x.username,x.status]));const out={active:0,unavailable:0,notfollowing:0,unknown:0,removed:0,unchecked:0};for(const u of users)out[map.get(u.username)||'unchecked']++;return {map,out};}
export function eligible(users,queue,protectedSet,map){const candidates=new Set(users.map(u=>u.username));return queue.filter(x=>x.status==='pending'&&candidates.has(x.username)&&!protectedSet.has(x.username)&&!['unavailable','removed','notfollowing'].includes(map.get(x.username))).map(x=>x.username);}
// Executed in an isolated world on the profile tab. Conservative exact labels only.
export function profileDom(username, action='inspect'){
 const norm=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
 const visible=e=>!!e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
 const text=e=>norm(e?.innerText||e?.getAttribute('aria-label')||'');
 const body=norm(document.body?.innerText);
 if(location.hostname!=='www.instagram.com')return 'blocked';
 if(/^\/(accounts\/login|challenge|checkpoint|accounts\/suspended)/i.test(location.pathname))return 'blocked';
 if(/tente novamente mais tarde|try again later|we restrict certain activity|restringimos determinadas atividades|action blocked|acao bloqueada|confirme que voce e humano|confirm you're human|something went wrong|algo deu errado/.test(body))return 'blocked';
 if(location.pathname.replace(/\/$/,'').toLowerCase()!=='/'+username)return 'unknown';
 const heads=[...document.querySelectorAll('main header, main section header, header')].filter(visible);
 const head=heads.find(h=>[...h.querySelectorAll('h1,h2,h3,a,span')].some(e=>visible(e)&&text(e)===username));
 const dialogs=[...document.querySelectorAll('[role="dialog"]')].filter(visible);
 const buttons=root=>[...root.querySelectorAll('button,[role="button"]')].filter(e=>visible(e)&&!e.disabled&&e.getAttribute('aria-disabled')!=='true');
 const following=['following','seguindo'], follow=['follow','seguir','follow back','seguir de volta'], unfollow=['unfollow','deixar de seguir'];
 if(!head){if(/sorry, this page isn.t available|esta pagina nao esta disponivel|pagina nao disponivel|user not found|usuario nao encontrado|profile isn.t available|perfil nao esta disponivel/.test(body))return 'unavailable';return 'unknown';}
 if(dialogs.length){const dialog=dialogs.length===1?dialogs[0]:null;if(!dialog)return 'unknown';const targets=buttons(dialog).filter(e=>unfollow.includes(text(e)));if(targets.length===1){if(action==='confirm'){targets[0].click();return 'clicked';}return 'confirm';}return 'unknown';}
 const b=buttons(head),f=b.filter(e=>following.includes(text(e))),n=b.filter(e=>follow.includes(text(e)));
 if(f.length===1&&!n.length){if(action==='open'){f[0].click();return 'clicked';}return 'following';}
 if(n.length===1&&!f.length)return 'notfollowing';
 return 'unknown';
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function execute(tabId,user,action){const result=await chrome.scripting.executeScript({target:{tabId},func:profileDom,args:[user,action]});return result[0]?.result||'unknown';}
export async function visit(tabId,user,alive,remove){
 if(!/^[a-z0-9._]{1,30}$/.test(user))return {status:'unknown',stop:true};
 if(!(await alive()))return {cancelled:true};
 await chrome.tabs.update(tabId,{url:`https://www.instagram.com/${user}/`});
 async function waitFor(allowed,ms=16000){const end=Date.now()+ms;while((await alive())&&Date.now()<end){try{const tab=await chrome.tabs.get(tabId);if(tab.status==='complete'){const x=await execute(tabId,user,'inspect');if(x==='blocked'||allowed.includes(x))return x;}}catch(e){try{await chrome.tabs.get(tabId);}catch{return 'blocked';}}await sleep(750);}return (await alive())?'unknown':'cancelled';}
 const state=await waitFor(['following','notfollowing','unavailable']);
 if(state==='cancelled'||!(await alive()))return {cancelled:true};
 if(state==='blocked')return {status:'unknown',stop:true,reason:'Instagram pediu login, apresentou erro ou restringiu a atividade.'};
 if(state==='unavailable')return {status:'unavailable'};
 if(state==='notfollowing')return {status:'notfollowing'};
 if(state!=='following')return {status:'unknown',stop:remove,reason:'Não foi possível identificar o botão com segurança.'};
 if(!remove)return {status:'active'};
 if(!(await alive()))return {cancelled:true};
 if(await execute(tabId,user,'open')!=='clicked')return {status:'unknown',stop:true,reason:'O botão Seguindo mudou.'};
 const confirmation=await waitFor(['confirm','notfollowing'],10000);
 if(confirmation==='cancelled'||!(await alive()))return {cancelled:true};
 if(confirmation==='confirm'){if(!(await alive()))return {cancelled:true};if(await execute(tabId,user,'confirm')!=='clicked')return {status:'unknown',stop:true,reason:'Confirmação não identificada.'};}
 else if(confirmation!=='notfollowing')return {status:'unknown',stop:true,reason:'Confirmação não identificada; confira o perfil manualmente.'};
 const final=await waitFor(['notfollowing'],12000);
 if(final==='notfollowing')return {status:'removed'};
 if(final==='cancelled')return {cancelled:true};
 return {status:'unknown',stop:true,reason:'Remoção não confirmada pelo Instagram; confira manualmente.'};
}
