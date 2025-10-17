import React from "react";
import { describe, it, expect } from "vitest";
import "@testing-library/jest-dom";
import { render, screen } from "~/__tests__/test-utils";
import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";

describe("Avatar", () => {
  it("renders with default props", () => {
    const { container } = render(<Avatar />);
    const avatar = container.querySelector("span.relative.flex.h-10.w-10");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass(
      "relative",
      "flex",
      "h-10",
      "w-10",
      "shrink-0",
      "overflow-hidden",
      "rounded-full",
    );
  });

  it("applies custom className", () => {
    const { container } = render(<Avatar className="custom-class" />);
    const avatar = container.querySelector("span");
    expect(avatar).toHaveClass("custom-class");
  });

  it("forwards other props", () => {
    const { container } = render(<Avatar data-testid="avatar" />);
    const avatar = container.querySelector('[data-testid="avatar"]');
    expect(avatar).toBeInTheDocument();
  });
});

// describe("AvatarImage", () => {
//   it("renders with correct classes", () => {
//     render(
//       <Avatar>
//         <AvatarImage src="test.jpg" alt="Test" />
//       </Avatar>,
//     );
//     const image = screen.getByAltText("Test");
//     expect(image).toHaveClass("aspect-square", "h-full", "w-full");
//   });

//   it("applies custom className", () => {
//     render(
//       <Avatar>
//         <AvatarImage src="test.jpg" alt="Test" className="custom-class" />
//       </Avatar>,
//     );
//     const image = screen.getByAltText("Test");
//     expect(image).toHaveClass("custom-class");
//   });
// });

describe("AvatarFallback", () => {
  it("renders with correct classes", () => {
    render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>,
    );
    const fallback = screen.getByText("AB");
    expect(fallback).toHaveClass(
      "flex",
      "h-full",
      "w-full",
      "items-center",
      "justify-center",
      "rounded-full",
      "bg-muted",
    );
  });

  it("applies custom className", () => {
    render(
      <Avatar>
        <AvatarFallback className="custom-class">AB</AvatarFallback>
      </Avatar>,
    );
    const fallback = screen.getByText("AB");
    expect(fallback).toHaveClass("custom-class");
  });
});
