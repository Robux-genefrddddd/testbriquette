import { useState } from "react";
import { User } from "firebase/auth";
import { toast } from "sonner";

interface ConsoleProps {
  user: User | null;
  isAdmin: boolean;
}

export function Console({ user, isAdmin }: ConsoleProps) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState<Array<{ type: string; text: string }>>([
    {
      type: "info",
      text: "RShield Console v1.0 - Type 'help' for available commands",
    },
  ]);

  const commands = {
    help: () => {
      const cmds = [
        "help - Show this help message",
        "status - Get system status",
        "users - List active players",
        "servers - List active servers",
        "ban <userId> <reason> - Ban a user",
        "unban <userId> - Unban a user",
        "kick <userId> - Kick a player",
        "announce <message> - Send global announcement",
        "clear - Clear console output",
      ];
      return cmds.join("\n");
    },
    status: () => {
      return `System Status: OK\nTime: ${new Date().toLocaleTimeString()}\nUser: ${user?.email || "Unknown"}`;
    },
    users: () => {
      return "Players: 0 online (feature coming soon)";
    },
    servers: () => {
      return "Servers: 0 active (feature coming soon)";
    },
    clear: () => {
      setOutput([]);
      return "";
    },
  };

  function handleCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const [cmd, ...args] = input.trim().split(" ");
    const cmdLower = cmd.toLowerCase();

    const newOutput = [...output, { type: "command", text: `> ${input}` }];

    if (cmdLower === "help") {
      newOutput.push({ type: "output", text: (commands as any)[cmdLower]() });
    } else if (cmdLower === "status") {
      newOutput.push({ type: "output", text: (commands as any)[cmdLower]() });
    } else if (cmdLower === "users") {
      newOutput.push({ type: "output", text: (commands as any)[cmdLower]() });
    } else if (cmdLower === "servers") {
      newOutput.push({ type: "output", text: (commands as any)[cmdLower]() });
    } else if (cmdLower === "clear") {
      setOutput([]);
      setInput("");
      return;
    } else if (
      cmdLower === "ban" ||
      cmdLower === "unban" ||
      cmdLower === "kick" ||
      cmdLower === "announce"
    ) {
      if (!isAdmin) {
        newOutput.push({
          type: "error",
          text: "Error: Admin access required for this command",
        });
      } else {
        newOutput.push({
          type: "output",
          text: `Command '${cmdLower}' executed (feature coming soon)`,
        });
      }
    } else {
      newOutput.push({
        type: "error",
        text: `Unknown command: '${cmd}'. Type 'help' for available commands.`,
      });
    }

    setOutput(newOutput);
    setInput("");
  }

  return (
    <section className="mt-8 rounded-xl border border-border/60 p-4 bg-card/60">
      <h2 className="font-semibold mb-3">Console</h2>

      <div className="bg-background/50 rounded-lg p-3 border border-border/50 h-64 overflow-y-auto font-mono text-sm mb-3">
        {output.map((line, idx) => (
          <div
            key={idx}
            className={
              line.type === "command"
                ? "text-primary"
                : line.type === "error"
                  ? "text-red-400"
                  : "text-muted-foreground"
            }
          >
            {line.text}
          </div>
        ))}
      </div>

      <form onSubmit={handleCommand} className="flex gap-2">
        <span className="text-primary font-mono">$ </span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter command (type 'help' for list)"
          className="flex-1 bg-background border border-border/50 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-primary text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-black font-semibold rounded-md hover:bg-primary/90"
        >
          Execute
        </button>
      </form>

      <p className="text-xs text-muted-foreground mt-2">
        {isAdmin ? "✓ Admin access enabled" : "⚠ Limited user access"}
      </p>
    </section>
  );
}
