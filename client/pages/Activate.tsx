import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { toast } from "sonner";
import { useActiveLicense } from "@/hooks/use-active-license";

export default function Activate() {
  const [user, setUser] = useState<User | null>(null);
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { hasActiveLicense } = useActiveLicense(user);

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

  // If user has active license, redirect to dashboard
  useEffect(() => {
    if (hasActiveLicense === true) {
      navigate("/dashboard");
    }
  }, [hasActiveLicense, navigate]);

  async function activateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Connectez-vous d'abord");
    const token = await user.getIdToken();
    const res = await fetch("/api/license/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success("Licence activée");
      navigate("/dashboard");
    } else {
      toast.error(data?.error || "Activation échouée");
    }
  }

  if (loading) {
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

      <main className="container min-h-[calc(100vh-72px)] grid place-items-center py-12">
        <div className="w-full max-w-md bg-card/80 backdrop-blur rounded-2xl border border-border/60 p-6">
          <h1 className="text-2xl font-bold">Activer votre licence</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Entrez votre clé de licence pour activer votre compte.
          </p>

          <form onSubmit={activateKey} className="mt-5 space-y-3">
            <div>
              <label className="text-sm">Clé de licence</label>
              <input
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                placeholder="ABCD-XXXX-YYYY"
                required
                className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button className="w-full py-2 rounded-md bg-primary text-black font-semibold hover:bg-primary/90">
              Activer la licence
            </button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm">
              Pas de clé de licence ?{" "}
              <a
                href="https://discord.gg/"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-semibold"
              >
                Contactez-nous sur Discord
              </a>
            </p>
          </div>

          <button
            onClick={() => signOut(auth)}
            className="w-full mt-4 py-2 rounded-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-border/80"
          >
            Déconnexion
          </button>
        </div>
      </main>
    </div>
  );
}
