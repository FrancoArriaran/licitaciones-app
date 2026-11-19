// n8n Code node -- "Armar mensaje WhatsApp"
// Input: rows from the "Traer matches pendientes" Postgres node
// (match_id, whatsapp_phone, company_name, title, buyer_name, amount, enquiry_end).
// Output: one item per row with a ready-to-send Meta Graph API body.
//
// NOTE: language.code is "en" because that's what got registered when the
// template was created (see conversation) -- if you recreate the template
// in Spanish, change this to "es" to match.

return $input.all().map(({ json: item }) => ({
  json: {
    match_id: item.match_id,
    whatsapp_phone: item.whatsapp_phone,
    whatsapp_body: {
      messaging_product: "whatsapp",
      to: item.whatsapp_phone,
      type: "template",
      template: {
        name: "licitacion_nueva",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: String(item.company_name ?? "") },
              { type: "text", text: String(item.title ?? "") },
              { type: "text", text: String(item.buyer_name ?? "") },
              {
                type: "text",
                text:
                  item.amount != null
                    ? Number(item.amount).toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : "0.00",
              },
              {
                type: "text",
                text: item.enquiry_end
                  ? new Date(item.enquiry_end).toLocaleDateString("es-PE")
                  : "por confirmar",
              },
            ],
          },
        ],
      },
    },
  },
}));
