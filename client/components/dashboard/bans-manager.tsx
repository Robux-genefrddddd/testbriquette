import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";

interface Ban {
  id: string;
  robloxUserId: string;
  reason: string;
  active: boolean;
  createdAt: number;
  expiresAt?: number;
  by: string;
}

interface BansManagerProps {
  user: User | null;
  isAdmin: boolean;
}

export function BansManager({ user, isAdmin }: BansManagerProps) {
  const [bans, setBans] = useState<Ban[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [newBanUserId, setNewBanUserId] = useState("");
  const [newBanReason, setNewBanReason] = useState("");

  // Listen to active bans
  useEffect(() => {
    const q = query(
      collection(db, "bans"),
      activeOnly ? where("active", "==", true) : where("active", "!=", null),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const bansList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Ban[];
        setBans(bansList.sort((a, b) => b.createdAt - a.createdAt));
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to bans:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [activeOnly]);

  const filteredBans = bans.filter(
    (ban) =>
      ban.robloxUserId.includes(search) ||
      ban.reason.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleCreateBan(e: React.FormEvent) {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }
    if (!newBanUserId || !newBanReason) {
      toast.error("Please fill in all fields");
      return;
    }

    const token = await user?.getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          robloxUserId: newBanUserId,
          reason: newBanReason,
        }),
      });
      if (res.ok) {
        toast.success(`User ${newBanUserId} has been banned`);
        setNewBanUserId("");
        setNewBanReason("");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to ban user");
      }
    } catch (error) {
      toast.error("Error banning user");
    }
  }

  async function handleUnban(ban: Ban) {
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }

    const token = await user?.getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/unban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          robloxUserId: ban.robloxUserId,
        }),
      });
      if (res.ok) {
        toast.success(`User ${ban.robloxUserId} has been unbanned`);
      } else {
        toast.error("Failed to unban user");
      }
    } catch (error) {
      toast.error("Error unbanning user");
    }
  }

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleString();
  }

  function getRemainingTime(expiresAt?: number) {
    if (!expiresAt) return "Permanent";
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return "Expired";
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days}d`;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h`;
    const mins = Math.floor(remaining / (1000 * 60));
    return `${mins}m`;
  }

  return (
    <section className="mt-8 rounded-xl border border-border/60 p-4 bg-card/60">
      <h2 className="font-semibold mb-4">Ban Management</h2>

      {isAdmin && (
        <form
          onSubmit={handleCreateBan}
          className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/50"
        >
          <h3 className="font-medium text-sm mb-3">Create Ban</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Roblox User ID"
              value={newBanUserId}
              onChange={(e) => setNewBanUserId(e.target.value)}
              className="rounded-md bg-background border border-border/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <input
              type="text"
              placeholder="Ban reason"
              value={newBanReason}
              onChange={(e) => setNewBanReason(e.target.value)}
              className="rounded-md bg-background border border-border/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md font-semibold text-sm"
            >
              Ban User
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3 mb-4">
        <input
          type="text"
          placeholder="Search by User ID or reason..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md bg-background border border-border/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="cursor-pointer"
          />
          <span>Active bans only</span>
        </label>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading bans...</p>
        </div>
      ) : filteredBans.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{activeOnly ? "No active bans" : "No bans found"}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3">User ID</th>
                <th className="text-left py-2 px-3">Reason</th>
                <th className="text-left py-2 px-3">Created</th>
                <th className="text-left py-2 px-3">Duration</th>
                <th className="text-left py-2 px-3">Status</th>
                {isAdmin && <th className="text-left py-2 px-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBans.map((ban) => (
                <tr
                  key={ban.id}
                  className={`border-b border-border/30 hover:bg-muted/20 ${
                    !ban.active ? "opacity-60" : ""
                  }`}
                >
                  <td className="py-2 px-3 font-mono text-xs">
                    {ban.robloxUserId}
                  </td>
                  <td className="py-2 px-3">{ban.reason}</td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {formatTime(ban.createdAt)}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {getRemainingTime(ban.expiresAt)}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        ban.active
                          ? "bg-red-600/20 text-red-300"
                          : "bg-gray-600/20 text-gray-300"
                      }`}
                    >
                      {ban.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-2 px-3">
                      {ban.active ? (
                        <button
                          onClick={() => handleUnban(ban)}
                          className="px-2 py-1 bg-green-600/20 text-green-300 hover:bg-green-600/40 rounded text-xs"
                        >
                          Unban
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
