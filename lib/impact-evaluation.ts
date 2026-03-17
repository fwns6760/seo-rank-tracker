import type { ImpactEvaluationLabel } from "@/lib/bq";

export function coerceMetricNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

export function formatMetricNumber(
  value: number | string | null | undefined,
  digits = 0,
) {
  const numeric = coerceMetricNumber(value);

  if (numeric === null) {
    return "--";
  }

  return numeric.toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPosition(value: number | string | null | undefined) {
  const numeric = coerceMetricNumber(value);

  if (numeric === null) {
    return "未取得";
  }

  return numeric.toLocaleString("ja-JP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPercent(value: number | string | null | undefined) {
  const numeric = coerceMetricNumber(value);

  if (numeric === null) {
    return "未取得";
  }

  return `${(numeric * 100).toLocaleString("ja-JP", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

export function formatSignedMetric(
  value: number | string | null | undefined,
  digits = 0,
) {
  const numeric = coerceMetricNumber(value);

  if (numeric === null) {
    return "--";
  }

  const prefix = numeric > 0 ? "+" : "";

  return `${prefix}${numeric.toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function formatSignedPercentPoint(
  value: number | string | null | undefined,
  digits = 1,
) {
  const numeric = coerceMetricNumber(value);

  if (numeric === null) {
    return "--";
  }

  const prefix = numeric > 0 ? "+" : "";

  return `${prefix}${(numeric * 100).toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}pt`;
}

export function getImpactEvaluationLabelText(label: ImpactEvaluationLabel) {
  switch (label) {
    case "positive":
      return "改善";
    case "negative":
      return "悪化";
    case "needs_review":
      return "要確認";
    case "insufficient_data":
      return "データ不足";
    case "mixed":
    default:
      return "横ばい";
  }
}

export function getImpactEvaluationBadgeTone(label: ImpactEvaluationLabel) {
  switch (label) {
    case "positive":
      return "border-emerald-300/70 bg-emerald-100 text-emerald-900";
    case "negative":
      return "border-destructive/40 bg-destructive/10 text-destructive";
    case "needs_review":
      return "border-amber-300/70 bg-amber-100 text-amber-900";
    case "insufficient_data":
      return "border-slate-300/70 bg-slate-100 text-slate-700";
    case "mixed":
    default:
      return "border-border/70 bg-background/80 text-foreground";
  }
}

export function getImpactEvaluationCardTone(label: ImpactEvaluationLabel) {
  switch (label) {
    case "positive":
      return "border-emerald-300/60 bg-emerald-50";
    case "negative":
      return "border-destructive/30 bg-destructive/5";
    case "needs_review":
      return "border-amber-300/60 bg-amber-50";
    case "insufficient_data":
      return "border-slate-300/60 bg-slate-50";
    case "mixed":
    default:
      return "border-border/70 bg-background/70";
  }
}
