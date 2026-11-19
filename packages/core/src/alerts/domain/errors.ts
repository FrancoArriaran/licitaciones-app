import { DomainError } from "../../shared";

export class ProfileLimitReachedError extends DomainError {
  readonly code = "profile_limit_reached";

  constructor(max: number) {
    super(
      `Tu plan incluye ${max} ${max === 1 ? "perfil de alertas" : "perfiles de alertas"} y ya los usas todos. ` +
        "Edita uno existente o escríbenos para ampliar tu plan.",
    );
  }
}

export class NoSuggestionsError extends DomainError {
  readonly code = "no_suggestions";

  constructor() {
    super(
      "No encontramos categorías para esa descripción. Agrega más detalle sobre lo que vendes o búscalas en la lista.",
    );
  }
}
