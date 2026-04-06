function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function formatBs(value) {
  return `${value.toLocaleString("es-BO")} Bs`;
}

function formatUnits(value) {
  return `${value} frasco${value === 1 ? "" : "s"}`;
}

function safeDiv(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 0;
  return num / den;
}

function calcProgressive(units, tiers) {
  let remaining = units;
  let total = 0;
  let previousCap = 0;

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const cap = tier.upTo;
    const tierUnits =
      cap === Infinity
        ? remaining
        : Math.max(Math.min(units, cap) - previousCap, 0);

    total += tierUnits * tier.rate;
    remaining -= tierUnits;
    previousCap = cap;
  }

  return total;
}

function getNewSellerBonus(units) {
  if (units >= 110) return 2200;
  if (units >= 80) return 1200;
  if (units >= 60) return 600;
  return 0;
}

function getNewSellerRate(units) {
  if (units <= 0) return 0;
  return 30;
}

function getNewSellerLevel(units) {
  if (units <= 0) return "Sin ventas";
  return "Fijo 30 Bs";
}

function getLeaderTeamBonus(totalUnits) {
  if (totalUnits >= 180) return 800;
  if (totalUnits >= 150) return 500;
  if (totalUnits >= 120) return 300;
  return 0;
}

function getNewSellerNextLevelMessage(units) {
  if (units <= 0) return "Comision diaria fija: cada venta se paga a 30 Bs.";
  return "Comision diaria fija activa: todas tus ventas de hoy valen 30 Bs por frasco.";
}

function getNewSellerNextBonusMessage(units) {
  if (units < 60) {
    const missing = 60 - units;
    return `Meta mensual base: te faltan ${missing} frasco${missing === 1 ? "" : "s"} para bono de +600 Bs.`;
  }
  if (units < 80) {
    const missing = 80 - units;
    return `Buen avance mensual: te faltan ${missing} frasco${missing === 1 ? "" : "s"} para bono de +1,200 Bs.`;
  }
  if (units < 110) {
    const missing = 110 - units;
    return `Meta alta: te faltan ${missing} frasco${missing === 1 ? "" : "s"} para bono de +2,200 Bs.`;
  }
  return "Excelente: ya activaste el bono mensual maximo de +2,200 Bs.";
}

function getLeaderNextGoalMessage(totalUnits) {
  if (totalUnits < 120) {
    const missing = 120 - totalUnits;
    return `Meta mensual equipo: faltan ${missing} frasco${missing === 1 ? "" : "s"} para bono de +300 Bs.`;
  }
  if (totalUnits < 150) {
    const missing = 150 - totalUnits;
    return `Buen avance mensual: faltan ${missing} frasco${missing === 1 ? "" : "s"} para bono de +500 Bs.`;
  }
  if (totalUnits < 180) {
    const missing = 180 - totalUnits;
    return `Meta alta equipo: faltan ${missing} frasco${missing === 1 ? "" : "s"} para bono de +800 Bs.`;
  }
  return "Excelente: bono mensual maximo de equipo (+800 Bs) activo.";
}

function getProjectedGoalMessage(projectedSales, monthSalesTotal, workdays) {
  const remainingDays = Math.max(22 - workdays, 0);

  if (projectedSales >= 110) {
    return "Con este ritmo proyectas meta elite (110+). Excelente rendimiento comercial.";
  }
  if (projectedSales >= 80) {
    return "Con este ritmo proyectas meta fuerte (80-109). Empuja para cerrar en 110+.";
  }
  if (projectedSales >= 60) {
    return "Con este ritmo proyectas meta base (60-79). Buen avance.";
  }

  const missing = 60 - monthSalesTotal;
  if (remainingDays <= 0) {
    return "Mes casi cerrado: enfocate en cerrar mas frascos hoy para alcanzar 60+.";
  }
  const needPerDay = Math.max(safeDiv(missing, remainingDays), 0);
  return `Con tu ritmo actual no llegas a 60. Necesitas promediar ${needPerDay.toFixed(1)} frascos/dia en los ${remainingDays} dias restantes.`;
}

function runNewSellerCalculator() {
  const input = document.getElementById("new-sales");
  const levelEl = document.getElementById("new-level");
  const rateEl = document.getElementById("new-rate");
  const commissionEl = document.getElementById("new-commission");
  const bonusEl = document.getElementById("new-bonus");
  const totalEl = document.getElementById("new-total");
  const monthSalesPrevInput = document.getElementById("new-month-sales-prev");
  const monthIncomePrevInput = document.getElementById("new-month-income-prev");
  const workdaysInput = document.getElementById("new-workdays");
  const summarySalesEl = document.getElementById("new-summary-sales");
  const summaryFormulaEl = document.getElementById("new-summary-formula");
  const monthSalesTotalEl = document.getElementById("new-month-sales-total");
  const workdaysShowEl = document.getElementById("new-workdays-show");
  const monthIncomeBaseTotalEl = document.getElementById("new-month-income-base-total");
  const monthIncomeTotalEl = document.getElementById("new-month-income-total");
  const projectionSalesEl = document.getElementById("new-projection-sales");
  const projectionBonusEl = document.getElementById("new-projection-bonus");
  const nextLevelEl = document.getElementById("new-next-level");
  const nextBonusEl = document.getElementById("new-next-bonus");
  const projectionNoteEl = document.getElementById("new-projection-note");

  if (
    !input ||
    !levelEl ||
    !rateEl ||
    !commissionEl ||
    !bonusEl ||
    !totalEl ||
    !monthSalesPrevInput ||
    !monthIncomePrevInput ||
    !workdaysInput ||
    !summarySalesEl ||
    !summaryFormulaEl ||
    !monthSalesTotalEl ||
    !workdaysShowEl ||
    !monthIncomeBaseTotalEl ||
    !monthIncomeTotalEl ||
    !projectionSalesEl ||
    !projectionBonusEl ||
    !nextLevelEl ||
    !nextBonusEl ||
    !projectionNoteEl
  ) return;

  const update = () => {
    const sales = toNumber(input.value);
    const monthSalesPrev = toNumber(monthSalesPrevInput.value);
    const monthIncomePrev = toNumber(monthIncomePrevInput.value);
    const workdaysRaw = toNumber(workdaysInput.value);
    const workdays = Math.min(Math.max(workdaysRaw || 1, 1), 22);
    workdaysInput.value = String(workdays);
    const level = getNewSellerLevel(sales);
    const rate = getNewSellerRate(sales);
    const commission = sales * rate;
    const monthSalesTotal = monthSalesPrev + sales;
    const bonus = getNewSellerBonus(monthSalesTotal);
    const total = commission;
    const monthIncomeBaseTotal = monthIncomePrev + total;
    const monthIncomeTotal = monthIncomeBaseTotal + bonus;
    const projectedSales = Math.round(safeDiv(monthSalesTotal, workdays) * 22);
    const projectedBonus = getNewSellerBonus(projectedSales);

    levelEl.textContent = level;
    rateEl.textContent = formatBs(rate);
    commissionEl.textContent = formatBs(commission);
    bonusEl.textContent = formatBs(bonus);
    totalEl.textContent = formatBs(total);
    summarySalesEl.textContent = formatUnits(sales);
    summaryFormulaEl.textContent = `${sales} x ${rate} Bs = ${commission} Bs`;
    monthSalesTotalEl.textContent = formatUnits(monthSalesTotal);
    workdaysShowEl.textContent = `${workdays} dia${workdays === 1 ? "" : "s"}`;
    monthIncomeBaseTotalEl.textContent = formatBs(monthIncomeBaseTotal);
    monthIncomeTotalEl.textContent = formatBs(monthIncomeTotal);
    projectionSalesEl.textContent = formatUnits(projectedSales);
    projectionBonusEl.textContent = formatBs(projectedBonus);
    nextLevelEl.textContent = getNewSellerNextLevelMessage(sales);
    nextBonusEl.textContent = getNewSellerNextBonusMessage(monthSalesTotal);
    projectionNoteEl.textContent = getProjectedGoalMessage(projectedSales, monthSalesTotal, workdays);
  };

  input.addEventListener("input", update);
  monthSalesPrevInput.addEventListener("input", update);
  monthIncomePrevInput.addEventListener("input", update);
  workdaysInput.addEventListener("input", update);
  update();
}

function runLeaderCalculator() {
  const ownInput = document.getElementById("leader-own-sales");
  const teamInputs = Array.from(document.querySelectorAll(".leader-team-sales"));
  const ownEl = document.getElementById("leader-own-commission");
  const teamEl = document.getElementById("leader-team-commission");
  const bonusEl = document.getElementById("leader-team-bonus");
  const totalEl = document.getElementById("leader-total");
  const monthTeamSalesPrevInput = document.getElementById("leader-month-team-sales-prev");
  const monthIncomePrevInput = document.getElementById("leader-month-income-prev");
  const teamSalesTotalEl = document.getElementById("leader-team-sales-total");
  const v1PayEl = document.getElementById("leader-v1-pay");
  const v2PayEl = document.getElementById("leader-v2-pay");
  const v3PayEl = document.getElementById("leader-v3-pay");
  const monthTeamSalesTotalEl = document.getElementById("leader-month-team-sales-total");
  const monthIncomeBaseTotalEl = document.getElementById("leader-month-income-base-total");
  const monthIncomeTotalEl = document.getElementById("leader-month-income-total");
  const nextTeamGoalEl = document.getElementById("leader-next-team-goal");

  if (
    !ownInput ||
    teamInputs.length === 0 ||
    !ownEl ||
    !teamEl ||
    !bonusEl ||
    !totalEl ||
    !monthTeamSalesPrevInput ||
    !monthIncomePrevInput ||
    !teamSalesTotalEl ||
    !v1PayEl ||
    !v2PayEl ||
    !v3PayEl ||
    !monthTeamSalesTotalEl ||
    !monthIncomeBaseTotalEl ||
    !monthIncomeTotalEl ||
    !nextTeamGoalEl
  ) return;

  const mentorTiers = [
    { upTo: 4, rate: 5 },
    { upTo: 9, rate: 7 },
    { upTo: Infinity, rate: 10 }
  ];

  const update = () => {
    const ownSales = toNumber(ownInput.value);
    const teamSalesList = teamInputs.map((input) => toNumber(input.value));
    const monthTeamSalesPrev = toNumber(monthTeamSalesPrevInput.value);
    const monthIncomePrev = toNumber(monthIncomePrevInput.value);
    const teamTotalUnits = teamSalesList.reduce((sum, val) => sum + val, 0);

    const ownCommission = ownSales * 30;
    const teamPayoutList = teamSalesList.map((sales) => calcProgressive(sales, mentorTiers));
    const teamCommission = teamPayoutList.reduce((sum, pay) => sum + pay, 0);
    const monthTeamSalesTotal = monthTeamSalesPrev + teamTotalUnits;
    const teamBonus = getLeaderTeamBonus(monthTeamSalesTotal);
    const total = ownCommission + teamCommission;
    const monthIncomeBaseTotal = monthIncomePrev + total;
    const monthIncomeTotal = monthIncomeBaseTotal + teamBonus;

    ownEl.textContent = formatBs(ownCommission);
    teamEl.textContent = formatBs(teamCommission);
    bonusEl.textContent = formatBs(teamBonus);
    totalEl.textContent = formatBs(total);
    teamSalesTotalEl.textContent = formatUnits(teamTotalUnits);
    v1PayEl.textContent = formatBs(teamPayoutList[0] || 0);
    v2PayEl.textContent = formatBs(teamPayoutList[1] || 0);
    v3PayEl.textContent = formatBs(teamPayoutList[2] || 0);
    monthTeamSalesTotalEl.textContent = formatUnits(monthTeamSalesTotal);
    monthIncomeBaseTotalEl.textContent = formatBs(monthIncomeBaseTotal);
    monthIncomeTotalEl.textContent = formatBs(monthIncomeTotal);
    nextTeamGoalEl.textContent = getLeaderNextGoalMessage(monthTeamSalesTotal);
  };

  ownInput.addEventListener("input", update);
  teamInputs.forEach((input) => input.addEventListener("input", update));
  monthTeamSalesPrevInput.addEventListener("input", update);
  monthIncomePrevInput.addEventListener("input", update);
  update();
}

document.addEventListener("DOMContentLoaded", () => {
  runNewSellerCalculator();
  runLeaderCalculator();
});
