import { ManagedProfileManagement } from "@/features/family/profile/managed-profile-management";

interface PageProps {
  readonly params: Promise<{
    readonly memberId: string;
  }>;
}

export default async function FamilyMemberProfilePage({ params }: PageProps) {
  const { memberId } = await params;

  return <ManagedProfileManagement memberId={memberId} />;
}
