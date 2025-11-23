/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render } from "@testing-library/react";

describe("DOM Container Test", () => {
  beforeEach(() => {
    // Ensure document body exists and is clean
    document.body.innerHTML = "";
  });

  it("should have document body", () => {
    expect(document.body).toBeDefined();
    expect(document.body.appendChild).toBeDefined();
  });

  it("should create div element", () => {
    const div = document.createElement("div");
    div.textContent = "Test";
    document.body.appendChild(div);
    expect(document.body.textContent).toBe("Test");
  });

  it("should render React component", () => {
    const { container } = render(<div>Test React</div>);
    expect(container.textContent).toBe("Test React");
  });
});
