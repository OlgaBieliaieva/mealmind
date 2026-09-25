import { Card } from "@/shared/ui";

export function MetricCard({
  label,
  value,
  description,
  secondary,
}: {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly secondary?: string;
}) {
  return (
    <Card className="analytics-metric" padding="compact">
      <p className="analytics-metric__label">{label}</p>
      <p className="analytics-metric__value">{value}</p>
      {secondary ? <p className="analytics-metric__secondary">{secondary}</p> : null}
      <p className="analytics-metric__description">{description}</p>
    </Card>
  );
}
