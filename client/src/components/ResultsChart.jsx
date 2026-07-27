import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip
} from "recharts";

export default function ResultsChart({ dimensions }) {
  const data = [
    { metric: "Conformity", value: dimensions?.conformity ?? 0 },
    { metric: "Predictability", value: dimensions?.predictability ?? 0 },
    { metric: "Risk Tolerance", value: dimensions?.riskTolerance ?? 0 },
    { metric: "Transparency", value: dimensions?.transparency ?? 0 }
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.16)" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "#121218",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              color: "#fff"
            }}
          />
          <Radar
            dataKey="value"
            stroke="#06B6D4"
            fill="#06B6D4"
            fillOpacity={0.24}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
