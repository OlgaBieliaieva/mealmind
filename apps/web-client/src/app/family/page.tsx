import type { Metadata } from "next";
import { FamilyManagement } from "@/features/family/family-management";

export const metadata: Metadata = { title: "Моя сім’я" };

export default function FamilyPage() {
  return <FamilyManagement />;
}
