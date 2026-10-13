"use strict";
const $ = s => document.querySelector(s);
const STORE_KEY = "mlbb_member_monitor_v1";
const state = { members: [], events: [], dailyRecords: [], attendanceEvent: null };
const today = () => new Date().toISOString().slice(0,10);
function loadStore(){
  try { const x=JSON.parse(localStorage.getItem(STORE_KEY)||"{}"); state.members=Array.isArray(x.members)?x.members:[]; state.events=Array.isArray(x.events)?x.events:[]; state.dailyRecords=Array.isArray(x.dailyRecords)?x.dailyRecords:[]; }
  catch(e){ state.members=[]; state.events=[]; toast("Saved data could not be read. Starting with an empty workspace."); }
}
function saveStore(){ try { localStorage.setItem(STORE_KEY,JSON.stringify({members:state.members,events:state.events,dailyRecords:state.dailyRecords})); } catch(e){ toast("Storage is full or unavailable. Export or remove some data."); } }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(msg){const el=$("#toast"); if(!el)return; el.textContent=msg;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2600);}
function dateLabel(d){return d?new Date(d+"T00:00:00").toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"—";}
function latestFor(memberId){
 const records=state.events.flatMap(e=>(e.attendance||[]).filter(a=>a.memberId===memberId&&["Present","Excused"].includes(a.status)).map(a=>e.event_date)).sort();
 return records.length?records[records.length-1]:null;
}
function activityFor(member){
 const last=latestFor(member.id); if(!last)return {label:"No activity yet",days:null,last:null};
 const days=Math.max(0,Math.floor((new Date(today()+"T00:00:00")-new Date(last+"T00:00:00"))/86400000));
 return {label:days<=30?"Active":days<=45?"At Risk":"Inactive",days,last};
}
function badge(label){const cls=label==="Active"?"active":label==="At Risk"?"risk":label==="Inactive"?"inactive":"none";return `<span class="status ${cls}">${esc(label)}</span>`;}
function enriched(){return state.members.map(m=>({...m,...activityFor(m)}));}
function renderDashboard(){
 const members=enriched(), active=members.filter(m=>m.label==="Active").length, risk=members.filter(m=>m.label==="At Risk").length, inactive=members.length-active-risk;
 $("#totalCount").textContent=members.length;$("#activeCount").textContent=active;$("#riskCount").textContent=risk;$("#inactiveCount").textContent=inactive;
 const ordered=[...members].sort((a,b)=>(b.days??99999)-(a.days??99999)).slice(0,7);
 $("#activityRows").innerHTML=ordered.length?ordered.map(m=>`<tr><td><span class="player">${esc(m.ign)}</span><span class="subline">${esc(m.role||"No role assigned")}</span></td><td>${dateLabel(m.last)}</td><td>${badge(m.label)}</td></tr>`).join(""):`<tr><td colspan="3" class="muted">No members yet. Add your roster to begin.</td></tr>`;
 const events=[...state.events].sort((a,b)=>b.event_date.localeCompare(a.event_date)).slice(0,4);
 $("#recentEvents").innerHTML=events.length?events.map(e=>`<div class="event-mini"><b>${esc(e.title)}</b><small>${esc(e.event_type)} · ${dateLabel(e.event_date)}</small></div>`).join(""):`<p class="muted">No events recorded yet.</p>`;
}
function renderMembers(){
 const q=($("#memberSearch")?.value||"").toLowerCase(), f=$("#memberFilter")?.value||"";
 const rows=enriched().filter(m=>[m.ign,m.real_name,m.role].join(" ").toLowerCase().includes(q)).filter(m=>!f||m.label===f);
 $("#memberRows").innerHTML=rows.length?rows.map(m=>`<tr><td><span class="player">${esc(m.ign)}</span><span class="subline">${esc(m.real_name||"")}</span></td><td>${esc(m.role||"—")}</td><td>${dateLabel(m.last)}</td><td>${badge(m.label)}</td><td><span class="status ${m.status==="Active"?"active":m.status==="On Break"?"break":"inactive"}">${esc(m.status)}</span></td><td><button class="action-btn" data-edit="${m.id}">Edit</button> <button class="action-btn" data-delete-member="${m.id}">Delete</button></td></tr>`).join(""):`<tr><td colspan="6" class="muted">No matching members.</td></tr>`;
}
function renderEvents(){
 const events=[...state.events].sort((a,b)=>b.event_date.localeCompare(a.event_date));
 $("#eventCards").innerHTML=events.length?events.map(e=>`<article class="panel event-card"><div class="panel-head"><div><p class="eyebrow">${esc(e.event_type)}</p><h3>${esc(e.title)}</h3><small>${dateLabel(e.event_date)}</small></div><button class="action-btn" data-delete-event="${e.id}">Delete</button></div><p class="muted">${esc(e.notes||"No notes")}</p><p class="muted">${(e.attendance||[]).length} attendance records</p><button class="primary" data-attendance="${e.id}">Record attendance</button></article>`).join(""):`<div class="panel"><p class="muted">No events yet. Create your first team event.</p></div>`;
}

function renderDaily(){
 const date=$("#dailyDate").value||today();
 const record=state.dailyRecords.find(r=>r.date===date);
 const statuses=record?.statuses||{};
 $("#dailyRows").innerHTML=state.members.length?state.members.map(m=>`<tr><td><span class="player">${esc(m.ign)}</span></td><td>${esc(m.role||"—")}</td><td><select class="daily-status" data-daily-member="${m.id}"><option value="">Not recorded</option><option value="Present" ${statuses[m.id]==="Present"?"selected":""}>Present</option><option value="Absent" ${statuses[m.id]==="Absent"?"selected":""}>Absent</option><option value="Excused" ${statuses[m.id]==="Excused"?"selected":""}>Excused</option></select></td></tr>`).join(""):`<tr><td colspan="3" class="muted">Add members to your roster first.</td></tr>`;
 const history=[...state.dailyRecords].sort((a,b)=>b.date.localeCompare(a.date));
 $("#dailyHistory").innerHTML=history.length?history.map(r=>{const vals=Object.values(r.statuses||{});const p=vals.filter(v=>v==="Present").length,a=vals.filter(v=>v==="Absent").length,x=vals.filter(v=>v==="Excused").length;return `<div class="event-mini"><b>${dateLabel(r.date)}</b><small>Present: ${p} · Absent: ${a} · Excused: ${x}</small></div>`}).join(""):`<p class="muted">No daily attendance saved yet.</p>`;
}
function render(){renderDashboard();renderMembers();renderEvents();renderDaily();}
function showPage(page){
 document.querySelectorAll(".page").forEach(p=>p.classList.add("hidden"));
 $("#"+page+"Page").classList.remove("hidden");
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("selected",b.dataset.page===page));
 $("#pageTitle").textContent=page==="events"?"Meetings & Events":page==="daily"?"Daily Attendance":page[0].toUpperCase()+page.slice(1); if(page==="daily")renderDaily();
}
document.querySelectorAll(".nav-btn").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.go)));
$("#memberSearch").addEventListener("input",renderMembers);$("#memberFilter").addEventListener("change",renderMembers);
$("#addMemberBtn").addEventListener("click",()=>{ $("#memberForm").reset();$("#memberForm [name=id]").value="";$("#memberDialogTitle").textContent="Add member";$("#memberDialog").showModal();});
$("#memberForm").addEventListener("submit",e=>{
 e.preventDefault();const f=new FormData(e.currentTarget),id=f.get("id")||uid();
 const old=state.members.find(m=>m.id===id);
 const item={id,ign:f.get("ign").trim(),real_name:f.get("real_name").trim(),role:f.get("role"),status:f.get("status"),notes:f.get("notes").trim(),created:old?.created||today()};
 if(!item.ign)return toast("Please enter an in-game name.");
 const i=state.members.findIndex(m=>m.id===id);if(i>=0)state.members[i]=item;else state.members.push(item);
 saveStore();render();$("#memberDialog").close();toast("Member saved.");
});
$("#memberRows").addEventListener("click",e=>{
 const edit=e.target.closest("[data-edit]")?.dataset.edit, del=e.target.closest("[data-delete-member]")?.dataset.deleteMember;
 if(edit){const m=state.members.find(x=>x.id===edit);if(!m)return;const f=$("#memberForm");f.reset();for(const k of ["id","ign","real_name","role","status","notes"])f.elements[k].value=m[k]??"";$("#memberDialogTitle").textContent="Edit member";$("#memberDialog").showModal();}
 if(del&&confirm("Delete this member and their attendance records?")){state.members=state.members.filter(m=>m.id!==del);state.events.forEach(e=>e.attendance=(e.attendance||[]).filter(a=>a.memberId!==del));saveStore();render();toast("Member deleted.");}
});
$("#addEventBtn").addEventListener("click",()=>{$("#eventForm").reset();$("#eventForm").elements.event_date.value=today();$("#eventDialog").showModal();});
$("#eventForm").addEventListener("submit",e=>{
 e.preventDefault();const f=new FormData(e.currentTarget);state.events.push({id:uid(),title:f.get("title").trim(),event_date:f.get("event_date"),event_type:f.get("event_type"),notes:f.get("notes").trim(),attendance:[]});
 saveStore();render();$("#eventDialog").close();toast("Event created.");
});
$("#eventCards").addEventListener("click",e=>{
 const del=e.target.closest("[data-delete-event]")?.dataset.deleteEvent, att=e.target.closest("[data-attendance]")?.dataset.attendance;
 if(del&&confirm("Delete this event and its attendance records?")){state.events=state.events.filter(x=>x.id!==del);saveStore();render();toast("Event deleted.");}
 if(att){const ev=state.events.find(x=>x.id===att);if(!ev)return;if(!state.members.length)return toast("Add members before recording attendance.");state.attendanceEvent=att;$("#attendanceTitle").textContent=ev.title;$("#attendanceList").innerHTML=state.members.map(m=>{const old=(ev.attendance||[]).find(a=>a.memberId===m.id);return `<label class="attendance-row"><span>${esc(m.ign)} <small>${esc(m.role||"")}</small></span><select data-att-member="${m.id}"><option ${!old?"selected":""} value="">Not recorded</option><option ${old?.status==="Present"?"selected":""}>Present</option><option ${old?.status==="Absent"?"selected":""}>Absent</option><option ${old?.status==="Excused"?"selected":""}>Excused</option></select></label>`}).join("");$("#attendanceDialog").showModal();}
});
$("#attendanceForm").addEventListener("submit",e=>{
 e.preventDefault();const ev=state.events.find(x=>x.id===state.attendanceEvent);if(!ev)return;
 ev.attendance=Array.from($("#attendanceList").querySelectorAll("[data-att-member]")).map(s=>({memberId:s.dataset.attMember,status:s.value})).filter(a=>a.status);
 saveStore();render();$("#attendanceDialog").close();toast("Attendance saved.");
});
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>$("#"+b.dataset.close).close()));

$("#dailyDate").value=today();
$("#dailyDate").addEventListener("change",renderDaily);
$("#allPresentBtn").addEventListener("click",()=>{document.querySelectorAll(".daily-status").forEach(s=>s.value="Present");});
$("#allAbsentBtn").addEventListener("click",()=>{document.querySelectorAll(".daily-status").forEach(s=>s.value="Absent");});
$("#saveDailyBtn").addEventListener("click",()=>{
 const date=$("#dailyDate").value;if(!date)return toast("Choose an attendance date first.");
 const statuses={};document.querySelectorAll(".daily-status").forEach(s=>{if(s.value)statuses[s.dataset.dailyMember]=s.value;});
 const i=state.dailyRecords.findIndex(r=>r.date===date);const record={date,statuses};
 if(i>=0)state.dailyRecords[i]=record;else state.dailyRecords.push(record);
 saveStore();renderDaily();toast("Daily attendance saved.");
});

// Export/import lets you keep a backup when changing phones or browsers.
const exportBtn=document.createElement("button");exportBtn.className="secondary";exportBtn.textContent="Export backup";exportBtn.style.margin="12px 0";exportBtn.addEventListener("click",()=>{const blob=new Blob([JSON.stringify({members:state.members,events:state.events},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="mlbb-team-backup.json";a.click();URL.revokeObjectURL(a.href);});
const importInput=document.createElement("input");importInput.type="file";importInput.accept="application/json";importInput.hidden=true;importInput.addEventListener("change",async()=>{const file=importInput.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.members)||!Array.isArray(data.events))throw Error();if(!confirm("Replace current data with this backup?"))return;state.members=data.members;state.events=data.events;state.dailyRecords=Array.isArray(data.dailyRecords)?data.dailyRecords:[];saveStore();render();toast("Backup restored.");}catch{toast("Invalid backup file.");}importInput.value="";});
const side=$("#appView .side-bottom");side?.append(exportBtn);const importBtn=document.createElement("button");importBtn.className="text-btn";importBtn.textContent="Import backup";importBtn.addEventListener("click",()=>importInput.click());side?.append(importBtn);document.body.append(importInput);
loadStore();render();showPage("dashboard");
