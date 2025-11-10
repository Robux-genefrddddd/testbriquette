import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";

interface PlayerData {
  name: string;
  userId: string;
  serverId?: string;
  joinTime: number;
}

interface PlayersListProps {
  user: User | null;
  isAdmin: boolean;
}

export function PlayersList({ user, isAdmin }: PlayersListProps) {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterServer, setFilterServer] = useState<string>("");
  const [servers, setServers] = useState<string[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(
    new Set(),
  );

  // Listen to servers
  useEffect(() => {
    const q = query(collection(db, "servers"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const serverIds = snapshot.docs
          .map((doc) => doc.data().serverId as string)
          .filter(Boolean);
        setServers([...new Set(serverIds)]);
      },
      (error) => {
        console.error("Error listening to servers:", error);
      },
    );
    return () => unsub();
  }, []);

  // Listen to server stats for players
  useEffect(() => {
    const q = query(collection(db, "servers"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const allPlayers: PlayerData[] = [];
        snapshot.docs.forEach((doc) => {
          const server = doc.data();
          if (
            server.stats?.playerList &&
            Array.isArray(server.stats.playerList)
          ) {
            server.stats.playerList.forEach((player: any) => {
              allPlayers.push({
                name: player.name,
                userId: player.userId,
                serverId: server.serverId,
                joinTime: player.joinTime || 0,
              });
            });
          }
        });
        setPlayers(allPlayers);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to players:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  const filteredPlayers = players.filter((player) => {
    const matchesSearch =
      player.name.toLowerCase().includes(search.toLowerCase()) ||
      player.userId.toString().includes(search);
    const matchesServer = !filterServer || player.serverId === filterServer;
    return matchesSearch && matchesServer;
  });

  async function handleKick(playerId: string) {
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }
    const token = await user?.getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/kick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ robloxUserId: playerId }),
      });
      if (res.ok) {
        toast.success("Player kicked");
      } else {
        toast.error("Failed to kick player");
      }
    } catch (error) {
      toast.error("Error kicking player");
    }
  }

  async function handleBan(playerId: string, playerName: string) {
    if (!isAdmin) {
      toast.error("Admin access required");
      return;
    }
    const reason = prompt(`Ban reason for ${playerName}:`, "Violating rules");
    if (!reason) return;

    const token = await user?.getIdToken();
    if (!token) return;

    try {
      const res = await fetch("/api/ban", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ robloxUserId: playerId, reason }),
      });
      if (res.ok) {
        toast.success(`${playerName} has been banned`);
        setSelectedPlayers(new Set());
      } else {
        toast.error("Failed to ban player");
      }
    } catch (error) {
      toast.error("Error banning player");
    }
  }

  function formatTime(timestamp: number) {
    const now = Date.now();
    const diff = now - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  }

  function togglePlayerSelection(userId: string) {
    const newSet = new Set(selectedPlayers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedPlayers(newSet);
  }

  return (
    <section className="mt-8 rounded-xl border border-border/60 p-4 bg-card/60">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Players Online</h2>
        <span className="text-xs text-muted-foreground">
          {filteredPlayers.length} / {players.length}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or User ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md bg-background border border-border/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <div className="flex gap-2">
          <select
            value={filterServer}
            onChange={(e) => setFilterServer(e.target.value)}
            className="flex-1 rounded-md bg-background border border-border/50 px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
          >
            <option value="">All Servers</option>
            {servers.map((server) => (
              <option key={server} value={server}>
                {server}
              </option>
            ))}
          </select>
          {selectedPlayers.size > 0 && isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  selectedPlayers.forEach((playerId) => handleKick(playerId));
                  setSelectedPlayers(new Set());
                }}
                className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-md text-sm font-semibold"
              >
                Kick ({selectedPlayers.size})
              </button>
              <button
                onClick={() => {
                  toast.info("Select one player at a time to ban");
                }}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md text-sm font-semibold"
              >
                Ban ({selectedPlayers.size})
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading players...</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No players online</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3 w-8">
                  <input
                    type="checkbox"
                    checked={
                      selectedPlayers.size === filteredPlayers.length &&
                      filteredPlayers.length > 0
                    }
                    onChange={() => {
                      if (selectedPlayers.size === filteredPlayers.length) {
                        setSelectedPlayers(new Set());
                      } else {
                        setSelectedPlayers(
                          new Set(filteredPlayers.map((p) => p.userId)),
                        );
                      }
                    }}
                    className="cursor-pointer"
                  />
                </th>
                <th className="text-left py-2 px-3">Player Name</th>
                <th className="text-left py-2 px-3">User ID</th>
                <th className="text-left py-2 px-3">Server</th>
                <th className="text-left py-2 px-3">Join Time</th>
                {isAdmin && <th className="text-left py-2 px-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player) => (
                <tr
                  key={player.userId}
                  className="border-b border-border/30 hover:bg-muted/20"
                >
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={selectedPlayers.has(player.userId)}
                      onChange={() => togglePlayerSelection(player.userId)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="py-2 px-3">{player.name}</td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {player.userId}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {player.serverId || "—"}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {formatTime(player.joinTime)}
                  </td>
                  {isAdmin && (
                    <td className="py-2 px-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleKick(player.userId)}
                          className="px-2 py-1 bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/40 rounded text-xs"
                        >
                          Kick
                        </button>
                        <button
                          onClick={() => handleBan(player.userId, player.name)}
                          className="px-2 py-1 bg-red-600/20 text-red-300 hover:bg-red-600/40 rounded text-xs"
                        >
                          Ban
                        </button>
                      </div>
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
