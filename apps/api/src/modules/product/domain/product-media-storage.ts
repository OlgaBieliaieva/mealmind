export interface ProductMediaStorage {
  createUploadUrl(
    objectPath: string,
  ): Promise<{ readonly uploadUrl: string; readonly token: string }>;
  createReadUrl(objectPath: string): Promise<string>;
  read(objectPath: string): Promise<Buffer>;
  write(objectPath: string, data: Buffer, mimeType: string): Promise<void>;
  remove(objectPaths: readonly string[]): Promise<void>;
}

export function thumbnailObjectPath(originalObjectPath: string): string {
  return `${originalObjectPath}.thumbnail.webp`;
}
