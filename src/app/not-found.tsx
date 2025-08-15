import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist.
        </p>
        <Link 
          href="/" 
          className="btn-primary px-6 py-2 rounded-lg"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}