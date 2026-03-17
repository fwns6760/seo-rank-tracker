"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardTrendPoint = {
  date: string;
  averagePosition: number | null;
  improvedKeywords: number;
  declinedKeywords: number;
};

type DashboardTrendChartProps = {
  points: DashboardTrendPoint[];
  title: string;
  subtitle: string;
};

function formatDateLabel(value: string) {
  return value.slice(5);
}

export function DashboardTrendChart({
  points,
  title,
  subtitle,
}: DashboardTrendChartProps) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="mt-5 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 4, right: 16, top: 8, bottom: 8 }}>
            <CartesianGrid stroke="rgba(15, 23, 42, 0.08)" strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={24}
              tickFormatter={formatDateLabel}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              reversed
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: "1px solid rgba(15, 23, 42, 0.08)",
                background: "rgba(255,255,255,0.96)",
              }}
              formatter={(value, name) => {
                const numericValue =
                  typeof value === "number"
                    ? value
                    : value === undefined
                      ? null
                      : Number(value);

                if (name === "averagePosition") {
                  return [
                    numericValue === null ? "--" : numericValue.toFixed(2),
                    "平均順位",
                  ];
                }

                if (name === "improvedKeywords") {
                  return [numericValue ?? 0, "上昇数"];
                }

                return [numericValue ?? 0, "下落数"];
              }}
              labelFormatter={(value) => `日付: ${value}`}
            />
            <Line
              dataKey="averagePosition"
              dot={false}
              name="averagePosition"
              stroke="hsl(201 73% 24%)"
              strokeLinecap="round"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              dataKey="improvedKeywords"
              dot={false}
              name="improvedKeywords"
              stroke="hsl(146 47% 36%)"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="declinedKeywords"
              dot={false}
              name="declinedKeywords"
              stroke="hsl(12 75% 55%)"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
