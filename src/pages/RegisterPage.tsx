import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { Eye, EyeOff } from "lucide-react";
import AuthShell from "@/components/shared/AuthShell";
import Button from "@/components/shared/Button";

export default function RegisterPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
      });
      // Sign them in and drop them straight into the app. The single/multi
      // tenant question is asked as a dismissible prompt once they are in,
      // not as a wizard blocking the door.
      await login(form.email, form.password);
      navigate("/dashboard");
    } catch {
      setError("Registration failed. Email may already exist.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      subtitle="Set up your admin console"
      footer={
        <p className="text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-accent-light underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-ctl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-text-muted">Full name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Your name"
            required
            className="h-11 w-full"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-text-muted">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 characters"
              minLength={8}
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
          Create account
        </Button>
      </form>
    </AuthShell>
  );
}
