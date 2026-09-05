import type { Metadata } from "next";
import { ConsumptionDiaryScreen } from "@/features/consumption/consumption-diary-screen";

export const metadata: Metadata = { title: "Щоденник харчування" };
export default function DiaryPage() {
  return <ConsumptionDiaryScreen />;
}
