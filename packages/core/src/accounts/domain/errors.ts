import { DomainError } from "../../shared";

export class RucAlreadyRegisteredError extends DomainError {
  readonly code = "ruc_already_registered";

  constructor() {
    super("Ya existe una empresa registrada con ese RUC. Búscala en el listado de empresas.");
  }
}

export class SeatLimitReachedError extends DomainError {
  readonly code = "seat_limit_reached";

  constructor(maxSeats: number) {
    super(
      `El plan permite ${maxSeats} ${maxSeats === 1 ? "usuario" : "usuarios"} y ya están todos asignados. ` +
        "Amplía los usuarios del plan o elimina una invitación pendiente.",
    );
  }
}

export class MemberAlreadyJoinedError extends DomainError {
  readonly code = "member_already_joined";

  constructor() {
    super(
      "Esta persona ya activó su cuenta. Si olvidó su contraseña, puede pedir una nueva desde «Olvidé mi contraseña».",
    );
  }
}

export class LastOwnerError extends DomainError {
  readonly code = "last_owner";

  constructor() {
    super(
      "La empresa necesita al menos un responsable. Asigna otro responsable antes de quitar a esta persona.",
    );
  }
}

export class SeatsBelowUsageError extends DomainError {
  readonly code = "seats_below_usage";

  constructor(used: number) {
    super(
      `La empresa ya tiene ${used} usuarios entre activos e invitados. Quita usuarios antes de bajar el límite.`,
    );
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  readonly code = "email_already_registered";

  constructor() {
    super(
      "Ese correo ya tiene una cuenta. Por ahora cada persona pertenece a una sola empresa: usa otro correo.",
    );
  }
}
