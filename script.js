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

let lastNewSellerState = null;
let lastLeaderState = null;

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBarChart(canvas, labels, values, options = {}) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  const paddingX = 26;
  const paddingY = 24;
  const chartW = width - paddingX * 2;
  const chartH = height - paddingY * 2;
  const maxValue = Math.max(options.max || 0, ...values, 1);
  const headroom = options.headroom || 1.12;
  const max = maxValue * headroom;

  ctx.strokeStyle = "#e7ecf4";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 3; i += 1) {
    const y = paddingY + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(paddingX + chartW, y);
    ctx.stroke();
  }

  const count = values.length;
  const slot = chartW / count;
  const barWidth = slot * 0.62;
  const gap = slot - barWidth;
  const colors = options.colors || [];

  values.forEach((value, index) => {
    const safeValue = Math.max(value, 0);
    const barHeight = (safeValue / max) * chartH;
    const x = paddingX + index * slot + gap / 2;
    const y = paddingY + chartH - barHeight;
    const color = colors[index] || "#c7d2e5";

    ctx.fillStyle = color;
    drawRoundedRect(ctx, x, y, barWidth, barHeight, 8);
    ctx.fill();
  });

  ctx.fillStyle = "#1b2f4b";
  ctx.font = "12px Lexend, sans-serif";
  ctx.textAlign = "center";
  values.forEach((value, index) => {
    const safeValue = Math.max(value, 0);
    const barHeight = (safeValue / max) * chartH;
    const x = paddingX + index * slot + slot / 2;
    const y = Math.max(paddingY + chartH - barHeight - 6, 12);
    ctx.fillText(String(value), x, y);
  });

  ctx.fillStyle = "#5b6b82";
  ctx.font = "11px Lexend, sans-serif";
  labels.forEach((label, index) => {
    const x = paddingX + index * slot + slot / 2;
    const y = height - 6;
    ctx.fillText(label, x, y);
  });
}

function drawNewSellerCharts(state) {
  const monthlyCanvas = document.getElementById("new-chart-monthly");
  const dailyCanvas = document.getElementById("new-chart-daily");
  const monthTotal = state.monthSalesTotal;

  drawBarChart(
    monthlyCanvas,
    ["Actual", "Meta 60", "Meta 80", "Meta 100"],
    [monthTotal, 60, 80, 100],
    {
      max: Math.max(100, monthTotal),
      colors: ["#1d4ed8", "#c7d2e5", "#c7d2e5", "#c7d2e5"]
    }
  );

  drawBarChart(
    dailyCanvas,
    ["Hoy", "Meta 3", "Meta 5"],
    [state.sales, 3, 5],
    {
      max: Math.max(5, state.sales),
      colors: ["#f28a2e", "#c7d2e5", "#c7d2e5"]
    }
  );
}

function drawLeaderCharts(state) {
  const dailyCanvas = document.getElementById("leader-chart-daily");
  const monthlyCanvas = document.getElementById("leader-chart-monthly");
  const teamLabels = state.teamSalesList.map((_, index) => `V${index + 1}`);
  const salesLabels = [...teamLabels, "Total"];
  const salesValues = [...state.teamSalesList, state.teamTotalUnits];
  const salesColors = salesValues.map((_, index) =>
    index === salesValues.length - 1 ? "#1d4ed8" : "#c7d2e5"
  );

  drawBarChart(dailyCanvas, salesLabels, salesValues, {
    max: Math.max(state.teamTotalUnits, ...salesValues, 1),
    colors: salesColors
  });

  const payLabels = [...teamLabels, "Total"];
  const payValues = [...state.teamPayoutList, state.teamCommission];
  const payColors = payValues.map((_, index) =>
    index === payValues.length - 1 ? "#0b3ea8" : "#f28a2e"
  );

  drawBarChart(monthlyCanvas, payLabels, payValues, {
    max: Math.max(state.teamCommission, ...payValues, 1),
    colors: payColors
  });
}

window.addEventListener("resize", () => {
  if (lastNewSellerState) drawNewSellerCharts(lastNewSellerState);
  if (lastLeaderState) drawLeaderCharts(lastLeaderState);
});

function getNewSellerBonus(units) {
  if (units >= 100) return 2200;
  if (units >= 80) return 1200;
  if (units >= 60) return 600;
  return 0;
}

function getNewSellerRate(units) {
  if (units <= 0) return 0;
  return 30;
}

function getNewSellerLevel(units) {
  return "30 Bs por frasco";
}

function getLeaderSellerRate(units) {
  if (units >= 100) return 10;
  if (units >= 80) return 7;
  if (units >= 60) return 5;
  return 5;
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
  if (units < 100) {
    const missing = 100 - units;
    return `Meta alta: te faltan ${missing} frasco${missing === 1 ? "" : "s"} para bono de +2,200 Bs.`;
  }
  return "Excelente: ya activaste el bono mensual maximo de +2,200 Bs.";
}

function getProjectedGoalMessage(projectedSales, monthSalesTotal, workdays) {
  const remainingDays = Math.max(30 - workdays, 0);

  if (projectedSales >= 100) {
    return "Con este ritmo proyectas meta elite (100+). Excelente rendimiento comercial.";
  }
  if (projectedSales >= 80) {
    return "Con este ritmo proyectas meta fuerte (80-99). Empuja para cerrar en 100+.";
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
    const workdays = Math.min(Math.max(workdaysRaw || 1, 1), 30);
    workdaysInput.value = String(workdays);
    const level = getNewSellerLevel(sales);
    const rate = getNewSellerRate(sales);
    const commission = sales * rate;
    const monthSalesTotal = monthSalesPrev + sales;
    const bonus = getNewSellerBonus(monthSalesTotal);
    const total = commission;
    const monthIncomeBaseTotal = monthIncomePrev + total;
    const monthIncomeTotal = monthIncomeBaseTotal + bonus;
    const projectedSales = Math.round(safeDiv(monthSalesTotal, workdays) * 30);
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

    lastNewSellerState = { sales, monthSalesTotal };
    drawNewSellerCharts(lastNewSellerState);
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
  const totalEl = document.getElementById("leader-total");
  const teamSalesTotalEl = document.getElementById("leader-team-sales-total");
  const v1PayEl = document.getElementById("leader-v1-pay");
  const v2PayEl = document.getElementById("leader-v2-pay");
  const v3PayEl = document.getElementById("leader-v3-pay");
  const monthTeamSalesTotalEl = document.getElementById("leader-month-team-sales-total");

  if (
    !ownInput ||
    teamInputs.length === 0 ||
    !ownEl ||
    !teamEl ||
    !totalEl ||
    !teamSalesTotalEl ||
    !v1PayEl ||
    !v2PayEl ||
    !v3PayEl ||
    !monthTeamSalesTotalEl
  ) return;

  const update = () => {
    const ownSales = toNumber(ownInput.value);
    const teamSalesList = teamInputs.map((input) => toNumber(input.value));
    const teamTotalUnits = teamSalesList.reduce((sum, val) => sum + val, 0);

    const ownCommission = ownSales * 30;
    const teamRateList = teamSalesList.map((sales) => getLeaderSellerRate(sales));
    const teamPayoutList = teamSalesList.map((sales, index) => sales * teamRateList[index]);
    const teamCommission = teamPayoutList.reduce((sum, pay) => sum + pay, 0);
    const total = ownCommission + teamCommission;

    ownEl.textContent = formatBs(ownCommission);
    teamEl.textContent = formatBs(teamCommission);
    totalEl.textContent = formatBs(total);
    teamSalesTotalEl.textContent = formatUnits(teamTotalUnits);
    v1PayEl.textContent = formatBs(teamPayoutList[0] || 0);
    v2PayEl.textContent = formatBs(teamPayoutList[1] || 0);
    v3PayEl.textContent = formatBs(teamPayoutList[2] || 0);
    monthTeamSalesTotalEl.textContent = formatUnits(teamTotalUnits);

    lastLeaderState = {
      ownSales,
      teamSalesList,
      teamPayoutList,
      teamTotalUnits,
      teamCommission
    };
    drawLeaderCharts(lastLeaderState);
  };

  ownInput.addEventListener("input", update);
  teamInputs.forEach((input) => input.addEventListener("input", update));
  update();
}

document.addEventListener("DOMContentLoaded", () => {
  runNewSellerCalculator();
  runLeaderCalculator();
});
