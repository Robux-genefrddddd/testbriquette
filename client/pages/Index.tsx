import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  User,
} from "firebase/auth";
import { toast } from "sonner";

export default function Index() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        navigate("/dashboard");
      }
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "F1") {
        e.preventDefault();
        setShowAdmin(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title = useMemo(
    () => (mode === "login" ? "Se connecter" : "Créer un compte"),
    [mode],
  );

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("Connecté");
        navigate("/dashboard");
      } else {
        if (step === "email") {
          setStep("password");
        } else {
          const cred = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
          );
          try {
            await sendEmailVerification(cred.user);
          } catch {}
          toast.success("Compte créé. Vérifiez votre email.");
          navigate("/activate");
        }
      }
    } catch (err: any) {
      const msg =
        err?.code === "auth/network-request-failed"
          ? "Réseau bloqué. Autorisez *.googleapis.com et *.firebaseapp.com ou réessayez."
          : err?.message || "Erreur d'authentification";
      toast.error(msg);
    }
  }

  function tryAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (adminName === "admin" && adminPass === "Antoine80@") {
      setShowAdmin(false);
      setAdminName("");
      setAdminPass("");
      navigate("/admin");
    } else {
      toast.error("Identifiants admin invalides");
    }
  }

  if (user) {
    return null;
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
            <a
              className="text-primary hover:underline"
              href="https://discord.gg/"
              target="_blank"
              rel="noreferrer"
            >
              Discord
            </a>
          </nav>
        </div>
      </header>

      <main className="container min-h-[calc(100vh-72px-80px)] grid place-items-center py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-extrabold leading-tight">
              Bienvenue sur <span className="text-primary">RShield</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              AntiCheat + Licences + Roblox Link
            </p>
          </div>
          <div className="bg-card/80 backdrop-blur rounded-2xl border border-border/60 p-6 shadow-2xl">
            {mode === "login" ? (
              <>
                <h2 className="text-lg font-semibold mb-4">Se connecter</h2>
                <form onSubmit={handleAuth} className="space-y-3">
                  <div>
                    <label className="text-sm">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm">Mot de passe</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 rounded-md bg-primary text-black font-semibold"
                  >
                    Se connecter
                  </button>
                </form>
                <button
                  onClick={() => {
                    setMode("register");
                    setStep("email");
                    setEmail("");
                    setPassword("");
                  }}
                  className="w-full mt-3 py-2 rounded-md border border-primary/50 text-primary font-semibold hover:bg-primary/10"
                >
                  Créer un compte
                </button>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-4">Créer un compte</h2>
                <form onSubmit={handleAuth} className="space-y-3">
                  {step === "email" ? (
                    <>
                      <div>
                        <label className="text-sm">Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                          placeholder="you@example.com"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 rounded-md bg-primary text-black font-semibold"
                      >
                        Suivant
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm">Email</label>
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="mt-1 w-full rounded-md bg-background/50 border border-border px-3 py-2 outline-none opacity-60"
                        />
                      </div>
                      <div>
                        <label className="text-sm">Mot de passe</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 rounded-md bg-primary text-black font-semibold"
                      >
                        Créer un compte
                      </button>
                    </>
                  )}
                </form>
                <button
                  onClick={() => {
                    setMode("login");
                    setStep("email");
                    setEmail("");
                    setPassword("");
                  }}
                  className="w-full mt-3 py-2 rounded-md border border-primary/50 text-primary font-semibold hover:bg-primary/10"
                >
                  Se connecter
                </button>
              </>
            )}

            <div className="my-6 h-px bg-border" />
            <div className="flex items-center justify-between text-sm">
              <button
                onClick={() => setShowAdmin(true)}
                className="text-muted-foreground hover:text-primary"
              >
                Admin
              </button>
              <a
                href="https://discord.gg/"
                className="text-muted-foreground hover:text-primary"
              >
                Pas de clé ? Discord
              </a>
            </div>
          </div>
        </div>
      </main>

      {showAdmin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5">
            <h2 className="text-lg font-semibold mb-3">
              Admin — Accès fondateur
            </h2>
            <form onSubmit={tryAdmin} className="space-y-3">
              <div>
                <label className="text-sm">Nom</label>
                <input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  placeholder="admin"
                />
              </div>
              <div>
                <label className="text-sm">Mot de passe</label>
                <input
                  type="password"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                />
              </div>
              <div className="flex items-center gap-2">
                <button className="flex-1 py-2 rounded-md bg-primary text-black font-semibold">
                  Entrer
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdmin(false)}
                  className="px-3 py-2 rounded-md border border-border hover:bg-accent"
                >
                  Annuler
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Raccourci: Ctrl + F1
              </p>
            </form>
          </div>
        </div>
      )}

      <footer className="border-t border-border/60 py-8">
        <div className="container text-sm text-muted-foreground flex items-center justify-between">
          <span>© {new Date().getFullYear()} RShield</span>
          <div className="flex items-center gap-3">
            <a
              href="/scripts/roblox/TerminalSecureRShield.lua"
              className="hover:text-primary"
            >
              Script Roblox
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-primary"
            >
              Docs & README
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
