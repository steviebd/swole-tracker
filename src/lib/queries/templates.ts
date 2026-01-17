import {
  queryOptions,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "~/server/functions/templates";

type TemplateSortOption = "recent" | "lastUsed" | "mostUsed" | "name";

export const templatesQueryOptions = (params?: {
  search?: string;
  sort?: TemplateSortOption;
}) =>
  queryOptions({
    queryKey: ["templates", params],
    queryFn: () =>
      getTemplates({
        data: params ? { search: params.search, sort: params.sort } : undefined,
      }),
    staleTime: 1000 * 60 * 5,
  });

export const templateQueryOptions = (id: number) =>
  queryOptions({
    queryKey: ["templates", id],
    queryFn: () => getTemplate({ data: { id } }),
  });

export function useTemplates(params?: {
  search?: string;
  sort?: TemplateSortOption;
}) {
  return useSuspenseQuery(templatesQueryOptions(params));
}

export function useTemplate(id: number) {
  return useSuspenseQuery(templateQueryOptions(id));
}

export function useCreateTemplate() {
  const mutationFn = useServerFn(createTemplate);
  return useMutation({ mutationFn });
}

export function useUpdateTemplate() {
  const mutationFn = useServerFn(updateTemplate);
  return useMutation({ mutationFn });
}

export function useDeleteTemplate() {
  const mutationFn = useServerFn(deleteTemplate);
  return useMutation({ mutationFn });
}

export function useDuplicateTemplate() {
  const mutationFn = useServerFn(duplicateTemplate);
  return useMutation({ mutationFn });
}
