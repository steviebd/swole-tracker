/**
 * TanStack Form Configuration Utilities
 *
 * Provides base configuration, helpers, and patterns for TanStack Form
 * with Zod validation integration.
 */

import { zodValidator } from "@tanstack/zod-form-adapter";
import type { ZodType } from "zod";

/**
 * Creates default form options with Zod validation
 */
export function createFormOptions<TFormData>(
  schema: ZodType<TFormData>
) {
  return {
    defaultValues: {} as TFormData,
    validatorAdapter: zodValidator(),
    validators: {
      onChange: schema,
    },
  };
}

/**
 * Field-level validation helper
 * Validates on change and on blur for better UX
 */
export function fieldValidation<TFieldValue>(
  schema: ZodType<TFieldValue>
) {
  return {
    onChange: schema,
    onBlur: schema,
  };
}

/**
 * Helper to extract error messages from TanStack Form field state
 */
export function getFieldError(fieldState: { meta: { errors?: string[] } }): string | undefined {
  const errors = fieldState.meta.errors;
  if (errors && errors.length > 0) {
    return errors[0];
  }
  return undefined;
}

/**
 * Helper to check if a field has errors
 */
export function hasFieldError(fieldState: { meta: { errors?: string[] } }): boolean {
  const errors = fieldState.meta.errors;
  return Boolean(errors && errors.length > 0);
}

/**
 * Form submission helper that handles async operations
 */
export async function handleFormSubmit<TData>(
  onSubmit: (data: TData) => Promise<void> | void,
  data: TData
): Promise<void> {
  try {
    await onSubmit(data);
  } catch (error) {
    console.error("Form submission error:", error);
    throw error;
  }
}
