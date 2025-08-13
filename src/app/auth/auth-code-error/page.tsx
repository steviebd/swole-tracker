import Link from "next/link";

export default function AuthCodeError() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-6 shadow-md dark:bg-gray-800">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-red-600">Authentication Error</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            There was an error processing your authentication request.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This could happen if:
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <li>The authentication link has expired</li>
            <li>The link has already been used</li>
            <li>There was a temporary server error</li>
          </ul>
        </div>

        <div className="text-center space-y-3">
          <Link
            href="/auth/login"
            className="block w-full rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            Try Signing In Again
          </Link>
          <Link
            href="/auth/register"
            className="block text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            Or create a new account
          </Link>
        </div>
      </div>
    </div>
  );
}