"use client";

/**
 * TanStack Form-compatible UI Components
 *
 * These components provide a similar API to the existing shadcn/ui form
 * components but work with TanStack Form instead of react-hook-form.
 *
 * ## Key Differences from react-hook-form:
 * - Uses TanStack Form's field-based API instead of Controller
 * - Validation is handled at the form level with Zod schemas
 * - Better TypeScript inference and performance optimizations
 * - Lazy validation by default for better UX
 *
 * ## Usage Patterns:
 *
 * ### Basic Field Usage:
 * ```tsx
 * import { useForm } from "@tanstack/react-form";
 * import { zodValidator } from "@tanstack/zod-form-adapter";
 * import { z } from "zod";
 *
 * const schema = z.object({ name: z.string().min(1) });
 *
 * function MyForm() {
 *   const form = useForm({
 *     defaultValues: { name: "" },
 *     validators: { onBlur: schema }, // Lazy validation
 *     onSubmit: ({ value }) => console.log(value),
 *   });
 *
 *   return (
 *     <form onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
 *       <form.Field name="name">
 *         {(field) => (
 *           <TanStackFormField
 *             name={field.name}
 *             error={field.state.meta.errors?.[0]?.message}
 *           >
 *             <TanStackFormItem>
 *               <TanStackFormLabel>Name</TanStackFormLabel>
 *               <TanStackFormControl>
 *                 <Input
 *                   value={field.state.value}
 *                   onChange={(e) => field.handleChange(e.target.value)}
 *                   onBlur={field.handleBlur}
 *                 />
 *               </TanStackFormControl>
 *               <TanStackFormMessage />
 *             </TanStackFormItem>
 *           </TanStackFormField>
 *         )}
 *       </form.Field>
 *     </form>
 *   );
 * }
 * ```
 *
 * ### Field Arrays:
 * ```tsx
 * <form.Field name="items">
 *   {(field) => (
 *     <div>
 *       {field.state.value.map((_, index) => (
 *         <form.Field key={index} name={`items[${index}]`}>
 *           {(itemField) => (
 *             <TanStackFormField name={itemField.name}>
 *               <TanStackFormItem>
 *                 <TanStackFormControl>
 *                   <Input
 *                     value={itemField.state.value}
 *                     onChange={(e) => itemField.handleChange(e.target.value)}
 *                   />
 *                 </TanStackFormControl>
 *               </TanStackFormItem>
 *             </TanStackFormField>
 *           )}
 *         </form.Field>
 *       ))}
 *     </div>
 *   )}
 * </form.Field>
 * ```
 *
 * ## Performance Optimizations:
 * - All components use React.memo to prevent unnecessary re-renders
 * - Context values are memoized
 * - ARIA attributes are computed efficiently
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
      "useTanStackFormField must be used within <TanStackFormField>",
    );
  }

  if (!itemContext) {
    throw new Error(
      "useTanStackFormField must be used within <TanStackFormItem>",
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
export const TanStackFormField = React.memo(function TanStackFormField({
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
  const contextValue = React.useMemo(
    () => ({ name, error, isDirty, isTouched }),
    [name, error, isDirty, isTouched],
  );

  return (
    <TanStackFormFieldContext.Provider value={contextValue}>
      {children}
    </TanStackFormFieldContext.Provider>
  );
});

/**
 * TanStackFormItem - Container for form field layout
 */
export const TanStackFormItem = React.memo(function TanStackFormItem({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const id = React.useId();

  const contextValue = React.useMemo(() => ({ id }), [id]);

  return (
    <TanStackFormItemContext.Provider value={contextValue}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </TanStackFormItemContext.Provider>
  );
});

/**
 * TanStackFormLabel - Label with error styling
 */
export const TanStackFormLabel = React.memo(function TanStackFormLabel({
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
});

/**
 * TanStackFormControl - Wrapper for input elements with ARIA attributes
 */
export const TanStackFormControl = React.memo(function TanStackFormControl({
  ...props
}: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useTanStackFormField();

  const ariaDescribedBy = React.useMemo(
    () =>
      !error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`,
    [error, formDescriptionId, formMessageId],
  );

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={ariaDescribedBy}
      aria-invalid={!!error}
      {...props}
    />
  );
});

/**
 * TanStackFormDescription - Helper text for form fields
 */
export const TanStackFormDescription = React.memo(
  function TanStackFormDescription({
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
  },
);

/**
 * TanStackFormMessage - Display validation error messages
 */
export const TanStackFormMessage = React.memo(function TanStackFormMessage({
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
});
