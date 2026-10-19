const STORAGE_KEY = 'timer.entries.v1';
const SALARY_KEY = 'timer.salary.v6';
const PAYCHECK_KEY = 'timer.payslip-checks.v1';
const $ = (selector) => document.querySelector(selector);
const entriesBody = $('#entries-body');
const dialog = $('#entry-dialog');
const form = $('#entry-form');
const dayNames = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
let entries = loadEntries();
let salaryRates = loadSalaryRates();
let payslipChecks = loadPayslipChecks();
let payslipFormPeriod = null;
let earningsScope = 'all';
let toastTimer;

function loadEntries() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}
function loadSalaryRates() {
  const defaults={baseRate:174.61,serviceRate:3.65,damageServiceRate:27.4,seniorityRate:0,qualificationRate:0,localRate:0,eveningRate:18.2,nightRate:23.7,saturdayRate:0,sundayRate:26.3,overtimeFirstRate:46.24,overtimeOtherRate:92.49,standbyRate:185.3,calloutRate:156.14,holidayCalloutRate:173.51,travelDayRate:0,fritvalgRate:10,taxRate:0,monthlyDeduction:0,pensionRate:0,amRate:0,travelTaxable:false};
  try {
    const saved=JSON.parse(localStorage.getItem(SALARY_KEY)||'null');
    if(saved)return {...defaults,...saved};
    const previous=JSON.parse(localStorage.getItem('timer.salary.v4')||'{}');
    return {...defaults,localRate:Number(previous.localRate)||0,saturdayRate:Number(previous.saturdayRate)||0,fritvalgRate:Number(previous.fritvalgRate)||10,taxRate:Number(previous.taxRate)||0,monthlyDeduction:Number(previous.monthlyDeduction)||0,pensionRate:Number(previous.pensionRate)||0,amRate:Number(previous.amRate)||0,travelTaxable:Boolean(previous.travelTaxable)};
  }
  catch { return defaults; }
}
function loadPayslipChecks() { try { return JSON.parse(localStorage.getItem(PAYCHECK_KEY)||'{}')||{}; } catch { return {}; } }
function saveEntries() { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function parseDate(value) { const [y,m,d] = value.split('-').map(Number); return new Date(y,m-1,d); }
function startOfWeek(date) { const d = new Date(date.getFullYear(),date.getMonth(),date.getDate()); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d; }
function endOfWeek(date) { const d = startOfWeek(date); d.setDate(d.getDate()+6); return d; }
function duration(entry) { const [sh,sm] = entry.start.split(':').map(Number); const [eh,em] = entry.end.split(':').map(Number); let minutes = eh*60+em-sh*60-sm-Number(entry.break||0); if(minutes<0) minutes+=1440; return Math.max(minutes,0)/60; }
function sum(list) { return list.reduce((total,item)=>total+duration(item),0); }
function ordinaryHourlyRate() { return Math.max(0,Number(salaryRates.baseRate||0)-Number(salaryRates.localRate||0))+Number(salaryRates.localRate||0)+Number(salaryRates.serviceRate||0)+Number(salaryRates.damageServiceRate||0)+Number(salaryRates.seniorityRate||0)+Number(salaryRates.qualificationRate||0); }
function overtimeForEntry(target,list=entries) {
  const weekStart=dateKey(startOfWeek(parseDate(target.date)));
  const ordered=list.filter(item=>dateKey(startOfWeek(parseDate(item.date)))===weekStart).slice().sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
  let worked=0;
  for(const item of ordered){const hours=duration(item);if(item.id===target.id){const end=worked+hours;return {fifty:Math.max(0,Math.min(end,40)-Math.max(worked,37)),hundred:Math.max(0,end-Math.max(worked,40))};}worked+=hours;}
  return {fifty:0,hundred:0};
}
function easterSunday(year) {
  const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(year,month-1,day);
}
function isDanishPublicHoliday(date) {
  const year=date.getFullYear(),key=dateKey(date),easter=easterSunday(year),move=days=>{const d=new Date(easter);d.setDate(d.getDate()+days);return dateKey(d)};
  return key===`${year}-01-01`||key===move(-3)||key===move(-2)||key===move(1)||key===move(39)||key===move(50)||key===`${year}-12-24`||key===`${year}-12-25`||key===`${year}-12-26`;
}
function premiumHoursForEntry(entry) {
  const start=parseDate(entry.date),[startHour,startMinute]=entry.start.split(':').map(Number),[endHour,endMinute]=entry.end.split(':').map(Number);
  start.setHours(startHour,startMinute,0,0);const end=new Date(start);end.setHours(endHour,endMinute,0,0);if(end<=start)end.setDate(end.getDate()+1);
  const spanMinutes=Math.max(0,(end-start)/60000),workedMinutes=Math.max(0,spanMinutes-Number(entry.break||0)),hours={evening:0,night:0,saturday:0,sunday:0};
  for(let minute=0;minute<spanMinutes;minute++){
    const instant=new Date(start.getTime()+minute*60000),hour=instant.getHours(),day=instant.getDay();
    if(hour>=18&&hour<22)hours.evening++;
    if(hour>=22||hour<5)hours.night++;
    if(day===6)hours.saturday++;
    if(day===0||isDanishPublicHoliday(instant)||(instant.getMonth()===4&&instant.getDate()===1&&hour>=12))hours.sunday++;
  }
  const factor=spanMinutes?workedMinutes/spanMinutes:0;Object.keys(hours).forEach(key=>hours[key]=hours[key]/60*factor);return hours;
}
function fmtHours(hours) { return hours.toLocaleString('da-DK',{minimumFractionDigits:1,maximumFractionDigits:1}); }
function dateLabel(key, options={weekday:'short',day:'numeric',month:'short'}) { return new Intl.DateTimeFormat('da-DK',options).format(parseDate(key)).replace('.',''); }
function escapeHtml(value='') { return String(value).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function getWeekEntries(now=new Date()) { const start=dateKey(startOfWeek(now)), end=dateKey(endOfWeek(now)); return entries.filter(e=>e.date>=start&&e.date<=end); }
function render() {
  $('#repeat-entry').hidden=entries.length===0;
  entries.forEach(entry=>{const overtime=overtimeForEntry(entry),premium=premiumHoursForEntry(entry);entry.overtime50Hours=overtime.fifty;entry.overtime100Hours=overtime.hundred;entry.eveningHours=premium.evening;entry.nightHours=premium.night;entry.saturdayHours=premium.saturday;entry.sundayHours=premium.sunday;});
  const now=new Date(), today=dateKey(now), week=getWeekEntries(now), monthKey=today.slice(0,7), month=entries.filter(e=>e.date.startsWith(monthKey));
  $('#today-label').textContent=new Intl.DateTimeFormat('da-DK',{weekday:'long',day:'numeric',month:'long'}).format(now);
  $('#week-range').textContent=`${dateLabel(dateKey(startOfWeek(now)),{day:'numeric',month:'short'})} – ${dateLabel(dateKey(endOfWeek(now)),{day:'numeric',month:'short'})}`;
  $('#week-hours').textContent=fmtHours(sum(week));
  const todayEntries=entries.filter(e=>e.date===today), todayTotal=sum(todayEntries);
  $('#today-hours').textContent=fmtHours(todayTotal);
  $('#today-entry-count').textContent=todayEntries.length?`${todayEntries.length} ${todayEntries.length===1?'registrering':'registreringer'}`:'Ingen registreringer endnu';
  $('#today-progress').style.width=`${Math.min(todayTotal/7.5*100,100)}%`;
  $('#month-hours').textContent=fmtHours(sum(month));
  $('#month-count').textContent=`${new Set(month.map(e=>e.date)).size} arbejdsdage registreret`;
  $('#month-dots').innerHTML=Array.from({length:14},(_,i)=>`<i class="${month.some(e=>parseDate(e.date).getDate()===i+1)?'filled':''}"></i>`).join('');
  renderChart(week,now);
  renderTable();
  renderSalary(now);
}
function renderChart(week,now) {
  const monday=startOfWeek(now), today=dateKey(now), daily=Array(7).fill(0);
  week.forEach(entry=>{const diff=Math.round((parseDate(entry.date)-monday)/86400000); if(diff>=0&&diff<7)daily[diff]+=duration(entry);});
  $('#week-chart').innerHTML=dayNames.map((name,index)=>{const date=new Date(monday);date.setDate(date.getDate()+index);const isToday=dateKey(date)===today;const hours=daily[index];const height=Math.min(hours/7.5*100,100);return `<div class="chart-day" title="${name}: ${fmtHours(hours)} timer"><div class="bar-track"><div class="bar-target"></div><div class="bar-fill ${isToday?'today':''}" style="height:${height}%"></div>${hours?`<span class="bar-hours">${fmtHours(hours)} t</span>`:''}</div><span class="day-label ${isToday?'today':''}">${name}</span></div>`}).join('');
}
function getPayPeriodRange(now=new Date()) {
  const start=new Date(now.getFullYear(),now.getMonth()-(now.getDate()<15?1:0),15);
  const end=new Date(start.getFullYear(),start.getMonth()+1,14);
  return {start:dateKey(start),end:dateKey(end)};
}
function formatMoney(amount, decimals=0) { return amount.toLocaleString('da-DK',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}); }
function extraPay(entry) {
  const overtime=overtimeForEntry(entry),premium=premiumHoursForEntry(entry);
  return premium.evening*salaryRates.eveningRate + premium.night*salaryRates.nightRate + premium.saturday*salaryRates.saturdayRate + premium.sunday*salaryRates.sundayRate + overtime.fifty*salaryRates.overtimeFirstRate + overtime.hundred*salaryRates.overtimeOtherRate + Number(entry.standbyDays||0)*salaryRates.standbyRate + Number(entry.calloutHours||0)*salaryRates.calloutRate + Number(entry.holidayCalloutHours||0)*salaryRates.holidayCalloutRate + Number(entry.travelDays||0)*salaryRates.travelDayRate;
}
function entryPay(entry) { return duration(entry)*ordinaryHourlyRate()+extraPay(entry); }
function paySum(list) { return list.reduce((total,entry)=>total+entryPay(entry),0); }
function travelPay(list) { return list.reduce((total,entry)=>total+Number(entry.travelDays||0)*Number(salaryRates.travelDayRate||0),0); }
function estimateNet(list) {
  if(![salaryRates.taxRate,salaryRates.monthlyDeduction,salaryRates.pensionRate,salaryRates.amRate].some(value=>Number(value)>0)) return 0;
  const gross=paySum(list), travel=salaryRates.travelTaxable?0:travelPay(list), taxable=Math.max(0,gross-travel);
  const pension=taxable*Number(salaryRates.pensionRate||0)/100, am=Math.max(0,taxable-pension)*Number(salaryRates.amRate||0)/100;
  const taxableAfterAllowance=Math.max(0,taxable-pension-am-Number(salaryRates.monthlyDeduction||0));
  return taxable-pension-am-taxableAfterAllowance*Number(salaryRates.taxRate||0)/100+travel;
}
function renderSalary(now=new Date()) {
  const hourly=ordinaryHourlyRate(), today=dateKey(now);
  const range=getPayPeriodRange(now), currentPeriod=entries.filter(e=>e.date>=range.start&&e.date<=range.end), month=entries.filter(e=>e.date.startsWith(today.slice(0,7))), weekEntries=getWeekEntries(now), totalHours=sum(entries);
  const scopedEntries=earningsScope==='pay'?currentPeriod:earningsScope==='week'?weekEntries:entries;
  Object.entries(salaryRates).forEach(([key,value])=>{const field=$(`#${key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase())}`);if(field){if(field.type==='checkbox')field.checked=Boolean(value);else field.value=value;}});
  $('#pay-earned').textContent=formatMoney(paySum(currentPeriod)); $('#month-earned').textContent=formatMoney(paySum(month)); $('#total-earned').textContent=formatMoney(paySum(entries));
  $('#pay-range-label').textContent=`${dateLabel(range.start,{day:'numeric',month:'short'})} – ${dateLabel(range.end,{day:'numeric',month:'short'})}`;
  $('#net-earned').textContent=`${formatMoney(estimateNet(currentPeriod))} kr.`;
  const periodOt=currentPeriod.reduce((total,entry)=>{const overtime=overtimeForEntry(entry);return total+overtime.fifty+overtime.hundred;},0);
  $('#period-hours').textContent=`${fmtHours(sum(currentPeriod))} t`;
  $('#period-overtime').textContent=`${fmtHours(periodOt)} t`;
  if(payslipFormPeriod!==range.start){const saved=payslipChecks[range.start]||{};$('#actual-gross').value=saved.gross??'';$('#actual-net').value=saved.net??'';payslipFormPeriod=range.start;}
  renderPayslipComparison(range.start,paySum(currentPeriod),estimateNet(currentPeriod));
  $('#month-earned-hours').textContent=`${fmtHours(sum(month))} timer registreret`;
  $('#total-earned-hours').textContent=`${fmtHours(totalHours)} timer registreret`;
  $('#salary-hours').textContent=`${fmtHours(sum(scopedEntries))} t`; $('#effective-rate').textContent=`${formatMoney(hourly,2)} kr./t · ${formatMoney(sum(scopedEntries)*hourly)} kr.`; $('#extra-earnings').textContent=`${formatMoney(scopedEntries.reduce((total,entry)=>total+extraPay(entry),0))} kr.`; $('#earnings-total').textContent=`${formatMoney(paySum(scopedEntries))} kr.`;
  const fritvalgBase=Math.max(0,paySum(scopedEntries)-(salaryRates.travelTaxable?0:travelPay(scopedEntries)));
  $('#fritvalg-earned').textContent=`${formatMoney(fritvalgBase*Number(salaryRates.fritvalgRate||0)/100)} kr.`;
  renderPayrollBreakdown(currentPeriod,range);
  document.querySelectorAll('.earnings-tab').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.scope===earningsScope));});
}
function renderPayrollBreakdown(periodEntries,range) {
  const premiums=periodEntries.reduce((sum,entry)=>{const item=premiumHoursForEntry(entry);Object.keys(item).forEach(key=>sum[key]+=item[key]);return sum;},{evening:0,night:0,saturday:0,sunday:0});
  const hours=key=>periodEntries.reduce((total,entry)=>total+Number(entry[key]||0),0);
  const overtime=key=>periodEntries.reduce((total,entry)=>total+overtimeForEntry(entry)[key],0);
  const days=key=>periodEntries.reduce((total,entry)=>total+Number(entry[key]||0),0);
  const totalHours=sum(periodEntries);
  const rows=[
    ['Grundløn og faste tillæg',totalHours,`${formatMoney(ordinaryHourlyRate(),2)} kr./t`,totalHours*ordinaryHourlyRate(),'timer'],
    ['Aften 18–22',premiums.evening,`${formatMoney(salaryRates.eveningRate,2)} kr./t`,premiums.evening*salaryRates.eveningRate,'timer'],
    ['Nat 22–05',premiums.night,`${formatMoney(salaryRates.nightRate,2)} kr./t`,premiums.night*salaryRates.nightRate,'timer'],
    ['Lørdag',premiums.saturday,`${formatMoney(salaryRates.saturdayRate,2)} kr./t`,premiums.saturday*salaryRates.saturdayRate,'timer'],
    ['Søndag / helligdag',premiums.sunday,`${formatMoney(salaryRates.sundayRate,2)} kr./t`,premiums.sunday*salaryRates.sundayRate,'timer'],
    ['Overarbejde · 50 % (første 3 t)',overtime('fifty'),`${formatMoney(salaryRates.overtimeFirstRate,2)} kr./t`,overtime('fifty')*salaryRates.overtimeFirstRate,'timer'],
    ['Overarbejde · 100 %',overtime('hundred'),`${formatMoney(salaryRates.overtimeOtherRate,2)} kr./t`,overtime('hundred')*salaryRates.overtimeOtherRate,'timer'],
    ['Beredskab',days('standbyDays'),`${formatMoney(salaryRates.standbyRate,2)} kr./døgn`,days('standbyDays')*salaryRates.standbyRate,'døgn'],
    ['Udkald · hverdag',hours('calloutHours'),`${formatMoney(salaryRates.calloutRate,2)} kr./t`,hours('calloutHours')*salaryRates.calloutRate,'timer'],
    ['Udkald · søndag / helligdag',hours('holidayCalloutHours'),`${formatMoney(salaryRates.holidayCalloutRate,2)} kr./t`,hours('holidayCalloutHours')*salaryRates.holidayCalloutRate,'timer'],
    ['Rejsedøgn',days('travelDays'),`${formatMoney(salaryRates.travelDayRate,2)} kr./døgn`,days('travelDays')*salaryRates.travelDayRate,'døgn'],
    ['Fritvalg opsparet · vises særskilt',Math.max(0,paySum(periodEntries)-(salaryRates.travelTaxable?0:travelPay(periodEntries)))*Number(salaryRates.fritvalgRate||0)/100,`${formatMoney(salaryRates.fritvalgRate,1)} % af løngrundlag`,Math.max(0,paySum(periodEntries)-(salaryRates.travelTaxable?0:travelPay(periodEntries)))*Number(salaryRates.fritvalgRate||0)/100,'kr.']
  ];
  const panel=$('#payroll-breakdown');panel.querySelector('.breakdown-period').textContent=`${dateLabel(range.start,{day:'numeric',month:'short'})} – ${dateLabel(range.end,{day:'numeric',month:'short'})}`;
  panel.querySelector('tbody').innerHTML=rows.map(([label,qty,rate,amount,unit])=>`<tr><td>${label}</td><td>${fmtHours(qty)} ${unit}</td><td>${rate}</td><td>${formatMoney(amount)} kr.</td></tr>`).join('');
  panel.querySelector('.breakdown-total').textContent=`${formatMoney(paySum(periodEntries))} kr.`;
}
function addPayrollBreakdown() {
  const panel=document.createElement('section');panel.className='panel breakdown-panel';panel.id='payroll-breakdown';
  panel.innerHTML='<div class="panel-header"><div><p class="eyebrow">OPDELT LØNNSOVERSIGT</p><h2>Timer, tillæg og overarbejde</h2></div><span class="week-pill breakdown-period"></span></div><p class="breakdown-caption">Mængder og vejledende beløb i denne lønningsperiode.</p><div class="breakdown-wrap"><table class="breakdown-table"><thead><tr><th>TYPE</th><th>MÆNGDE</th><th>SATS</th><th>OPTJENT</th></tr></thead><tbody></tbody><tfoot><tr><th colspan="3">Brutto i perioden</th><th class="breakdown-total">0 kr.</th></tr></tfoot></table></div>';
  document.querySelector('.salary-view').insertBefore(panel,document.querySelector('.salary-grid'));
}
function addEarningsTabs() {
  const header=document.querySelector('.earnings-panel>.panel-header'),tabs=document.createElement('div');tabs.className='earnings-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Vælg tidsrum for din optjening');
  [['all','I alt'],['pay','Lønperioden'],['week','Denne uge']].forEach(([scope,label])=>{const button=document.createElement('button');button.type='button';button.className='earnings-tab';button.dataset.scope=scope;button.textContent=label;button.setAttribute('aria-pressed',String(scope===earningsScope));button.addEventListener('click',()=>{earningsScope=scope;renderSalary();});tabs.append(button)});
  header.after(tabs);
}
function renderTable() {
  const filter=$('#filter-period').value, now=new Date(), today=dateKey(now);
  const period=filter==='week'
    ? {start:dateKey(startOfWeek(now)),end:dateKey(endOfWeek(now))}
    : filter==='month'
      ? {start:`${today.slice(0,7)}-01`,end:dateKey(new Date(now.getFullYear(),now.getMonth()+1,0))}
      : filter==='pay-period' ? getPayPeriodRange(now) : null;
  const visible=entries.filter(e=>!period||(e.date>=period.start&&e.date<=period.end)).sort((a,b)=>b.date.localeCompare(a.date)||b.start.localeCompare(a.start));
  $('#entries-body').innerHTML=visible.map(entry=>{const premiumLabels=[['eveningHours','Aften'],['nightHours','Nat'],['saturdayHours','Lørdag'],['sundayHours','Søn/helligdag'],['overtime50Hours','OT 50%'],['overtime100Hours','OT 100%']].filter(([key])=>Number(entry[key]||0)>0).map(([key,label])=>`${label} ${fmtHours(Number(entry[key]))} t`);if(Number(entry.standbyDays||0))premiumLabels.push(`Beredskab ${entry.standbyDays} døgn`);return `<tr><td>${dateLabel(entry.date,{weekday:'short',day:'numeric',month:'short'})}</td><td><strong>${escapeHtml(entry.caseNumber||'—')}</strong></td><td><div class="task-name"><i class="task-dot"></i><div><strong>${escapeHtml(entry.task)}</strong>${premiumLabels.length?`<span class="task-notes">${premiumLabels.join(' · ')}</span>`:''}${entry.notes?`<span class="task-notes">${escapeHtml(entry.notes)}</span>`:''}</div></div></td><td>${escapeHtml(entry.start)} – ${escapeHtml(entry.end)}</td><td>${Number(entry.break||0)} min.</td><td class="hours-cell">${fmtHours(duration(entry))} t</td><td class="row-actions"><button type="button" class="edit-action" data-edit="${entry.id}" aria-label="Redigér ${escapeHtml(entry.task)}" title="Ret denne registrering">✎ <span>Redigér</span></button><button type="button" data-delete="${entry.id}" aria-label="Slet ${escapeHtml(entry.task)}">Slet</button></td></tr>`}).join('');
  const empty=visible.length===0; $('#empty-state').classList.toggle('visible',empty); entriesBody.style.display=empty?'none':'';
  const rangeLabel=period?` · ${dateLabel(period.start,{day:'numeric',month:'short'})} – ${dateLabel(period.end,{day:'numeric',month:'short'})}`:'';
  $('#entries-summary').textContent=`${visible.length} ${visible.length===1?'registrering':'registreringer'} · ${fmtHours(sum(visible))} timer${rangeLabel}`;
}
function renderPayslipComparison(period,grossEstimate,netEstimate) {
  const saved=payslipChecks[period], grossNode=$('#gross-difference'), netNode=$('#net-difference');
  if(!saved){grossNode.textContent='Gem lønsedlens beløb for at sammenligne';netNode.textContent='Gem lønsedlens beløb for at sammenligne';return;}
  const describe=(actual,estimate)=>actual==null?'Ikke udfyldt':`${formatMoney(actual-estimate)} kr. ${actual>=estimate?'over':'under'} estimatet`;
  grossNode.textContent=describe(saved.gross,grossEstimate);netNode.textContent=describe(saved.net,netEstimate);
}
function addPayslipPanel() {
  const panel=document.createElement('section');panel.className='panel payslip-panel';panel.innerHTML='<div class="panel-header"><div><p class="eyebrow">LØNSEDDELSKONTROL</p><h2>Sammenlign med lønsedlen</h2></div><span class="quick-emoji">✓</span></div><p class="quick-copy">Indtast beløbene fra den samme lønningsperiode for at se forskellen fra appens estimat.</p><div class="payslip-form"><label class="field-label" for="actual-gross">Brutto ifølge lønsedlen (kr.)<input class="field-input" id="actual-gross" type="number" min="0" step="0.01" placeholder="0,00"></label><label class="field-label" for="actual-net">Udbetalt ifølge lønsedlen (kr.)<input class="field-input" id="actual-net" type="number" min="0" step="0.01" placeholder="0,00"></label><button class="button button-primary" id="save-payslip" type="button">Gem sammenligning</button></div><div class="comparison-results"><div><span>Brutto</span><strong id="gross-difference">Gem lønsedlens beløb for at sammenligne</strong></div><div><span>Udbetalt</span><strong id="net-difference">Gem lønsedlens beløb for at sammenligne</strong></div></div>';
  document.querySelector('.salary-view').insertBefore(panel,document.querySelector('.salary-view>footer'));
  $('#save-payslip').addEventListener('click',()=>{const gross=$('#actual-gross').value,net=$('#actual-net').value;if(!gross&&!net){showToast('Indtast mindst ét beløb fra lønsedlen');return}const period=getPayPeriodRange(),saved={};if(gross!=='')saved.gross=Number(gross);if(net!=='')saved.net=Number(net);payslipChecks={...payslipChecks,[period.start]:saved};localStorage.setItem(PAYCHECK_KEY,JSON.stringify(payslipChecks));showToast('Sammenligningen er gemt');render();});
}
function addFritvalgControls() {
  const taxRates=document.querySelector('.tax-fields .rate-fields'),label=document.createElement('label');
  label.className='field-label';label.htmlFor='fritvalg-rate';label.innerHTML='Fritvalg opsparing (%)<input class="field-input" type="number" id="fritvalg-rate" min="0" max="100" step="0.1" value="10">';taxRates.append(label);
  const panel=document.querySelector('.earnings-panel'),line=document.createElement('div');line.className='earnings-line';line.innerHTML='<span>Fritvalg opsparet i perioden (est.)</span><strong id="fritvalg-earned">0 kr.</strong>';panel.insertBefore(line,document.querySelector('.earnings-total'));
}
function openDialog(entry=null) {
  form.reset(); $('#entry-id').value=entry?.id||''; $('#case-number').value=entry?.caseNumber||''; $('#task').value=entry?.task||''; $('#date').value=entry?.date||dateKey(new Date()); $('#break').value=entry?.break??30; $('#start').value=entry?.start||'07:00'; $('#end').value=entry?.end||'17:00'; $('#notes').value=entry?.notes||'';
  ['eveningHours','nightHours','saturdayHours','sundayHours','overtime50Hours','overtime100Hours','standbyDays','calloutHours','holidayCalloutHours','travelDays'].forEach(name=>{const field=form.elements[name];if(field)field.value=entry?.[name]??0;});
  const cases=[...new Set(entries.map(item=>item.caseNumber?.trim()).filter(Boolean))];$('#case-number-history').innerHTML=cases.map(value=>`<option value="${escapeHtml(value)}"></option>`).join('');
  $('#repeat-last').hidden=Boolean(entry)||entries.length===0;
  $('.dialog-top .eyebrow').textContent=entry?'REDIGÉR REGISTRERING':'NY REGISTRERING'; $('.dialog-top h2').textContent=entry?'Ret dine timer':'Hvad har du arbejdet på?'; $('.dialog-actions .button-primary').innerHTML=entry?'Gem ændringer <span>→</span>':'Gem timer <span>→</span>';
  dialog.showModal(); setTimeout(()=>$('#task').focus(),40);
}
function showToast(message) { const toast=$('#toast');toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),2300); }
function copyLastEntryToForm() { const last=entries.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.start.localeCompare(a.start))[0];if(!last)return false;$('#case-number').value=last.caseNumber||'';$('#task').value=last.task||'';$('#start').value=last.start||'07:00';$('#end').value=last.end||'17:00';$('#break').value=last.break??30;$('#notes').value=last.notes||'';['standbyDays','calloutHours','holidayCalloutHours','travelDays'].forEach(name=>{if(form.elements[name])form.elements[name].value=last[name]??0});$('#date').value=dateKey(new Date());showToast('Sidste registrering kopieret – ret dato og detaljer efter behov');return true; }
document.querySelectorAll('#new-entry,#quick-entry,#empty-entry').forEach(button=>button.addEventListener('click',()=>openDialog()));
$('#repeat-last').addEventListener('click',copyLastEntryToForm);
$('#repeat-entry').addEventListener('click',()=>{openDialog();copyLastEntryToForm()});
$('#close-dialog').addEventListener('click',()=>dialog.close()); $('#cancel-dialog').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
form.addEventListener('submit',event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form));const existingId=values.id;const entry={id:existingId||crypto.randomUUID(),caseNumber:values.caseNumber.trim(),task:values.task.trim(),date:values.date,start:values.start,end:values.end,break:Number(values.break||0),notes:values.notes.trim(),eveningHours:Number(values.eveningHours||0),nightHours:Number(values.nightHours||0),saturdayHours:Number(values.saturdayHours||0),sundayHours:Number(values.sundayHours||0),overtime50Hours:Number(values.overtime50Hours||0),overtime100Hours:Number(values.overtime100Hours||0),standbyDays:Number(values.standbyDays||0),calloutHours:Number(values.calloutHours||0),holidayCalloutHours:Number(values.holidayCalloutHours||0),travelDays:Number(values.travelDays||0)};if(duration(entry)<=0){showToast('Sluttid skal være efter starttid.');return}if(existingId)entries=entries.map(item=>item.id===existingId?entry:item);else entries.push(entry);saveEntries();render();dialog.close();showToast(existingId?'Registreringen er opdateret':'Timerne er registreret')});
entriesBody.addEventListener('click',event=>{const edit=event.target.closest('[data-edit]'),remove=event.target.closest('[data-delete]');if(edit){const entry=entries.find(item=>item.id===edit.dataset.edit);if(entry)openDialog(entry)}if(remove){entries=entries.filter(item=>item.id!==remove.dataset.delete);saveEntries();render();showToast('Registreringen er slettet')}});
$('#filter-period').addEventListener('change',renderTable);
addFritvalgControls();
Object.keys(salaryRates).forEach(key=>{const id=key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase()),field=$('#'+id);if(field)field.addEventListener('change',()=>{const maximum=field.max===''?Infinity:Number(field.max);salaryRates={...salaryRates,[key]:field.type==='checkbox'?field.checked:Math.min(maximum,Math.max(0,Number(field.value)||0))};field.value=salaryRates[key];localStorage.setItem(SALARY_KEY,JSON.stringify(salaryRates));renderSalary();showToast('Dine løn- og skatteværdier er gemt')})});
function syncNavigation() {
  const salary=location.hash==='#lon';
  document.querySelector('.main-content').classList.toggle('salary-active',salary);
  document.querySelectorAll('.nav-link').forEach(link=>link.classList.toggle('active',link.hash===location.hash));
}
document.querySelectorAll('.nav-link').forEach(link=>link.addEventListener('click',event=>{
  event.preventDefault();
  if(location.hash!==link.hash)history.pushState(null,'',link.hash);
  syncNavigation();
}));
window.addEventListener('hashchange',syncNavigation);
window.addEventListener('popstate',syncNavigation);
syncNavigation();

$('#export-csv').addEventListener('click',()=>{if(!entries.length){showToast('Der er ingen registreringer at eksportere');return}const rows=[['Dato','Sagsnummer','Opgave','Start','Slut','Pause (min)','Timer','Aften','Nat','Lørdag','Søn/helligdag','OT 50%','OT 100%','Beredskabsdøgn','Udkald hverdag','Udkald søn/helligdag','Rejsedøgn','Noter'],...entries.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,e.caseNumber,e.task,e.start,e.end,e.break,fmtHours(duration(e)),e.eveningHours,e.nightHours,e.saturdayHours,e.sundayHours,e.overtime50Hours,e.overtime100Hours,e.standbyDays,e.calloutHours,e.holidayCalloutHours,e.travelDays,e.notes])];const csv='\ufeff'+rows.map(row=>row.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(';')).join('\r\n');const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));link.download=`timer-${dateKey(new Date())}.csv`;link.click();URL.revokeObjectURL(link.href);showToast('Din CSV-fil er klar')});
addPayslipPanel();
addPayrollBreakdown();
addEarningsTabs();
render();
if('serviceWorker' in navigator&&location.protocol!=='file:')window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
