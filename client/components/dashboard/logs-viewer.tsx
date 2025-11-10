import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

interface Log {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  serverId?: string;
  meta?: any;
  at: number;
}

export function LogsViewer() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "info" | "warn" | "error">(
    "all",
  );

  useEffect(() => {
    const q = query(collection(db, "logs"), orderBy("at", "desc"), limit(100));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const logsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Log[];
        setLogs(logsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to logs:", error);
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  const filteredLogs =
    filter === "all" ? logs : logs.filter((log) => log.level === filter);

  function formatTime(timestamp: number) {
    return new Date(timestamp).toLocaleTimeString();
  }

  function getLevelColor(level: string) {
    switch (level) {
      case "error":
        return "text-red-400";
      case "warn":
        return "text-yellow-400";
      case "info":
      default:
        return "text-blue-400";
    }
  }

  return (
    <section className="mt-8 rounded-xl border border-border/60 p-4 bg-card/60">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Logs</h2>
        <div className="flex gap-2">
          {(["all", "info", "warn", "error"] as const).map((lvl) => (
            <button
              key={lvl}
              onClick={() => setFilter(lvl)}
              className={`text-xs px-2 py-1 rounded-md border transition ${
                filter === lvl
                  ? "bg-primary text-black border-primary"
                  : "border-border/50 text-muted-foreground hover:border-border"
              }`}
            >
              {lvl === "all"
                ? "All"
                : lvl.charAt(0).toUpperCase() + lvl.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>Loading logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No logs available</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Level</th>
                <th className="text-left py-2 px-3">Message</th>
                <th className="text-left py-2 px-3">Server</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border/30 hover:bg-muted/20"
                >
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {formatTime(log.at)}
                  </td>
                  <td
                    className={`py-2 px-3 font-semibold ${getLevelColor(log.level)}`}
                  >
                    {log.level.toUpperCase()}
                  </td>
                  <td className="py-2 px-3 max-w-xs truncate">{log.message}</td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {log.serverId || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
