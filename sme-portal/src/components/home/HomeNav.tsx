import { useState } from "react";
import { ChevronDown, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function HomeNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center">
            <BarChart2 className="h-7 w-7 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-gray-900">SME FINANCE</p>
            <p className="text-[10px] font-medium leading-tight text-green-600">Grow Your Business</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <a href="#" className="border-b-2 border-green-600 pb-0.5 text-sm font-medium text-green-600">
            Home
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
            How It Works
          </a>
          <a href="#features" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
            Features
          </a>
          <a href="#about" className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
            About Us
          </a>
          <button className="flex items-center gap-1 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900">
            Resources <ChevronDown className="h-4 w-4" />
          </button>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/login"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Log In
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700"
          >
            Get Started
          </Link>
        </div>

        <button className="p-2 md:hidden" onClick={() => setMobileOpen((open) => !open)} aria-label="Toggle navigation">
          <div className="mb-1 h-0.5 w-5 bg-gray-700" />
          <div className="mb-1 h-0.5 w-5 bg-gray-700" />
          <div className="h-0.5 w-5 bg-gray-700" />
        </button>
      </div>

      {mobileOpen && (
        <div className="space-y-3 border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <a href="#" className="block text-sm font-medium text-green-600">
            Home
          </a>
          <a href="#how-it-works" className="block text-sm font-medium text-gray-600">
            How It Works
          </a>
          <a href="#features" className="block text-sm font-medium text-gray-600">
            Features
          </a>
          <a href="#about" className="block text-sm font-medium text-gray-600">
            About Us
          </a>
          <div className="flex gap-3 pt-2">
            <Link to="/login" className="flex-1 rounded-lg border border-gray-200 py-2 text-center text-sm font-medium text-gray-700">
              Log In
            </Link>
            <Link to="/register" className="flex-1 rounded-lg bg-green-600 py-2 text-center text-sm font-semibold text-white">
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
