import { zodResolver } from "@hookform/resolvers/zod";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Field, Input } from "./field";

describe("Field", () => {
  it("connects label, hint and error to the control", () => {
    render(
      <Field label="Username" hint="Shown publicly" error="Required">
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Shown publicly Required");
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("is not marked invalid without an error", () => {
    render(<Field label="Username">{(control) => <Input {...control} />}</Field>);
    expect(screen.getByLabelText("Username")).not.toHaveAttribute("aria-invalid");
  });
});

const schema = z.object({ name: z.string().trim().min(2, "Enter at least 2 characters.") });

function ExampleForm({ onValid }: { onValid: (values: z.infer<typeof schema>) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  return (
    <form noValidate onSubmit={handleSubmit(onValid)}>
      <Field label="Name" error={errors.name?.message}>
        {(control) => <Input {...control} {...register("name")} />}
      </Field>
      <button type="submit">Submit</button>
    </form>
  );
}

describe("Field with React Hook Form + Zod", () => {
  it("shows the schema error and does not submit invalid input", async () => {
    const onValid = vi.fn();
    render(<ExampleForm onValid={onValid} />);
    await userEvent.type(screen.getByLabelText("Name"), " a ");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Enter at least 2 characters.");
    expect(onValid).not.toHaveBeenCalled();
  });

  it("submits valid, trimmed input", async () => {
    const onValid = vi.fn();
    render(<ExampleForm onValid={onValid} />);
    await userEvent.type(screen.getByLabelText("Name"), "  Vice Beach ");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));
    await vi.waitFor(() => expect(onValid).toHaveBeenCalled());
    expect(onValid.mock.calls[0][0]).toEqual({ name: "Vice Beach" });
  });
});
