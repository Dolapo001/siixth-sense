/*
 * Minimal OpenAPI 3.x model for the Developer Portal. The reference is
 * generated only from the backend's published document; nothing here
 * describes Sixth Sense endpoints on its own.
 */

export type Schema = {
  $ref?: string;
  type?: string | string[];
  format?: string;
  description?: string;
  enum?: unknown[];
  example?: unknown;
  default?: unknown;
  nullable?: boolean;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  oneOf?: Schema[];
  anyOf?: Schema[];
  allOf?: Schema[];
  additionalProperties?: boolean | Schema;
};

export type Parameter = {
  $ref?: string;
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema?: Schema;
};

type MediaType = { schema?: Schema; example?: unknown };
type Content = Record<string, MediaType>;

export type Operation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  parameters?: Parameter[];
  requestBody?: { $ref?: string; description?: string; required?: boolean; content?: Content };
  responses?: Record<string, { $ref?: string; description?: string; content?: Content }>;
  security?: Record<string, string[]>[];
};

export type SecurityScheme = {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect" | "mutualTLS";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
};

export type OpenApiDocument = {
  openapi: string;
  info: { title: string; version: string; description?: string };
  servers?: { url: string; description?: string }[];
  tags?: { name: string; description?: string }[];
  paths: Record<string, Partial<Record<HttpMethod, Operation>> & { parameters?: Parameter[] }>;
  components?: {
    schemas?: Record<string, Schema>;
    parameters?: Record<string, Parameter>;
    responses?: Record<string, { description?: string; content?: Content }>;
    requestBodies?: Record<string, { description?: string; required?: boolean; content?: Content }>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  security?: Record<string, string[]>[];
};

export const httpMethods = ["get", "post", "put", "patch", "delete", "head", "options"] as const;
export type HttpMethod = (typeof httpMethods)[number];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Checks the basics we rely on. Returns an error message, or null if usable. */
export function validateOpenApi(value: unknown): string | null {
  if (!isObject(value)) return "The API document isn't a JSON object.";
  if (typeof value.openapi !== "string" || !value.openapi.startsWith("3.")) {
    return "The API document isn't OpenAPI 3. Only OpenAPI 3.x is supported.";
  }
  if (!isObject(value.info) || typeof value.info.title !== "string") return "The API document has no title.";
  if (!isObject(value.paths)) return "The API document has no paths.";
  return null;
}

/** Follows a local `#/components/...` reference. External references aren't followed. */
export function resolveRef<T>(doc: OpenApiDocument, value: T & { $ref?: string }): T {
  if (!value?.$ref) return value;
  if (!value.$ref.startsWith("#/")) return value;
  let current: unknown = doc;
  for (const part of value.$ref.slice(2).split("/")) {
    const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
    if (!isObject(current) || !(key in current)) return value;
    current = current[key];
  }
  return current as T;
}

/** Name of a referenced schema, e.g. "#/components/schemas/Error" → "Error". */
export function refName(ref: string | undefined) {
  return ref?.split("/").at(-1);
}

export type OperationEntry = {
  id: string;
  method: HttpMethod;
  path: string;
  operation: Operation;
  /** Path-level and operation-level parameters, resolved. */
  parameters: Parameter[];
};

/** Operations grouped by their first tag, in the document's tag order. */
export function groupOperations(doc: OpenApiDocument) {
  const groups = new Map<string, OperationEntry[]>();
  for (const tag of doc.tags ?? []) groups.set(tag.name, []);

  for (const [path, item] of Object.entries(doc.paths)) {
    const shared = (item.parameters ?? []).map((p) => resolveRef(doc, p));
    for (const method of httpMethods) {
      const operation = item[method];
      if (!operation) continue;
      const own = (operation.parameters ?? []).map((p) => resolveRef(doc, p));
      // Operation parameters override path ones with the same name and location.
      const parameters = [...shared.filter((s) => !own.some((o) => o.name === s.name && o.in === s.in)), ...own];
      const tag = operation.tags?.[0] ?? "Other";
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag)!.push({
        id: operation.operationId ?? `${method}-${path}`.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, ""),
        method,
        path,
        operation,
        parameters,
      });
    }
  }
  return [...groups.entries()]
    .filter(([, operations]) => operations.length > 0)
    .map(([name, operations]) => ({
      name,
      description: doc.tags?.find((t) => t.name === name)?.description,
      operations,
    }));
}

const MAX_DEPTH = 6;

/**
 * An example value: the document's own example if it has one, otherwise a
 * shape generated from the schema (callers label it as such).
 */
export function exampleFor(
  doc: OpenApiDocument,
  schema: Schema | undefined,
  depth = 0,
  seen = new Set<string>(),
): unknown {
  if (!schema || depth > MAX_DEPTH) return null;
  if (schema.$ref) {
    if (seen.has(schema.$ref)) return {};
    return exampleFor(doc, resolveRef(doc, schema), depth + 1, new Set(seen).add(schema.$ref));
  }
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  const variant = schema.oneOf?.[0] ?? schema.anyOf?.[0];
  if (variant) return exampleFor(doc, variant, depth + 1, seen);
  if (schema.allOf) {
    return Object.assign({}, ...schema.allOf.map((part) => exampleFor(doc, part, depth + 1, seen) ?? {}));
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
  if (type === "object" || schema.properties) {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, value]) => [key, exampleFor(doc, value, depth + 1, seen)]),
    );
  }
  switch (type) {
    case "array":
      return [exampleFor(doc, schema.items, depth + 1, seen)];
    case "integer":
    case "number":
      return 0;
    case "boolean":
      return false;
    case "string":
      if (schema.format === "date-time") return "2026-01-01T00:00:00Z";
      if (schema.format === "date") return "2026-01-01";
      if (schema.format === "uri" || schema.format === "url") return "https://example.com";
      if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
      return "string";
    default:
      return null;
  }
}

/** The JSON media type's schema and example, if the content has one. */
export function jsonContent(content: Content | undefined) {
  if (!content) return null;
  const key = Object.keys(content).find((k) => k === "application/json" || k.endsWith("+json")) ?? null;
  return key ? { mediaType: key, ...content[key] } : null;
}

/** A curl command for an operation, using only what the document declares. */
export function curlFor(doc: OpenApiDocument, entry: OperationEntry) {
  const base = doc.servers?.[0]?.url ?? "<API base URL>";
  const lines = [`curl -X ${entry.method.toUpperCase()} "${base.replace(/\/$/, "")}${entry.path}"`];
  const requirements = entry.operation.security ?? doc.security ?? [];
  const schemeName = Object.keys(requirements[0] ?? {})[0];
  const scheme = schemeName ? doc.components?.securitySchemes?.[schemeName] : undefined;
  if (scheme?.type === "http" && scheme.scheme?.toLowerCase() === "bearer") {
    lines.push(`  -H "Authorization: Bearer $SIXTH_SENSE_API_KEY"`);
  } else if (scheme?.type === "apiKey" && scheme.in === "header" && scheme.name) {
    lines.push(`  -H "${scheme.name}: $SIXTH_SENSE_API_KEY"`);
  }
  const body = jsonContent(resolveRef(doc, entry.operation.requestBody ?? {}).content);
  if (body) {
    lines.push(`  -H "Content-Type: ${body.mediaType}"`);
    const example = body.example ?? exampleFor(doc, body.schema);
    lines.push(`  -d '${JSON.stringify(example)}'`);
  }
  return lines.join(" \\\n");
}

/** All documented error responses (4xx/5xx), merged across operations. */
export function errorResponses(doc: OpenApiDocument) {
  const errors = new Map<string, { description?: string; schema?: Schema; operations: number }>();
  for (const group of groupOperations(doc)) {
    for (const entry of group.operations) {
      for (const [status, raw] of Object.entries(entry.operation.responses ?? {})) {
        if (!/^[45]/.test(status)) continue;
        const response = resolveRef(doc, raw);
        const existing = errors.get(status);
        errors.set(status, {
          description: existing?.description ?? response.description,
          schema: existing?.schema ?? jsonContent(response.content)?.schema,
          operations: (existing?.operations ?? 0) + 1,
        });
      }
    }
  }
  return [...errors.entries()].sort(([a], [b]) => a.localeCompare(b));
}
