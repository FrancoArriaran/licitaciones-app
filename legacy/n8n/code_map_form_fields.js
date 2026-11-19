// n8n Code node -- "Mapear campos del formulario"
// The Form Trigger node's output keys depend on the exact field labels as
// n8n stores them (can vary by version/locale), so instead of hardcoding
// exact key names, find each field by a substring of its label. This way
// the rest of the flow (which expects snake_case keys) doesn't break if
// n8n's internal key format differs from what you'd guess.

const raw = $input.first().json;

function findField(substrings) {
  for (const [key, value] of Object.entries(raw)) {
    const k = key.toLowerCase();
    if (substrings.some((s) => k.includes(s))) return value;
  }
  return null;
}

return [{
  json: {
    company_name: findField(["nombre de la empresa", "company_name"]),
    ruc: findField(["ruc"]),
    whatsapp_phone: findField(["whatsapp"]),
    departments: findField(["departamento"]) || "",
    business_description: findField(["dedica", "ofrecen", "business_description"]),
    min_amount: findField(["minimo", "min_amount"]),
    max_amount: findField(["maximo", "max_amount"]),
  },
}];
