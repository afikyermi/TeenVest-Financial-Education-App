

const INVESTMENTS = [
  { key: 'deposit',   label: 'פיקדון/אג"ח',               rate: 0.03,  years: 3,  cost: 20000 },
  { key: 'moneyFund', label: 'קרן כספית',                  rate: 0.035, years: 2,  cost: 30000 },
  { key: 'etfSolid',  label: 'תעודת סל/קרן מחקה',         rate: 0.06,  years: 7,  cost: 50000 },
  { key: 'kIska',     label: 'קרן השתלמות להשקעה',        rate: 0.04,  years: 6,  cost: 70000 },
  { key: 'stocks',    label: 'מניות',                      rate: 0.08,  years: 5,  cost: 100000 },
  { key: 'land',      label: 'קרקע (הפשרה מתקדמת)',       rate: 0.15,  years: 3, cost: 500000 },
  { key: 'urbanRen',  label: 'דירה לפני פינוי בינוי',           rate: 0.10,  years: 5,  cost: 1000000 }
];

// Emotional spendings Two cards per round; if no budget → show the CHEAPEST marked "מחוץ לתקציב".
const SPENDING = [
  { key: 'fineDining',     label: 'מסעדת יוקרה',            cost: 2000 },
  { key: 'newPhone',       label: 'פלאפון חדש',             cost: 3000 },
  { key: 'localVacation',  label: 'חופשה בארץ',             cost: 5000 },
  { key: 'homeFurniture',  label: 'ריהוט חדש לבית',         cost: 5000 },
  { key: 'buildPool',      label: 'לבנות בריכה בבית',       cost: 20000 },
  { key: 'homeRenovation', label: 'מלון יוקרה ביעד טרופי',     cost: 50000 },
  { key: 'vacationAbroad', label: 'חופשה מפנקת בחו"ל',      cost: 30000 },
  { key: 'yacht',          label: 'יאכטה מפנקת',            cost: 200000 },
  { key: 'luxuryCar',      label: 'רכב יוקרה חדש',          cost: 250000 },
  { key: 'vacationHouse',  label: 'קניית בית נופש בתאילנד',   cost: 800000 }
];

const DECISION_YEARS = [1,3,5,7,9,12,15,18,22,24];

// --- STATE ---
const state = {
  year: 1,
  decisionsMade: 0,
  balance: 0,
  startBalance: 0,
  goal: 0,
  salaryMonthly: 0,
  expenseMonthly: 0,       // NEW: monthly expense; deducted yearly (×12)
  investments: [],         // { key,label,principal,rate,years,buyYear,maturityYear }
  history: [],             // { type, year, amount, note }
  profitFromInvestments: 0 // tracked at maturities + final redemption
};

// --- DOM HOOKS (expected IDs; do not change visual design) ---
const el = {
  // intro inputs
  startForm:        () => document.getElementById('introSection'),
  inpStartBalance:  () => document.getElementById('startingCapital'),
  inpSalaryMonthly: () => document.getElementById('monthlySalary'),
  inpExpenseMonthly:() => document.getElementById('monthlyExtra'),
  inpGoal:          () => document.getElementById('finalGoal'),
  btnStart:         () => document.getElementById('startGameBtn'),

  // containers / sections
  introSection:     () => document.getElementById('introSection'),
  gameSection:      () => document.getElementById('gameSection'),
  resultsSection:   () => document.getElementById('resultsSection'),

  // status bar
  yearNow:          () => document.getElementById('currentYear'),
  balanceNow:       () => document.getElementById('currentBalance'),
  goalNow:          () => document.getElementById('goalDisplay'),
  decisionsNow:     () => document.getElementById('decisionsMade'),

  // cards grid
  cardsWrap:        () => document.getElementById('cardsContainer'),

  // actions
  btnContinue:      () => document.getElementById('continueBtn'),

  // results
  resultSummary:    () => document.getElementById('resultsContent'),
  leadForm:         () => document.getElementById('contactForm'),
  leadName:         () => document.getElementById('fullName'),
  leadEmail:        () => document.getElementById('email'),
  leadThanks:       () => document.getElementById('thankYouMessage'),
  restartBtn:       () => document.getElementById('restartBtn')

};

// --- UTIL ---
function nis(x){ return x.toLocaleString('he-IL'); }
function clampGoal(x, min, max){ return Math.max(min, Math.min(max, x)); }
function nextDecisionYearIndex(currentYear){
  for (let i=0;i<DECISION_YEARS.length;i++){
    if (DECISION_YEARS[i] >= currentYear) return i;
  }
  return DECISION_YEARS.length-1;
}

// --- INIT ---
function setup(){
  // Hook start button
  if (el.btnStart()) {
    el.btnStart().onclick = onStart;
  }
  if (el.btnContinue()) {
    el.btnContinue().onclick = onContinue;
  }
  if (el.restartBtn()) {
      el.restartBtn().onclick = () => window.location.reload();
    }


  // Lead form (UI only; no network)
  if (el.leadForm()){
    el.leadForm().onsubmit = function(e){
      e.preventDefault();
      if (el.leadName().value.trim() && el.leadEmail().value.trim()){
        el.leadForm().style.display = 'none';
        if (el.leadThanks()) el.leadThanks().style.display = 'block';
      }
    };
  }
  // Keep intro visible on load
  show(el.introSection()); hide(el.gameSection()); hide(el.resultsSection());
}
document.addEventListener('DOMContentLoaded', setup);

// --- FLOW: START ---
function onStart(){
  const X = parseInt(el.inpStartBalance().value, 10);
  const sal = parseInt(el.inpSalaryMonthly().value, 10);
  const exp = parseInt(el.inpExpenseMonthly().value, 10);
  let Y = parseInt(el.inpGoal().value, 10);

  if (isNaN(X) || X < 100000){ alert('סכום פתיחה מינימלי הוא 100,000 ₪'); return; }
  if (isNaN(sal) || sal < 0){ alert('שכר חודשי חייב להיות מספר תקין'); return; }
  if (isNaN(exp) || exp < 0){ alert('הוצאה חודשית חייבת להיות מספר תקין'); return; }

  // Goal bounds: X .. 15*X
  const minGoal = X;
  const maxGoal = X * 15;
  if (isNaN(Y) || Y < minGoal || Y > maxGoal){
    Y = clampGoal(Y || minGoal, minGoal, maxGoal);
    alert('היעד הותאם אוטומטית לטווח המותר: ' + nis(minGoal) + '–' + nis(maxGoal));
  }

  // init state
  state.year = 1;
  state.decisionsMade = 0;
  state.balance = X;
  state.startBalance = X;
  state.goal = Y;
  state.salaryMonthly = sal;
  state.expenseMonthly = exp;
  state.investments = [];
  state.history = [];
  state.profitFromInvestments = 0;

  // swap sections
  hide(el.introSection()); show(el.gameSection()); hide(el.resultsSection());

  // first render
  renderStatus();
  renderDecisionCards();
}

// --- RENDER STATUS ---
function renderStatus(){
  if (el.yearNow())      el.yearNow().innerText = state.year; 
  if (el.balanceNow())   el.balanceNow().innerText = nis(state.balance); 
  if (el.goalNow())      el.goalNow().innerText = nis(state.goal);
  if (el.decisionsNow()) el.decisionsNow().innerText = state.decisionsMade;
}

// --- DECISION CARDS ---
// Investments: choose up to TWO highest-cost within budget; if <2, fill with most expensive out-of-budget (disabled).
// Emotions: choose TWO; if none affordable, show the CHEAPEST marked "מחוץ לתקציב" (disabled).
// All four shown together without visual separation.

function renderDecisionCards(){
  const wrap = el.cardsWrap();
  if (!wrap) return;
  wrap.innerHTML = '';

  const invCards = pickInvestmentCards();
  const emoCards = pickEmotionCards();

  const all = invCards.concat(emoCards);
  for (let c of all){
    const node = cardNode(c);
    wrap.appendChild(node);
  }

  // Enable/disable Continue (always enabled — user may skip buys)
  if (el.btnContinue()) el.btnContinue().disabled = (state.decisionsMade >= 10);
}

// Select investments based on budget (prefer higher cost within budget)
function pickInvestmentCards(){
  const affordable = INVESTMENTS.filter(x => x.cost <= state.balance);
  affordable.sort((a,b)=> b.cost - a.cost); // highest first
  const picks = [];

  if (affordable.length >= 2){
    picks.push(makeInvCard(affordable[0], true));
    picks.push(makeInvCard(affordable[1], true));
  } else if (affordable.length === 1){
    picks.push(makeInvCard(affordable[0], true));
    // fill with the most expensive not affordable (disabled)
    const notAff = INVESTMENTS.filter(x => x.cost > state.balance)
                              .sort((a,b)=> b.cost - a.cost);
    if (notAff[0]) picks.push(makeInvCard(notAff[0], false, true));
  } else {
    // none affordable → show two largest, both disabled
    const notAff = INVESTMENTS.slice().sort((a,b)=> b.cost - a.cost);
    for (let i=0;i<2 && i<notAff.length;i++){
      picks.push(makeInvCard(notAff[i], false, true));
    }
  }
  return picks;
}

function makeInvCard(item, affordable, disabledBecauseBudget){
  return {
    type: 'investment',
    key: item.key,
    label: item.label,
    note: item.years + ' שנים · תשואה שנתית ' + Math.round(item.rate*100) + '%',
    cost: item.cost,
    affordable: !!affordable,
    disabledBudget: !!disabledBecauseBudget,
    onBuy: function(){
      if (!this.affordable) return;
      if (state.balance < item.cost) return;
      state.balance -= item.cost;
      state.investments.push({
        key: item.key,
        label: item.label,
        principal: item.cost,
        rate: item.rate,
        years: item.years,
        buyYear: state.year,
        maturityYear: state.year + item.years
      });
      state.history.push({type:'buy', year: state.year, amount: -item.cost, note: item.label});
      renderStatus();
      renderDecisionCards();
    }
  };
}

// Select two emotional options; if none affordable, include the CHEAPEST marked out-of-budget
function pickEmotionCards(){
  const byPriceAsc = SPENDING.slice().sort((a,b)=> a.cost - b.cost);
  const affordable = byPriceAsc.filter(x => x.cost <= state.balance);
  const picks = [];

  if (affordable.length >= 2){
    // pick two closest to balance (maximize temptation)
    const sortedByCloseness = affordable.slice().sort((a,b)=> Math.abs(state.balance - a.cost) - Math.abs(state.balance - b.cost));
    picks.push(makeEmoCard(sortedByCloseness[0], true));
    picks.push(makeEmoCard(sortedByCloseness[1], true));
  } else if (affordable.length === 1){
    picks.push(makeEmoCard(affordable[0], true));
    // fill with the cheapest remaining as disabled
    const cheapestOther = byPriceAsc.find(x => x.key !== affordable[0].key);
    if (cheapestOther) picks.push(makeEmoCard(cheapestOther, false, true));
  } else {
    // none affordable → show the CHEAPEST (and next cheapest) as disabled
    if (byPriceAsc[0]) picks.push(makeEmoCard(byPriceAsc[0], false, true));
    if (byPriceAsc[1]) picks.push(makeEmoCard(byPriceAsc[1], false, true));
  }
  return picks;
}

function makeEmoCard(item, affordable, disabledBecauseBudget){
  return {
    type: 'spending',
    key: item.key,
    label: item.label,
    note: 'הוצאה מיידית ללא החזר',
    cost: item.cost,
    affordable: !!affordable,
    disabledBudget: !!disabledBecauseBudget,
    onBuy: function(){
      if (!this.affordable) return;
      if (state.balance < item.cost) return;
      state.balance -= item.cost;
      state.history.push({type:'spending', year: state.year, amount: -item.cost, note: item.label});
      renderStatus();
      renderDecisionCards();
    }
  };
}

// --- CARD NODE (unified visual; do not separate categories) ---
function cardNode(c){
  const box = document.createElement('div');
  box.className = 'purchase-card';

  const title = document.createElement('h3');
  title.className = 'card-title';
  title.innerText = c.label;
  box.appendChild(title);

  const p = document.createElement('p');
  p.className = 'card-details';
  p.innerText = c.note;
  box.appendChild(p);

  const price = document.createElement('div');
  price.className = 'card-price';
  price.innerText = nis(c.cost) + ' ₪';
  box.appendChild(price);

  const btn = document.createElement('button');
  btn.innerText = 'קנה';
  btn.className = 'card-btn';

  // Budget badge
  if (!c.affordable){
    const badge = document.createElement('div');
    badge.className = 'out-of-budget';
    badge.innerText = 'מחוץ לתקציב';
    box.appendChild(badge);
    btn.disabled = true;
  }

  btn.onclick = function(){ c.onBuy && c.onBuy(); };
  box.appendChild(btn);
  return box;
}

// --- CONTINUE: simulate until next checkpoint ---
function onContinue(){
  if (state.decisionsMade >= 10) return;
  const currentIdx = nextDecisionYearIndex(state.year);
  const nextIdx = Math.min(currentIdx + 1, DECISION_YEARS.length-1);
  const targetYear = DECISION_YEARS[nextIdx];

  simulateThrough(targetYear);

  state.decisionsMade += 1;
  renderStatus();

  if (state.decisionsMade >= 10 || state.year >= 25){
    finishGame();
  } else {
    renderDecisionCards();
  }
}

// Simulate inclusive from current year to targetYear (advancing years)
// Each year: + salary*12; - expense*12; process maturities (compound)
function simulateThrough(targetYear){
  while (state.year <= targetYear && state.year <= 25){
    // Income
    const salaryYear = state.salaryMonthly * 12;
    if (salaryYear > 0){
      state.balance += salaryYear;
      state.history.push({type:'income', year: state.year, amount: salaryYear, note: 'שכר שנתי'});
    }

    // Expense (new: monthly → yearly total)
    const expenseYear = state.expenseMonthly * 12;
    if (expenseYear > 0){
      state.balance -= expenseYear;
      state.history.push({type:'expense', year: state.year, amount: -expenseYear, note: 'יוקר מחיה'});
    }

    // Mature investments
    settleMaturitiesForYear(state.year);

    // advance
    if (state.year === targetYear) break;
    state.year += 1;
  }
  // if we broke before increment, ensure next round shows targetYear
  if (state.year < targetYear) state.year = targetYear;
}

// Process investments maturing this year (principal * (1+rate)^years)
function settleMaturitiesForYear(y){
  const remain = [];
  for (let inv of state.investments){
    if (inv.maturityYear === y){
      const payout = Math.round(inv.principal * Math.pow(1 + inv.rate, inv.years));
      state.balance += payout;
      state.profitFromInvestments += (payout - inv.principal);
      state.history.push({type:'maturity', year: y, amount: payout, note: inv.label + ' — פדיון'});
    } else {
      remain.push(inv);
    }
  }
  state.investments = remain;
}

// --- FINISH: simulate to year 25 and redeem everything ---
function finishGame(){
  if (state.year < 25){
    simulateThrough(25);
  }
  // Final redemption of any remaining investments at their contractual maturity;
  // If any maturity years are >25, we force redemption now per spec (end-game realization).
  const rest = [];
  for (let inv of state.investments){
    const yearsHeld = Math.max(1, 25 - inv.buyYear);
    const maturityYears = yearsHeld;
    const payout = Math.round(inv.principal * Math.pow(1 + inv.rate, maturityYears));
    state.balance += payout;
    state.profitFromInvestments += (payout - inv.principal);
    state.history.push({type:'maturity', year: 25, amount: payout, note: inv.label + ' — מימוש סופי'});
  }
  state.investments = rest;

  // Lock game UI
  if (el.btnContinue()) el.btnContinue().disabled = true;
  if (el.cardsWrap()) el.cardsWrap().innerHTML = '';

  // Show results
  showResults();
}

// --- RESULTS ---
function showResults(){
  hide(el.gameSection()); show(el.resultsSection());

  const won = state.balance >= state.goal;
  const diff = state.balance - state.goal;

  const lines = [];
  lines.push('יתרה סופית: ' + nis(state.balance) + ' ₪');
  lines.push('היעד: ' + nis(state.goal) + ' ₪');
  lines.push('רווח מצטבר מהשקעות: ' + nis(state.profitFromInvestments) + ' ₪');
  lines.push(won ? '✔️ השגת את היעד! (+ ' + nis(diff) + ' ₪)' : '❌ היעד לא הושג (' + nis(diff) + ' ₪)');

  // Simple personalized insights (based on history)
  const buys = state.history.filter(h => h.type==='buy').length;
  const spends = state.history.filter(h => h.type==='spending').length;
  if (spends > buys){
    lines.push('תובנה: כמות ההוצאות הרגשיות גבוהה מכמות ההשקעות — נסו לצמצם פיתויים בתחנות ההחלטה.');
  } else if (buys >= 7){
    lines.push('תובנה: התמדה בהשקעה לאורך זמן הובילה לצבירה משמעותית בריבית דריבית.');
  } else {
    lines.push('תובנה: שילוב מאוזן בין השקעות לצריכה משפר את הסיכוי לעמוד ביעד.');
  }

  if (el.resultSummary()) el.resultSummary().innerHTML = lines.map(x=>'<p>'+x+'</p>').join('');

  // Reveal the lead form (UI only)
  if (el.leadForm()){
    el.leadForm().classList.remove('hidden');
  }
}

// --- HELPERS ---
function show(node){ if (node) node.classList.add('active'); }
function hide(node){ if (node) node.classList.remove('active'); }