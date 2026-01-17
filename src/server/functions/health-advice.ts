import { createServerFn } from "@tanstack/react-start";
import { withAuth } from "./middleware";

// === GET HEALTH ADVICE ===
export const getAdvice = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async () => {
    return {
      advice: "Stay consistent with your workouts and prioritize recovery.",
      category: "general",
    };
  });

// === GET HEALTH JOKE ===
export const getJoke = createServerFn({ method: "GET" })
  .middleware([withAuth])
  .handler(async () => {
    return {
      joke: "Why did the gym member bring a ladder? Because they wanted to work on their 'bar' height!",
    };
  });
