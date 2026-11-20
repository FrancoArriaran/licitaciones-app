import type { FileStorage } from "@licitaciones/core/bids";
import type { DbClient } from "../supabase/client";

/** How long a download link works: enough to open it, too short to share around. */
const DOWNLOAD_URL_SECONDS = 60;

/**
 * Private bucket `org-files`. Runs with the user's session, so the storage policies
 * (first folder = organization) decide access, as with the tables.
 */
export class SupabaseFileStorage implements FileStorage {
  constructor(
    private readonly db: DbClient,
    private readonly bucket = "org-files",
  ) {}

  private get files() {
    return this.db.storage.from(this.bucket);
  }

  async createUploadUrl(path: string) {
    const { data, error } = await this.files.createSignedUploadUrl(path);
    if (error) throw new Error(`storage.createUploadUrl failed: ${error.message}`);
    return { signedUrl: data.signedUrl, token: data.token };
  }

  async sizeOf(path: string) {
    const { data, error } = await this.files.info(path);
    if (error) return null;
    return data.size ?? null;
  }

  async createDownloadUrl(path: string, downloadName: string) {
    const { data, error } = await this.files.createSignedUrl(path, DOWNLOAD_URL_SECONDS, {
      download: downloadName,
    });
    if (error) throw new Error(`storage.createDownloadUrl failed: ${error.message}`);
    return data.signedUrl;
  }

  async remove(path: string) {
    const { error } = await this.files.remove([path]);
    if (error) throw new Error(`storage.remove failed: ${error.message}`);
  }
}
