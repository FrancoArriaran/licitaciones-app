import {
  canDeleteBids,
  canWorkOnBids,
  type Actor,
  type OrganizationId,
  type UserId,
} from "../../accounts";
import {
  NotAuthorizedError,
  NotFoundError,
  parseInput,
  ValidationError,
  type UntrustedInput,
} from "../../shared";
import {
  bidDetailsSchema,
  describeChanges,
  type BidDetailsInput,
  type BidId,
  type BidSource,
} from "../domain/bid";
import type { BidRepository, BidTimeline, TeamDirectory } from "../ports";
import { z } from "zod";

const ocidSchema = z.object({
  ocid: z.string().regex(/^ocds-[\w-]+$/, "Ese proceso no es válido."),
});

const notFound = () => new NotFoundError("No encontramos esa postulación.");

/** "Seguir": adds an opportunity to the board. Following it again just returns it. */
export class FollowOpportunity {
  constructor(
    private readonly bids: BidRepository,
    private readonly timeline: BidTimeline,
  ) {}

  async execute(
    actor: Actor,
    organizationId: OrganizationId,
    input: UntrustedInput<{ ocid: string }>,
    source: BidSource = "manual",
  ): Promise<{ bidId: BidId; created: boolean }> {
    if (!canWorkOnBids(actor)) throw new NotAuthorizedError();
    const { ocid } = parseInput(ocidSchema, input);

    const existing = await this.bids.findIdByOcid(organizationId, ocid);
    if (existing) return { bidId: existing, created: false };

    const bidId = await this.bids.create({ organizationId, ocid, source, createdBy: actor.userId });
    await this.timeline.append(organizationId, bidId, actor.userId, [
      { type: "created", data: { source } },
    ]);
    return { bidId, created: true };
  }
}

/** Status, offered price, result and assignee, recording what changed in the timeline. */
export class UpdateBid {
  constructor(
    private readonly bids: BidRepository,
    private readonly timeline: BidTimeline,
    private readonly team: TeamDirectory,
  ) {}

  async execute(
    actor: Actor,
    organizationId: OrganizationId,
    bidId: BidId,
    input: UntrustedInput<BidDetailsInput>,
  ): Promise<{ changed: boolean }> {
    if (!canWorkOnBids(actor)) throw new NotAuthorizedError();
    const details = parseInput(bidDetailsSchema, input);
    const assigneeId = details.assigneeId as UserId | null;

    const current = await this.bids.get(organizationId, bidId);
    if (!current) throw notFound();
    if (
      assigneeId &&
      assigneeId !== current.assigneeId &&
      !(await this.team.isMember(organizationId, assigneeId))
    ) {
      throw new ValidationError("Revisa los datos marcados en el formulario.", {
        assigneeId: ["Esa persona ya no es parte de tu equipo."],
      });
    }

    const next = { ...details, assigneeId };
    const events = describeChanges(current, next);
    if (events.length === 0) return { changed: false };

    await this.bids.update(organizationId, bidId, next);
    await this.timeline.append(organizationId, bidId, actor.userId, events);
    return { changed: true };
  }
}

const noteSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Escribe la nota.")
    .max(2000, "La nota es muy larga (máximo 2,000 caracteres)."),
});

export class AddBidNote {
  constructor(
    private readonly bids: BidRepository,
    private readonly timeline: BidTimeline,
  ) {}

  async execute(
    actor: Actor,
    organizationId: OrganizationId,
    bidId: BidId,
    input: UntrustedInput<{ text: string }>,
  ): Promise<void> {
    if (!canWorkOnBids(actor)) throw new NotAuthorizedError();
    const { text } = parseInput(noteSchema, input);
    if (!(await this.bids.get(organizationId, bidId))) throw notFound();
    await this.timeline.append(organizationId, bidId, actor.userId, [
      { type: "note", data: { text } },
    ]);
  }
}

export class RemoveBid {
  constructor(private readonly bids: BidRepository) {}

  async execute(actor: Actor, organizationId: OrganizationId, bidId: BidId): Promise<void> {
    if (!canDeleteBids(actor)) {
      throw new NotAuthorizedError("Solo quien administra la cuenta puede eliminar postulaciones.");
    }
    if (!(await this.bids.remove(organizationId, bidId))) throw notFound();
  }
}
