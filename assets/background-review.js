// Background review: one explicitly authorized session, no private API or bypass.
import {visit, summarize, eligible, cleanProgress, nextSlot, MINUTE, REST} from './live-review.js';
const DATA='sl:data:v1', JOB='sl:background-review:v1', ALARM='sl:review-next', LOCK='sl:background-data';
const read=async()=> (await chrome.storage.local.get(DATA))[DATA];
const job=async()=> (await chrome.storage.session.get(JOB))[JOB];
const saveJob=async j=>chrome.storage.session.set({[JOB]:j});
const saveData=async d=>chrome.storage.local.set({[DATA]:d});
const lock=fn=>navigator.locks.request(LOCK,fn);
const today=(d,now=new Date())=>d.queue.filter(x=>x.status==='done'&&x.resolvedAt&&new Date(x.resolvedAt).toDateString()===now.toDateString()).length;
function context(d,sid){
 if(!d||d.enc||!Array.isArray(d.snapshots)||!Array.isArray(d.queue)||!Array.isArray(d.protectedList))return null;
 const s=[...d.snapshots].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
 if(!s||s.id!==sid)return null;
 const followers=new Set(s.followers.map(x=>x.username)),users=s.following.filter(x=>!followers.has(x.username));
 return {users,protectedSet:new Set(d.protectedList.map(x=>x.username)),map:summarize(users,d.checks??[],sid).map};
}
function candidates(d,sid){const c=context(d,sid);return c?eligible(c.users,d.queue,c.protectedSet,c.map):[];}
function arm(when){return chrome.alarms.create(ALARM,{when:Math.max(Date.now()+100,when)});}
async function stop(message, id){const j=await job();if(!j||id&&j.id!==id)return;await saveJob({...j,active:false,person:'',inFlight:false,message});await chrome.alarms.clear(ALARM);}
let serial=Promise.resolve();
function enqueue(fn){const result=serial.then(fn);serial=result.catch(()=>{});return result;}
async function start(sid){return navigator.locks.request("sl-review-exclusive",{ifAvailable:true},async exclusive=>{if(!exclusive)throw Error("Já existe uma sessão local em andamento.");return lock(async()=>{
 const old=await job();if(old?.active||old?.inFlight)throw Error('Já existe uma sessão em andamento.');
 const d=await read();if(!context(d,sid))throw Error('Dados bloqueados, criptografados ou análise alterada.');
 if(!candidates(d,sid).length)throw Error('Nenhum perfil elegível na fila.');
 if(today(d)>=d.settings.dailyLimit)throw Error('Limite diário configurado atingido.');
 const tab=await chrome.tabs.create({url:'https://www.instagram.com/',active:false});if(tab.id==null)throw Error('Não foi possível abrir a aba do Instagram.');
 const p=cleanProgress(d.reviewProgress?.remove),j={id:crypto.randomUUID(),sid,tabId:tab.id,active:true,inFlight:false,person:'',seen:[],message:'Sessão em segundo plano iniciada.',nextAt:Math.max(Date.now(),p.nextAt)};
 await saveJob(j);await arm(j.nextAt);return j;
 });});}
async function pause(message='Pausa solicitada. Confira o perfil atual se uma ação já foi enviada.'){
 return lock(async()=>{const j=await job();if(!j?.active)return;await saveJob({...j,active:false,message});if(!j.inFlight)await chrome.alarms.clear(ALARM);});
}
async function tick(){
 let j=await job();if(!j?.active){if(j?.inFlight)await stop('Sessão interrompida; confira o último perfil manualmente.',j.id);return;}
 if(j.inFlight){await stop('Execução anterior interrompida; confira o último perfil antes de iniciar novamente.',j.id);return;}
 if(Date.now()<j.nextAt){await arm(j.nextAt);return;}
 let user,p;
 await lock(async()=>{
  const current=await job();if(!current?.active||current.id!==j.id)return;
  const d=await read();if(!context(d,j.sid)){await stop('Análise alterada ou dados bloqueados. Sessão pausada.',j.id);return;}
  if(today(d)>=d.settings.dailyLimit){await stop('Limite diário configurado atingido. Sessão pausada.',j.id);return;}
  user=candidates(d,j.sid).find(x=>!j.seen.includes(x));if(!user){await stop('Sessão concluída: não há mais perfis elegíveis.',j.id);return;}
  p=nextSlot(cleanProgress(d.reviewProgress?.remove).count,Date.now(),'remove');
  j={...current,inFlight:true,person:user,seen:[...current.seen,user],message:'Verificando @'+user+' antes de deixar de seguir.',nextAt:p.nextAt};
  await saveJob(j);await arm(Date.now()+90000); // watchdog: never retry an uncertain action
  await saveData({...d,reviewProgress:{...d.reviewProgress,remove:p}});
 });
 if(!user)return;
 const guard=async()=>{const cur=await job();if(!cur?.active||cur.id!==j.id)return false;const d=await read();return !!context(d,j.sid)&&today(d)<d.settings.dailyLimit&&candidates(d,j.sid).includes(user);};
 let result;
 try{result=await visit(j.tabId,user,guard,true);}catch(e){result={status:'unknown',stop:true,reason:e?.message||'Falha na aba do Instagram.'};}
 await lock(async()=>{
  const cur=await job();if(!cur||cur.id!==j.id)return;
  const d=await read();if(!context(d,j.sid)){await stop('Dados alterados durante a execução; confira o perfil manualmente.',j.id);return;}
  const when=Date.now(),nextAt=Math.max(p.nextAt,when+(p.count===0?REST:MINUTE));
  const updated={...d,reviewProgress:{...d.reviewProgress,remove:{count:p.count,nextAt}}};
  if(result.status){const record={snapshotId:j.sid,username:user,status:result.status,checkedAt:new Date(when).toISOString()};updated.checks=[...(d.checks??[]).filter(x=>x.snapshotId!==j.sid||x.username!==user),record];if(result.status==='removed')updated.queue=d.queue.map(x=>x.username===user&&x.status==='pending'?{...x,status:'done',resolvedAt:record.checkedAt}:x);}
  await saveData(updated);
  const last=await job();if(!last||last.id!==j.id)return;
  if(!last.active||result.cancelled||result.stop){await stop(result.stop?(result.reason||'Resultado incerto.')+' Sessão pausada.':last.active?'Execução cancelada; confira o perfil manualmente.':last.message,j.id);return;}
  if(today(updated)>=updated.settings.dailyLimit){await stop('Limite diário configurado atingido. Sessão pausada.',j.id);return;}
  if(!candidates(updated,j.sid).some(x=>!j.seen.includes(x))){await stop('Sessão concluída: não há mais perfis elegíveis.',j.id);return;}
  const label={removed:'remoção confirmada',unavailable:'perfil indisponível',notfollowing:'você já não segue este perfil',unknown:'resultado inconclusivo'}[result.status]||'verificação concluída';
  await saveJob({...last,inFlight:false,person:'',nextAt,message:'@'+user+': '+label+'. Aguardando próximo perfil.'});await arm(nextAt);
 });
}
function fail(e){return stop('Sessão interrompida: '+(e?.message||'erro inesperado')+'. Confira o último perfil manualmente.');}
chrome.alarms.onAlarm.addListener(a=>{if(a.name===ALARM)enqueue(tick).catch(fail);});
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(s.id!==chrome.runtime.id||!s.url?.startsWith(chrome.runtime.getURL('index.html')))return;
 if(m?.type==='SL_BG_START'){enqueue(()=>start(m.sid)).then(j=>reply({ok:true,job:j}),e=>reply({ok:false,error:e.message}));return true;}
 if(m?.type==='SL_BG_PAUSE'){pause().then(()=>reply({ok:true}),e=>reply({ok:false,error:e.message}));return true;}
});
chrome.tabs.onRemoved.addListener(id=>{job().then(j=>{if(j?.active&&j.tabId===id)return pause('A aba do Instagram foi fechada. Sessão pausada.');}).catch(fail);});
// Browser restart clears session storage; stale alarms cannot authorize new actions.
chrome.runtime.onStartup.addListener(()=>{chrome.alarms.clear(ALARM);});
