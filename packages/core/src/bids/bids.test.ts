import { describe, expect, it } from "vitest";
import type { Actor, OrganizationId, UserId } from "../accounts";
import { NotAuthorizedError, NotFoundError, ValidationError } from "../shared";
import {
  AddBidNote,
  BidDocuments,
  bidDetailsSchema,
  DocumentNotUploadedError,
  FollowOpportunity,
  RemoveBid,
  storageFileName,
  UpdateBid,
  type Bid,
  type BidDetails,
  type BidId,
  type BidRepository,
  type BidTimeline,
  type FileStorage,
  type NewBidEvent,
} from "./index";

const ORG = "20000000-0000-0000-0000-0000000000aa" as OrganizationId;
const OWNER = "00000000-0000-0000-0000-0000000000a1" as UserId;
const MEMBER = "6f1c0e2a-3b4d-4e5f-8a9b-0c1d2e3f4a5b" as UserId;
const owner: Actor = { userId: OWNER, isPlatformAdmin: false, role: "owner" };
const member: Actor = { userId: MEMBER, isPlatformAdmin: false, role: "member" };
const staff: Actor = { userId: "staff" as UserId, isPlatformAdmin: true, role: null };

async function errorOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (error: unknown) => error,
  );
}

function setup() {
  const bids = new Map<string, Bid>();
  const events: { bidId: string; actorId: string; event: NewBidEvent }[] = [];
  let next = 0;

  const repository: BidRepository = {
    findIdByOcid: async (_org, ocid) =>
      [...bids.values()].find((bid) => bid.ocid === ocid)?.id ?? null,
    create: async ({ organizationId, ocid }) => {
      const id = `bid-${String(++next)}` as BidId;
      bids.set(id, {
        id,
        organizationId,
        ocid,
        status: "evaluating",
        offeredAmount: null,
        awardedAmount: null,
        lostReason: null,
        assigneeId: null,
      });
      return id;
    },
    get: async (_org, id) => bids.get(id) ?? null,
    update: async (_org, id, details: BidDetails) => {
      const bid = bids.get(id);
      if (bid) bids.set(id, { ...bid, ...details });
    },
    remove: async (_org, id) => bids.delete(id),
  };
  const timeline: BidTimeline = {
    append: async (_org, bidId, actorId, newEvents) => {
      for (const event of newEvents) events.push({ bidId, actorId, event });
    },
  };
  const team = { isMember: async (_org: OrganizationId, user: UserId) => user === MEMBER };

  return {
    bids,
    events,
    follow: new FollowOpportunity(repository, timeline),
    update: new UpdateBid(repository, timeline, team),
    note: new AddBidNote(repository, timeline),
    remove: new RemoveBid(repository),
    repository,
    timeline,
  };
}

describe("FollowOpportunity", () => {
  it("adds the opportunity to the board once", async () => {
    const { follow, events } = setup();
    const first = await follow.execute(member, ORG, { ocid: "ocds-dgv273-seacev3-1" });
    const again = await follow.execute(member, ORG, { ocid: "ocds-dgv273-seacev3-1" });
    expect(first.created).toBe(true);
    expect(again).toEqual({ bidId: first.bidId, created: false });
    expect(events.map(({ event }) => event.type)).toEqual(["created"]);
  });

  it("is for members of the company, not for our staff", async () => {
    const { follow } = setup();
    expect(await errorOf(follow.execute(staff, ORG, { ocid: "ocds-x-1" }))).toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("rejects anything that isn't a SEACE process id", async () => {
    const { follow } = setup();
    expect(await errorOf(follow.execute(member, ORG, { ocid: "../../x" }))).toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("UpdateBid", () => {
  async function followed() {
    const context = setup();
    const { bidId } = await context.follow.execute(member, ORG, { ocid: "ocds-x-1" });
    context.events.length = 0;
    return { ...context, bidId };
  }

  it("records the status and the offered price in the timeline", async () => {
    const { update, events, bids, bidId } = await followed();
    await update.execute(member, ORG, bidId, {
      status: "submitted",
      offeredAmount: "S/ 41,000.50",
    });
    expect(bids.get(bidId)).toMatchObject({ status: "submitted", offeredAmount: 41000.5 });
    expect(events.map(({ event }) => event)).toEqual([
      { type: "status_changed", data: { from: "evaluating", to: "submitted" } },
      { type: "offer_changed", data: { from: null, to: 41000.5 } },
    ]);
  });

  it("records a win with the awarded amount as a result", async () => {
    const { update, events, bidId } = await followed();
    await update.execute(member, ORG, bidId, { status: "won", awardedAmount: "39,800" });
    expect(events.map(({ event }) => event)).toEqual([
      {
        type: "result_recorded",
        data: { from: "evaluating", to: "won", awardedAmount: 39800, lostReason: null },
      },
    ]);
  });

  it("drops result fields that don't fit the new status", async () => {
    const { update, bids, bidId } = await followed();
    await update.execute(member, ORG, bidId, { status: "lost", lostReason: "price" });
    await update.execute(member, ORG, bidId, {
      status: "submitted",
      lostReason: "price",
      awardedAmount: "100",
    });
    expect(bids.get(bidId)).toMatchObject({
      status: "submitted",
      lostReason: null,
      awardedAmount: null,
    });
  });

  it("writes nothing when nothing changed", async () => {
    const { update, events, bidId } = await followed();
    expect(await update.execute(member, ORG, bidId, { status: "evaluating" })).toEqual({
      changed: false,
    });
    expect(events).toEqual([]);
  });

  it("only assigns people of the team", async () => {
    const { update, bidId } = await followed();
    const error = await errorOf(
      update.execute(member, ORG, bidId, {
        status: "evaluating",
        assigneeId: "7a2b3c4d-5e6f-4a1b-9c2d-3e4f5a6b7c8d",
      }),
    );
    expect(error).toBeInstanceOf(ValidationError);
    await update.execute(member, ORG, bidId, { status: "evaluating", assigneeId: MEMBER });
  });

  it("explains a badly typed amount", async () => {
    const { update, bidId } = await followed();
    const error = await errorOf(
      update.execute(member, ORG, bidId, { status: "submitted", offeredAmount: "cuarenta mil" }),
    );
    expect((error as ValidationError).fieldErrors.offeredAmount).toEqual([
      "Escribe el monto en soles, por ejemplo 41,000.50.",
    ]);
  });

  it("says when the bid doesn't exist", async () => {
    const { update } = setup();
    expect(
      await errorOf(update.execute(member, ORG, "nope" as BidId, { status: "won" })),
    ).toBeInstanceOf(NotFoundError);
  });
});

describe("amounts", () => {
  it.each([
    ["41000", 41000],
    ["41,000.50", 41000.5],
    ["S/ 41 000", 41000],
    ["S/. 1,234,567.8", 1234567.8],
    ["", null],
  ])("reads %s", (typed, expected) => {
    expect(
      bidDetailsSchema.parse({ status: "submitted", offeredAmount: typed }).offeredAmount,
    ).toBe(expected);
  });
});

describe("notes and removal", () => {
  it("adds trimmed notes", async () => {
    const { follow, note, events } = setup();
    const { bidId } = await follow.execute(member, ORG, { ocid: "ocds-x-1" });
    await note.execute(member, ORG, bidId, { text: "  Llamar a la entidad  " });
    expect(events.at(-1)?.event).toEqual({ type: "note", data: { text: "Llamar a la entidad" } });
  });

  it("lets only owners and admins delete", async () => {
    const { follow, remove, bids } = setup();
    const { bidId } = await follow.execute(member, ORG, { ocid: "ocds-x-1" });
    expect(await errorOf(remove.execute(member, ORG, bidId))).toBeInstanceOf(NotAuthorizedError);
    await remove.execute(owner, ORG, bidId);
    expect(bids.size).toBe(0);
  });
});

describe("BidDocuments", () => {
  function documentsSetup() {
    const context = setup();
    const uploaded = new Map<string, number>();
    const removed: string[] = [];
    const records = new Map<string, { bidId: BidId; storagePath: string; name: string }>();
    const storage: FileStorage = {
      createUploadUrl: async (path) => ({ signedUrl: `https://upload/${path}`, token: "t" }),
      sizeOf: async (path) => uploaded.get(path) ?? null,
      createDownloadUrl: async (path) => `https://download/${path}`,
      remove: async (path) => void removed.push(path),
    };
    const documents = new BidDocuments(
      context.repository,
      {
        add: async (doc) => {
          records.set("doc-1", doc);
          return "doc-1";
        },
        find: async (_org, id) => {
          const record = records.get(id);
          return record ? { id, ...record } : null;
        },
        remove: async (_org, id) => void records.delete(id),
      },
      context.timeline,
      storage,
      { uuid: () => "11111111-1111-1111-1111-111111111111" },
    );
    return { ...context, documents, uploaded, removed, records };
  }

  const pdf = { name: "Oferta económica.pdf", size: 2048, contentType: "application/pdf" };

  it("uploads into the bid folder and records the file in the timeline", async () => {
    const { follow, documents, uploaded, events } = documentsSetup();
    const { bidId } = await follow.execute(member, ORG, { ocid: "ocds-x-1" });

    const { path } = await documents.prepare(member, ORG, bidId, pdf);
    expect(path).toBe(
      `${ORG}/bids/${bidId}/11111111-1111-1111-1111-111111111111-Oferta-economica.pdf`,
    );

    uploaded.set(path, 2048);
    await documents.register(member, ORG, bidId, { ...pdf, path });
    expect(events.at(-1)?.event).toEqual({
      type: "document_added",
      data: { documentId: "doc-1", name: "Oferta económica.pdf" },
    });
  });

  it("refuses files outside the bid folder, missing uploads, big or odd files", async () => {
    const { follow, documents } = documentsSetup();
    const { bidId } = await follow.execute(member, ORG, { ocid: "ocds-x-1" });

    expect(
      await errorOf(
        documents.register(member, ORG, bidId, { ...pdf, path: "other-org/bids/x/a.pdf" }),
      ),
    ).toBeInstanceOf(ValidationError);
    expect(
      await errorOf(
        documents.register(member, ORG, bidId, {
          ...pdf,
          path: `${ORG}/bids/${bidId}/missing.pdf`,
        }),
      ),
    ).toBeInstanceOf(DocumentNotUploadedError);
    expect(
      await errorOf(documents.prepare(member, ORG, bidId, { ...pdf, size: 30 * 1024 * 1024 })),
    ).toBeInstanceOf(ValidationError);
    expect(
      await errorOf(
        documents.prepare(member, ORG, bidId, { ...pdf, contentType: "application/x-msdownload" }),
      ),
    ).toBeInstanceOf(ValidationError);
  });

  it("removes the file and the record", async () => {
    const { follow, documents, uploaded, removed, records } = documentsSetup();
    const { bidId } = await follow.execute(member, ORG, { ocid: "ocds-x-1" });
    const { path } = await documents.prepare(member, ORG, bidId, pdf);
    uploaded.set(path, 2048);
    const id = await documents.register(member, ORG, bidId, { ...pdf, path });

    await documents.remove(member, ORG, id);
    expect(removed).toEqual([path]);
    expect(records.size).toBe(0);
  });

  it("makes storage names safe", () => {
    expect(storageFileName("Carta de presentación (firmada).PDF")).toBe(
      "Carta-de-presentacion-firmada-.PDF",
    );
    expect(storageFileName("¿¿??")).toBe("archivo");
  });
});
