"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Map as MapIcon } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, type DialogVariant } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Tooltip } from "@/components/ui/tooltip";
import { Section } from "./section";

// Example schema to demonstrate the form pattern. Not a real Sixth Sense form.
const exampleSchema = z.object({
  identification: z.string().trim().min(2, "Enter at least 2 characters."),
  category: z.enum(["vehicle", "location", "wildlife"], { message: "Choose a category." }),
  evidence: z.string().trim().max(280, "Keep evidence under 280 characters.").optional(),
});
type ExampleValues = z.infer<typeof exampleSchema>;

export function InteractiveExamples() {
  const [openVariant, setOpenVariant] = useState<DialogVariant | null>(null);
  const [submitted, setSubmitted] = useState<ExampleValues | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExampleValues>({ resolver: zodResolver(exampleSchema) });

  return (
    <>
      <Section title="Tooltip">
        <div className="flex gap-4">
          <Tooltip content="World" side="right" asLabel>
            {(props) => (
              <Button variant="ghost" size="icon" {...props}>
                <MapIcon aria-hidden />
              </Button>
            )}
          </Tooltip>
          <Tooltip content="Extra detail as a description">
            {(props) => (
              <Button variant="secondary" {...props}>
                <Info aria-hidden />
                Hover or focus me
              </Button>
            )}
          </Tooltip>
        </div>
      </Section>

      <Section title="Modal, drawer, bottom sheet">
        <div className="flex flex-wrap gap-3">
          {(["modal", "drawer", "sheet", "responsive"] as const).map((variant) => (
            <Button key={variant} variant="secondary" onClick={() => setOpenVariant(variant)}>
              Open {variant}
            </Button>
          ))}
        </div>
        <Dialog
          open={openVariant !== null}
          onOpenChange={(open) => !open && setOpenVariant(null)}
          variant={openVariant ?? "modal"}
          title={`Example ${openVariant ?? ""}`}
          description="Escape, the close button or a backdrop click closes it. Focus returns to the trigger."
        >
          <p className="text-small text-muted">Dialog content goes here.</p>
        </Dialog>
      </Section>

      <Section title="Form (React Hook Form + Zod)">
        <form
          noValidate
          className="flex max-w-md flex-col gap-4"
          onSubmit={handleSubmit((values) => setSubmitted(values))}
        >
          <Field label="Suggested identification" required error={errors.identification?.message}>
            {(control) => <Input {...control} {...register("identification")} />}
          </Field>
          <Field label="Category" required error={errors.category?.message}>
            {(control) => (
              <Select {...control} defaultValue="" {...register("category")}>
                <option value="" disabled>
                  Select…
                </option>
                <option value="vehicle">Vehicle</option>
                <option value="location">Location</option>
                <option value="wildlife">Wildlife</option>
              </Select>
            )}
          </Field>
          <Field label="Evidence" hint="Optional. Up to 280 characters." error={errors.evidence?.message}>
            {(control) => <Textarea {...control} {...register("evidence")} />}
          </Field>
          <Button type="submit" className="self-start">
            Validate
          </Button>
          {submitted && (
            <p role="status" className="meta text-muted">
              Valid. Example only, nothing was sent.
            </p>
          )}
        </form>
      </Section>
    </>
  );
}
