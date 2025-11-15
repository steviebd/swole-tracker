/**
 * TanStack Form Configuration Utilities
 *
 * Provides base configuration, helpers, and patterns for TanStack Form
 * with Zod validation integration, performance optimizations, and analytics.
 */

import { zodValidator } from "@tanstack/zod-form-adapter";
import type { ZodType, ZodSchema } from "zod";
import type { FieldApi, FormApi } from "@tanstack/react-form";
import { analytics } from "~/lib/analytics";

// ============================================================================
// ANALYTICS EXTENSIONS
// ============================================================================

/**
 * Form-specific analytics utilities
 */
export const formAnalytics = {
  formSubmissionAttempted: (
    formName: string,
    properties?: Record<string, unknown>,
  ) => {
    analytics.event("form_submission_attempted", {
      formName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  formSubmissionCompleted: (
    formName: string,
    properties?: Record<string, unknown>,
  ) => {
    analytics.event("form_submission_completed", {
      formName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  formSubmissionError: (
    formName: string,
    properties?: Record<string, unknown>,
  ) => {
    analytics.event("form_submission_error", {
      formName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  fieldValidationPerformed: (
    formName: string,
    fieldName: string,
    properties?: Record<string, unknown>,
  ) => {
    analytics.event("field_validation_performed", {
      formName,
      fieldName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  formFieldInteracted: (
    formName: string,
    fieldName: string,
    properties?: Record<string, unknown>,
  ) => {
    analytics.event("form_field_interacted", {
      formName,
      fieldName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  formAbandoned: (formName: string, properties?: Record<string, unknown>) => {
    analytics.event("form_abandoned", {
      formName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  formValidationError: (
    formName: string,
    fieldName: string,
    properties?: Record<string, unknown>,
  ) => {
    analytics.event("form_validation_error", {
      formName,
      fieldName,
      ...properties,
      timestamp: new Date().toISOString(),
    });
  },

  formPerformanceMetrics: (
    formName: string,
    metrics: Record<string, unknown>,
  ) => {
    analytics.event("form_performance_metrics", {
      formName,
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  },
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Enhanced type definitions for better TypeScript inference
 */
export type FormFieldError = string | { message: string } | undefined;
export type FormValidationMode = "onChange" | "onBlur" | "onSubmit" | "lazy";
export type FormAnalyticsContext = {
  formName: string;
  fieldCount?: number;
  submissionCount?: number;
  errorCount?: number;
  averageTimeToSubmit?: number;
};

/**
 * Configuration for lazy validation behavior
 */
export interface LazyValidationConfig {
  enabled: boolean;
  debounceMs: number;
  validateOnChange: boolean;
  validateOnBlur: boolean;
}

/**
 * Default lazy validation settings
 */
export const DEFAULT_LAZY_VALIDATION: LazyValidationConfig = {
  enabled: true,
  debounceMs: 300,
  validateOnChange: false,
  validateOnBlur: true,
};

// ============================================================================
// FORM CONFIGURATION HELPERS
// ============================================================================

/**
 * Creates default form options with Zod validation and enhanced features
 */
export function createFormOptions<TFormData>(
  schema: ZodType<TFormData>,
  options: {
    defaultValues?: Partial<TFormData>;
    validationMode?: FormValidationMode;
    lazyValidation?: Partial<LazyValidationConfig>;
    analytics?: FormAnalyticsContext;
    onSubmit?: (values: TFormData) => Promise<void> | void;
  } = {},
) {
  const {
    defaultValues = {} as Partial<TFormData>,
    validationMode = "onChange",
    lazyValidation = {},
    analytics: analyticsContext,
    onSubmit,
  } = options;

  const lazyConfig = { ...DEFAULT_LAZY_VALIDATION, ...lazyValidation };

  // Track form submission start time for analytics
  let submissionStartTime: number | null = null;
  let submissionAttempts = 0;

  return {
    defaultValues: defaultValues as TFormData,
    validatorAdapter: zodValidator(),
    validators:
      validationMode === "lazy"
        ? {
            onBlur: schema,
          }
        : validationMode === "onChange"
          ? {
              onChange: schema,
            }
          : validationMode === "onBlur"
            ? {
                onBlur: schema,
              }
            : {
                onSubmit: schema,
              },
    onSubmit: async ({ value }: { value: TFormData }) => {
      if (analyticsContext) {
        submissionStartTime = Date.now();
        submissionAttempts++;

        // Track form submission attempt
        formAnalytics.formSubmissionAttempted(analyticsContext.formName, {
          fieldCount: analyticsContext.fieldCount,
          attemptNumber: submissionAttempts,
        });
      }

      try {
        await onSubmit?.(value);

        if (analyticsContext && submissionStartTime) {
          const submissionTime = Date.now() - submissionStartTime;

          // Track successful form submission
          formAnalytics.formSubmissionCompleted(analyticsContext.formName, {
            fieldCount: analyticsContext.fieldCount,
            submissionTime,
            attemptNumber: submissionAttempts,
          });
        }
      } catch (error) {
        if (analyticsContext) {
          // Track form submission error
          formAnalytics.formSubmissionError(analyticsContext.formName, {
            error: error instanceof Error ? error.message : "Unknown error",
            fieldCount: analyticsContext.fieldCount,
            attemptNumber: submissionAttempts,
          });
        }
        throw error;
      } finally {
        submissionStartTime = null;
      }
    },
    // Add lazy validation configuration to form meta
    meta: {
      lazyValidation: lazyConfig,
      analytics: analyticsContext,
    },
  };
}

// ============================================================================
// FIELD VALIDATION HELPERS
// ============================================================================

/**
 * Field-level validation helper with lazy validation support
 */
export function fieldValidation<TFieldValue>(
  schema: ZodType<TFieldValue>,
  options: {
    mode?: FormValidationMode;
    lazyValidation?: Partial<LazyValidationConfig>;
    fieldName?: string;
    formName?: string;
  } = {},
) {
  const {
    mode = "onChange",
    lazyValidation = {},
    fieldName,
    formName,
  } = options;

  const lazyConfig = { ...DEFAULT_LAZY_VALIDATION, ...lazyValidation };

  // Track field validation for analytics
  const trackFieldValidation = (isValid: boolean, error?: string) => {
    if (fieldName && formName) {
      formAnalytics.fieldValidationPerformed(formName, fieldName, {
        isValid,
        error,
        validationMode: mode,
      });
    }
  };

  const validators: Record<
    string,
    (value: TFieldValue) => {
      success: boolean;
      error?: any;
      data?: TFieldValue;
    }
  > = {};

  if (mode === "onChange" || (mode === "lazy" && lazyConfig.validateOnChange)) {
    validators["onChange"] = (value: TFieldValue) => {
      const result = schema.safeParse(value);
      trackFieldValidation(
        result.success,
        result.success ? undefined : result.error?.issues[0]?.message,
      );
      return result;
    };
  }

  if (mode === "onBlur" || (mode === "lazy" && lazyConfig.validateOnBlur)) {
    validators["onBlur"] = (value: TFieldValue) => {
      const result = schema.safeParse(value);
      trackFieldValidation(
        result.success,
        result.success ? undefined : result.error?.issues[0]?.message,
      );
      return result;
    };
  }

  if (mode === "onSubmit") {
    validators["onSubmit"] = (value: TFieldValue) => {
      const result = schema.safeParse(value);
      trackFieldValidation(
        result.success,
        result.success ? undefined : result.error?.issues[0]?.message,
      );
      return result;
    };
  }

  return validators;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper to extract error messages from TanStack Form field state
 */
export function getFieldError(fieldState: {
  meta: { errors?: FormFieldError[] };
}): string | undefined {
  const errors = fieldState.meta.errors;
  if (errors && errors.length > 0) {
    const firstError = errors[0];
    if (typeof firstError === "string") {
      return firstError;
    }
    if (
      firstError &&
      typeof firstError === "object" &&
      "message" in firstError
    ) {
      return firstError.message;
    }
  }
  return undefined;
}

/**
 * Helper to check if a field has errors
 */
export function hasFieldError(fieldState: {
  meta: { errors?: FormFieldError[] };
}): boolean {
  const errors = fieldState.meta.errors;
  return Boolean(errors && errors.length > 0);
}

/**
 * Enhanced form submission helper with analytics and error handling
 */
export async function handleFormSubmit<TData>(
  onSubmit: (data: TData) => Promise<void> | void,
  data: TData,
  context?: {
    formName: string;
    fieldCount?: number;
  },
): Promise<void> {
  const startTime = Date.now();

  try {
    if (context) {
      formAnalytics.formSubmissionAttempted(context.formName, {
        fieldCount: context.fieldCount,
      });
    }

    await onSubmit(data);

    if (context) {
      const submissionTime = Date.now() - startTime;
      formAnalytics.formSubmissionCompleted(context.formName, {
        fieldCount: context.fieldCount,
        submissionTime,
      });
    }
  } catch (error) {
    console.error("Form submission error:", error);

    if (context) {
      formAnalytics.formSubmissionError(context.formName, {
        error: error instanceof Error ? error.message : "Unknown error",
        fieldCount: context.fieldCount,
      });
    }

    throw error;
  }
}

// ============================================================================
// FIELD ARRAY HELPERS
// ============================================================================

/**
 * Utility for managing field arrays with common operations
 */
export function createFieldArrayHelpers<TField>(
  formApi: FormApi<any, any, any, any, any, any, any, any, any, any, any>,
  fieldName: string,
  defaultValue: TField,
) {
  const addField = (value?: TField) => {
    const currentArray = (formApi.getFieldValue(fieldName) as TField[]) || [];
    formApi.setFieldValue(fieldName, [...currentArray, value ?? defaultValue]);
  };

  const removeField = (index: number) => {
    const currentArray = (formApi.getFieldValue(fieldName) as TField[]) || [];
    if (currentArray.length > 1) {
      formApi.setFieldValue(
        fieldName,
        currentArray.filter((_, i) => i !== index),
      );
    }
  };

  const moveField = (fromIndex: number, toIndex: number) => {
    const currentArray = (formApi.getFieldValue(fieldName) as TField[]) || [];
    const newArray = [...currentArray];
    const [movedItem] = newArray.splice(fromIndex, 1);
    if (movedItem !== undefined) {
      newArray.splice(toIndex, 0, movedItem);
    }
    formApi.setFieldValue(fieldName, newArray);
  };

  const swapFields = (index1: number, index2: number) => {
    const currentArray = (formApi.getFieldValue(fieldName) as TField[]) || [];
    const newArray = [...currentArray];
    const temp = newArray[index1];
    if (temp !== undefined && newArray[index2] !== undefined) {
      newArray[index1] = newArray[index2];
      newArray[index2] = temp;
    }
    formApi.setFieldValue(fieldName, newArray);
  };

  const duplicateField = (index: number) => {
    const currentArray = (formApi.getFieldValue(fieldName) as TField[]) || [];
    const fieldToDuplicate = currentArray[index];
    if (fieldToDuplicate) {
      formApi.setFieldValue(fieldName, [...currentArray, fieldToDuplicate]);
    }
  };

  const updateField = (index: number, value: Partial<TField>) => {
    const currentArray = (formApi.getFieldValue(fieldName) as TField[]) || [];
    const newArray = [...currentArray];
    if (newArray[index] !== undefined) {
      newArray[index] = { ...newArray[index], ...value } as TField;
    }
    formApi.setFieldValue(fieldName, newArray);
  };

  return {
    addField,
    removeField,
    moveField,
    swapFields,
    duplicateField,
    updateField,
  };
}

// ============================================================================
// CONDITIONAL FIELD HELPERS
// ============================================================================

/**
 * Utility for conditional field visibility and validation
 */
export function createConditionalField<TFormData, TFieldValue>(
  formApi: FormApi<TFormData, any, any, any, any, any, any, any, any, any, any>,
  fieldName: string,
  condition: (values: TFormData) => boolean,
  options: {
    clearValueWhenHidden?: boolean;
    disableValidationWhenHidden?: boolean;
  } = {},
) {
  const { clearValueWhenHidden = true, disableValidationWhenHidden = true } =
    options;

  const isVisible = () => {
    // Use store to get current form values
    const formValues = formApi.store.state.values;
    return condition(formValues);
  };

  const updateVisibility = () => {
    const shouldShow = isVisible();

    if (!shouldShow && clearValueWhenHidden) {
      formApi.setFieldValue(fieldName, undefined as any);
    }

    // Note: TanStack Form doesn't have a direct way to disable validation for specific fields
    // This would need to be handled at the field level in the UI
  };

  // Subscribe to form changes to update visibility
  const unsubscribe = formApi.store.subscribe(() => {
    updateVisibility();
  });

  return {
    isVisible,
    updateVisibility,
    unsubscribe,
  };
}

// ============================================================================
// PERFORMANCE UTILITIES
// ============================================================================

/**
 * Debounced validation utility for performance optimization
 */
export function createDebouncedValidation<TValue>(
  validator: (value: TValue) => unknown,
  debounceMs = 300,
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return (value: TValue) => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        const result = validator(value);
        resolve(result);
        timeoutId = null;
      }, debounceMs);
    });
  };
}

/**
 * Form performance monitoring utilities
 */
export function createFormPerformanceMonitor(formName: string) {
  const startTime = Date.now();
  let validationCount = 0;
  let renderCount = 0;

  return {
    trackValidation: () => {
      validationCount++;
    },

    trackRender: () => {
      renderCount++;
    },

    getMetrics: () => ({
      formName,
      timeOpen: Date.now() - startTime,
      validationCount,
      renderCount,
    }),

    reportMetrics: () => {
      const metrics = {
        formName,
        timeOpen: Date.now() - startTime,
        validationCount,
        renderCount,
      };

      formAnalytics.formPerformanceMetrics(formName, metrics);
      return metrics;
    },
  };
}
