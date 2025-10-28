import Link from 'next/link'

export default function AdminAccess() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <h1 className="text-4xl font-bold text-yellow-500 mb-2">
              DappDojo
            </h1>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Access
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Restricted access for administrators only
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="text-gray-400 text-6xl mb-4">🔒</div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              This area is restricted to authorized administrators only.
            </p>
            <Link
              href="/admin/login"
              className="inline-block bg-yellow-500 text-black px-6 py-2 rounded-md font-medium hover:bg-yellow-600 transition-colors"
            >
              Admin Login
            </Link>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm text-yellow-600 hover:text-yellow-500 transition-colors"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

