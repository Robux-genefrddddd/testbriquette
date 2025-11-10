import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { toast } from "sonner";

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [gateOk, setGateOk] = useState(false);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  const [newKey, setNewKey] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function submitGate(e: React.FormEvent) {
    e.preventDefault();
    if (name === "Admin" && pass === "Antoine80@") {
      setGateOk(true);
    } else {
      toast.error("Accès refusé");
    }
  }

  async function createKey() {
    if (!user) return toast.error("Connectez-vous d'abord");
    const token = await user.getIdToken();
    const res = await fetch("/api/license/createKey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key: newKey || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(`Clé créée: ${data.key}`);
      setNewKey(data.key);
    } else {
      toast.error(data?.error || "Erreur création de clé");
    }
  }

  if (!gateOk) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b1020] to-[#0a0f1a] text-white grid place-items-center p-6">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5">
          <h1 className="text-lg font-semibold">Admin — Accès fondateur</h1>
          <form onSubmit={submitGate} className="mt-4 space-y-3">
            <div>
              <label className="text-sm">Nom</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                placeholder="Admin"
              />
            </div>
            <div>
              <label className="text-sm">Mot de passe</label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            <button className="w-full py-2 rounded-md bg-primary text-black font-semibold">
              Entrer
            </button>
            <div className="text-sm text-muted-foreground">
              Raccourci: Ctrl + F1 depuis l'accueil
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1020] to-[#0a0f1a] text-white">
      <header className="border-b border-border/50">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="font-bold">RShield — Admin</h1>
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Retour
          </Link>
        </div>
      </header>
      <main className="container py-8 grid gap-6">
        <section className="rounded-xl border border-border/60 p-4 bg-card/60">
          <h2 className="font-semibold mb-3">Licences</h2>
          <div className="flex gap-2 flex-wrap items-end">
            <div className="flex-1 min-w-56">
              <label className="text-sm">Clé (optionnel)</label>
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                placeholder="Auto si vide"
              />
            </div>
            <button
              onClick={createKey}
              className="px-4 py-2 rounded-md bg-primary text-black font-semibold"
            >
              Créer une clé
            </button>
          </div>
        </section>
        <section className="rounded-xl border border-border/60 p-4 bg-card/60">
          <h2 className="font-semibold mb-3">Modération</h2>
          <p className="text-sm text-muted-foreground">
            Bientôt: Ban / Unban, logs, commandes.
          </p>
        </section>
      </main>
    </div>
  );
}
