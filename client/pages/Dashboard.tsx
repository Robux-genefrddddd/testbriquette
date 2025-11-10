import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { useActiveLicense } from "@/hooks/use-active-license";
import { toast } from "sonner";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { hasActiveLicense, loading: licenseLoading } = useActiveLicense(user);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        navigate("/");
      }
    });
    return () => unsub();
  }, [navigate]);

  // Redirect to license activation if no active license
  useEffect(() => {
    if (licenseLoading === false && hasActiveLicense === false) {
      navigate("/activate");
    }
  }, [hasActiveLicense, licenseLoading, navigate]);

  if (loading || licenseLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b1020] to-[#0a0f1a] text-white grid place-items-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1020] to-[#0a0f1a] text-white">
      <header className="border-b border-border/50 backdrop-blur sticky top-0 z-40">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <img src="/logo-rshield.svg" className="h-8 w-8" alt="RShield" />
            <span className="font-extrabold tracking-tight text-xl">
              RShield — Panel
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            {user && (
              <>
                <span className="text-muted-foreground">{user.email}</span>
                <button
                  onClick={() => signOut(auth)}
                  className="px-3 py-1 rounded-md bg-muted hover:bg-accent"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="container py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Retour
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border/60 p-4 bg-card/60">
            <div className="text-sm text-muted-foreground">Players online</div>
            <div className="text-2xl font-semibold mt-1">0</div>
          </div>
          <div className="rounded-xl border border-border/60 p-4 bg-card/60">
            <div className="text-sm text-muted-foreground">Servers active</div>
            <div className="text-2xl font-semibold mt-1">0</div>
          </div>
          <div className="rounded-xl border border-border/60 p-4 bg-card/60">
            <div className="text-sm text-muted-foreground">Commands queued</div>
            <div className="text-2xl font-semibold mt-1">0</div>
          </div>
          <div className="rounded-xl border border-border/60 p-4 bg-card/60">
            <div className="text-sm text-muted-foreground">Logs / min</div>
            <div className="text-2xl font-semibold mt-1">0</div>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-border/60 p-4 bg-card/60">
          <h2 className="font-semibold mb-3">Placeholder</h2>
          <p className="text-sm text-muted-foreground">
            Dashboard is under development. More features coming soon.
          </p>
        </section>
      </main>
    </div>
  );
}
