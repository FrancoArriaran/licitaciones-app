import { canWorkOnBids, type Actor, type OrganizationId } from "../../accounts";
import {
  NotAuthorizedError,
  NotFoundError,
  parseInput,
  ValidationError,
  type UntrustedInput,
} from "../../shared";
import type { BidId } from "../domain/bid";
import {
  bidFolder,
  documentUploadSchema,
  storageFileName,
  type DocumentUpload,
} from "../domain/documents";
import { DocumentNotUploadedError } from "../domain/errors";
import type {
  BidDocumentRepository,
  BidRepository,
  BidTimeline,
  FileStorage,
  IdGenerator,
} from "../ports";

/**
 * Documents go straight from the browser to private storage (no size limit on our
 * servers): 1) `prepare` validates and returns a signed upload URL for a path inside
 * the bid's folder, 2) the browser uploads, 3) `register` checks the file is there and
 * records it in the timeline.
 */
export class BidDocuments {
  constructor(
    private readonly bids: BidRepository,
    private readonly documents: BidDocumentRepository,
    private readonly timeline: BidTimeline,
    private readonly storage: FileStorage,
    private readonly ids: IdGenerator,
  ) {}

  async prepare(
    actor: Actor,
    organizationId: OrganizationId,
    bidId: BidId,
    input: UntrustedInput<DocumentUpload>,
  ): Promise<{ path: string; signedUrl: string; token: string }> {
    await this.authorize(actor, organizationId, bidId);
    const file = parseInput(documentUploadSchema, input);
    const path = `${bidFolder(organizationId, bidId)}${this.ids.uuid()}-${storageFileName(file.name)}`;
    return { path, ...(await this.storage.createUploadUrl(path)) };
  }

  async register(
    actor: Actor,
    organizationId: OrganizationId,
    bidId: BidId,
    input: UntrustedInput<DocumentUpload & { path: string }>,
  ): Promise<string> {
    await this.authorize(actor, organizationId, bidId);
    const file = parseInput(documentUploadSchema, input);
    const path = typeof input.path === "string" ? input.path : "";
    if (!path.startsWith(bidFolder(organizationId, bidId)) || path.includes("..")) {
      throw new ValidationError("Ese archivo no pertenece a esta postulación.");
    }

    const size = await this.storage.sizeOf(path);
    if (size === null) throw new DocumentNotUploadedError();

    const documentId = await this.documents.add({
      organizationId,
      bidId,
      storagePath: path,
      name: file.name,
      sizeBytes: size,
      contentType: file.contentType,
      uploadedBy: actor.userId,
    });
    await this.timeline.append(organizationId, bidId, actor.userId, [
      { type: "document_added", data: { documentId, name: file.name } },
    ]);
    return documentId;
  }

  async downloadUrl(actor: Actor, organizationId: OrganizationId, documentId: string) {
    if (!canWorkOnBids(actor)) throw new NotAuthorizedError();
    const document = await this.findDocument(organizationId, documentId);
    return this.storage.createDownloadUrl(document.storagePath, document.name);
  }

  async remove(actor: Actor, organizationId: OrganizationId, documentId: string): Promise<void> {
    if (!canWorkOnBids(actor)) throw new NotAuthorizedError();
    const document = await this.findDocument(organizationId, documentId);
    await this.storage.remove(document.storagePath);
    await this.documents.remove(organizationId, documentId);
    await this.timeline.append(organizationId, document.bidId, actor.userId, [
      { type: "document_removed", data: { name: document.name } },
    ]);
  }

  private async authorize(actor: Actor, organizationId: OrganizationId, bidId: BidId) {
    if (!canWorkOnBids(actor)) throw new NotAuthorizedError();
    if (!(await this.bids.get(organizationId, bidId))) {
      throw new NotFoundError("No encontramos esa postulación.");
    }
  }

  private async findDocument(organizationId: OrganizationId, documentId: string) {
    const document = await this.documents.find(organizationId, documentId);
    if (!document) throw new NotFoundError("Ese documento ya no existe.");
    return document;
  }
}
