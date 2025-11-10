import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { collection, query, onSnapshot, doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

interface AdminUser {
  uid: string;
  email?: string;
  role: "admin" | "moderator" | "user";
}

interface LicenseKey {
  key: string;
  active: boolean;
  ownerUid?: string;
  createdAt: number;
  activatedAt?: number;
}

export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [gateOk, setGateOk] = useState(false);
  const [name, setName] = useState("");
  const [pass, setPass] = useState("");
  
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [licenses, setLicenses] = useState<LicenseKey[]>([]);
  const [newKey, setNewKey] = useState("");
  const [selectedTab, setSelectedTab] = useState<"users" | "licenses">("users");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  async function submitGate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Connectez-vous d'abord");
    const token = await user.getIdToken();
    const res = await fetch("/api/admin/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, password: pass }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setGateOk(true);
      toast.success("Accès accordé");
      setName("");
      setPass("");
      loadAdminData();
    } else {
      toast.error(data?.error === "invalid_credentials" ? "Identifiants invalides" : "Erreur d'accès");
    }
  }

  function loadAdminData() {
    // Load users with role
    const usersQuery = query(collection(db, "users"));
    const unsubUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const users = snapshot.docs.map((doc) => ({
          uid: doc.id,
          email: doc.data().email,
          role: (doc.data().role || "user") as "admin" | "moderator" | "user",
        }));
        setAdminUsers(users);
      },
      (error) => console.error("Error loading users:", error),
    );

    // Load licenses
    const licensesQuery = query(collection(db, "licenses"));
    const unsubLicenses = onSnapshot(
      licensesQuery,
      (snapshot) => {
        const lics = snapshot.docs.map((doc) => ({
          key: doc.data().key,
          active: doc.data().active,
          ownerUid: doc.data().ownerUid,
          createdAt: doc.data().createdAt,
          activatedAt: doc.data().activatedAt,
        }));
        setLicenses(lics.sort((a, b) => b.createdAt - a.createdAt));
      },
      (error) => console.error("Error loading licenses:", error),
    );

    return () => {
      unsubUsers();
      unsubLicenses();
    };
  }

  async function createKey() {
    if (!user) return toast.error("Connectez-vous d'abord");
    setLoading(true);
    const token = await user.getIdToken();
    const res = await fetch("/api/license/createKey", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ key: newKey || undefined }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(`Clé créée: ${data.key}`);
      setNewKey("");
      // Copy to clipboard
      navigator.clipboard.writeText(data.key);
      toast.success("Copié dans le presse-papiers!");
    } else {
      toast.error(data?.error || "Erreur création de clé");
    }
  }

  async function updateUserRole(uid: string, newRole: "admin" | "moderator" | "user") {
    if (!user) return;
    const token = await user.getIdToken();
    const res = await fetch("/api/admin/update-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uid, role: newRole }),
    });
    if (res.ok) {
      toast.success("Rôle mis à jour");
    } else {
      toast.error("Erreur lors de la mise à jour");
    }
  }

  if (!user) {
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
                placeholder="admin"
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
                placeholder="admin"
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
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-sm text-primary hover:underline">
              Dashboard
            </Link>
            <button
              onClick={() => signOut(auth)}
              className="text-sm px-3 py-1 rounded-md bg-muted hover:bg-accent"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <main className="container py-8 grid gap-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-border/50">
          <button
            onClick={() => setSelectedTab("users")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
              selectedTab === "users"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Users & Roles
          </button>
          <button
            onClick={() => setSelectedTab("licenses")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${
              selectedTab === "licenses"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            License Keys
          </button>
        </div>

        {/* Users Tab */}
        {selectedTab === "users" && (
          <section className="rounded-xl border border-border/60 p-4 bg-card/60">
            <h2 className="font-semibold mb-4">User Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3">Email</th>
                    <th className="text-left py-2 px-3">UID</th>
                    <th className="text-left py-2 px-3">Role</th>
                    <th className="text-left py-2 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adminUsers.map((u) => (
                    <tr key={u.uid} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-2 px-3">{u.email || "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground text-xs font-mono truncate max-w-xs">
                        {u.uid}
                      </td>
                      <td className="py-2 px-3">
                        <select
                          value={u.role}
                          onChange={(e) => updateUserRole(u.uid, e.target.value as any)}
                          className="rounded-md bg-background border border-border/50 px-2 py-1 text-xs"
                        >
                          <option value="user">User</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span
                          className={`px-2 py-1 rounded ${
                            u.role === "admin"
                              ? "bg-red-600/20 text-red-300"
                              : u.role === "moderator"
                                ? "bg-yellow-600/20 text-yellow-300"
                                : "bg-blue-600/20 text-blue-300"
                          }`}
                        >
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Licenses Tab */}
        {selectedTab === "licenses" && (
          <section className="rounded-xl border border-border/60 p-4 bg-card/60">
            <h2 className="font-semibold mb-4">License Keys</h2>
            
            {/* Create License */}
            <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/50">
              <h3 className="font-medium text-sm mb-3">Generate New Key</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                  placeholder="Auto-generated if empty"
                  className="flex-1 rounded-md bg-background border border-border px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
                />
                <button
                  onClick={createKey}
                  disabled={loading}
                  className="px-4 py-2 bg-primary text-black font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50"
                >
                  {loading ? "..." : "Create"}
                </button>
              </div>
            </div>

            {/* List Licenses */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3">Key</th>
                    <th className="text-left py-2 px-3">Status</th>
                    <th className="text-left py-2 px-3">Owner</th>
                    <th className="text-left py-2 px-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {licenses.map((lic) => (
                    <tr key={lic.key} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-2 px-3 font-mono text-xs">{lic.key}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            lic.active
                              ? "bg-green-600/20 text-green-300"
                              : "bg-gray-600/20 text-gray-300"
                          }`}
                        >
                          {lic.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {lic.ownerUid ? lic.ownerUid.slice(0, 8) + "..." : "—"}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground text-xs">
                        {new Date(lic.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
