"use client";

import {
  DEPARTMENTS,
  MAX_FAMILIES_PER_PROFILE,
  type CatalogFamily,
} from "@licitaciones/core/alerts";
import { Alert, Button, buttonVariants, cn, Field, Input, Textarea } from "@licitaciones/ui";
import Link from "next/link";
import { useActionState, useMemo, useState, useTransition, type ReactNode } from "react";
import { FormMessage, SubmitButton } from "@/components/form-parts";
import { fieldErrors, idleState, type FormState } from "@/lib/form-state";
import { previewAlertProfile, suggestCategories } from "../actions";
import type { AlertProfileView } from "../data";
import type { Opportunity } from "../types";
import { OpportunityList } from "./opportunity-list";

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

function Step({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="border-border bg-surface rounded-xl border p-5 sm:p-6">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="border-primary text-primary grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-semibold tabular-nums"
        >
          {number}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          {hint && <p className="text-muted mt-0.5 text-sm">{hint}</p>}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </fieldset>
  );
}

export function AlertProfileEditor({
  catalog,
  profile,
  action,
}: {
  catalog: CatalogFamily[];
  profile: AlertProfileView | null;
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const byCode = useMemo(() => new Map(catalog.map((family) => [family.code, family])), [catalog]);

  const [name, setName] = useState(profile?.name ?? "");
  const [description, setDescription] = useState(profile?.businessDescription ?? "");
  const [selected, setSelected] = useState<string[]>(profile?.families ?? []);
  const [nationwide, setNationwide] = useState(!profile || profile.departments.length === 0);
  const [departments, setDepartments] = useState<string[]>(profile?.departments ?? []);
  const [minAmount, setMinAmount] = useState(profile?.minAmount?.toString() ?? "");
  const [maxAmount, setMaxAmount] = useState(profile?.maxAmount?.toString() ?? "");
  const [paused, setPaused] = useState(profile?.status === "paused");

  const [query, setQuery] = useState("");
  const [reasoning, setReasoning] = useState<string | null>(null);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const [suggesting, startSuggesting] = useTransition();

  const [preview, setPreview] = useState<{ key: string; opportunities: Opportunity[] } | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewing, startPreviewing] = useTransition();

  const effectiveDepartments = nationwide ? [] : departments;
  const criteriaKey = JSON.stringify([selected, effectiveDepartments, minAmount, maxAmount]);
  const atLimit = selected.length >= MAX_FAMILIES_PER_PROFILE;

  const searchResults = useMemo(() => {
    const term = normalize(query.trim());
    if (term.length < 2) return [];
    return catalog
      .filter((family) => !selected.includes(family.code))
      .filter(
        (family) => normalize(family.description).includes(term) || family.code.startsWith(term),
      )
      .slice(0, 8);
  }, [catalog, query, selected]);

  function addFamilies(codes: string[]) {
    setSelected((current) =>
      [...new Set([...current, ...codes])].slice(0, MAX_FAMILIES_PER_PROFILE),
    );
  }

  function suggest() {
    setSuggestError(null);
    startSuggesting(async () => {
      const result = await suggestCategories(description);
      if (result.ok) {
        addFamilies(result.families.map((family) => family.code));
        setReasoning(result.reasoning);
      } else {
        setSuggestError(result.message);
      }
    });
  }

  function runPreview() {
    setPreviewError(null);
    const key = criteriaKey;
    startPreviewing(async () => {
      const result = await previewAlertProfile({
        families: selected,
        departments: effectiveDepartments,
        minAmount: minAmount === "" ? null : Number(minAmount),
        maxAmount: maxAmount === "" ? null : Number(maxAmount),
      });
      if (result.ok) setPreview({ key, opportunities: result.opportunities });
      else setPreviewError(result.message);
    });
  }

  function toggleDepartment(code: string) {
    setDepartments((current) =>
      current.includes(code) ? current.filter((value) => value !== code) : [...current, code],
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]"
    >
      {selected.map((code) => (
        <input key={code} type="hidden" name="families" value={code} />
      ))}
      {effectiveDepartments.map((code) => (
        <input key={code} type="hidden" name="departments" value={code} />
      ))}
      <input type="hidden" name="status" value={paused ? "paused" : "active"} />

      <div className="flex min-w-0 flex-col gap-5">
        <FormMessage state={state} />

        <Step
          number={1}
          title="¿Qué vende tu empresa?"
          hint="Con tus palabras. Mientras más concreto, mejores serán las alertas."
        >
          <Field
            id="businessDescription"
            label="Descripción"
            errors={fieldErrors(state, "businessDescription")}
          >
            {(control) => (
              <Textarea
                {...control}
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                }}
                placeholder="Por ejemplo: vendemos cemento, fierro corrugado y agregados para obras de construcción."
                className="min-h-28"
              />
            )}
          </Field>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={suggest}
              disabled={suggesting || description.trim().length < 10}
            >
              {suggesting ? "Buscando categorías..." : "Sugerir categorías"}
            </Button>
            <span className="text-muted text-xs">
              Usamos tu descripción para proponerte categorías del Estado.
            </span>
          </div>
          {suggestError && (
            <Alert tone="error" className="mt-3">
              {suggestError}
            </Alert>
          )}
        </Step>

        <Step
          number={2}
          title="Categorías"
          hint="Son las categorías con las que el Estado clasifica lo que compra. Quita las que no apliquen."
        >
          {reasoning && (
            <p className="bg-primary-soft text-primary mb-4 rounded-lg px-3 py-2 text-sm">
              {reasoning}
            </p>
          )}
          {selected.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Categorías elegidas">
              {selected.map((code) => (
                <li
                  key={code}
                  className="border-border bg-surface-muted flex items-center gap-1 rounded-full border py-1 pr-1 pl-3 text-sm"
                >
                  <span>{byCode.get(code)?.description ?? code}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected((current) => current.filter((value) => value !== code));
                    }}
                    className="text-muted hover:text-danger grid size-6 place-items-center rounded-full"
                    aria-label={`Quitar ${byCode.get(code)?.description ?? code}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-sm">Aún no elegiste categorías.</p>
          )}
          {fieldErrors(state, "families") && (
            <p className="text-danger mt-2 text-xs">{fieldErrors(state, "families")?.join(" ")}</p>
          )}

          <div className="mt-4">
            <label htmlFor="family-search" className="text-sm font-medium">
              Buscar otra categoría
            </label>
            <Input
              id="family-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={
                atLimit
                  ? `Máximo ${MAX_FAMILIES_PER_PROFILE} categorías`
                  : "Por ejemplo: cemento, computadoras, limpieza"
              }
              disabled={atLimit}
              className="mt-1.5"
              autoComplete="off"
            />
            {searchResults.length > 0 && (
              <ul className="border-border divide-border mt-2 divide-y rounded-lg border">
                {searchResults.map((family) => (
                  <li key={family.code}>
                    <button
                      type="button"
                      onClick={() => {
                        addFamilies([family.code]);
                        setQuery("");
                      }}
                      className="hover:bg-surface-muted flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm"
                    >
                      <span>{family.description}</span>
                      <span className="text-primary shrink-0 text-xs font-medium">Agregar</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {query.trim().length >= 2 && searchResults.length === 0 && (
              <p className="text-muted mt-2 text-sm">No encontramos categorías con esa palabra.</p>
            )}
          </div>
        </Step>

        <Step number={3} title="¿Dónde atiendes?" hint="Te avisamos de procesos de estas regiones.">
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Alcance">
            {[
              { value: true, label: "Todo el Perú" },
              { value: false, label: "Solo algunas regiones" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                role="radio"
                aria-checked={nationwide === option.value}
                onClick={() => {
                  setNationwide(option.value);
                }}
                className={cn(
                  "rounded-full border px-4 py-1.5 text-sm transition-colors",
                  nationwide === option.value
                    ? "border-primary bg-primary-soft text-primary font-medium"
                    : "border-border hover:bg-surface-muted",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          {!nationwide && (
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {DEPARTMENTS.map((department) => (
                <label key={department.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={departments.includes(department.code)}
                    onChange={() => {
                      toggleDepartment(department.code);
                    }}
                    className="accent-primary size-4"
                  />
                  {department.label}
                </label>
              ))}
            </div>
          )}
          {!nationwide && departments.length === 0 && (
            <p className="text-warning mt-3 text-xs">
              Elige al menos una región, o marca «Todo el Perú».
            </p>
          )}
        </Step>

        <Step
          number={4}
          title="Montos"
          hint="Opcional. Los procesos que aún no publican monto te llegarán igual."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="minAmount"
              label="Desde (S/)"
              optional
              errors={fieldErrors(state, "minAmount")}
            >
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  value={minAmount}
                  onChange={(event) => {
                    setMinAmount(event.target.value);
                  }}
                  placeholder="0"
                />
              )}
            </Field>
            <Field
              id="maxAmount"
              label="Hasta (S/)"
              optional
              errors={fieldErrors(state, "maxAmount")}
            >
              {(control) => (
                <Input
                  {...control}
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  value={maxAmount}
                  onChange={(event) => {
                    setMaxAmount(event.target.value);
                  }}
                  placeholder="Sin límite"
                />
              )}
            </Field>
          </div>
        </Step>

        <div className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-5 sm:p-6">
          <Field
            id="name"
            label="Nombre de este perfil"
            hint="Para reconocerlo en tus alertas, por ejemplo «Cemento Arequipa»."
            errors={fieldErrors(state, "name")}
          >
            {(control) => (
              <Input
                {...control}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                }}
              />
            )}
          </Field>
          {profile && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={paused}
                onChange={(event) => {
                  setPaused(event.target.checked);
                }}
                className="accent-primary size-4"
              />
              Pausar este perfil (no recibirás alertas de él)
            </label>
          )}
          <div className="flex flex-wrap gap-3">
            <SubmitButton
              pendingLabel="Guardando..."
              disabled={!nationwide && departments.length === 0}
            >
              {profile ? "Guardar cambios" : "Guardar y activar alertas"}
            </SubmitButton>
            <Link href="/alertas" className={buttonVariants({ variant: "ghost" })}>
              Cancelar
            </Link>
          </div>
        </div>
      </div>

      <aside
        className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6"
        aria-labelledby="preview-title"
      >
        <div className="border-border bg-surface rounded-xl border p-5 sm:p-6">
          <h2 id="preview-title" className="font-semibold">
            Esto te habría llegado
          </h2>
          <p className="text-muted mt-1 text-sm">
            Procesos reales de SEACE de los últimos 30 días que encajan con este perfil.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={runPreview}
            disabled={previewing || selected.length === 0}
          >
            {previewing ? "Buscando..." : preview ? "Actualizar vista previa" : "Ver vista previa"}
          </Button>
          {selected.length === 0 && (
            <p className="text-muted mt-2 text-xs">
              Elige al menos una categoría para ver la vista previa.
            </p>
          )}
          {previewError && (
            <Alert tone="error" className="mt-3">
              {previewError}
            </Alert>
          )}
          {preview && (
            <p className="mt-4 text-sm" role="status">
              <span className="font-semibold tabular-nums">{preview.opportunities.length}</span>{" "}
              {preview.opportunities.length === 1 ? "proceso" : "procesos"}
              {preview.opportunities.length === 50 ? " o más" : ""} en los últimos 30 días.
              {preview.key !== criteriaKey && (
                <span className="text-warning">
                  {" "}
                  Cambiaste el perfil: actualiza la vista previa.
                </span>
              )}
            </p>
          )}
        </div>
        {preview && preview.opportunities.length > 0 && (
          <div className="max-h-[36rem] overflow-y-auto rounded-xl">
            <OpportunityList opportunities={preview.opportunities.slice(0, 15)} />
          </div>
        )}
        {preview && preview.opportunities.length === 0 && (
          <p className="text-muted text-sm">
            No hubo procesos con estos criterios en los últimos 30 días. Prueba con más categorías,
            más regiones o sin límite de monto.
          </p>
        )}
      </aside>
    </form>
  );
}
