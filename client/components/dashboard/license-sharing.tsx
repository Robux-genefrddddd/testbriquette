import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";

interface License {
  key: string;
  ownerUid: string;
  active: boolean;
}

interface ShareLink {
  token: string;
  licenseId: string;
  expiresAt: number;
  createdAt: number;
  used: boolean;
}

interface LicenseSharingProps {
  user: User | null;
}

export function LicenseSharing({ user }: LicenseSharingProps) {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLicense, setSelectedLicense] = useState<string>("");
  const [sharePassword, setSharePassword] = useState("");
  const [shareHours, setShareHours] = useState("24");
  const [creatingShare, setCreatingShare] = useState(false);

  // Load user's licenses
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "licenses"),
      where("ownerUid", "==", user.uid),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const lics = snapshot.docs.map((doc) => ({
          key: doc.data().key,
          ownerUid: doc.data().ownerUid,
          active: doc.data().active,
        }));
        setLicenses(lics);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading licenses:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [user]);

  // Load share links for user's licenses
  useEffect(() => {
    if (licenses.length === 0) {
      setShares([]);
      return;
    }

    const licenseIds = licenses.map((l) => l.key);
    const q = query(
      collection(db, "shares"),
      where("licenseId", "in", licenseIds),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const shareLinks = snapshot.docs.map((doc) => ({
          token: doc.data().token,
          licenseId: doc.data().licenseId,
          expiresAt: doc.data().expiresAt,
          createdAt: doc.data().createdAt,
          used: doc.data().used || false,
        }));
        setShares(shareLinks.sort((a, b) => b.createdAt - a.createdAt));
      },
      (error) => {
        console.error("Error loading shares:", error);
      },
    );

    return () => unsub();
  }, [licenses]);

  async function createShareLink(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!selectedLicense || !sharePassword) {
      toast.error("Sélectionnez une licence et entrez un mot de passe");
      return;
    }

    setCreatingShare(true);
    const token = await user.getIdToken();

    try {
      const res = await fetch("/api/share/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          licenseId: selectedLicense,
          password: sharePassword,
          expiresInHours: parseInt(shareHours),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Lien de partage créé!");
        
        // Copy share link to clipboard
        const shareUrl = `${window.location.origin}/?share=${data.token}`;
        navigator.clipboard.writeText(shareUrl);
        toast.success("Lien copié!");
        
        setSelectedLicense("");
        setSharePassword("");
        setShareHours("24");
      } else {
        toast.error("Erreur lors de la création du lien");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setCreatingShare(false);
    }
  }

  async function revokeShare(token: string) {
    if (!user) return;
    const userToken = await user.getIdToken();

    try {
      const res = await fetch("/api/share/revoke", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        toast.success("Partage révoqué");
      } else {
        toast.error("Erreur lors de la révocation");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    }
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  function getTimeRemaining(expiresAt: number) {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return "Expiré";
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}j`;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h`;
    const mins = Math.floor(remaining / (1000 * 60));
    return `${mins}m`;
  }

  return (
    <section className="mt-8 rounded-xl border border-border/60 p-4 bg-card/60">
      <h2 className="font-semibold mb-4">License Sharing</h2>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading...</p>
        </div>
      ) : licenses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Vous n'avez pas de licence active</p>
        </div>
      ) : (
        <>
          {/* Create Share Link */}
          <form onSubmit={createShareLink} className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="font-medium text-sm mb-3">Create Share Link</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={selectedLicense}
                onChange={(e) => setSelectedLicense(e.target.value)}
                className="rounded-md bg-background border border-border/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="">Select License</option>
                {licenses.map((lic) => (
                  <option key={lic.key} value={lic.key}>
                    {lic.key}
                  </option>
                ))}
              </select>
              <input
                type="password"
                placeholder="Share Password"
                value={sharePassword}
                onChange={(e) => setSharePassword(e.target.value)}
                className="rounded-md bg-background border border-border/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
              />
              <select
                value={shareHours}
                onChange={(e) => setShareHours(e.target.value)}
                className="rounded-md bg-background border border-border/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="1">1 hour</option>
                <option value="24">24 hours</option>
                <option value="168">1 week</option>
                <option value="720">1 month</option>
              </select>
              <button
                type="submit"
                disabled={creatingShare}
                className="px-4 py-2 bg-primary text-black font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
              >
                {creatingShare ? "..." : "Create"}
              </button>
            </div>
          </form>

          {/* Share Links List */}
          <div>
            <h3 className="font-medium text-sm mb-3">Active Share Links</h3>
            {shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">No share links yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-3">License</th>
                      <th className="text-left py-2 px-3">Created</th>
                      <th className="text-left py-2 px-3">Expires</th>
                      <th className="text-left py-2 px-3">Status</th>
                      <th className="text-left py-2 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shares.map((share) => (
                      <tr
                        key={share.token}
                        className={`border-b border-border/30 hover:bg-muted/20 ${
                          share.used ? "opacity-60" : ""
                        }`}
                      >
                        <td className="py-2 px-3 font-mono text-xs">{share.licenseId}</td>
                        <td className="py-2 px-3 text-muted-foreground text-xs">
                          {formatTime(share.createdAt)}
                        </td>
                        <td className="py-2 px-3 text-xs">{getTimeRemaining(share.expiresAt)}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              share.used
                                ? "bg-gray-600/20 text-gray-300"
                                : "bg-green-600/20 text-green-300"
                            }`}
                          >
                            {share.used ? "Used" : "Active"}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {!share.used && (
                            <button
                              onClick={() => revokeShare(share.token)}
                              className="px-2 py-1 bg-red-600/20 text-red-300 hover:bg-red-600/40 rounded text-xs"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
