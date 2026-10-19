import type { ReactNode } from "react";

import { safeZakazImageUrl } from "./zakaz-image-url";

export interface ZakazSourceImageProps {
  readonly sourceUrl: string | null | undefined;
  readonly alt: string;
  readonly className?: string;
  readonly width?: number;
  readonly height?: number;
  readonly fallback?: ReactNode;
}

export function ZakazSourceImage({
  sourceUrl,
  alt,
  className,
  width,
  height,
  fallback = null,
}: ZakazSourceImageProps) {
  const safeUrl = safeZakazImageUrl(sourceUrl);
  if (safeUrl === null) return fallback;

  return (
    // Zakaz source images are rendered only after protocol, host and path validation.
    // eslint-disable-next-line @next/next/no-img-element
    <img className={className} src={safeUrl} alt={alt} width={width} height={height} />
  );
}
