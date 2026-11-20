import { departmentLabel } from "@licitaciones/core/alerts";
import {
  formatDateLima,
  formatMoney,
  formatQuantity,
  formatTenderDescription,
} from "@licitaciones/core/shared";
import { Badge, Card, CardDescription, CardTitle } from "@licitaciones/ui";
import type { SimilarAward } from "../data";

function competitors(count: number | null): string | null {
  if (count === null) return null;
  if (count <= 1) return "Fue la única oferta";
  return `Compitió con ${count - 1} ${count === 2 ? "empresa más" : "empresas más"}`;
}

const lower = (text: string | null) => text?.toLocaleLowerCase("es-PE") ?? "";

function unitPriceLabel(award: SimilarAward): string | null {
  if (award.unitPrice === null || award.quantity === null || award.quantity <= 1) return null;
  return `${formatMoney(award.unitPrice, award.currency)} por ${lower(award.unitName) || "unidad"}`;
}

function AwardSummary({ award, featured }: { award: SimilarAward; featured: boolean }) {
  const unitPrice = unitPriceLabel(award);
  const facts = [
    award.awardDate && `Adjudicado el ${formatDateLima(new Date(award.awardDate))}`,
    competitors(award.numberOfTenderers),
    [award.buyerName, award.department && departmentLabel(award.department)]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <Badge tone={award.matchLevel === "product" ? "success" : "neutral"}>
          {award.matchLevel === "product" ? "Mismo producto" : "Producto parecido"}
        </Badge>
      </div>
      <p className={featured ? "text-lg leading-snug font-semibold" : "font-medium"}>
        {award.supplierName ?? "Proveedor sin nombre"}
        {award.amount !== null && (
          <span className="font-normal"> ganó por {formatMoney(award.amount, award.currency)}</span>
        )}
      </p>
      {(unitPrice !== null || award.quantity !== null) && (
        <p className="text-sm">
          {unitPrice && <span className="font-medium">{unitPrice}</span>}
          {award.quantity !== null && (
            <span className="text-muted">
              {unitPrice ? " · " : ""}
              {formatQuantity(award.quantity)} {lower(award.unitName)}
            </span>
          )}
        </p>
      )}
      {award.itemDescription && (
        <p className="text-muted line-clamp-2 text-sm">
          {formatTenderDescription(award.itemDescription)}
        </p>
      )}
      <p className="text-muted text-xs">{facts.join(" · ")}</p>
    </div>
  );
}

/** "La última contratación similar": who won, at what price, against how many. */
export function SimilarAwards({ awards }: { awards: SimilarAward[] }) {
  const [latest, ...others] = awards;
  return (
    <Card className="flex flex-col gap-4">
      <div>
        <CardTitle>Última contratación similar</CardTitle>
        <CardDescription>
          Quién ganó procesos parecidos en el último año y a qué precio, para que calcules tu
          oferta.
        </CardDescription>
      </div>
      {latest ? (
        <>
          <AwardSummary award={latest} featured />
          {others.length > 0 && (
            <ul className="border-border flex flex-col gap-4 border-t pt-4">
              {others.map((award, index) => (
                <li key={`${award.ocid}-${String(index)}`}>
                  <AwardSummary award={award} featured={false} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="text-muted text-sm">
          Aún no encontramos contrataciones parecidas adjudicadas en el último año.
        </p>
      )}
    </Card>
  );
}
