import { canWorkOnBids, type Actor, type OrganizationId } from "../../accounts";
import { NotAuthorizedError } from "../../shared";
import type { BidStatus } from "../domain/bid";
import type { BidRepository, SeaceHistory, SeaceParticipation } from "../ports";

/** What SEACE says happened, as a bid status. */
function statusFor(participation: SeaceParticipation): BidStatus {
  if (participation.outcome === "won") return "won";
  if (participation.outcome === "lost") return "lost";
  return "submitted";
}

/**
 * "Importar mi historial": every process where the company's RUC bid or won becomes a
 * bid with its result, so history and analytics start full instead of empty. Processes
 * already on the board are left as they are. Running it twice imports nothing new.
 */
export class ImportSeaceHistory {
  constructor(
    private readonly history: SeaceHistory,
    private readonly bids: BidRepository,
  ) {}

  async preview(actor: Actor, organizationId: OrganizationId): Promise<SeaceParticipation[]> {
    if (!canWorkOnBids(actor)) throw new NotAuthorizedError();
    return this.history.list(organizationId);
  }

  async execute(actor: Actor, organizationId: OrganizationId): Promise<{ imported: number }> {
    if (!canWorkOnBids(actor)) throw new NotAuthorizedError();
    const pending = (await this.history.list(organizationId)).filter(
      (item) => !item.alreadyTracked,
    );
    if (pending.length === 0) return { imported: 0 };

    const imported = await this.bids.importMany(
      organizationId,
      actor.userId,
      pending.map((item) => ({
        ocid: item.ocid,
        status: statusFor(item),
        awardedAmount: item.outcome === "won" ? item.awardedAmount : null,
      })),
    );
    return { imported };
  }
}
