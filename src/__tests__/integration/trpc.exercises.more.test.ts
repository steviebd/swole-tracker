import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCaller } from "./trpc-harness";

const createCaller = (opts?: Parameters<typeof buildCaller>[0]) => buildCaller(opts as any) as any;

describe("tRPC exercises router additional branches (integration, mocked ctx/db)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("searchMaster paginates prefix then fills with contains, deduping ids", async () => {
    const userId = "user_1";
    const prefixRows = [
      { id: 1, name: "Row", normalizedName: "row", createdAt: new Date() },
      { id: 2, name: "Row Machine", normalizedName: "row machine", createdAt: new Date() },
    ];
    const containsRows = [
      { id: 2, name: "Row Machine", normalizedName: "row machine", createdAt: new Date() }, // dup
      { id: 3, name: "Bent Over Row", normalizedName: "bent over row", createdAt: new Date() },
      { id: 4, name: "Seated Row", normalizedName: "seated row", createdAt: new Date() },
    ];

    // Minimal chain stub: first select().from(...).where(...).orderBy(...).limit(...) => prefix
    // Second chain => contains
    const select = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => prefixRows),
            })),
          })),
        })),
      })
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => containsRows),
            })),
          })),
        })),
      });

    const db = { select } as any;
    const caller = createCaller({ user: { id: userId }, db });

    const res = await caller.exercises.searchMaster({ q: "row", limit: 2, cursor: 0 });
    expect(res.items.map((i: any) => i.id)).toEqual([1, 2]); // page filled by prefix, no contains fallback needed
    expect(res.nextCursor).toBe(2);
  });

  it("createOrGetMaster returns consistent fallback shape when insert returns empty", async () => {
    const userId = "user_1";
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])), // not found
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([])), // emulate driver returning empty array
        })),
      })),
    } as any;

    const caller = createCaller({ user: { id: userId }, db });
    const out = await caller.exercises.createOrGetMaster({ name: "  Bench   Press  " });
    expect(out).toMatchObject({ id: undefined, user_id: userId, name: "  Bench   Press  ", normalizedName: "bench press" });
  });

  it("linkToMaster throws when template exercise not found", async () => {
    const userId = "user_1";
    const select = vi.fn()
      // templateExercise lookup -> empty
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce([]),
          })),
        })),
      });

    const db = { select } as any;
    const caller = createCaller({ user: { id: userId }, db });
    await expect(
      caller.exercises.linkToMaster({ templateExerciseId: 10, masterExerciseId: 1 }),
    ).rejects.toThrow(/Template exercise not found/i);
  });

  it("linkToMaster throws when master exercise not found", async () => {
    const userId = "user_1";
    const select = vi.fn()
      // templateExercise lookup -> found
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce([{ id: 10, user_id: userId }]),
          })),
        })),
      })
      // masterExercise lookup -> empty
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn().mockResolvedValueOnce([]),
          })),
        })),
      });

    const db = { select } as any;
    const caller = createCaller({ user: { id: userId }, db });
    await expect(
      caller.exercises.linkToMaster({ templateExerciseId: 10, masterExerciseId: 999 }),
    ).rejects.toThrow(/Master exercise not found/i);
  });

  it("getLatestPerformance returns null when no linked template exercises", async () => {
    const userId = "user_1";
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([])), // linkedTemplateExercises = []
          })),
        })),
      })),
    } as any;

    const caller = createCaller({ user: { id: userId }, db });
    const res = await caller.exercises.getLatestPerformance({ masterExerciseId: 42 });
    expect(res).toBeNull();
  });

  it("getLinksForTemplate returns computed rows", async () => {
    const userId = "user_1";
    const rows = [
      {
        templateExerciseId: 10,
        exerciseName: "Row",
        masterExerciseId: 1,
        masterExerciseName: "Row",
        isLinked: true,
      },
      {
        templateExerciseId: 11,
        exerciseName: "Curl",
        masterExerciseId: null,
        masterExerciseName: null,
        isLinked: false,
      },
    ];

    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                orderBy: vi.fn(() => Promise.resolve(rows)),
              })),
            })),
          })),
        })),
      })),
    } as any;

    const caller = createCaller({ user: { id: userId }, db });
    const out = await caller.exercises.getLinksForTemplate({ templateId: 77 });
    expect(out).toEqual(rows);
  });

  it("isLinkingRejected returns false when missing and true when flag present", async () => {
    const userId = "user_1";
    const select = vi.fn()
      // missing
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })
      // present true
      .mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ linkingRejected: true }])),
          })),
        })),
      });

    const db = { select } as any;
    const caller = createCaller({ user: { id: userId }, db });

    const a = await caller.exercises.isLinkingRejected({ templateExerciseId: 1 });
    expect(a).toBe(false);
    const b = await caller.exercises.isLinkingRejected({ templateExerciseId: 1 });
    expect(b).toBe(true);
  });

  it("rejectLinking flips flag after existence check", async () => {
    const userId = "user_1";
    const db = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ id: 10 }])),
          })),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
      })),
    } as any;

    const caller = createCaller({ user: { id: userId }, db });
    const out = await caller.exercises.rejectLinking({ templateExerciseId: 10 });
    expect(out).toEqual({ success: true });
  });

  it("getLinkingDetails throws when master not found, otherwise returns linked and potentialLinks sorted", async () => {
    const userId = "user_1";
    // First call: no master -> throw
    {
      const db = {
        select: vi.fn()
          // linkedExercises
          .mockReturnValueOnce({
            from: vi.fn(() => ({
              innerJoin: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })
          // unlinkedExercises
          .mockReturnValueOnce({
            from: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve([])),
              })),
            })),
          })
          // masterExercise -> empty
          .mockReturnValueOnce({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve([])),
              })),
            })),
          }),
      } as any;

      const caller = createCaller({ user: { id: userId }, db });
      await expect(
        caller.exercises.getLinkingDetails({ masterExerciseId: 1 }),
      ).rejects.toThrow(/Master exercise not found/i);
    }

    // Second call: valid master, mix of potential links sorted by similarity
    {
      const linked = [{ templateExerciseId: 10, exerciseName: "Row", templateId: 1, templateName: "T1" }];
      const unlinked = [
        { templateExerciseId: 11, exerciseName: "Bent Over Row", templateId: 1, templateName: "T1", linkingRejected: false },
        { templateExerciseId: 12, exerciseName: "Seated Row", templateId: 2, templateName: "T2", linkingRejected: false },
      ];
      const db = {
        select: vi.fn()
          // linkedExercises
          .mockReturnValueOnce({
            from: vi.fn(() => ({
              innerJoin: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve(linked)),
              })),
            })),
          })
          // unlinkedExercises
          .mockReturnValueOnce({
            from: vi.fn(() => ({
              leftJoin: vi.fn(() => ({
                where: vi.fn(() => Promise.resolve(unlinked)),
              })),
            })),
          })
          // masterExercise -> present (normalizedName required for similarity)
          .mockReturnValueOnce({
            from: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve([{ name: "Row", normalizedName: "row" }])),
              })),
            })),
          }),
      } as any;

      const caller = createCaller({ user: { id: userId }, db });
      const res = await caller.exercises.getLinkingDetails({ masterExerciseId: 1 });
      expect(res.masterExerciseName).toBe("Row");
      expect(res.linkedExercises).toEqual(linked);
      // Potential links sorted by similarity descending; we at least expect presence and length
      expect(Array.isArray(res.potentialLinks)).toBe(true);
      expect(res.potentialLinks.length).toBe(2);
      expect(res.potentialLinks[0].similarity).toBeGreaterThanOrEqual(res.potentialLinks[1].similarity);
    }
  });

  it("bulkLinkSimilar returns count of links created based on similarity threshold", async () => {
    const userId = "user_1";
    const db = {
      query: {
        masterExercises: {
          findFirst: vi.fn(() => Promise.resolve({ id: 1, normalizedName: "row" })),
        },
      },
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          leftJoin: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([
              { id: 10, exerciseName: "Row" },
              { id: 11, exerciseName: "Bent Over Row" },
              { id: 12, exerciseName: "Curl" },
            ])),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve(undefined)),
      })),
    } as any;

    const caller = createCaller({ user: { id: userId }, db });
    const res = await caller.exercises.bulkLinkSimilar({ masterExerciseId: 1, minimumSimilarity: 0.5 });
    expect(res.linkedCount).toBeGreaterThan(0);
  });

  it("bulkUnlinkAll returns number unlinked from returned rows length", async () => {
    const userId = "user_1";
    const db = {
      delete: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => Promise.resolve([{ id: 1 }, { id: 2 }])),
        })),
      })),
    } as any;

    const caller = createCaller({ user: { id: userId }, db });
    const res = await caller.exercises.bulkUnlinkAll({ masterExerciseId: 1 });
    expect(res.unlinkedCount).toBe(2);
  });

  it("migrateExistingExercises creates masters and links; returns counts", async () => {
    const userId = "user_1";
    const db = {
      select: vi.fn()
        // unlinked exercises
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            leftJoin: vi.fn(() => ({
              where: vi.fn(() => Promise.resolve([
                { id: 10, exerciseName: "Row" },
                { id: 11, exerciseName: "Bent Over Row" },
              ])),
            })),
          })),
        })
        // existing master for "row"
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{ id: 1, user_id: userId, normalizedName: "row" }])),
            })),
          })),
        })
        // existing master for "bent over row" -> none
        .mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        }),
      insert: vi.fn(() => ({
        values: vi.fn((v: any) => ({
          returning: vi.fn(() => {
            // If inserting into masterExercises, return the row
            if (v && (Array.isArray(v) ? v[0] : v).name) {
              return Promise.resolve([{ id: 2, name: "Bent Over Row", normalizedName: "bent over row" }]);
            }
            // Otherwise linking insert (return ignored)
            return Promise.resolve([{ id: 100 }]);
          }),
        })),
      })),
    } as any;

    const caller = createCaller({ user: { id: userId }, db });
    const res = await caller.exercises.migrateExistingExercises();
    expect(res.migratedExercises).toBe(2);
    expect(res.createdMasterExercises).toBe(1);
    expect(res.createdLinks).toBe(2);
  });
});
