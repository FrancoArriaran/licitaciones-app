"use client";

import { ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_BYTES } from "@licitaciones/core/bids";
import { formatDateLima, formatFileSize } from "@licitaciones/core/shared";
import { Button, cn } from "@licitaciones/ui";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type DragEvent } from "react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import {
  documentDownloadUrl,
  prepareDocumentUpload,
  registerDocument,
  removeDocument,
} from "../actions";
import type { BidDocumentView } from "../data";

type Upload = { key: string; name: string; state: "uploading" | "error"; message?: string };

const ACCEPT = Object.keys(ALLOWED_DOCUMENT_TYPES).join(",");

function kindOf(contentType: string | null): string {
  return (contentType && ALLOWED_DOCUMENT_TYPES[contentType]) ?? "Archivo";
}

/** Checks in the browser first, so a wrong file fails instantly instead of after uploading. */
function precheck(file: File): string | null {
  if (file.size === 0) return "El archivo está vacío.";
  if (file.size > MAX_DOCUMENT_BYTES) return "Pesa más de 25 MB. Comprímelo o divídelo.";
  if (!(file.type in ALLOWED_DOCUMENT_TYPES)) {
    return "Ese tipo de archivo no se admite. Sube PDF, Word, Excel, ZIP, RAR o imágenes.";
  }
  return null;
}

async function uploadOne(bidId: string, file: File): Promise<string | null> {
  const problem = precheck(file);
  if (problem) return problem;
  const meta = { name: file.name, size: file.size, contentType: file.type };

  const prepared = await prepareDocumentUpload(bidId, meta);
  if (!prepared.ok) return prepared.message;

  const { error } = await createBrowserSupabase()
    .storage.from("org-files")
    .uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type });
  if (error) return "No se pudo subir el archivo. Revisa tu conexión e inténtalo de nuevo.";

  const registered = await registerDocument(bidId, { ...meta, path: prepared.path });
  return registered.ok ? null : registered.message;
}

export function BidDocuments({
  bidId,
  documents,
  canEdit,
}: {
  bidId: string;
  documents: BidDocumentView[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function upload(files: FileList | File[]) {
    const list = [...files];
    if (list.length === 0) return;
    setMessage(null);
    const batch = list.map((file, index) => ({
      key: `${String(Date.now())}-${String(index)}`,
      name: file.name,
      state: "uploading" as const,
    }));
    setUploads((current) => [...batch, ...current]);

    await Promise.all(
      list.map(async (file, index) => {
        const key = batch[index]?.key ?? "";
        const problem = await uploadOne(bidId, file);
        setUploads((current) =>
          problem
            ? current.map((item) =>
                item.key === key ? { ...item, state: "error", message: problem } : item,
              )
            : current.filter((item) => item.key !== key),
        );
      }),
    );
    startTransition(() => {
      router.refresh();
    });
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (canEdit) void upload(event.dataTransfer.files);
  }

  async function download(documentId: string) {
    setBusy(documentId);
    const result = await documentDownloadUrl(documentId);
    setBusy(null);
    if (result.ok) window.location.assign(result.url);
    else setMessage(result.message);
  }

  async function remove(documentId: string) {
    setBusy(documentId);
    const result = await removeDocument(bidId, documentId);
    setBusy(null);
    setConfirming(null);
    if (!result.ok) setMessage(result.message);
  }

  return (
    <div className="flex flex-col gap-3">
      {canEdit && (
        <label
          htmlFor={inputId}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => {
            setDragging(false);
          }}
          onDrop={onDrop}
          className={cn(
            "border-border bg-surface flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
            "hover:border-primary/50 focus-within:ring-ring focus-within:ring-2",
            dragging && "border-primary bg-primary-soft",
          )}
        >
          <span className="text-sm font-medium">
            Arrastra tus archivos aquí o <span className="text-primary underline">elígelos</span>
          </span>
          <span className="text-muted text-xs">
            Propuesta, cartas, garantías, constancias. PDF, Word, Excel, ZIP, RAR o imágenes, hasta
            25 MB.
          </span>
          <input
            ref={input}
            id={inputId}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const files = event.target.files;
              if (files) void upload(files);
              event.target.value = "";
            }}
          />
        </label>
      )}

      {message && (
        <p role="alert" className="text-danger text-sm">
          {message}
        </p>
      )}

      {(uploads.length > 0 || documents.length > 0) && (
        <ul className="border-border bg-surface divide-border divide-y rounded-xl border">
          {uploads.map((item) => (
            <li key={item.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p
                  className={cn("text-xs", item.state === "error" ? "text-danger" : "text-muted")}
                  role={item.state === "error" ? "alert" : "status"}
                >
                  {item.state === "error" ? item.message : "Subiendo…"}
                </p>
              </div>
              {item.state === "error" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setUploads((current) => current.filter((upload) => upload.key !== item.key));
                  }}
                >
                  Quitar
                </Button>
              )}
            </li>
          ))}
          {documents.map((document) => (
            <li
              key={document.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{document.name}</p>
                <p className="text-muted text-xs">
                  {kindOf(document.contentType)} · {formatFileSize(document.sizeBytes)} ·{" "}
                  {formatDateLima(new Date(document.createdAt))}
                  {document.uploadedByEmail ? ` · ${document.uploadedByEmail}` : ""}
                </p>
              </div>
              {confirming === document.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm">¿Eliminar?</span>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={busy === document.id}
                    onClick={() => void remove(document.id)}
                  >
                    {busy === document.id ? "Eliminando…" : "Sí, eliminar"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setConfirming(null);
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy === document.id}
                    onClick={() => void download(document.id)}
                  >
                    {busy === document.id ? "Abriendo…" : "Descargar"}
                  </Button>
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConfirming(document.id);
                      }}
                    >
                      Eliminar
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {documents.length === 0 && uploads.length === 0 && !canEdit && (
        <p className="text-muted text-sm">Todavía no hay documentos.</p>
      )}
    </div>
  );
}
