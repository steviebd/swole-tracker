import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "~/__tests__/test-utils";

import { GlobalStatusTray } from "~/components/global-status-tray";

describe("GlobalStatusTray", () => {
  it.skip("renders without crashing", () => {
    expect(() => render(<GlobalStatusTray />)).not.toThrow();
  });
});
