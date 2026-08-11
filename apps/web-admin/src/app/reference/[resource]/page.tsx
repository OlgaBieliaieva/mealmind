import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { REFERENCE_CONFIGS } from "@/features/reference/reference-config";
import { ReferenceManager } from "@/features/reference/reference-manager";
import { REFERENCE_RESOURCES, type ReferenceResource } from "@/shared/api/reference-data";

interface ReferenceResourcePageProps {
  readonly params: Promise<{ readonly resource: string }>;
}

export async function generateMetadata({ params }: ReferenceResourcePageProps): Promise<Metadata> {
  const { resource } = await params;
  return isReferenceResource(resource)
    ? { title: REFERENCE_CONFIGS[resource].label }
    : { title: "Довідник" };
}

export default async function ReferenceResourcePage({ params }: ReferenceResourcePageProps) {
  const { resource } = await params;
  if (!isReferenceResource(resource)) notFound();
  return <ReferenceManager resource={resource} />;
}

function isReferenceResource(value: string): value is ReferenceResource {
  return REFERENCE_RESOURCES.some((resource) => resource === value);
}
