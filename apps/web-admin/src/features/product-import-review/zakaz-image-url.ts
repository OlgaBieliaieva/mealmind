const ZAKAZ_IMAGE_HOST_PATTERN = /^img\d+\.zakaz\.ua$/u;

export function safeZakazImageUrl(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const source = new URL(value.trim());
    const hostname = source.hostname.toLowerCase();
    if (
      source.protocol !== "https:" ||
      !ZAKAZ_IMAGE_HOST_PATTERN.test(hostname) ||
      source.username !== "" ||
      source.password !== "" ||
      source.port !== "" ||
      source.search !== "" ||
      source.hash !== ""
    ) {
      return null;
    }

    const pathname = source.pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return `https://${hostname}${pathname}`;
  } catch {
    return null;
  }
}
