import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useActiveLicense } from "@/hooks/use-active-license";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { Console } from "@/components/dashboard/console";
import { LogsViewer } from "@/components/dashboard/logs-viewer";
import { PlayersList } from "@/components/dashboard/players-list";
import { BansManager } from "@/components/dashboard/bans-manager";
import { toast } from "sonner";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
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

  // Check if user is admin
  useEffect(() => {
    if (!user) return;
    const checkAdminRole = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const role = userDoc.data()?.role || "user";
        setIsAdmin(role === "admin");
      } catch (error) {
        console.error("Error checking admin role:", error);
        setIsAdmin(false);
      }
    };
    checkAdminRole();
  }, [user]);

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
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{user.email}</span>
                  {isAdmin && (
                    <span className="px-2 py-1 rounded-md bg-red-500/20 border border-red-500/50 text-red-300 text-xs font-semibold">
                      ADMIN
                    </span>
                  )}
                </div>
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
          <h1 className="text-2xl font-bold">Dashboard Overview</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                to="/admin"
                className="px-3 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30 text-sm"
              >
                Admin Panel
              </Link>
            )}
            <a
              href="/scripts/roblox/TerminalSecureRShield.lua"
              download
              className="px-3 py-1 rounded-md bg-muted hover:bg-accent text-sm"
            >
              Roblox Script
            </a>
          </div>
        </div>

        <StatsOverview />
        <Console user={user} isAdmin={isAdmin} />
        <LogsViewer />
      </main>
    </div>
  );
}
