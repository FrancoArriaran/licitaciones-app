import { DomainError } from "../../shared";

export class TenderNotFoundError extends DomainError {
  readonly code = "tender_not_found";

  constructor() {
    super("No encontramos ese proceso en SEACE. Actualiza la página e inténtalo de nuevo.");
  }
}

export class DocumentNotUploadedError extends DomainError {
  readonly code = "document_not_uploaded";

  constructor() {
    super("El archivo no terminó de subirse. Inténtalo de nuevo.");
  }
}
