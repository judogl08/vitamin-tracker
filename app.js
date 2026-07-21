'use strict';

const APP_VERSION = 7;
const PROFILE_NAMES = { man: 'Мужчина', woman: 'Женщина' };
const PROFILE_LABELS = { man: 'Мужской профиль', woman: 'Женский профиль' };
const DEFAULT_COLORS = { man: '#e98a3a', woman: '#d85c91' };
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const clone = value => JSON.parse(JSON.stringify(value));
const todayDate = () => { const d = new Date(); d.setHours(12,0,0,0); return d; };
const dateKey = date => {
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,'0');
  const d = String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
};
const parseDate = value => { const [y,m,d] = value.split('-').map(Number); const x = new Date(y,m-1,d); x.setHours(12,0,0,0); return x; };
const addDays = (date, count) => { const d = new Date(date); d.setDate(d.getDate()+count); return d; };
const diffDays = (a,b) => Math.floor((a-b)/86400000);
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
const roundStock = n => Math.round((Number(n)+Number.EPSILON)*100)/100;
const isNumber = value => value !== '' && value !== null && Number.isFinite(Number(value));

const defaultItems = {
  man: [
    {id:'men',time:'08:30',name:'Men — мужской комплекс',details:'Во время или сразу после завтрака. Дозировка по этикетке.',unit:'капс.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:90,paused:false}},
    {id:'creatine',time:'09:00',name:'Креатин',details:'После завтрака или тренировки. Количество задайте по своей схеме.',unit:'г',stock:null,dose:5,low:50,buyDate:'',course:{enabled:false,start:'',days:90,paused:false}},
    {id:'brain',time:'13:00',name:'Brain',details:'После еды; проверьте состав и сочетание с комплексом.',unit:'капс.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:30,paused:false}},
    {id:'zinc',time:'19:00',name:'Цинк',details:'Проверьте суммарный цинк во всех добавках.',unit:'табл.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:30,paused:false}},
    {id:'magnesium',time:'21:00',name:'Магний + B6',details:'После ужина; учитывайте суммарные дозировки.',unit:'табл.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:30,paused:false}},
    {id:'htp',time:'22:00',name:'5‑HTP + витамин C',details:'Только после согласования с врачом при наличии лекарств.',unit:'капс.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:30,paused:false}}
  ],
  woman: [
    {id:'women',time:'08:30',name:'Women — женский комплекс',details:'Во время или сразу после завтрака. Дозировка по этикетке.',unit:'капс.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:90,paused:false}},
    {id:'creatine',time:'09:00',name:'Креатин',details:'После завтрака или тренировки. Количество задайте по своей схеме.',unit:'г',stock:null,dose:5,low:50,buyDate:'',course:{enabled:false,start:'',days:90,paused:false}},
    {id:'brain',time:'13:00',name:'Brain',details:'После еды; проверьте состав и сочетание с комплексом.',unit:'капс.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:30,paused:false}},
    {id:'zinc',time:'19:00',name:'Цинк',details:'Проверьте суммарный цинк во всех добавках.',unit:'табл.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:30,paused:false}},
    {id:'magnesium',time:'21:00',name:'Магний + B6',details:'После ужина; учитывайте суммарные дозировки.',unit:'табл.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:30,paused:false}},
    {id:'htp',time:'22:00',name:'5‑HTP + витамин C',details:'Только после согласования с врачом при наличии лекарств.',unit:'капс.',stock:null,dose:1,low:7,buyDate:'',course:{enabled:false,start:'',days:30,paused:false}}
  ]
};

let profile = localStorage.getItem('vit:profile') || localStorage.getItem('profile') || 'man';
let currentDay = todayDate();
const urlParams=new URLSearchParams(location.search);
let currentView = urlParams.get('view') || localStorage.getItem('vit:view') || 'today';
if(!['today','courses','journal','stock','settings'].includes(currentView)) currentView='today';
let editingId = null;
let unlocked = false;

function migrateItem(item) {
  const legacy = clone(item);
  legacy.unit = legacy.unit || (legacy.id === 'creatine' ? 'г' : 'шт.');
  legacy.stock = isNumber(legacy.stock) ? Number(legacy.stock) : null;
  legacy.dose = isNumber(legacy.dose) ? Number(legacy.dose) : (legacy.id === 'creatine' ? 5 : 1);
  legacy.low = isNumber(legacy.low) ? Number(legacy.low) : (legacy.id === 'creatine' ? 50 : 7);
  legacy.buyDate = legacy.buyDate || '';
  legacy.course = Object.assign({enabled:false,start:'',days:90,paused:false}, legacy.course || {});
  return legacy;
}

function loadItems() {
  const raw = localStorage.getItem('vit:items') || localStorage.getItem('vit:schedules');
  let data;
  try { data = raw ? JSON.parse(raw) : clone(defaultItems); } catch { data = clone(defaultItems); }
  data.man = (data.man || clone(defaultItems.man)).map(migrateItem);
  data.woman = (data.woman || clone(defaultItems.woman)).map(migrateItem);
  return data;
}
let items = loadItems();
function saveItems() { localStorage.setItem('vit:items', JSON.stringify(items)); localStorage.setItem('vit:schedules', JSON.stringify(items)); }

if (!localStorage.getItem('vit:installedAt')) localStorage.setItem('vit:installedAt', dateKey(todayDate()));

function dayStorageKey(p, date) { return `vit:${p}:${dateKey(date)}`; }
function loadDay(p=profile, date=currentDay) {
  try { return JSON.parse(localStorage.getItem(dayStorageKey(p,date)) || '{}'); } catch { return {}; }
}
function saveDay(data, p=profile, date=currentDay) { localStorage.setItem(dayStorageKey(p,date), JSON.stringify(data)); }
function isTaken(data,id) { return data[id] === true || data[id]?.taken === true; }

function courseEnd(item) {
  if (!item.course?.enabled || !item.course.start) return null;
  return addDays(parseDate(item.course.start), Math.max(1,Number(item.course.days)||1)-1);
}
function isScheduled(item, date) {
  if (!item.course?.enabled) return true;
  if (!item.course.start) return true;
  const start = parseDate(item.course.start), end = courseEnd(item);
  if (date < start || date > end) return false;
  if (item.course.paused && date >= todayDate()) return false;
  return true;
}
function scheduledItems(p=profile,date=currentDay) { return items[p].filter(item => isScheduled(item,date)).sort((a,b)=>a.time.localeCompare(b.time)); }
function courseProgress(item) {
  if (!item.course.enabled || !item.course.start) return null;
  const start = parseDate(item.course.start), end = courseEnd(item), today=todayDate();
  const total = Math.max(1,Number(item.course.days)||1);
  const elapsed = Math.min(total,Math.max(0,diffDays(today,start)+1));
  return {start,end,total,elapsed,percent:Math.round(elapsed/total*100),remaining:Math.max(0,total-elapsed)};
}
function stockText(item) {
  if (!isNumber(item.stock)) return 'остаток не задан';
  return `${roundStock(item.stock)} ${item.unit || 'шт.'}`;
}
function isLowStock(item) { return isNumber(item.stock) && Number(item.stock) <= Number(item.low || 0); }

function setTaken(item, date, taken) {
  const data = loadDay(profile,date);
  const previous = isTaken(data,item.id);
  if (previous === taken) return;
  data[item.id] = taken;
  saveDay(data,profile,date);

  const txKey = `vit:stocktx:${profile}:${dateKey(date)}:${item.id}`;
  const adjusted = localStorage.getItem(txKey) === '1';
  if (taken && !adjusted && isNumber(item.stock) && date <= todayDate()) {
    item.stock = Math.max(0, roundStock(Number(item.stock)-Number(item.dose||1)));
    localStorage.setItem(txKey,'1');
  } else if (!taken && adjusted && isNumber(item.stock)) {
    item.stock = roundStock(Number(item.stock)+Number(item.dose||1));
    localStorage.removeItem(txKey);
  }
  saveItems();
  if (taken && isLowStock(item)) notifyLowStock(item);
}

function notifyLowStock(item) {
  const alertKey = `vit:lowalert:${profile}:${item.id}:${dateKey(todayDate())}`;
  if (localStorage.getItem(alertKey)) return;
  localStorage.setItem(alertKey,'1');
  toast(`Заканчивается: ${item.name}. Остаток ${stockText(item)}`);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Пора купить добавку', {body:`${item.name}: осталось ${stockText(item)}`, icon:'app-icon-192-v7.png'}); } catch {}
  }
}

function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.remove('hidden');
  clearTimeout(toast.timer); toast.timer = setTimeout(()=>el.classList.add('hidden'),2600);
}

function profileAccent(p=profile) { return localStorage.getItem(`vit:accent:${p}`) || DEFAULT_COLORS[p]; }
function applyProfileTheme() {
  document.body.dataset.profile = profile;
  document.documentElement.style.setProperty('--accent', profileAccent(profile));
  $('#manAccent').value = profileAccent('man');
  $('#womanAccent').value = profileAccent('woman');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', profile === 'man' ? '#1f3349' : '#5b315d');
}
function applyTheme() {
  const theme = localStorage.getItem('vit:theme') || 'system';
  document.body.dataset.theme = theme;
  $$('#themeSelector button').forEach(b=>b.classList.toggle('active',b.dataset.themeValue===theme));
}

function render() {
  items = loadItems(); applyProfileTheme(); applyTheme();
  $$('.profile').forEach(btn=>btn.classList.toggle('active',btn.dataset.profile===profile));
  showView(currentView,false);
  renderToday(); renderCourses(); renderJournal(); renderStock(); renderSettings();
}

function renderToday() {
  const list = scheduledItems(), data = loadDay();
  const completed = list.filter(item=>isTaken(data,item.id)).length;
  const percent = list.length ? Math.round(completed/list.length*100) : 100;
  $('#heroProfile').textContent = PROFILE_LABELS[profile];
  $('#heroGreeting').textContent = dateKey(currentDay)===dateKey(todayDate()) ? 'Сегодня' : 'Выбранный день';
  $('#dateLabel').textContent = currentDay.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
  $('#progressLabel').textContent = `Принято ${completed} из ${list.length}`;
  $('#heroPercent').textContent = `${percent}%`;
  $('.hero-ring').style.setProperty('--progress',`${percent}%`);
  $('#bar').style.width = `${percent}%`;

  $('#items').innerHTML = list.length ? list.map(item=>{
    const taken = isTaken(data,item.id), progress=courseProgress(item), low=isLowStock(item);
    return `<article class="vitamin-item ${taken?'done':''}">
      <div class="time">${escapeHTML(item.time)}</div>
      <div>
        <div class="name">${escapeHTML(item.name)}</div>
        <div class="details">${escapeHTML(item.details||'')}</div>
        <div class="badges">
          ${item.course.enabled?`<span class="badge course">Курс ${progress?`${progress.elapsed}/${progress.total} дн.`:'настроен'}</span>`:''}
          ${isNumber(item.stock)?`<span class="badge ${low?'low':''}">Остаток ${escapeHTML(stockText(item))}</span>`:'<span class="badge">Остаток не задан</span>'}
        </div>
      </div>
      <div class="item-actions"><button class="edit-small" data-edit="${item.id}" aria-label="Редактировать">✎</button><input class="check" type="checkbox" data-check="${item.id}" ${taken?'checked':''}></div>
    </article>`;
  }).join('') : `<section class="panel"><h2>На этот день приёмов нет</h2><p>Проверьте даты курсов или снимите паузу.</p></section>`;
  $$('[data-check]').forEach(input=>input.onchange=()=>{const item=items[profile].find(x=>x.id===input.dataset.check); if(item)setTaken(item,currentDay,input.checked); render();});
  $$('[data-edit]').forEach(btn=>btn.onclick=()=>openVitaminModal(btn.dataset.edit));
  renderLowStockPanel(); renderHistory(); updateNotificationPanel(); renderWidgetPreview();
}

function renderLowStockPanel() {
  const low = items[profile].filter(isLowStock);
  $('#lowStockPanel').classList.toggle('hidden',!low.length);
  $('#lowStockToday').innerHTML = low.map(item=>`<div class="alert-row"><b>${escapeHTML(item.name)}</b><span>${escapeHTML(stockText(item))}</span></div>`).join('');
}

function renderHistory() {
  let html='';
  for(let i=6;i>=0;i--){
    const d=addDays(todayDate(),-i), list=scheduledItems(profile,d), data=loadDay(profile,d), n=list.filter(x=>isTaken(data,x.id)).length;
    const cls=list.length&&n===list.length?'complete':n>0?'partial':'';
    html+=`<div class="day-cell ${cls}"><b>${d.toLocaleDateString('ru-RU',{weekday:'short'})}</b><span>${n}/${list.length}</span></div>`;
  }
  $('#history').innerHTML=html;
}

function renderCourses() {
  const list=items[profile].sort((a,b)=>a.time.localeCompare(b.time));
  $('#coursesList').innerHTML=list.map(item=>{
    const p=courseProgress(item);
    if(!item.course.enabled) return `<article class="course-card"><div class="course-top"><div><h3>${escapeHTML(item.name)}</h3><div class="course-meta">Постоянное расписание · ${escapeHTML(item.time)}</div></div><span class="status-pill">Без срока</span></div><div class="course-actions"><button data-course-edit="${item.id}">Настроить курс</button></div></article>`;
    const status=item.course.paused?'Пауза':(p&&todayDate()>p.end?'Завершён':(p&&todayDate()<p.start?'Ожидает':'Активен'));
    return `<article class="course-card"><div class="course-top"><div><h3>${escapeHTML(item.name)}</h3><div class="course-meta">${p.start.toLocaleDateString('ru-RU')} — ${p.end.toLocaleDateString('ru-RU')} · ${p.total} дней</div></div><span class="status-pill ${status==='Активен'?'ok':''}">${status}</span></div><div class="mini-progress"><i style="width:${p.percent}%"></i></div><div class="course-meta">Пройдено ${p.elapsed} дней · осталось ${p.remaining}</div><div class="course-actions"><button data-course-pause="${item.id}">${item.course.paused?'Продолжить':'Пауза'}</button><button data-course-edit="${item.id}">Изменить</button></div></article>`;
  }).join('');
  $$('[data-course-edit]').forEach(b=>b.onclick=()=>openVitaminModal(b.dataset.courseEdit));
  $$('[data-course-pause]').forEach(b=>b.onclick=()=>{const item=items[profile].find(x=>x.id===b.dataset.coursePause); item.course.paused=!item.course.paused; saveItems(); render();});
}

function journalData(days=30) {
  const installed=parseDate(localStorage.getItem('vit:installedAt')||dateKey(todayDate()));
  const result=[];
  for(let i=1;i<=days;i++){
    const d=addDays(todayDate(),-i); if(d<installed) break;
    const list=scheduledItems(profile,d); if(!list.length) continue;
    const data=loadDay(profile,d), taken=list.filter(x=>isTaken(data,x.id)), missed=list.filter(x=>!isTaken(data,x.id));
    result.push({date:d,list,taken,missed,status:missed.length===0?'complete':taken.length?'partial':'missed'});
  }
  return result;
}
function renderJournal() {
  const rows=journalData(30), complete=rows.filter(x=>x.status==='complete').length, partial=rows.filter(x=>x.status==='partial').length, missed=rows.filter(x=>x.status==='missed').length;
  $('#journalStats').innerHTML=`<div class="stat-card"><strong>${complete}</strong><span>без пропусков</span></div><div class="stat-card"><strong>${partial}</strong><span>частично</span></div><div class="stat-card"><strong>${missed}</strong><span>пропущено</span></div>`;
  $('#missedJournal').innerHTML=rows.length?rows.map(row=>`<article class="journal-card ${row.status}"><div class="journal-top"><div><h3>${row.date.toLocaleDateString('ru-RU',{day:'numeric',month:'long',weekday:'short'})}</h3><div class="course-meta">Принято ${row.taken.length} из ${row.list.length}</div></div><span class="status-pill ${row.status==='complete'?'ok':''}">${row.status==='complete'?'Выполнено':row.status==='partial'?'Частично':'Пропуск'}</span></div>${row.missed.length?`<ul class="missed-names">${row.missed.map(x=>`<li>${escapeHTML(x.name)} · ${escapeHTML(x.time)}</li>`).join('')}</ul>`:''}</article>`).join(''):`<section class="panel"><h2>Журнал пока пуст</h2><p>Он начнёт формироваться со следующего дня после установки.</p></section>`;
}

function renderStock() {
  const list=items[profile].sort((a,b)=>a.name.localeCompare(b.name,'ru'));
  const shopping=list.filter(isLowStock);
  $('#shoppingPanel').classList.toggle('hidden',!shopping.length);
  $('#shoppingList').innerHTML=shopping.map(item=>`<div class="alert-row"><b>${escapeHTML(item.name)}</b><span>${escapeHTML(stockText(item))}</span></div>`).join('');
  $('#stockList').innerHTML=list.map(item=>`<article class="stock-card"><div class="stock-top"><div><h3>${escapeHTML(item.name)}</h3><div class="stock-meta">Расход: ${escapeHTML(String(item.dose||1))} ${escapeHTML(item.unit||'шт.')} за приём · купить при ≤ ${escapeHTML(String(item.low||0))}</div></div><div class="stock-number ${isLowStock(item)?'stock-low':!isNumber(item.stock)?'stock-none':''}">${isNumber(item.stock)?escapeHTML(String(roundStock(item.stock))):'—'}<small> ${escapeHTML(item.unit||'')}</small></div></div><div class="stock-actions"><button data-stock-minus="${item.id}">− расход</button><button data-stock-plus="${item.id}">＋ пополнить</button><button data-stock-edit="${item.id}">Настроить</button>${isLowStock(item)?`<button data-buy-reminder="${item.id}">Напомнить купить</button>`:''}</div></article>`).join('');
  $$('[data-stock-edit]').forEach(b=>b.onclick=()=>openVitaminModal(b.dataset.stockEdit));
  $$('[data-stock-minus]').forEach(b=>b.onclick=()=>adjustStock(b.dataset.stockMinus,-1));
  $$('[data-stock-plus]').forEach(b=>b.onclick=()=>adjustStock(b.dataset.stockPlus,1));
  $$('[data-buy-reminder]').forEach(b=>b.onclick=()=>downloadBuyReminder([items[profile].find(x=>x.id===b.dataset.buyReminder)]));
}
function adjustStock(id,direction){const item=items[profile].find(x=>x.id===id);if(!item)return;const step=Number(item.dose||1);item.stock=isNumber(item.stock)?Math.max(0,roundStock(Number(item.stock)+direction*step)):direction>0?step:0;saveItems();render();}

function renderSettings() {
  $('#bioStatus').textContent=localStorage.getItem('vit:bioEnabled')==='1'?'Включено':'Выключено';
  $('#bioStatus').classList.toggle('ok',localStorage.getItem('vit:bioEnabled')==='1');
  const backup=localStorage.getItem('vit:lastBackup');
  $('#backupInfo').textContent=backup?`Последняя копия: ${new Date(backup).toLocaleString('ru-RU')}`:'Резервная копия ещё не создавалась.';
  applyTheme(); applyProfileTheme(); renderWidgetPreview();
}
function renderWidgetPreview(){
  const list=scheduledItems(),data=loadDay(),next=list.find(x=>!isTaken(data,x.id))||list[0],done=list.filter(x=>isTaken(data,x.id)).length,percent=list.length?Math.round(done/list.length*100):100;
  $('#widgetPreview').innerHTML=`<div class="widget-top"><div><small>${PROFILE_NAMES[profile]}</small><div>Сегодня ${done}/${list.length}</div></div><b>${percent}%</b></div><div class="widget-next">${next?escapeHTML(next.name):'Все выполнено'}</div><div class="widget-time">${next?`Следующий приём · ${escapeHTML(next.time)}`:'Расписание завершено'}</div><div class="widget-bar"><i style="width:${percent}%"></i></div>`;
}

function showView(name,scroll=true) {
  currentView=name; localStorage.setItem('vit:view',name);
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===`${name}View`));
  $$('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  if(scroll) window.scrollTo({top:0,behavior:'smooth'});
}

function openVitaminModal(id=null) {
  editingId=id;
  const item=id?items[profile].find(x=>x.id===id):null;
  $('#modalProfileLabel').textContent=PROFILE_NAMES[profile]; $('#vitaminFormTitle').textContent=item?'Редактировать добавку':'Новая добавка';
  $('#vitaminName').value=item?.name||''; $('#vitaminTime').value=item?.time||'12:00'; $('#vitaminUnit').value=item?.unit||'капс.'; $('#vitaminDetails').value=item?.details||'';
  $('#courseEnabled').checked=Boolean(item?.course?.enabled); $('#courseStart').value=item?.course?.start||dateKey(todayDate()); $('#courseDays').value=item?.course?.days||90; $('#coursePaused').checked=Boolean(item?.course?.paused);
  $('#stockAmount').value=isNumber(item?.stock)?item.stock:''; $('#stockDose').value=item?.dose||1; $('#stockLow').value=item?.low||7; $('#buyDate').value=item?.buyDate||'';
  $('#deleteVitamin').classList.toggle('hidden',!item); $('#vitaminModal').classList.remove('hidden'); setTimeout(()=>$('#vitaminName').focus(),80);
}
function closeVitaminModal(){editingId=null;$('#vitaminModal').classList.add('hidden');}
function saveVitaminFromForm(){
  const name=$('#vitaminName').value.trim(),time=$('#vitaminTime').value;if(!name){toast('Введите название');return}if(!time){toast('Укажите время');return}
  const wasEditing=Boolean(editingId);
  const item=editingId?items[profile].find(x=>x.id===editingId):{id:uid('vit')};
  Object.assign(item,{name,time,unit:$('#vitaminUnit').value.trim()||'шт.',details:$('#vitaminDetails').value.trim(),stock:isNumber($('#stockAmount').value)?Number($('#stockAmount').value):null,dose:Number($('#stockDose').value)||1,low:Number($('#stockLow').value)||0,buyDate:$('#buyDate').value,course:{enabled:$('#courseEnabled').checked,start:$('#courseStart').value,days:Math.max(1,Number($('#courseDays').value)||90),paused:$('#coursePaused').checked}});
  if(!editingId)items[profile].push(item);items[profile].sort((a,b)=>a.time.localeCompare(b.time));saveItems();localStorage.removeItem(`vit:calendar:${profile}`);localStorage.setItem('vit:forceNotifyPanel','1');closeVitaminModal();toast(wasEditing?'Изменения сохранены':'Добавка создана');render();
}
function deleteEditingVitamin(){if(!editingId)return;const item=items[profile].find(x=>x.id===editingId);if(!confirm(`Удалить «${item.name}»?`))return;items[profile]=items[profile].filter(x=>x.id!==editingId);saveItems();closeVitaminModal();toast('Добавка удалена');render();}

function notificationPermissionGranted(){return 'Notification' in window&&Notification.permission==='granted'}
function calendarConfirmed(){return localStorage.getItem(`vit:calendar:${profile}`)==='1'}
function updateNotificationPanel(){
  const complete=notificationPermissionGranted()&&calendarConfirmed();$('#notify').classList.toggle('done',notificationPermissionGranted());$('#calendarConfirm').classList.toggle('done',calendarConfirmed());$('#notifyStatus').textContent=complete?'Настроено':'Не настроено';$('#notifyStatus').classList.toggle('ok',complete);$('#notificationPanel').classList.toggle('hidden',complete&&localStorage.getItem('vit:forceNotifyPanel')!=='1');
}
function escapeICS(value){return String(value).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function makeScheduleICS(){
  const start=addDays(todayDate(),1),stamp=dateKey(start).replaceAll('-',''),events=[];
  items[profile].forEach(item=>{const [hh,mm]=item.time.split(':');let recurrence='RRULE:FREQ=DAILY';if(item.course.enabled&&item.course.start){const end=courseEnd(item);recurrence=`RRULE:FREQ=DAILY;UNTIL=${dateKey(end).replaceAll('-','')}T235959`;}events.push('BEGIN:VEVENT',`UID:${profile}-${item.id}-${Date.now()}@vitamin-tracker`,`DTSTAMP:${stamp}T000000Z`,`DTSTART:${stamp}T${hh}${mm}00`,recurrence,`SUMMARY:${escapeICS(item.name)}`,`DESCRIPTION:${escapeICS(item.details||'')}`,'BEGIN:VALARM','TRIGGER:-PT0M','ACTION:DISPLAY',`DESCRIPTION:${escapeICS(item.name)}`,'END:VALARM','END:VEVENT');});
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Vitamin Tracker Pro//RU','CALSCALE:GREGORIAN',...events,'END:VCALENDAR'].join('\r\n');
}
function downloadTextFile(content,type,filename){const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}
function downloadCalendar(){downloadTextFile(makeScheduleICS(),'text/calendar;charset=utf-8',`vitamin-schedule-${profile}-v7.ics`);$('#calendarConfirm').classList.remove('hidden');toast('Откройте файл и добавьте события в Календарь');}
function downloadBuyReminder(selected){const list=(selected||items[profile].filter(isLowStock)).filter(Boolean);if(!list.length){toast('Список покупок пуст');return}const date=addDays(todayDate(),1),d=dateKey(date).replaceAll('-',''),summary=`Купить витамины: ${list.map(x=>x.name).join(', ')}`,body=list.map(x=>`${x.name} — осталось ${stockText(x)}`).join('\\n');const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Vitamin Tracker Pro//RU','BEGIN:VEVENT',`UID:buy-${Date.now()}@vitamin-tracker`,`DTSTAMP:${d}T000000Z`,`DTSTART:${d}T100000`,`SUMMARY:${escapeICS(summary)}`,`DESCRIPTION:${escapeICS(body)}`,'BEGIN:VALARM','TRIGGER:-PT1H','ACTION:DISPLAY','DESCRIPTION:Купить витамины','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');downloadTextFile(ics,'text/calendar;charset=utf-8','buy-vitamins.ics');}

function randomBytes(length=32){return crypto.getRandomValues(new Uint8Array(length));}
function toBase64Url(bytes){return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');}
function fromBase64Url(value){const base=value.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(value.length/4)*4,'=');return Uint8Array.from(atob(base),c=>c.charCodeAt(0));}
function bioSupported(){return window.isSecureContext&&'PublicKeyCredential'in window&&navigator.credentials;}
async function enableBiometric(){
  if(!bioSupported()){toast('На этом устройстве биометрическая защита недоступна');return}
  try{
    const userId=randomBytes(16),cred=await navigator.credentials.create({publicKey:{challenge:randomBytes(),rp:{name:'Vitamin Tracker Pro'},user:{id:userId,name:'vitamin-tracker-local',displayName:'Vitamin Tracker'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',residentKey:'preferred',userVerification:'required'},timeout:60000,attestation:'none'}});
    localStorage.setItem('vit:bioCredential',toBase64Url(cred.rawId));localStorage.setItem('vit:bioEnabled','1');toast('Face ID включён');renderSettings();
  }catch(error){toast(error.name==='NotAllowedError'?'Настройка отменена':'Не удалось настроить Face ID');}
}
function disableBiometric(){localStorage.removeItem('vit:bioCredential');localStorage.removeItem('vit:bioEnabled');$('#lockScreen').classList.add('hidden');unlocked=true;toast('Биометрическая блокировка отключена');renderSettings();}
async function unlockWithBiometric(){
  const id=localStorage.getItem('vit:bioCredential');if(!id){disableBiometric();return}
  $('#lockError').textContent='';
  try{await navigator.credentials.get({publicKey:{challenge:randomBytes(),allowCredentials:[{type:'public-key',id:fromBase64Url(id)}],userVerification:'required',timeout:60000}});unlocked=true;$('#lockScreen').classList.add('hidden');}
  catch(error){$('#lockError').textContent=error.name==='NotAllowedError'?'Подтверждение отменено. Нажмите кнопку ещё раз.':'Не удалось подтвердить личность.';}
}
function lockIfNeeded(){if(localStorage.getItem('vit:bioEnabled')==='1'&&!unlocked){$('#lockScreen').classList.remove('hidden');}else{$('#lockScreen').classList.add('hidden');}}

function backupPayload(){const data={};const excluded=new Set(['vit:bioCredential','vit:bioEnabled','vit:hiddenAt']);for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.startsWith('vit:')&&!excluded.has(key))data[key]=localStorage.getItem(key);}return{app:'Vitamin Tracker Pro',version:APP_VERSION,createdAt:new Date().toISOString(),data};}
async function exportBackup(){
  const json=JSON.stringify(backupPayload(),null,2),file=new File([json],`vitamin-tracker-backup-${dateKey(todayDate())}.json`,{type:'application/json'});localStorage.setItem('vit:lastBackup',new Date().toISOString());
  if(navigator.canShare?.({files:[file]})){try{await navigator.share({title:'Резервная копия Vitamin Tracker',text:'Сохраните файл в iCloud Drive',files:[file]});toast('Выберите «Сохранить в Файлы»');renderSettings();return}catch(error){if(error.name==='AbortError')return}}
  downloadTextFile(json,'application/json',file.name);toast('Резервная копия скачана');renderSettings();
}
async function importBackup(file){try{const payload=JSON.parse(await file.text());if(!payload?.data||typeof payload.data!=='object')throw new Error('format');if(!confirm('Заменить текущие данные данными из резервной копии?'))return;Object.entries(payload.data).forEach(([key,value])=>{if(key.startsWith('vit:')&&!['vit:bioCredential','vit:bioEnabled','vit:hiddenAt'].includes(key))localStorage.setItem(key,value)});localStorage.removeItem('vit:bioCredential');localStorage.removeItem('vit:bioEnabled');toast('Данные восстановлены');setTimeout(()=>location.reload(),700);}catch{toast('Не удалось прочитать резервную копию')}}

function changeTheme(theme){localStorage.setItem('vit:theme',theme);applyTheme();}
function cycleTheme(){const values=['system','light','dark'],now=localStorage.getItem('vit:theme')||'system';changeTheme(values[(values.indexOf(now)+1)%values.length]);}

$$('.profile').forEach(btn=>btn.onclick=()=>{profile=btn.dataset.profile;localStorage.setItem('vit:profile',profile);currentDay=todayDate();render();});
$$('.nav-btn').forEach(btn=>btn.onclick=()=>showView(btn.dataset.view));
$$('[data-go]').forEach(btn=>btn.onclick=()=>showView(btn.dataset.go));
$('#prev').onclick=()=>{currentDay=addDays(currentDay,-1);renderToday();};
$('#next').onclick=()=>{currentDay=addDays(currentDay,1);renderToday();};
$('#all').onclick=()=>{scheduledItems().forEach(item=>setTaken(item,currentDay,true));render();};
$('#reset').onclick=()=>{scheduledItems().forEach(item=>setTaken(item,currentDay,false));render();};
$('#settingsBtn').onclick=()=>showView('settings');
$('#quickThemeBtn').onclick=cycleTheme;
$('#newCourseVitamin').onclick=()=>openVitaminModal();
$('#closeVitaminModal').onclick=closeVitaminModal;
$('#saveVitamin').onclick=saveVitaminFromForm;
$('#deleteVitamin').onclick=deleteEditingVitamin;
$('#vitaminModal').onclick=e=>{if(e.target.id==='vitaminModal')closeVitaminModal();};
$('#notify').onclick=async()=>{if(!('Notification'in window)){toast('Браузер не поддерживает уведомления');return}const permission=await Notification.requestPermission();if(permission==='granted'){toast('Уведомления разрешены');try{new Notification('Vitamin Tracker',{body:'Уведомления включены',icon:'app-icon-192-v7.png'})}catch{}}else toast('Разрешение не выдано');updateNotificationPanel();};
$('#calendarBtn').onclick=downloadCalendar;
$('#calendarConfirm').onclick=()=>{localStorage.setItem(`vit:calendar:${profile}`,'1');localStorage.removeItem('vit:forceNotifyPanel');updateNotificationPanel();toast('Расписание отмечено как добавленное');};
$('#hideNotify').onclick=()=>{$('#notificationPanel').classList.add('hidden');localStorage.removeItem('vit:forceNotifyPanel');};
$('#stockReminderAll').onclick=()=>downloadBuyReminder();
$$('#themeSelector button').forEach(btn=>btn.onclick=()=>changeTheme(btn.dataset.themeValue));
$('#manAccent').oninput=e=>{localStorage.setItem('vit:accent:man',e.target.value);if(profile==='man')applyProfileTheme();};
$('#womanAccent').oninput=e=>{localStorage.setItem('vit:accent:woman',e.target.value);if(profile==='woman')applyProfileTheme();};
$('#enableBio').onclick=enableBiometric;
$('#disableBio').onclick=disableBiometric;
$('#unlockBtn').onclick=unlockWithBiometric;
$('#exportBackup').onclick=exportBackup;
$('#importBackup').onchange=e=>{const file=e.target.files?.[0];if(file)importBackup(file);e.target.value='';};

document.addEventListener('visibilitychange',()=>{if(document.hidden){localStorage.setItem('vit:hiddenAt',Date.now().toString());}else{const hiddenAt=Number(localStorage.getItem('vit:hiddenAt')||0);if(localStorage.getItem('vit:bioEnabled')==='1'&&Date.now()-hiddenAt>30000){unlocked=false;lockIfNeeded();}}});

if('serviceWorker'in navigator){window.addEventListener('load',async()=>{try{const registration=await navigator.serviceWorker.register('sw.js?v=7',{updateViaCache:'none'});await registration.update();let reloading=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!reloading){reloading=true;location.reload();}});}catch(error){console.error('Service Worker error',error);}});}

applyTheme();applyProfileTheme();render();lockIfNeeded();
