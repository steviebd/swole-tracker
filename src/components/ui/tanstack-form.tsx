"use client";

/**
 * TanStack Form-compatible UI Components
 *
 * These components provide a similar API to the existing shadcn/ui form
 * components but work with TanStack Form instead of react-hook-form.
 *
 * Usage:
 * - Use TanStackFormField to wrap form fields
 * - Use TanStackFormItem, TanStackFormLabel, TanStackFormControl for layout
 * - Use TanStackFormMessage to display validation errors
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import type * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "~/lib/utils";
import { Label } from "./label";

// Context for field state
type TanStackFormFieldContextValue = {
  name: string;
  error?: string;
  isDirty?: boolean;
  isTouched?: boolean;
};

const TanStackFormFieldContext =
  React.createContext<TanStackFormFieldContextValue | null>(null);

// Context for form item
type TanStackFormItemContextValue = {
  id: string;
};

const TanStackFormItemContext =
  React.createContext<TanStackFormItemContextValue | null>(null);

/**
 * Hook to access form field state from context
 */
export function useTanStackFormField() {
  const fieldContext = React.useContext(TanStackFormFieldContext);
  const itemContext = React.useContext(TanStackFormItemContext);

  if (!fieldContext) {
    throw new Error(
      "useTanStackFormField must be used within <TanStackFormField>"
    );
  }

  if (!itemContext) {
    throw new Error(
      "useTanStackFormField must be used within <TanStackFormItem>"
    );
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    error: fieldContext.error,
    isDirty: fieldContext.isDirty,
    isTouched: fieldContext.isTouched,
  };
}

/**
 * TanStackFormField - Provides field context to child components
 *
 * This component wraps a form field and provides error state to children.
 * Unlike react-hook-form's FormField, this doesn't use Controller.
 * Instead, you use form.Field from TanStack Form and wrap it with this component.
 */
export function TanStackFormField({
  name,
  error,
  isDirty,
  isTouched,
  children,
}: {
  name: string;
  error?: string;
  isDirty?: boolean;
  isTouched?: boolean;
  children: React.ReactNode;
}) {
  return (
    <TanStackFormFieldContext.Provider
      value={{ name, error, isDirty, isTouched }}
    >
      {children}
    </TanStackFormFieldContext.Provider>
  );
}

/**
 * TanStackFormItem - Container for form field layout
 */
export function TanStackFormItem({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <TanStackFormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </TanStackFormItemContext.Provider>
  );
}

/**
 * TanStackFormLabel - Label with error styling
 */
export function TanStackFormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useTanStackFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

/**
 * TanStackFormControl - Wrapper for input elements with ARIA attributes
 */
export function TanStackFormControl({
  ...props
}: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useTanStackFormField();

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
}

/**
 * TanStackFormDescription - Helper text for form fields
 */
export function TanStackFormDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  const { formDescriptionId } = useTanStackFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

/**
 * TanStackFormMessage - Display validation error messages
 */
export function TanStackFormMessage({
  className,
  children,
  ...props
}: React.ComponentProps<"p">) {
  const { error, formMessageId } = useTanStackFormField();
  const body = error ?? children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  );
}
