import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="text-9xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
            404
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-600">
            Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-8 rounded-lg hover:opacity-90 transition-opacity"
          >
            Go Home
          </Link>
          <Link
            href="/chat"
            className="bg-gray-100 text-gray-700 font-semibold py-3 px-8 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Start Chatting
          </Link>
        </div>

        <div className="mt-12">
          <svg 
            className="w-64 h-64 mx-auto text-purple-200" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
