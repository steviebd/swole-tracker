import { vi } from "vitest";

export const mockOfflineState = () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
};

export const mockOnlineState = () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
};

export const simulateNetworkTransition = (online: boolean) => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  window.dispatchEvent(new Event(online ? "online" : "offline"));
};