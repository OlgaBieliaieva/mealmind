"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { UsersAnalytics } from "../api/admin-analytics";

export function UsersTimeSeriesChart({ series }: { readonly series: UsersAnalytics["series"] }) {
  if (series.length === 0)
    return <p className="analytics-empty">За обраний період подій створення немає.</p>;

  return (
    <>
      <div className="analytics-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tickFormatter={shortDate} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(value) => formatDate(String(value))} />
            <Legend />
            <Line name="Користувачі" dataKey="users" stroke="#2563eb" strokeWidth={2} />
            <Line name="Сім’ї" dataKey="families" stroke="#16a34a" strokeWidth={2} />
            <Line name="Профілі" dataKey="profiles" stroke="#9333ea" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details className="analytics-data-table">
        <summary>Показати дані графіка таблицею</summary>
        <div className="analytics-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Період</th>
                <th scope="col">Користувачі</th>
                <th scope="col">Сім’ї</th>
                <th scope="col">Профілі</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.period}>
                  <th scope="row">{formatDate(point.period)}</th>
                  <td>{point.users}</td>
                  <td>{point.families}</td>
                  <td>{point.profiles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", { month: "short", day: "numeric" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("uk-UA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}
