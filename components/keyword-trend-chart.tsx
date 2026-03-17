"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type KeywordTrendPoint = {
  date: string;
  averagePosition: number | null;
  averageScrapePosition: number | null;
  clicks: number;
  impressions: number;
};

type RewriteMarker = {
  rewriteDate: string;
  rewriteType: string;
  url: string;
};

type KeywordTrendChartProps = {
  points: KeywordTrendPoint[];
  markers: RewriteMarker[];
};

function formatDateLabel(value: string) {
  return value.slice(5);
}

export function KeywordTrendChart({
  points,
  markers,
}: KeywordTrendChartProps) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">
          キーワード別順位推移
        </h3>
        <p className="text-sm text-muted-foreground">
          実線は GSC 平均順位、破線は補助データのスクレイピング順位です。金色の縦線は rewrite 実施日です。
        </p>
      </div>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ left: 4, right: 18, top: 8, bottom: 8 }}>
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
              width={38}
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
                    "GSC 平均順位",
                  ];
                }

                if (name === "averageScrapePosition") {
                  return [
                    numericValue === null ? "未取得" : numericValue.toFixed(2),
                    "スクレイピング順位",
                  ];
                }

                if (name === "clicks") {
                  return [numericValue ?? 0, "クリック数"];
                }

                return [numericValue ?? 0, "表示回数"];
              }}
              labelFormatter={(value) => `日付: ${value}`}
            />
            <Legend />
            {markers.map((marker) => (
              <ReferenceLine
                key={`${marker.rewriteDate}:${marker.url}:${marker.rewriteType}`}
                ifOverflow="extendDomain"
                stroke="hsl(31 86% 50%)"
                strokeDasharray="5 5"
                strokeOpacity={0.9}
                x={marker.rewriteDate}
              />
            ))}
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
              connectNulls={false}
              dataKey="averageScrapePosition"
              dot={false}
              name="averageScrapePosition"
              stroke="hsl(16 78% 50%)"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="clicks"
              dot={false}
              name="clicks"
              stroke="hsl(146 47% 36%)"
              strokeLinecap="round"
              strokeOpacity={0.6}
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="impressions"
              dot={false}
              name="impressions"
              stroke="hsl(270 45% 43%)"
              strokeLinecap="round"
              strokeOpacity={0.35}
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

