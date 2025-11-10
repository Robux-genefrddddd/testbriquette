import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

interface Stats {
  playersOnline: number;
  serversActive: number;
  commandsQueued: number;
  logsPerMin: number;
}

export function StatsOverview() {
  const [stats, setStats] = useState<Stats>({
    playersOnline: 0,
    serversActive: 0,
    commandsQueued: 0,
    logsPerMin: 0,
  });
  const [loading, setLoading] = useState(true);

  // Real-time listener for active servers
  useEffect(() => {
    const q = query(
      collection(db, "servers"),
      where("active", "==", true),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const servers = snapshot.docs.map((doc) => doc.data());
        const totalPlayers = servers.reduce((sum, server) => {
          return sum + (server.stats?.playersOnline || 0);
        }, 0);

        setStats((prev) => ({
          ...prev,
          serversActive: servers.length,
          playersOnline: totalPlayers,
        }));
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to servers:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  // Real-time listener for queued commands
  useEffect(() => {
    const q = query(
      collection(db, "commands"),
      where("executed", "==", false),
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setStats((prev) => ({
          ...prev,
          commandsQueued: snapshot.size,
        }));
      },
      (error) => {
        console.error("Error listening to commands:", error);
      },
    );

    return () => unsub();
  }, []);

  // Calculate logs per minute (one-time for now, but can be enhanced)
  useEffect(() => {
    const calculateLogsPerMin = async () => {
      const oneMinuteAgo = Date.now() - 60 * 1000;
      const q = query(
        collection(db, "logs"),
        where("at", ">", oneMinuteAgo),
      );

      try {
        const snapshot = await getDocs(q);
        setStats((prev) => ({
          ...prev,
          logsPerMin: snapshot.size,
        }));
      } catch (error) {
        console.error("Error calculating logs per min:", error);
      }
    };

    calculateLogsPerMin();
    const interval = setInterval(calculateLogsPerMin, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="rounded-xl border border-border/60 p-4 bg-card/60">
        <div className="text-sm text-muted-foreground">Players online</div>
        <div className="text-2xl font-semibold mt-1 text-primary">
          {stats.playersOnline}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {stats.serversActive} {stats.serversActive === 1 ? "server" : "servers"}
        </div>
      </div>
      <div className="rounded-xl border border-border/60 p-4 bg-card/60">
        <div className="text-sm text-muted-foreground">Servers active</div>
        <div className="text-2xl font-semibold mt-1 text-primary">
          {stats.serversActive}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          {loading ? "..." : "Real-time"}
        </div>
      </div>
      <div className="rounded-xl border border-border/60 p-4 bg-card/60">
        <div className="text-sm text-muted-foreground">Commands queued</div>
        <div className="text-2xl font-semibold mt-1 text-primary">
          {stats.commandsQueued}
        </div>
        <div className="text-xs text-muted-foreground mt-2">Pending</div>
      </div>
      <div className="rounded-xl border border-border/60 p-4 bg-card/60">
        <div className="text-sm text-muted-foreground">Logs / min</div>
        <div className="text-2xl font-semibold mt-1 text-primary">
          {stats.logsPerMin}
        </div>
        <div className="text-xs text-muted-foreground mt-2">Last 60s</div>
      </div>
    </div>
  );
}
