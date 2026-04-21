import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/UI';

export default function Login() {
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to="/" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
    else navigate('/');
  };

  return (
    <div className="flex h-full items-center justify-center bg-bg-primary p-6">
      <div className="w-full max-w-sm bg-bg-secondary border border-border rounded-lg p-8">
        <div className="text-xl font-bold mb-1">Hero Balancer</div>
        <div className="text-sm text-slate-400 mb-6">Sign in to continue.</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>
          {error && (
            <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded p-2">
              {error}
            </div>
          )}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="text-xs text-slate-500 mt-6">
          First run? Create a user in Supabase → Authentication → Users, then add a row to{' '}
          <code className="text-slate-300">user_roles</code> with role{' '}
          <code className="text-slate-300">admin</code>.
        </p>
      </div>
    </div>
  );
}
