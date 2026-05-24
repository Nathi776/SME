import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { AuthApi } from "../api/authApi";
import { formatApiErrorDetail } from "../utils/formatApiError";
import {
  BarChart2,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  TrendingUp,
  Zap,
} from "lucide-react";

function MicrosoftIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 21 21" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  );
}

function GoogleIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.9 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7 12.9 19c1.8-4.4 6.1-7.4 11.1-7.4 3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.4 4 24 4c-7.9 0-14.7 4.5-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.2l-6.3-5.2C29.4 35.9 26.9 37 24 37c-5.4 0-9.8-3.1-11.3-7.6l-6.6 5.1C9.1 39.7 16 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3-3.3 5.5-6.3 7.1l.1.1 6.3 5.2C34.8 38.8 40 34 40 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await AuthApi.login(email, password);
      const token = response.data.access_token;
      const role = response.data.role;

      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("role", role);
      sessionStorage.setItem("email", email.trim());
      sessionStorage.setItem("username", email.trim().split("@")[0] || email.trim());

      const redirectPath =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
        (role === "lender" ? "/lender/dashboard" : "/dashboard");

      navigate(redirectPath, { replace: true });
    } catch (authError) {
      if (axios.isAxiosError(authError)) {
        const detail = authError.response?.data?.detail;
        setError(formatApiErrorDetail(detail) || "Invalid email or password");
      } else {
        setError("Invalid email or password");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError("Social login is not configured in this project yet.");
  };

  const handleMicrosoft = () => {
    setError("Social login is not configured in this project yet.");
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-inter">
      <div className="relative hidden w-[46%] flex-col overflow-hidden bg-gradient-to-b from-[#0a2518] to-[#0d3320] p-10 lg:flex">
        <div className="mb-10 flex items-center gap-2">
          <BarChart2 className="h-7 w-7 text-green-400" />
          <div>
            <p className="text-sm font-bold leading-tight text-white">SME FINANCE</p>
            <p className="text-[10px] font-medium text-green-400">Grow Your Business</p>
          </div>
        </div>

        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-green-700/40 bg-green-900/60 px-3 py-1.5 text-xs font-medium text-green-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Smart Financing for Growing Businesses
        </div>

        <h1 className="mb-1 text-3xl font-extrabold leading-tight text-white">Fuel Your Business.</h1>
        <h1 className="mb-5 text-3xl font-extrabold leading-tight text-green-400">Unlock Your Potential.</h1>
        <p className="mb-8 max-w-xs text-sm leading-relaxed text-white/60">
          SME Finance connects small and medium businesses with the capital they need to grow. Upload invoices, get financing, and manage your business finances all in one secure platform.
        </p>

        <div className="mb-10 space-y-4">
          {[
            { icon: Zap, color: "bg-yellow-500/20 text-yellow-400", title: "Quick approvals", desc: "Get funding in as little as 24 hours" },
            { icon: ShieldCheck, color: "bg-green-500/20 text-green-400", title: "Competitive rates", desc: "Transparent pricing with no hidden fees" },
            { icon: TrendingUp, color: "bg-blue-500/20 text-blue-400", title: "Trusted by SMEs", desc: "Join thousands of businesses growing with us" },
          ].map((feature) => (
            <div key={feature.title} className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${feature.color}`}>
                <feature.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{feature.title}</p>
                <p className="text-xs text-white/50">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto relative">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="relative mb-3 h-20 overflow-hidden rounded-lg bg-[#0a2518]">
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 200 80" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,60 C20,55 40,45 60,40 C80,35 100,30 120,20 C140,10 160,15 180,10 L200,8 L200,80 L0,80 Z" fill="url(#chartGrad)" />
                <path d="M0,60 C20,55 40,45 60,40 C80,35 100,30 120,20 C140,10 160,15 180,10 L200,8" fill="none" stroke="#22C55E" strokeWidth="2" />
              </svg>
            </div>

            <div className="flex gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-green-700/30 bg-[#0a2518] px-3 py-2">
                <div>
                  <p className="text-sm font-bold text-white">R250,000</p>
                  <p className="text-[10px] text-green-400">Financing Approved</p>
                </div>
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex items-center justify-center rounded-lg border border-white/10 bg-[#0a2518] px-3 py-2">
                <div className="h-8 w-8 rounded-full border-4 border-green-400 border-t-transparent opacity-60" />
              </div>
              <div className="flex items-center justify-center rounded-lg border border-white/10 bg-[#0a2518] px-3 py-2">
                <Lock className="h-5 w-5 text-green-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        <div className="flex justify-end px-8 py-4">
          <button type="button" className="text-sm text-gray-500 transition-colors hover:text-gray-700">
            🌐 English ▾
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <div className="w-full max-w-md">
            <h2 className="mb-1 text-3xl font-extrabold text-gray-900">Welcome Back!</h2>
            <p className="mb-8 text-sm font-medium text-green-600">Sign in to your SME Finance account</p>

            {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email address"
                    className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-4 text-sm transition-colors focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-gray-200 py-3 pl-10 pr-10 text-sm transition-colors focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((current) => !current)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded accent-green-600"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-green-600 hover:underline">
                  Forgot Password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-700 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-800 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Sign In
                  </>
                )}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-400">
                <span className="bg-white px-3">or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleGoogle}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <GoogleIcon />
                Google
              </button>
              <button
                type="button"
                onClick={handleMicrosoft}
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                <MicrosoftIcon />
                Microsoft
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-gray-500">
              Don't have an account? <Link to="/register" className="font-semibold text-green-600 hover:underline">Create Account</Link>
            </p>

            <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
              <ShieldCheck className="h-4 w-4 text-gray-400" />
              Your data is secure with bank-level encryption
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
