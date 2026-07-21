
const defaults={
man:[
{id:"men",time:"08:30",name:"Men — мужской комплекс",details:"Во время или сразу после завтрака. Дозировка по этикетке."},
{id:"creatine",time:"09:00",name:"Креатин",details:"3–5 г ежедневно; после завтрака или тренировки."},
{id:"brain",time:"13:00",name:"Brain",details:"Только после проверки состава; после еды."},
{id:"zinc",time:"19:00",name:"Цинк",details:"Только после проверки суммарного цинка; после еды."},
{id:"magnesium",time:"21:00",name:"Магний + B6",details:"После ужина; проверить суммарные дозировки."},
{id:"htp",time:"22:00",name:"5‑HTP + витамин C",details:"Только после согласования с врачом."}],
woman:[
{id:"women",time:"08:30",name:"Women — женский комплекс",details:"Во время или сразу после завтрака. Дозировка по этикетке."},
{id:"creatine",time:"09:00",name:"Креатин",details:"3–5 г ежедневно; после завтрака или тренировки."},
{id:"brain",time:"13:00",name:"Brain",details:"Только после проверки состава; после еды."},
{id:"zinc",time:"19:00",name:"Цинк",details:"Только после проверки суммарного цинка; после еды."},
{id:"magnesium",time:"21:00",name:"Магний + B6",details:"После ужина; проверить суммарные дозировки."},
{id:"htp",time:"22:00",name:"5‑HTP + витамин C",details:"Только после согласования с врачом."}]
};

const clone=x=>JSON.parse(JSON.stringify(x));
const loadSchedules=()=>{const saved=JSON.parse(localStorage.getItem("vit:schedules")||"null");return saved||clone(defaults)};
let schedules=loadSchedules();
let profile=localStorage.getItem("profile")||"man",day=new Date();day.setHours(12,0,0,0);
const $=s=>document.querySelector(s),key=d=>d.toISOString().slice(0,10),storage=()=>`vit:${profile}:${key(day)}`;
const load=()=>JSON.parse(localStorage.getItem(storage())||"{}"),save=x=>localStorage.setItem(storage(),JSON.stringify(x));
const toast=t=>{const el=$("#toast");el.textContent=t;el.classList.remove("hidden");setTimeout(()=>el.classList.add("hidden"),2200)};

function notificationPermissionGranted(){return "Notification" in window&&Notification.permission==="granted"}
function calendarConfirmed(){return localStorage.getItem(`vit:calendar:${profile}`)==="1"}
function notificationSetupComplete(){return notificationPermissionGranted()&&calendarConfirmed()}
function updateNotificationPanel(){
  const panel=$("#notificationPanel"),status=$("#notifyStatus"),notifyBtn=$("#notify"),confirmBtn=$("#calendarConfirm");
  notifyBtn.classList.toggle("done",notificationPermissionGranted());
  confirmBtn.classList.toggle("done",calendarConfirmed());
  status.textContent=notificationSetupComplete()?"Настроено":"Не настроено";
  status.classList.toggle("ok",notificationSetupComplete());
  if(notificationSetupComplete()&&localStorage.getItem("vit:forceNotifyPanel")!=="1")panel.classList.add("hidden");
  else panel.classList.remove("hidden");
}

function render(){
  schedules=loadSchedules();
  document.querySelectorAll(".profile").forEach(x=>x.classList.toggle("active",x.dataset.profile===profile));
  const data=load(),list=schedules[profile];
  $("#dateLabel").textContent=day.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});
  $("#items").innerHTML=list.map(x=>`<label class="item ${data[x.id]?"done":""}">
    <div class="time">${x.time}</div>
    <div><div class="name">${x.name}</div><div class="details">${x.details}</div></div>
    <input class="check" type="checkbox" data-id="${x.id}" ${data[x.id]?"checked":""}>
  </label>`).join("");
  const n=list.filter(x=>data[x.id]).length;
  $("#progressLabel").textContent=`Выпито ${n} из ${list.length}`;
  $("#bar").style.width=`${n/list.length*100}%`;
  document.querySelectorAll(".check").forEach(c=>c.onchange=e=>{const d=load();d[e.target.dataset.id]=e.target.checked;save(d);render()});
  renderHistory();updateNotificationPanel();
}

function renderHistory(){
  let out="";
  for(let i=6;i>=0;i--){
    const d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);
    const data=JSON.parse(localStorage.getItem(`vit:${profile}:${key(d)}`)||"{}"),list=schedules[profile],n=list.filter(x=>data[x.id]).length;
    out+=`<div class="day ${n===list.length?"complete":""}"><b>${d.toLocaleDateString("ru-RU",{weekday:"short"})}</b><span>${n}/${list.length}</span></div>`;
  }
  $("#history").innerHTML=out;
}


function escapeHTML(s){
  return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}
let editingVitaminId=null;

function openVitaminForm(item=null){
  editingVitaminId=item?.id||null;
  $("#vitaminFormTitle").textContent=item?"Редактировать витамин":"Новый витамин";
  $("#newVitaminName").value=item?.name||"";
  $("#newVitaminTime").value=item?.time||"12:00";
  $("#newVitaminDetails").value=item?.details||"";
  $("#saveVitamin").textContent=item?"Сохранить":"Добавить";
  $("#addVitaminForm").classList.remove("hidden");
  setTimeout(()=>$("#newVitaminName").focus(),50);
}
function closeVitaminForm(){
  editingVitaminId=null;
  $("#addVitaminForm").classList.add("hidden");
  $("#newVitaminName").value="";
  $("#newVitaminTime").value="12:00";
  $("#newVitaminDetails").value="";
}
function vitaminId(name){
  const base=(name||"vitamin").toLowerCase().replace(/[^a-zа-яё0-9]+/gi,"-").replace(/^-|-$/g,"").slice(0,24)||"vitamin";
  return `${base}-${Date.now().toString(36)}`;
}
function addOrUpdateVitamin(){
  const name=$("#newVitaminName").value.trim();
  const time=$("#newVitaminTime").value;
  const details=$("#newVitaminDetails").value.trim();
  if(!name){toast("Введите название витамина");return}
  if(!time){toast("Укажите время приёма");return}
  const wasEditing=Boolean(editingVitaminId);
  if(editingVitaminId){
    const item=schedules[profile].find(x=>x.id===editingVitaminId);
    if(item){item.name=name;item.time=time;item.details=details||"Пользовательская добавка."}
  }else{
    schedules[profile].push({id:vitaminId(name),name,time,details:details||"Пользовательская добавка."});
  }
  schedules[profile].sort((a,b)=>a.time.localeCompare(b.time));
  localStorage.setItem("vit:schedules",JSON.stringify(schedules));
  localStorage.removeItem(`vit:calendar:${profile}`);
  localStorage.setItem("vit:forceNotifyPanel","1");
  closeVitaminForm();
  openSettings();
  toast(wasEditing?"Витамин обновлён":"Витамин добавлен");
}
function editVitamin(id){
  const item=schedules[profile].find(x=>x.id===id);
  if(item)openVitaminForm(item);
}
function deleteVitamin(id){
  const item=schedules[profile].find(x=>x.id===id);
  if(!item)return;
  if(!confirm(`Удалить «${item.name}» из расписания?`))return;
  schedules[profile]=schedules[profile].filter(x=>x.id!==id);
  localStorage.setItem("vit:schedules",JSON.stringify(schedules));
  localStorage.removeItem(`vit:calendar:${profile}`);
  localStorage.setItem("vit:forceNotifyPanel","1");
  openSettings();
  toast("Витамин удалён");
}

function openSettings(){
  $("#settingsTitle").textContent=profile==="man"?"Мужчина":"Женщина";
  $("#timeSettings").innerHTML=schedules[profile].map(x=>`<div class="time-row">
    <div><b>${escapeHTML(x.name)}</b><span>${escapeHTML(x.details||"")}</span></div>
    <input type="time" data-id="${x.id}" value="${x.time}">
    <button class="edit-vitamin" data-edit="${x.id}" aria-label="Редактировать">✎</button>
    <button class="delete-vitamin" data-delete="${x.id}" aria-label="Удалить">×</button>
  </div>`).join("");
  document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>deleteVitamin(b.dataset.delete));
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>editVitamin(b.dataset.edit));
  $("#settingsModal").classList.remove("hidden");
}
function saveTimes(){
  const inputs=[...document.querySelectorAll("#timeSettings input")];
  inputs.forEach(i=>{const item=schedules[profile].find(x=>x.id===i.dataset.id);if(item)item.time=i.value});
  localStorage.setItem("vit:schedules",JSON.stringify(schedules));
  localStorage.removeItem(`vit:calendar:${profile}`);
  $("#settingsModal").classList.add("hidden");
  localStorage.setItem("vit:forceNotifyPanel","1");
  toast("Время сохранено. Обновите календарь.");
  render();
}
function restoreTimes(){
  schedules[profile]=clone(defaults[profile]);
  localStorage.setItem("vit:schedules",JSON.stringify(schedules));
  openSettings();
  toast("Стандартное время восстановлено");
}

function escapeICS(s){return String(s).replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;")}
function makeICS(){
  const now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1);
  const pad=n=>String(n).padStart(2,"0");
  const datePart=`${start.getFullYear()}${pad(start.getMonth()+1)}${pad(start.getDate())}`;
  let out=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Vitamin Tracker//RU","CALSCALE:GREGORIAN"];
  schedules[profile].forEach(x=>{
    const [hh,mm]=x.time.split(":");
    out.push("BEGIN:VEVENT",`UID:${profile}-${x.id}-${Date.now()}@vitamin-tracker`,`DTSTAMP:${datePart}T000000Z`,`DTSTART:${datePart}T${hh}${mm}00`,"RRULE:FREQ=DAILY",`SUMMARY:${escapeICS(x.name)}`,`DESCRIPTION:${escapeICS(x.details)}`,"BEGIN:VALARM","TRIGGER:-PT0M","ACTION:DISPLAY",`DESCRIPTION:${escapeICS(x.name)}`,"END:VALARM","END:VEVENT");
  });
  out.push("END:VCALENDAR");
  return out.join("\r\n");
}
function downloadCalendar(){
  const blob=new Blob([makeICS()],{type:"text/calendar;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`vitamin-schedule-${profile}.ics`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  $("#calendarConfirm").classList.remove("hidden");
  toast("Откройте файл и добавьте события в Календарь");
}

document.querySelectorAll(".profile").forEach(b=>b.onclick=()=>{profile=b.dataset.profile;localStorage.setItem("profile",profile);localStorage.removeItem("vit:forceNotifyPanel");render()});
$("#prev").onclick=()=>{day.setDate(day.getDate()-1);render()};
$("#next").onclick=()=>{day.setDate(day.getDate()+1);render()};
$("#all").onclick=()=>{const d={};schedules[profile].forEach(x=>d[x.id]=true);save(d);render()};
$("#reset").onclick=()=>{localStorage.removeItem(storage());render()};
$("#settingsBtn").onclick=openSettings;
$("#addVitaminBtn").onclick=()=>openVitaminForm();
$("#cancelVitamin").onclick=closeVitaminForm;
$("#saveVitamin").onclick=addOrUpdateVitamin;
$("#closeSettings").onclick=()=>$("#settingsModal").classList.add("hidden");
$("#saveTimes").onclick=saveTimes;
$("#restoreTimes").onclick=restoreTimes;
$("#showNotifyPanel").onclick=()=>{localStorage.setItem("vit:forceNotifyPanel","1");$("#settingsModal").classList.add("hidden");updateNotificationPanel();};
$("#hideNotify").onclick=()=>{$("#notificationPanel").classList.add("hidden");localStorage.removeItem("vit:forceNotifyPanel")};
$("#calendarBtn").onclick=downloadCalendar;
$("#calendarConfirm").onclick=()=>{localStorage.setItem(`vit:calendar:${profile}`,"1");localStorage.removeItem("vit:forceNotifyPanel");toast("Календарь отмечен как добавленный");updateNotificationPanel()};
$("#notify").onclick=async()=>{
  if(!("Notification" in window)){alert("Этот браузер не поддерживает уведомления сайта.");return}
  const p=await Notification.requestPermission();
  if(p==="granted"){new Notification("Уведомления разрешены",{body:"Теперь добавьте расписание в календарь."});toast("Уведомления разрешены")}
  else toast("Разрешение не выдано");
  updateNotificationPanel();
};
$("#settingsModal").onclick=e=>{if(e.target.id==="settingsModal")$("#settingsModal").classList.add("hidden")};
if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("sw.js?v=5", { updateViaCache: "none" });
      await registration.update();
      let reloading = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!reloading) {
          reloading = true;
          window.location.reload();
        }
      });
    } catch (error) {
      console.error("Service Worker error:", error);
    }
  });
}
render();
