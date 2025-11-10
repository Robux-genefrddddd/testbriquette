import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { toast } from "sonner";

export default function Activate() {
  const [user, setUser] = useState<User | null>(null);
  const [key, setKey] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function activateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Connectez-vous d'abord");
    const token = await user.getIdToken();
    const res = await fetch("/api/license/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1020] to-[#0a0f1a] text-white grid place-items-center p-6">
      <div className="w-full max-w-md bg-card/80 backdrop-blur rounded-2xl border border-border/60 p-6">
        <h1 className="text-2xl font-bold">Activer une clé</h1>
        <p className="text-sm text-muted-foreground mt-1">Entrez votre clé de licence pour l'associer à votre compte.</p>
        {!user && (
          <p className="mt-3 text-amber-300">Vous devez être connecté. <Link to="/" className="underline">Aller à l'accueil</Link></p>
        )}
        <form onSubmit={activateKey} className="mt-5 space-y-3">
          <div>
            <label className="text-sm">Clé</label>
            <input value={key} onChange={(e)=>setKey(e.target.value)} placeholder="ABCD-XXXX-YYYY" className="mt-1 w-full rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <button className="w-full py-2 rounded-md bg-primary text-black font-semibold">Activer</button>
        </form>
        <div className="mt-4 text-sm text-muted-foreground flex items-center justify-between">
          <Link to="/" className="hover:text-primary">← Retour</Link>
          <a href="https://discord.gg/" className="hover:text-primary">Pas de clé ? Discord</a>
        </div>
      </div>
    </div>
  );
}
