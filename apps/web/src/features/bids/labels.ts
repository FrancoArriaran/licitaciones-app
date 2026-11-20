import type { BidStatus, LostReason } from "@licitaciones/core/bids";

type Tone = "neutral" | "info" | "warning" | "success" | "danger";

/** How each status reads for the customer, and the badge tone that goes with it. */
export const BID_STATUS: Record<BidStatus, { label: string; tone: Tone; hint: string }> = {
  evaluating: { label: "Evaluando", tone: "neutral", hint: "Revisando si conviene postular" },
  preparing: { label: "Preparando", tone: "info", hint: "Armando la oferta y los documentos" },
  submitted: { label: "Presentada", tone: "warning", hint: "Oferta enviada, esperando resultado" },
  won: { label: "Ganada", tone: "success", hint: "Obtuvimos la buena pro" },
  lost: { label: "No ganada", tone: "danger", hint: "La buena pro fue para otro postor" },
  cancelled: { label: "Desierta o cancelada", tone: "neutral", hint: "La entidad no adjudicó" },
  withdrawn: { label: "No me presenté", tone: "neutral", hint: "Decidimos no postular" },
};

export const LOST_REASON: Record<LostReason, string> = {
  price: "Por precio",
  requirements: "No cumplíamos un requisito",
  disqualified: "Nos descalificaron",
  other: "Otro motivo",
};
