import { z } from "zod";
import type { OrganizationId } from "../../accounts";
import type { BidId } from "./bid";

/** Same limits as the `org-files` bucket (migration 20261121000100). */
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const ALLOWED_DOCUMENT_TYPES: Readonly<Record<string, string>> = {
  "application/pdf": "PDF",
  "application/msword": "Word",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word",
  "application/vnd.ms-excel": "Excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
  "application/vnd.rar": "RAR",
  "application/x-rar-compressed": "RAR",
  "image/jpeg": "Imagen",
  "image/png": "Imagen",
};

export const documentUploadSchema = z.object({
  name: z.string().trim().min(1, "El archivo no tiene nombre.").max(200, "El nombre es muy largo."),
  size: z
    .number()
    .int()
    .positive("El archivo está vacío.")
    .max(MAX_DOCUMENT_BYTES, "El archivo pesa más de 25 MB. Comprímelo o divídelo."),
  contentType: z.string().refine((type) => type in ALLOWED_DOCUMENT_TYPES, {
    message: "Ese tipo de archivo no se admite. Sube PDF, Word, Excel, ZIP, RAR o imágenes.",
  }),
});

export type DocumentUpload = z.infer<typeof documentUploadSchema>;

/** Folder of a bid in the bucket; the policies check the first segment. */
export function bidFolder(organizationId: OrganizationId, bidId: BidId): string {
  return `${organizationId}/bids/${bidId}/`;
}

/** Storage keys are ASCII-safe; the original name is kept apart for display. */
export function storageFileName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "archivo").slice(-100);
}
