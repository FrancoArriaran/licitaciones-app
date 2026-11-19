declare const brand: unique symbol;

/** Nominal type: a `Brand<string, "Ruc">` can't be passed where an `OrganizationId` is expected. */
export type Brand<T, Name extends string> = T & { readonly [brand]: Name };
