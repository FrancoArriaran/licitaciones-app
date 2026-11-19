// n8n Code node -- "Parsear respuesta LLM"
// Input: the "Basic LLM Chain" node's output -- which ONLY has a `text`
// field (the model's reply) and drops every other field from upstream.
// So the original form fields are pulled back by node name from
// "Armar prompt LLM" instead of assuming they're still on this item.
// Output: one item ready for the Postgres "Insertar mype_profiles" node.

const item = $("Armar prompt LLM").first().json;
const raw = $input.first().json.text ?? $input.first().json.message?.content ?? $input.first().json.content ?? "";

const match = raw.match(/\{[\s\S]*\}/);
if (!match) {
  throw new Error("No se encontro JSON en la respuesta del LLM: " + raw);
}

const parsed = JSON.parse(match[0]);
const families = Array.isArray(parsed.families) ? parsed.families : [];

const departments = (item.departments || "")
  .split(",")
  .map((d) => d.trim().toUpperCase())
  .filter(Boolean);

return [{
  json: {
    company_name: item.company_name,
    ruc: item.ruc,
    whatsapp_phone: item.whatsapp_phone,
    departments, // plain JS array -- the Postgres node serializes this correctly for a TEXT[] column
    business_description: item.business_description,
    unspsc_families: families, // plain JS array, same reason
    mapping_reasoning: parsed.reasoning || null,
    min_amount: item.min_amount || null,
    max_amount: item.max_amount || null,
    status: "pending_review",
  },
}];
