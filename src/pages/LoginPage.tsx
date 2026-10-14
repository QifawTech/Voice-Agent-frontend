import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/shared/AuthShell";
import Button from "@/components/shared/Button";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);
  const justRegistered = (location.state as { registered?: boolean })?.registered === true;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <AuthShell
      subtitle="Sign in to your admin console"
      footer={
        <p className="text-center text-sm text-text-muted">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-medium text-accent-light underline-offset-2 hover:underline"
          >
            Create one
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {justRegistered && !error && (
          <div className="rounded-ctl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
            Account created. Sign in to continue.
          </div>
        )}
        {error && (
          <div className="rounded-ctl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-text-muted">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@restaurant.com"
            required
            className="h-11 w-full"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text-muted">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="h-11 w-full pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim transition-colors hover:text-text-muted"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button type="submit" variant="primary" loading={loading} className="mt-1 h-11 w-full">
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
