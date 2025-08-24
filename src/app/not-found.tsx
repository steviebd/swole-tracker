// Override built-in 404 to prevent Html import issues
export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            marginBottom: "1rem",
          }}
        >
          404 - Page Not Found
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
          The page you're looking for doesn't exist.
        </p>
        <a
          href="/"
          style={{
            backgroundColor: "#3b82f6",
            color: "white",
            padding: "0.5rem 1.5rem",
            borderRadius: "0.5rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

// Disable static generation for this page to prevent prerendering issues
export const dynamic = "force-dynamic";

// Also disable static generation params
export const dynamicParams = false;

// Force runtime to be edge to avoid Node.js specific issues
export const runtime = "edge";
