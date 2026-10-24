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
  const entries = state.entries.filter(item => depositProfile(item) === profile);
  // No se considera un olvido antes de que esa persona empezara a ahorrar.
  if (!entries.some(item => savingsPeruDay(item.date) && savingsPeruDay(item.date) < day)) return null;
  if (entries.some(item => savingsPeruDay(item.date) === day || item.recoveryFor === day)) return null;
  if (entries.some(item => item.depositType !== 'special' && savingsPeruDay(item.date) === today)) return null;
  return day;
}
function dailyDepositLimits(profile) {
  const recoveryFor = missedDepositDay(profile);
  return {min:recoveryFor ? 6 : 1, max:recoveryFor ? 6.5 : 1.5, recoveryFor};
}
(() => {
  const original = updateSpecialControls;
  updateSpecialControls = function() {
    original();
    const limits = dailyDepositLimits(selectedDepositProfile());
    const type = document.getElementById('depositType');
    type.querySelector('option[value="daily"]').textContent = limits.recoveryFor
      ? 'Ahorro diario + S/ 5 por el día olvidado' : 'Ahorro diario · S/ 1.00 a S/ 1.50';
    if (type.value === 'special') return;
    const input = document.getElementById('amount');
    input.min = String(limits.min); input.max = String(limits.max);
    input.placeholder = 'Entre ' + soles(limits.min) + ' y ' + soles(limits.max);
    document.getElementById('depositAmountHint').textContent = limits.recoveryFor
      ? 'Ayer no registraste un depósito. Hoy debes agregar S/ 5 al ahorro diario: total de S/ 6.00 a S/ 6.50.'
      : 'Depósito diario: mínimo S/ 1.00 y máximo S/ 1.50.';
  };
  setInterval(() => {
    if (window.loveGateUnlocked) updateSpecialControls();
  }, 1000);
  updateSpecialControls();
})();
