/* El recargo de ayer se incluye en un aporte diario registrado por el usuario. */
function savingsPeruDay(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const t = specialToday(date);
  return t.period + '-' + String(t.day).padStart(2, '0');
}
function missedDepositDay(profile, now = new Date()) {
  if (!['boo', 'sullivan'].includes(profile)) return null;
  const today = savingsPeruDay(now);
  const yesterday = new Date(today + 'T12:00:00-05:00');
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const day = savingsPeruDay(yesterday);
  if (state.savingWaivers?.[profile+':'+day]) return null;
  const entries = state.entries.filter(item => depositProfile(item) === profile && !item.withdrawalReturnId);
  // No se considera un olvido antes de que esa persona empezara a ahorrar.
  if (!entries.some(item => savingsPeruDay(item.date) && savingsPeruDay(item.date) < day)) return null;
  if (entries.some(item => savingsPeruDay(item.date) === day || item.recoveryFor === day)) return null;
  if (entries.some(item => item.depositType !== 'special' && savingsPeruDay(item.date) === today)) return null;
  return day;
}
function dailySavingRules() {
  const c=state.dailySavingRules;
  const valid=c&&[c.min,c.max,c.surcharge].every(n=>Number.isFinite(n)&&Math.abs(n*100-Math.round(n*100))<0.000001)&&c.min>=0.01&&c.max>=c.min&&c.max<=100000&&c.surcharge>=0&&c.surcharge<=100000;
  return valid?c:{min:1,max:1.5,surcharge:5};
}
function dailyDepositLimits(profile) {
  const recoveryFor = missedDepositDay(profile);
  const rules=dailySavingRules(),surcharge=recoveryFor?rules.surcharge:0;
  return {min:rules.min+surcharge,max:rules.max+surcharge,surcharge,recoveryFor};
}
(() => {
  const original = updateSpecialControls;
  updateSpecialControls = function() {
    original();
    const limits = dailyDepositLimits(selectedDepositProfile());
    const type = document.getElementById('depositType');
    type.querySelector('option[value="daily"]').textContent = limits.recoveryFor
      ? 'Ahorro diario + '+soles(limits.surcharge)+' por el día olvidado' : 'Ahorro diario · '+soles(limits.min)+' a '+soles(limits.max);
    if (type.value === 'special') return;
    const input = document.getElementById('amount');
    input.min = String(limits.min); input.max = String(limits.max);
    input.placeholder = 'Entre ' + soles(limits.min) + ' y ' + soles(limits.max);
    document.getElementById('depositAmountHint').textContent = limits.recoveryFor
      ? 'Ayer no registraste un depósito. Hoy debes agregar '+soles(limits.surcharge)+': total de '+soles(limits.min)+' a '+soles(limits.max)+'.'
      : 'Depósito diario: mínimo '+soles(limits.min)+' y máximo '+soles(limits.max)+'.';
  };
  setInterval(() => {
    if (window.loveGateUnlocked) updateSpecialControls();
  }, 1000);
  updateSpecialControls();
})();

