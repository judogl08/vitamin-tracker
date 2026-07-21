
const schedules={
man:[
{id:"men",time:"08:30",name:"Men — мужской комплекс",details:"Во время или сразу после завтрака. Дозировка по этикетке."},
{id:"creatine",time:"09:00",name:"Креатин",details:"3–5 г ежедневно; после завтрака или тренировки."},
{id:"brain",time:"13:00",name:"Brain",details:"Только после проверки состава; после еды."},
{id:"zinc",time:"19:00",name:"Цинк",details:"Только после проверки суммарного цинка; после еды."},
{id:"magnesium",time:"21:00",name:"Магний + B6",details:"После ужина; проверить суммарные дозировки."},
{id:"htp",time:"22:00",name:"5‑HTP + витамин C",details:"Только после согласования с врачом."}],
woman:[
{id:"women",time:"08:30",name:"Women — женский комплекс",details:"Во время или сразу после завтрака. Дозировка по этикетке."},
{id:"brain",time:"13:00",name:"Brain",details:"Только после проверки состава; после еды."},
{id:"zinc",time:"19:00",name:"Цинк",details:"Только после проверки суммарного цинка; после еды."},
{id:"magnesium",time:"21:00",name:"Магний + B6",details:"После ужина; проверить суммарные дозировки."},
{id:"htp",time:"22:00",name:"5‑HTP + витамин C",details:"Только после согласования с врачом."}]};
let profile=localStorage.getItem("profile")||"man",day=new Date();day.setHours(12,0,0,0);
const $=s=>document.querySelector(s), key=d=>d.toISOString().slice(0,10), storage=()=>`vit:${profile}:${key(day)}`;
function load(){return JSON.parse(localStorage.getItem(storage())||"{}")} function save(x){localStorage.setItem(storage(),JSON.stringify(x))}
function render(){
document.querySelectorAll(".profile").forEach(x=>x.classList.toggle("active",x.dataset.profile===profile));
const data=load(),list=schedules[profile];$("#dateLabel").textContent=day.toLocaleDateString("ru-RU",{weekday:"long",day:"numeric",month:"long"});
$("#items").innerHTML=list.map(x=>`<label class="item ${data[x.id]?"done":""}"><div class="time">${x.time}</div><div><div class="name">${x.name}</div><div class="details">${x.details}</div></div><input class="check" type="checkbox" data-id="${x.id}" ${data[x.id]?"checked":""}></label>`).join("");
let n=list.filter(x=>data[x.id]).length;$("#progressLabel").textContent=`Выпито ${n} из ${list.length}`;$("#bar").style.width=`${n/list.length*100}%`;
document.querySelectorAll(".check").forEach(c=>c.onchange=e=>{let d=load();d[e.target.dataset.id]=e.target.checked;save(d);render()});history();
}
function history(){let out="";for(let i=6;i>=0;i--){let d=new Date();d.setHours(12,0,0,0);d.setDate(d.getDate()-i);let data=JSON.parse(localStorage.getItem(`vit:${profile}:${key(d)}`)||"{}"),list=schedules[profile],n=list.filter(x=>data[x.id]).length;out+=`<div class="day ${n===list.length?"complete":""}"><b>${d.toLocaleDateString("ru-RU",{weekday:"short"})}</b><span>${n}/${list.length}</span></div>`}$("#history").innerHTML=out}
document.querySelectorAll(".profile").forEach(b=>b.onclick=()=>{profile=b.dataset.profile;localStorage.setItem("profile",profile);render()});
$("#prev").onclick=()=>{day.setDate(day.getDate()-1);render()};$("#next").onclick=()=>{day.setDate(day.getDate()+1);render()};
$("#all").onclick=()=>{let d={};schedules[profile].forEach(x=>d[x.id]=true);save(d);render()};$("#reset").onclick=()=>{localStorage.removeItem(storage());render()};
$("#notify").onclick=async()=>{if(!("Notification"in window)){alert("Уведомления не поддерживаются этим браузером.");return}let p=await Notification.requestPermission();if(p==="granted")new Notification("Уведомления включены",{body:"Для расписания импортируйте календарь."})};
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");render();
