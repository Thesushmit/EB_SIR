import { FormEvent, useState } from 'react';
import { Building2, LogIn, UserPlus } from 'lucide-react';
import { adminLoginEmail, hasSupabaseConfig, supabase } from '../services/supabase';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const isAdminLogin = mode === 'login' && email.trim().toLowerCase() === 'admin';
    const loginEmail = isAdminLogin ? adminLoginEmail : email.trim();

    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email: loginEmail, password })
        : await supabase.auth.signUp({
            email: loginEmail,
            password,
            options: { data: { name, role: 'tenant' } },
          });

    setBusy(false);
    if (result.error) {
      setMessage(
        isAdminLogin && result.error.message.toLowerCase().includes('invalid login')
          ? 'Admin account is not created yet in Supabase. Create user sushmitp1@gmail.com with password admin@123, then run the admin role SQL.'
          : result.error.message,
      );
      return;
    }

    if (mode === 'signup') {
      setMessage('Account created. If email confirmation is enabled, please confirm before logging in.');
    }
  }

  return (
    <main className="grid min-h-screen bg-paper px-4 py-8 text-ink lg:grid-cols-[1.05fr_0.95fr]">
      <section className="flex items-center justify-center">
        <div className="max-w-xl">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-xl bg-brand text-white">
            <Building2 size={30} />
          </div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">Rent and electricity bills without Excel work.</h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Owner enters meter readings. The app calculates units, electricity charges, well bill, rent, and total payable for every tenant.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {['Admin control', 'Tenant portal', 'Printable bills'].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft">
                <p className="font-semibold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center py-8">
        <form className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-soft" onSubmit={submit}>
          <div className="mb-6 flex rounded-lg bg-slate-100 p-1">
            <button type="button" className={`segmented ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
              Login
            </button>
            <button type="button" className={`segmented ${mode === 'signup' ? 'active' : ''}`} onClick={() => setMode('signup')}>
              Sign up
            </button>
          </div>

          {mode === 'signup' && (
            <>
              <label className="field-label">Name</label>
              <input className="field" value={name} onChange={(event) => setName(event.target.value)} required />
            </>
          )}

          <label className="field-label">{mode === 'login' ? 'Email or username' : 'Email'}</label>
          <input
            className="field"
            type={mode === 'login' ? 'text' : 'email'}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={mode === 'login' ? 'admin or tenant email' : 'tenant@example.com'}
            required
          />
          <label className="field-label">Password</label>
          <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />

          {mode === 'login' && (
            <p className="mb-4 text-sm text-slate-500">
              Owner login: username <code>admin</code>, password <code>admin@123</code>.
            </p>
          )}
          {message && <p className="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          {!hasSupabaseConfig && <p className="mb-4 text-sm text-amber-700">Supabase credentials are not configured yet.</p>}

          <button className="primary-button w-full" disabled={busy}>
            {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
            {busy ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </section>
    </main>
  );
}
