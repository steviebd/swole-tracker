import { http, HttpResponse } from "msw";

// Mock WorkOS user data
const mockWorkOSUser = {
  id: "test-user-id",
  email: "test@example.com",
  first_name: "Test",
  last_name: "User",
  profile_picture_url: null,
  user_metadata: {
    first_name: "Test",
    last_name: "User",
    display_name: "Test User",
  },
};

// Mock session endpoint
export const mockSessionHandler = http.get("/api/auth/session", () => {
  return HttpResponse.json({ user: mockWorkOSUser });
});

// Mock login redirect
export const mockLoginHandler = http.get("/api/auth/login", () => {
  return HttpResponse.redirect(
    "https://workos.com/oauth/authorize?client_id=test",
  );
});

// Mock callback handler
export const mockCallbackHandler = http.get("/api/auth/callback", () => {
  return HttpResponse.redirect("/?success=true");
});

// Mock logout handler
export const mockLogoutHandler = http.post("/api/auth/logout", () => {
  return HttpResponse.json({ success: true });
});

// Export all handlers
export const workosAuthHandlers = [
  mockSessionHandler,
  mockLoginHandler,
  mockCallbackHandler,
  mockLogoutHandler,
];
