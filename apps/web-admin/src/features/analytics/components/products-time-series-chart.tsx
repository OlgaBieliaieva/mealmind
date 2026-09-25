"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ProductsAnalytics } from "../api/admin-analytics";

export function ProductsTimeSeriesChart({
  series,
}: {
  readonly series: ProductsAnalytics["series"];
}) {
  if (series.length === 0)
    return <p className="analytics-empty">За обраний період продуктів не додано.</p>;

  return (
    <>
      <div className="analytics-chart" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 12, right: 16, bottom: 12, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" tickFormatter={shortDate} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(value) => formatDate(String(value))} />
            <Bar name="Продукти" dataKey="value" fill="#2563eb" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="analytics-data-table">
        <summary>Показати дані графіка таблицею</summary>
        <div className="analytics-table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Період</th>
                <th scope="col">Додано продуктів</th>
              </tr>
            </thead>
            <tbody>
              {series.map((point) => (
                <tr key={point.period}>
                  <th scope="row">{formatDate(point.period)}</th>
                  <td>{point.value}</td>
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
