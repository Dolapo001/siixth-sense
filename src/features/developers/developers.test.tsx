import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  curlFor,
  errorResponses,
  exampleFor,
  groupOperations,
  resolveRef,
  validateOpenApi,
  type OpenApiDocument,
} from "./openapi";

vi.mock("next/cache", () => ({ cacheLife: () => {} }));
const { loadApiSpec } = await import("./load-spec");
const { DeveloperPortal } = await import("./developer-portal");

/** A generic test document. Deliberately not a Sixth Sense API. */
const doc: OpenApiDocument = {
  openapi: "3.1.0",
  info: { title: "Example Notes API", version: "1.2.0", description: "Test fixture. <script>alert(1)</script>" },
  servers: [{ url: "https://api.example.test/v1/" }],
  tags: [{ name: "Notes", description: "Work with notes." }, { name: "Unused" }],
  security: [{ bearer: [] }],
  paths: {
    "/notes": {
      get: {
        operationId: "listNotes",
        summary: "List notes",
        tags: ["Notes"],
        parameters: [{ name: "limit", in: "query", schema: { type: "integer" } }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Note" } } },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      post: {
        operationId: "createNote",
        tags: ["Notes"],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/NewNote" } } },
        },
        responses: { "201": { description: "Created" }, "401": { $ref: "#/components/responses/Unauthorized" } },
      },
    },
    "/notes/{noteId}": {
      parameters: [
        { name: "noteId", in: "path", required: true, schema: { type: "string" }, description: "Path-level" },
      ],
      get: {
        operationId: "getNote",
        tags: ["Notes"],
        parameters: [
          { name: "noteId", in: "path", required: true, schema: { type: "string" }, description: "Override" },
        ],
        responses: {
          "404": {
            description: "Not found",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
          },
        },
      },
    },
    "/health": { get: { responses: { "200": { description: "OK" } } } },
  },
  components: {
    schemas: {
      Note: {
        type: "object",
        required: ["id"],
        properties: {
          id: { type: "string", format: "uuid" },
          title: { type: "string", example: "Groceries" },
          kind: { type: "string", enum: ["text", "list"] },
          // Circular: a note contains notes.
          children: { type: "array", items: { $ref: "#/components/schemas/Note" } },
        },
      },
      NewNote: { allOf: [{ type: "object", required: ["title"], properties: { title: { type: "string" } } }] },
      Error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid token",
        content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
      },
    },
    securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Send a token." } },
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("validateOpenApi", () => {
  it("accepts OpenAPI 3 and rejects everything else", () => {
    expect(validateOpenApi(doc)).toBeNull();
    expect(validateOpenApi({ swagger: "2.0", info: { title: "x" }, paths: {} })).toMatch(/OpenAPI 3/);
    expect(validateOpenApi("nope")).toMatch(/JSON object/);
    expect(validateOpenApi({ openapi: "3.0.0", info: { title: "x" } })).toMatch(/no paths/);
  });
});

describe("groupOperations", () => {
  it("groups by tag in document order, skips empty tags and collects untagged under Other", () => {
    const groups = groupOperations(doc);
    expect(groups.map((g) => g.name)).toEqual(["Notes", "Other"]);
    expect(groups[0].operations.map((o) => o.id)).toEqual(["listNotes", "createNote", "getNote"]);
    expect(groups[1].operations[0].id).toBe("get-health");
  });

  it("lets operation parameters override path parameters", () => {
    const getNote = groupOperations(doc)[0].operations.find((o) => o.id === "getNote")!;
    expect(getNote.parameters).toHaveLength(1);
    expect(getNote.parameters[0].description).toBe("Override");
  });
});

describe("examples, curl and errors", () => {
  it("uses document examples, generates the rest, and survives circular schemas", () => {
    const example = exampleFor(doc, { $ref: "#/components/schemas/Note" }) as Record<string, unknown>;
    expect(example).toMatchObject({ id: "00000000-0000-0000-0000-000000000000", title: "Groceries", kind: "text" });
    expect(example.children).toEqual([{}]);
  });

  it("follows local references only", () => {
    expect(resolveRef(doc, { $ref: "#/components/schemas/Error" })).toHaveProperty("properties.code");
    expect(resolveRef(doc, { $ref: "https://elsewhere.test/schema.json" })).toEqual({
      $ref: "https://elsewhere.test/schema.json",
    });
  });

  it("builds a curl command from what the document declares", () => {
    const create = groupOperations(doc)[0].operations.find((o) => o.id === "createNote")!;
    const curl = curlFor(doc, create);
    expect(curl).toContain('curl -X POST "https://api.example.test/v1/notes"');
    expect(curl).toContain("Authorization: Bearer $SIXTH_SENSE_API_KEY");
    expect(curl).toContain(`-d '{"title":"string"}'`);
  });

  it("merges error responses across endpoints", () => {
    const errors = Object.fromEntries(errorResponses(doc));
    expect(errors["401"]).toMatchObject({ description: "Missing or invalid token", operations: 2 });
    expect(errors["404"].operations).toBe(1);
  });
});

describe("loadApiSpec", () => {
  it("reports unpublished when no URL is configured", async () => {
    expect(await loadApiSpec(undefined)).toEqual({ status: "unpublished" });
  });

  it("loads a valid document", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(doc))),
    );
    expect(await loadApiSpec("https://api.example.test/openapi.json")).toMatchObject({ status: "ok" });
  });

  it("reports HTTP errors, invalid documents and network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 503 })),
    );
    expect(await loadApiSpec("https://x.test")).toEqual({
      status: "error",
      message: "The API document returned HTTP 503.",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ swagger: "2.0" }))),
    );
    expect(await loadApiSpec("https://x.test")).toMatchObject({ status: "error" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new Error("offline"))),
    );
    expect(await loadApiSpec("https://x.test")).toEqual({
      status: "error",
      message: "The API document couldn't be loaded.",
    });
  });
});

describe("DeveloperPortal", () => {
  it("says the reference isn't published, without inventing endpoints", () => {
    render(<DeveloperPortal spec={{ status: "unpublished" }} />);
    expect(screen.getByRole("heading", { name: "API reference not published yet" })).toBeInTheDocument();
    expect(screen.queryByText(/^get$/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "API keys" }).closest("section")).toHaveTextContent(
      "isn't available yet",
    );
  });

  it("renders operations, auth and errors from the document", () => {
    render(<DeveloperPortal spec={{ status: "ok", document: doc }} />);
    expect(screen.getByText("v1.2.0")).toBeInTheDocument();
    const reference = screen.getByRole("heading", { name: "API reference" }).closest("section")!;
    expect(within(reference).getByText("/notes/{noteId}")).toBeInTheDocument();
    expect(within(reference).getByText("List notes")).toBeInTheDocument();
    expect(screen.getByText("HTTP bearer (JWT)")).toBeInTheDocument();
    const errors = screen.getByRole("heading", { name: "Errors" }).closest("section")!;
    expect(within(errors).getByText("Missing or invalid token")).toBeInTheDocument();
    expect(screen.getAllByText(/shape generated from the schema/).length).toBeGreaterThan(0);
  });

  it("shows text from the document as text, never as HTML", () => {
    const { container } = render(<DeveloperPortal spec={{ status: "ok", document: doc }} />);
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/<script>alert\(1\)<\/script>/)).toBeInTheDocument();
  });

  it("explains a document that failed to load", () => {
    render(<DeveloperPortal spec={{ status: "error", message: "The API document returned HTTP 503." }} />);
    expect(screen.getByRole("alert")).toHaveTextContent("The API document returned HTTP 503.");
  });
});
