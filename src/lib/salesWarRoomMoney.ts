const ONE_MILLION = 1_000_000;
const LEGACY_DOUBLE_SCALE_THRESHOLD = 1_000_000_000_000;

export function normalizeSalesValue(value: unknown) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return amount >= LEGACY_DOUBLE_SCALE_THRESHOLD ? amount / ONE_MILLION : amount;
}

export function salesInputToEgp(value: string) {
  if (!String(value || "").trim()) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount >= ONE_MILLION ? amount : amount * ONE_MILLION);
}

export function salesValueToMillions(value: unknown) {
  const amount = normalizeSalesValue(value);
  return amount ? String(amount / ONE_MILLION) : "";
}

export function formatSalesEgp(value: unknown) {
  const amount = normalizeSalesValue(value);
  if (amount >= 1_000_000_000) {
    const shown = amount / 1_000_000_000;
    return `EGP ${Number.isInteger(shown) ? shown : shown.toFixed(1)}B`;
  }
  if (amount >= ONE_MILLION) {
    const shown = amount / ONE_MILLION;
    return `EGP ${Number.isInteger(shown) ? shown : shown.toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    const shown = amount / 1_000;
    return `EGP ${Number.isInteger(shown) ? shown : shown.toFixed(1)}K`;
  }
  return `EGP ${amount.toLocaleString()}`;
}

export function normalizeSalesTotals(totals: any) {
  if (!totals) return totals;
  const agents = (totals.agents || []).map((agent: any) => ({
    ...agent,
    expected_sales: normalizeSalesValue(agent.expected_sales),
    won_sales: normalizeSalesValue(agent.won_sales),
    lost_sales: normalizeSalesValue(agent.lost_sales),
  }));
  const sum = (key: "expected_sales" | "won_sales" | "lost_sales") =>
    agents.reduce((total: number, agent: any) => total + Number(agent[key] || 0), 0);

  return {
    ...totals,
    agents,
    team: {
      ...(totals.team || {}),
      expected_sales: sum("expected_sales"),
      won_sales: sum("won_sales"),
      lost_sales: sum("lost_sales"),
    },
  };
}
