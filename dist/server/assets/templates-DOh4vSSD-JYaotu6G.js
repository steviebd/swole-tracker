import { u as useSuspenseQuery, q as queryOptions } from "./queryOptions-XULLYB5y.js";
import { b as reactExports, e as useRouter, A as isRedirect, c as createServerFn } from "./worker-entry-_S0z7k3x.js";
import { S as Subscribable, s as shallowEqualObjects, g as hashKey, j as getDefaultState, n as notifyManager, k as useQueryClient, l as noop, m as shouldThrowError, d as createSsrRpc } from "./router-CfQjAsX4-BdfYCT0U.js";
import { w as withAuth } from "./middleware-C0nuZrz9-3s0fDIfv.js";
import { o as object, _ as _enum, s as string, n as number, r as record, b as array, a as any } from "./schemas-Dk_VZEFo.js";
var MutationObserver = class extends Subscribable {
  #client;
  #currentResult = void 0;
  #currentMutation;
  #mutateOptions;
  constructor(client, options) {
    super();
    this.#client = client;
    this.setOptions(options);
    this.bindMethods();
    this.#updateResult();
  }
  bindMethods() {
    this.mutate = this.mutate.bind(this);
    this.reset = this.reset.bind(this);
  }
  setOptions(options) {
    const prevOptions = this.options;
    this.options = this.#client.defaultMutationOptions(options);
    if (!shallowEqualObjects(this.options, prevOptions)) {
      this.#client.getMutationCache().notify({
        type: "observerOptionsUpdated",
        mutation: this.#currentMutation,
        observer: this
      });
    }
    if (prevOptions?.mutationKey && this.options.mutationKey && hashKey(prevOptions.mutationKey) !== hashKey(this.options.mutationKey)) {
      this.reset();
    } else if (this.#currentMutation?.state.status === "pending") {
      this.#currentMutation.setOptions(this.options);
    }
  }
  onUnsubscribe() {
    if (!this.hasListeners()) {
      this.#currentMutation?.removeObserver(this);
    }
  }
  onMutationUpdate(action) {
    this.#updateResult();
    this.#notify(action);
  }
  getCurrentResult() {
    return this.#currentResult;
  }
  reset() {
    this.#currentMutation?.removeObserver(this);
    this.#currentMutation = void 0;
    this.#updateResult();
    this.#notify();
  }
  mutate(variables, options) {
    this.#mutateOptions = options;
    this.#currentMutation?.removeObserver(this);
    this.#currentMutation = this.#client.getMutationCache().build(this.#client, this.options);
    this.#currentMutation.addObserver(this);
    return this.#currentMutation.execute(variables);
  }
  #updateResult() {
    const state = this.#currentMutation?.state ?? getDefaultState();
    this.#currentResult = {
      ...state,
      isPending: state.status === "pending",
      isSuccess: state.status === "success",
      isError: state.status === "error",
      isIdle: state.status === "idle",
      mutate: this.mutate,
      reset: this.reset
    };
  }
  #notify(action) {
    notifyManager.batch(() => {
      if (this.#mutateOptions && this.hasListeners()) {
        const variables = this.#currentResult.variables;
        const onMutateResult = this.#currentResult.context;
        const context = {
          client: this.#client,
          meta: this.options.meta,
          mutationKey: this.options.mutationKey
        };
        if (action?.type === "success") {
          this.#mutateOptions.onSuccess?.(
            action.data,
            variables,
            onMutateResult,
            context
          );
          this.#mutateOptions.onSettled?.(
            action.data,
            null,
            variables,
            onMutateResult,
            context
          );
        } else if (action?.type === "error") {
          this.#mutateOptions.onError?.(
            action.error,
            variables,
            onMutateResult,
            context
          );
          this.#mutateOptions.onSettled?.(
            void 0,
            action.error,
            variables,
            onMutateResult,
            context
          );
        }
      }
      this.listeners.forEach((listener) => {
        listener(this.#currentResult);
      });
    });
  }
};
function useMutation(options, queryClient) {
  const client = useQueryClient();
  const [observer] = reactExports.useState(
    () => new MutationObserver(
      client,
      options
    )
  );
  reactExports.useEffect(() => {
    observer.setOptions(options);
  }, [observer, options]);
  const result = reactExports.useSyncExternalStore(
    reactExports.useCallback(
      (onStoreChange) => observer.subscribe(notifyManager.batchCalls(onStoreChange)),
      [observer]
    ),
    () => observer.getCurrentResult(),
    () => observer.getCurrentResult()
  );
  const mutate = reactExports.useCallback(
    (variables, mutateOptions) => {
      observer.mutate(variables, mutateOptions).catch(noop);
    },
    [observer]
  );
  if (result.error && shouldThrowError(observer.options.throwOnError, [result.error])) {
    throw result.error;
  }
  return { ...result, mutate, mutateAsync: result.mutate };
}
function useServerFn(serverFn) {
  const router = useRouter();
  return reactExports.useCallback(
    async (...args) => {
      try {
        const res = await serverFn(...args);
        if (isRedirect(res)) {
          throw res;
        }
        return res;
      } catch (err) {
        if (isRedirect(err)) {
          err.options._fromLocation = router.state.location;
          return router.navigate(router.resolveRedirect(err).options);
        }
        throw err;
      }
    },
    [router, serverFn]
  );
}
const getTemplates = createServerFn({
  method: "GET"
}).inputValidator(object({
  search: string().max(120).optional(),
  sort: _enum(["recent", "lastUsed", "mostUsed", "name"]).default("recent")
}).optional()).middleware([withAuth]).handler(createSsrRpc("0d10ec2bf434c6a63c6025f4e70d8057daa98775c0451fea477b00b9354371f4"));
const getTemplate = createServerFn({
  method: "GET"
}).inputValidator(object({
  id: number()
})).middleware([withAuth]).handler(createSsrRpc("e2e3d77d332e133902a398ee645ee7f1cd2d034180f8d86df13159f9e3a181eb"));
const createTemplate = createServerFn({
  method: "POST"
}).inputValidator(object({
  name: string().min(1).max(256),
  exercises: array(string().min(1).max(256)),
  dedupeKey: string().optional(),
  warmupConfig: record(string(), any()).optional()
})).middleware([withAuth]).handler(createSsrRpc("d4d3c0cc524945cea68f72c47f6c715061cde53014bbfeeb760dc13d61761b84"));
const updateTemplate = createServerFn({
  method: "POST"
}).inputValidator(object({
  id: number(),
  name: string().min(1).max(256),
  exercises: array(string().min(1).max(256)),
  warmupConfig: record(string(), any()).optional()
})).middleware([withAuth]).handler(createSsrRpc("75f0b852d5fc0e020075f08dec218ab3c33d26b90fa8924ee1d9ec1cf2715da9"));
const deleteTemplate = createServerFn({
  method: "POST"
}).inputValidator(object({
  id: number()
})).middleware([withAuth]).handler(createSsrRpc("409eddae35c415ebcff85c9c16763eab8439fca2d738be603106039a3431c4f3"));
const duplicateTemplate = createServerFn({
  method: "POST"
}).inputValidator(object({
  id: number(),
  name: string().min(1).max(256).optional()
})).middleware([withAuth]).handler(createSsrRpc("fbea046e6c5c27f1263dce4ac18d00dcd1f56336cbf0f741f248713b27615601"));
const templatesQueryOptions = (params) => queryOptions({
  queryKey: ["templates", params],
  queryFn: () => getTemplates({
    data: void 0
  }),
  staleTime: 1e3 * 60 * 5
});
const templateQueryOptions = (id) => queryOptions({
  queryKey: ["templates", id],
  queryFn: () => getTemplate({ data: { id } })
});
function useTemplates(params) {
  return useSuspenseQuery(templatesQueryOptions(params));
}
function useTemplate(id) {
  return useSuspenseQuery(templateQueryOptions(id));
}
function useCreateTemplate() {
  const mutationFn = useServerFn(createTemplate);
  return useMutation({ mutationFn });
}
function useUpdateTemplate() {
  const mutationFn = useServerFn(updateTemplate);
  return useMutation({ mutationFn });
}
function useDeleteTemplate() {
  const mutationFn = useServerFn(deleteTemplate);
  return useMutation({ mutationFn });
}
function useDuplicateTemplate() {
  const mutationFn = useServerFn(duplicateTemplate);
  return useMutation({ mutationFn });
}
export {
  useDeleteTemplate as a,
  useDuplicateTemplate as b,
  useCreateTemplate as c,
  useTemplate as d,
  useUpdateTemplate as e,
  useTemplates as u
};
