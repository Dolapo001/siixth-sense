import { ChevronDown } from "lucide-react";
import {
  curlFor,
  exampleFor,
  jsonContent,
  refName,
  resolveRef,
  type OpenApiDocument,
  type OperationEntry,
  type Schema,
} from "@/features/developers/openapi";
import { cn } from "@/lib/utilities/cn";

/*
 * Server-rendered API reference. Text from the API document is always
 * rendered as plain text, never as HTML.
 */

const methodTone: Record<string, string> = {
  get: "border-accent/40 text-accent",
  post: "border-fg/40 text-fg",
  put: "border-signal/50 text-signal",
  patch: "border-signal/50 text-signal",
  delete: "border-signal/70 text-signal",
};

export function MethodBadge({ method }: { method: string }) {
  return (
    <span
      className={cn(
        "meta inline-flex w-16 shrink-0 justify-center rounded-sm border px-1.5 py-0.5 font-semibold uppercase",
        methodTone[method] ?? "border-border text-muted",
      )}
    >
      {method}
    </span>
  );
}

export function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <figure className="flex flex-col gap-1.5">
      <figcaption className="text-meta text-muted">{label}</figcaption>
      <pre className="meta overflow-x-auto rounded-md border border-border bg-midnight p-3 text-fg">
        <code>{code}</code>
      </pre>
    </figure>
  );
}

function typeLabel(doc: OpenApiDocument, schema: Schema): string {
  if (schema.$ref) return refName(schema.$ref) ?? "object";
  if (schema.oneOf) return `one of: ${schema.oneOf.map((s) => typeLabel(doc, s)).join(" | ")}`;
  if (schema.anyOf) return `any of: ${schema.anyOf.map((s) => typeLabel(doc, s)).join(" | ")}`;
  const type = Array.isArray(schema.type)
    ? schema.type.join(" | ")
    : (schema.type ?? (schema.properties ? "object" : "any"));
  if (type === "array" && schema.items) return `array of ${typeLabel(doc, schema.items)}`;
  return [type, schema.format && `(${schema.format})`, schema.nullable && "| null"].filter(Boolean).join(" ");
}

/** Object properties as a nested list. Follows references, stopping at cycles and a depth limit. */
export function SchemaView({
  doc,
  schema,
  depth = 0,
  seen = [],
}: {
  doc: OpenApiDocument;
  schema: Schema;
  depth?: number;
  seen?: string[];
}) {
  const resolved = resolveRef(doc, schema);
  const merged: Schema = resolved.allOf
    ? {
        ...resolved,
        properties: Object.assign({}, ...resolved.allOf.map((part) => resolveRef(doc, part).properties ?? {})),
        required: resolved.allOf.flatMap((part) => resolveRef(doc, part).required ?? []),
      }
    : resolved;
  const target = merged.type === "array" && merged.items ? resolveRef(doc, merged.items) : merged;
  const properties = Object.entries(target.properties ?? {});

  if (properties.length === 0 || depth > 4) {
    return <p className="meta text-muted">{typeLabel(doc, schema)}</p>;
  }

  return (
    <ul className={cn("flex flex-col gap-2", depth > 0 && "mt-2 border-l border-border pl-3")}>
      {properties.map(([name, property]) => {
        const required = target.required?.includes(name);
        const child = resolveRef(doc, property);
        const ref = property.$ref ?? property.items?.$ref;
        const nested =
          !!(child.properties || child.allOf || (child.type === "array" && child.items)) &&
          !(ref && seen.includes(ref));
        return (
          <li key={name} className="flex flex-col gap-0.5">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <code className="meta font-semibold text-fg">{name}</code>
              <span className="meta text-muted">{typeLabel(doc, property)}</span>
              {required && <span className="meta text-signal">required</span>}
            </p>
            {child.description && <p className="text-small text-muted">{child.description}</p>}
            {child.enum && (
              <p className="meta text-muted">One of: {child.enum.map((value) => JSON.stringify(value)).join(", ")}</p>
            )}
            {nested && <SchemaView doc={doc} schema={property} depth={depth + 1} seen={ref ? [...seen, ref] : seen} />}
          </li>
        );
      })}
    </ul>
  );
}

function ExampleJson({
  doc,
  schema,
  example,
  label,
}: {
  doc: OpenApiDocument;
  schema?: Schema;
  example?: unknown;
  label: string;
}) {
  const generated = example === undefined;
  const value = generated ? exampleFor(doc, schema) : example;
  return (
    <CodeBlock
      code={JSON.stringify(value, null, 2)}
      label={generated ? `${label} (shape generated from the schema)` : label}
    />
  );
}

export function OperationView({ doc, entry }: { doc: OpenApiDocument; entry: OperationEntry }) {
  const { operation } = entry;
  const body = resolveRef(doc, operation.requestBody ?? {});
  const bodyJson = jsonContent(body.content);
  const responses = Object.entries(operation.responses ?? {});

  return (
    <details
      id={entry.id}
      className="group scroll-mt-24 rounded-lg border border-border bg-surface open:border-muted/50"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <MethodBadge method={entry.method} />
        <code className="meta min-w-0 break-all text-fg">{entry.path}</code>
        {operation.summary && <span className="text-small text-muted">{operation.summary}</span>}
        {operation.deprecated && <span className="meta text-signal">deprecated</span>}
        <ChevronDown aria-hidden className="ml-auto size-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-5 border-t border-border p-4">
        {operation.description && <p className="text-small whitespace-pre-line">{operation.description}</p>}

        {entry.parameters.length > 0 && (
          <section className="flex flex-col gap-2">
            <h4 className="eyebrow">Parameters</h4>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left">
                <thead>
                  <tr className="border-b border-border text-meta text-muted">
                    <th scope="col" className="py-1.5 pr-3 font-normal">
                      Name
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-normal">
                      In
                    </th>
                    <th scope="col" className="py-1.5 pr-3 font-normal">
                      Type
                    </th>
                    <th scope="col" className="py-1.5 font-normal">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entry.parameters.map((parameter) => (
                    <tr key={`${parameter.in}-${parameter.name}`} className="border-b border-border align-top">
                      <td className="py-2 pr-3">
                        <code className="meta text-fg">{parameter.name}</code>
                        {parameter.required && <span className="meta ml-1.5 text-signal">required</span>}
                      </td>
                      <td className="meta py-2 pr-3 text-muted">{parameter.in}</td>
                      <td className="meta py-2 pr-3 text-muted">
                        {parameter.schema ? typeLabel(doc, parameter.schema) : "—"}
                      </td>
                      <td className="py-2 text-small text-muted">{parameter.description ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {bodyJson?.schema && (
          <section className="flex flex-col gap-2">
            <h4 className="eyebrow">
              Request body{body.required ? "" : " (optional)"} · {bodyJson.mediaType}
            </h4>
            {body.description && <p className="text-small text-muted">{body.description}</p>}
            <SchemaView doc={doc} schema={bodyJson.schema} />
          </section>
        )}

        {responses.length > 0 && (
          <section className="flex flex-col gap-3">
            <h4 className="eyebrow">Responses</h4>
            {responses.map(([status, raw]) => {
              const response = resolveRef(doc, raw);
              const json = jsonContent(response.content);
              return (
                <div key={status} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <p className="flex items-center gap-2">
                    <span
                      className={cn(
                        "meta font-semibold",
                        /^2/.test(status) ? "text-accent" : /^[45]/.test(status) ? "text-signal" : "text-fg",
                      )}
                    >
                      {status}
                    </span>
                    <span className="text-small text-muted">{response.description}</span>
                  </p>
                  {json?.schema && <SchemaView doc={doc} schema={json.schema} />}
                  {json?.schema && /^2/.test(status) && (
                    <ExampleJson doc={doc} schema={json.schema} example={json.example} label="Example response" />
                  )}
                </div>
              );
            })}
          </section>
        )}

        <CodeBlock code={curlFor(doc, entry)} label="Example request" />
      </div>
    </details>
  );
}
