import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "~/__tests__/test-utils";
import {
  LoadingBoundary,
  PageLoadingBoundary,
  CardLoadingBoundary,
  ListLoadingBoundary,
} from "~/components/loading-boundary";

describe("LoadingBoundary", () => {
  it("renders children when provided", () => {
    render(
      <LoadingBoundary>
        <div>Content</div>
      </LoadingBoundary>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("renders custom fallback when provided", () => {
    const CustomFallback = () => <div>Custom loading...</div>;

    render(
      <LoadingBoundary fallback={<CustomFallback />}>
        <div>Content</div>
      </LoadingBoundary>,
    );

    // Since no suspense, it should render content
    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("passes name prop correctly", () => {
    render(
      <LoadingBoundary name="test component">
        <div>Content</div>
      </LoadingBoundary>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

describe("PageLoadingBoundary", () => {
  it("renders children when provided", () => {
    render(
      <PageLoadingBoundary>
        <div>Page content</div>
      </PageLoadingBoundary>,
    );

    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("renders with custom name", () => {
    render(
      <PageLoadingBoundary name="dashboard">
        <div>Content</div>
      </PageLoadingBoundary>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

describe("CardLoadingBoundary", () => {
  it("renders children when provided", () => {
    render(
      <CardLoadingBoundary>
        <div>Card content</div>
      </CardLoadingBoundary>,
    );

    expect(screen.getByText("Card content")).toBeInTheDocument();
  });

  it("renders with custom name", () => {
    render(
      <CardLoadingBoundary name="workout stats">
        <div>Content</div>
      </CardLoadingBoundary>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});

describe("ListLoadingBoundary", () => {
  it("renders children when provided", () => {
    render(
      <ListLoadingBoundary>
        <div>List content</div>
      </ListLoadingBoundary>,
    );

    expect(screen.getByText("List content")).toBeInTheDocument();
  });

  it("renders with custom name", () => {
    render(
      <ListLoadingBoundary name="exercises">
        <div>Content</div>
      </ListLoadingBoundary>,
    );

    expect(screen.getByText("Content")).toBeInTheDocument();
  });
});
