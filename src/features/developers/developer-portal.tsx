import { KeyRound } from "lucide-react";
import { OperationView, SchemaView } from "@/components/developers/reference";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { ErrorState, UnavailableState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import type { SpecResult } from "./load-spec";
import { errorResponses, groupOperations, type OpenApiDocument, type SecurityScheme } from "./openapi";

const anchor = (name: string) => `tag-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="flex scroll-mt-24 flex-col gap-4">
      <h2 id={`${id}-heading`} className="text-heading font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function schemeSummary(scheme: SecurityScheme) {
  if (scheme.type === "http")
    return `HTTP ${scheme.scheme ?? ""}${scheme.bearerFormat ? ` (${scheme.bearerFormat})` : ""}`;
  if (scheme.type === "apiKey") return `API key in ${scheme.in ?? "header"} \`${scheme.name ?? ""}\``;
  return scheme.type;
}

/** The whole portal. Server-rendered from the backend's OpenAPI document. */
export function DeveloperPortal({ spec }: { spec: SpecResult }) {
  const doc = spec.status === "ok" ? spec.document : null;
  const groups = doc ? groupOperations(doc) : [];

  return (
    <PageContainer>
      <PageHeader
        eyebrow="API"
        title="Developer Portal"
        description="Build on Sixth Sense's visual intelligence. This reference is generated from the API's own OpenAPI document."
        actions={
          doc ? (
            <Badge tone="accent" className="self-start">
              v{doc.info.version}
            </Badge>
          ) : undefined
        }
      />

      <div className="grid gap-10 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Developer Portal" className="lg:sticky lg:top-8 lg:self-start">
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-small lg:flex-col lg:gap-1.5">
            {[
              ["overview", "Overview"],
              ["authentication", "Authentication"],
              ["reference", "API reference"],
              ["errors", "Errors"],
              ["api-keys", "API keys"],
              ["usage", "Usage"],
            ].map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-muted hover:text-fg">
                  {label}
                </a>
                {id === "reference" && groups.length > 0 && (
                  <ul className="mt-1 hidden flex-col gap-1 border-l border-border pl-3 lg:flex">
                    {groups.map((group) => (
                      <li key={group.name}>
                        <a href={`#${anchor(group.name)}`} className="text-meta text-muted hover:text-fg">
                          {group.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-12">
          <Section id="overview" title="Overview">
            {doc ? (
              <>
                <p className="text-body">{doc.info.title}</p>
                {doc.info.description && (
                  <p className="text-small whitespace-pre-line text-muted">{doc.info.description}</p>
                )}
                {doc.servers && doc.servers.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {doc.servers.map((server) => (
                      <li key={server.url} className="flex flex-wrap items-baseline gap-2">
                        <code className="meta text-fg">{server.url}</code>
                        {server.description && <span className="text-small text-muted">{server.description}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-body text-muted">
                The Sixth Sense API will give programs access to Sixth Sense&apos;s visual intelligence. Its full reference
                appears here, generated from the backend&apos;s OpenAPI document, as soon as it&apos;s published.
              </p>
            )}
          </Section>

          <Section id="authentication" title="Authentication">
            {!doc ? (
              <p className="text-small text-muted">Authentication details are published with the API reference.</p>
            ) : Object.keys(doc.components?.securitySchemes ?? {}).length === 0 ? (
              <p className="text-small text-muted">The API document doesn&apos;t describe any authentication.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {Object.entries(doc.components!.securitySchemes!).map(([name, scheme]) => (
                  <li key={name} className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4">
                    <p className="flex items-center gap-2 text-small font-semibold">
                      <KeyRound aria-hidden className="size-4 text-accent" />
                      {name}
                    </p>
                    <p className="meta text-muted">{schemeSummary(scheme)}</p>
                    {scheme.description && (
                      <p className="text-small whitespace-pre-line text-muted">{scheme.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-small text-muted">
              Keep API keys secret. Use them only from servers you control, never in browser or app code.
            </p>
          </Section>

          <Section id="reference" title="API reference">
            {spec.status === "unpublished" ? (
              <UnavailableState
                title="API reference not published yet"
                description="It will be generated from the Sixth Sense backend's OpenAPI document once that's available. Nothing here is guessed in the meantime."
              />
            ) : spec.status === "error" ? (
              <ErrorState title="The API reference couldn't load" description={spec.message} />
            ) : groups.length === 0 ? (
              <p className="text-small text-muted">The API document doesn&apos;t list any endpoints.</p>
            ) : (
              groups.map((group) => (
                <section key={group.name} id={anchor(group.name)} className="flex scroll-mt-24 flex-col gap-3">
                  <h3 className="eyebrow">{group.name}</h3>
                  {group.description && <p className="text-small text-muted">{group.description}</p>}
                  {group.operations.map((entry) => (
                    <OperationView key={`${entry.method}-${entry.path}`} doc={doc!} entry={entry} />
                  ))}
                </section>
              ))
            )}
          </Section>

          <Section id="errors" title="Errors">
            {!doc ? (
              <p className="text-small text-muted">Error formats are published with the API reference.</p>
            ) : (
              <ErrorList doc={doc} />
            )}
          </Section>

          <Section id="api-keys" title="API keys">
            <UnavailableState
              description="Creating and managing API keys isn't available yet. It needs account and key endpoints from the Sixth Sense backend."
              className="py-8"
            />
          </Section>

          <Section id="usage" title="Usage">
            <UnavailableState
              description="Usage and rate-limit information will appear here once the backend reports it."
              className="py-8"
            />
          </Section>
        </div>
      </div>
    </PageContainer>
  );
}

function ErrorList({ doc }: { doc: OpenApiDocument }) {
  const errors = errorResponses(doc);
  if (errors.length === 0)
    return <p className="text-small text-muted">The API document doesn&apos;t describe error responses.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {errors.map(([status, error]) => (
        <li key={status} className="flex flex-col gap-2 rounded-md border border-border bg-surface p-4">
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="meta font-semibold text-signal">{status}</span>
            <span className="text-small">{error.description}</span>
            <span className="meta text-muted">
              · {error.operations} {error.operations === 1 ? "endpoint" : "endpoints"}
            </span>
          </p>
          {error.schema && <SchemaView doc={doc} schema={error.schema} />}
        </li>
      ))}
    </ul>
  );
}
