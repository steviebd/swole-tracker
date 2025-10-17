import { describe, it, expect } from "vitest";
import { getClientIp } from "~/lib/oauth-state";

describe("OAuth State Management", () => {
  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const headers = new Headers({
        "x-forwarded-for": "192.168.1.1, 10.0.0.1",
      });

      const ip = getClientIp(headers);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const headers = new Headers({
        "x-real-ip": "192.168.1.1",
      });

      const ip = getClientIp(headers);
      expect(ip).toBe("192.168.1.1");
    });

    it("should extract IP from cf-connecting-ip header", () => {
      const headers = new Headers({
        "cf-connecting-ip": "192.168.1.1",
      });

      const ip = getClientIp(headers);
      expect(ip).toBe("192.168.1.1");
    });

    it("should return unknown when no headers present", () => {
      const headers = new Headers();

      const ip = getClientIp(headers);
      expect(ip).toBe("unknown");
    });

    it("should prioritize x-forwarded-for over others", () => {
      const headers = new Headers({
        "x-forwarded-for": "192.168.1.1",
        "x-real-ip": "10.0.0.1",
        "cf-connecting-ip": "172.16.0.1",
      });

      const ip = getClientIp(headers);
      expect(ip).toBe("192.168.1.1");
    });
  });
});
