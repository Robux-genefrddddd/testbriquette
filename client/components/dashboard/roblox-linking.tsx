import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";

interface RobloxLinkingProps {
  user: User | null;
}

export function RobloxLinking({ user }: RobloxLinkingProps) {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [robloxUserId, setRobloxUserId] = useState<string | null>(null);
  const [robloxUsername, setRobloxUsername] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load existing Roblox link
  useEffect(() => {
    if (!user) return;

    const loadLink = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setRobloxUserId(userDoc.data().robloxUserId || null);
          setRobloxUsername(userDoc.data().robloxUsername || null);
        }
      } catch (error) {
        console.error("Error loading Roblox link:", error);
      }
    };

    loadLink();
  }, [user]);

  async function generateLinkCode() {
    if (!user) return;
    setLoading(true);

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/roblox/link/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLinkCode(data.code);
        setExpiresAt(data.expiresAt);
        toast.success("Code generated! Valid for 10 minutes");
      } else {
        toast.error("Failed to generate code");
      }
    } catch (error) {
      toast.error("Error generating code");
    } finally {
      setLoading(false);
    }
  }

  function copyCode() {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      setCopied(true);
      toast.success("Code copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function getTimeRemaining(expiresAt: number) {
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) return "Expired";
    const mins = Math.floor(remaining / (1000 * 60));
    return `${mins}m remaining`;
  }

  return (
    <section className="mt-8 rounded-xl border border-border/60 p-4 bg-card/60">
      <h2 className="font-semibold mb-4">Roblox Account Linking</h2>

      {robloxUserId ? (
        <div className="p-4 rounded-lg bg-green-600/10 border border-green-600/30">
          <h3 className="font-medium text-sm mb-2">✓ Connected</h3>
          <p className="text-sm">
            <strong>Username:</strong> {robloxUsername || "—"}{" "}
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>User ID:</strong> {robloxUserId}
          </p>
          <button
            onClick={() => {
              setRobloxUserId(null);
              setRobloxUsername(null);
              toast.info("Link reset (reconnect with new code)");
            }}
            className="mt-3 px-3 py-1 bg-red-600/20 text-red-300 hover:bg-red-600/40 rounded text-xs"
          >
            Reset Link
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="font-medium text-sm mb-2">Step 1: Generate Code</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Click below to generate a 6-digit code for linking your Roblox account.
            </p>
            <button
              onClick={generateLinkCode}
              disabled={loading || !!linkCode}
              className="px-4 py-2 bg-primary text-black font-semibold rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
            >
              {loading ? "Generating..." : linkCode ? "Code Generated" : "Generate Code"}
            </button>
          </div>

          {linkCode && (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
              <h3 className="font-medium text-sm mb-2">Your Link Code</h3>
              <div className="flex items-center gap-2">
                <div className="text-3xl font-bold text-primary tracking-widest font-mono">
                  {linkCode}
                </div>
                <button
                  onClick={copyCode}
                  className={`px-3 py-2 rounded text-xs font-semibold transition ${
                    copied
                      ? "bg-green-600/20 text-green-300"
                      : "bg-primary/20 text-primary hover:bg-primary/30"
                  }`}
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {expiresAt && getTimeRemaining(expiresAt)}
              </p>
            </div>
          )}

          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <h3 className="font-medium text-sm mb-2">Step 2: Verify in Roblox</h3>
            <p className="text-sm text-muted-foreground mb-3">
              The server script will automatically detect your code linkage. Make sure the RShield server script is running in your game.
            </p>
            <p className="text-xs text-muted-foreground">
              The link will be confirmed when you join the game server. You can also manually call the API from your game.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
