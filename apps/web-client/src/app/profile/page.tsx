import type { Metadata } from "next";
import { ProfileManagement } from "@/features/family/profile/profile-management";

export const metadata: Metadata = { title: "Мій профіль" };

export default function ProfilePage() {
  return <ProfileManagement />;
}
