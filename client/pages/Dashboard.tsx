import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="min-h-[70vh] container py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Overview</h1>
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Retour
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/60 p-4 bg-card/60">
          <div className="text-sm text-muted-foreground">Players online</div>
          <div className="text-2xl font-semibold mt-1">0</div>
        </div>
        <div className="rounded-xl border border-border/60 p-4 bg-card/60">
          <div className="text-sm text-muted-foreground">Servers active</div>
          <div className="text-2xl font-semibold mt-1">0</div>
        </div>
        <div className="rounded-xl border border-border/60 p-4 bg-card/60">
          <div className="text-sm text-muted-foreground">Commands queued</div>
          <div className="text-2xl font-semibold mt-1">0</div>
        </div>
        <div className="rounded-xl border border-border/60 p-4 bg-card/60">
          <div className="text-sm text-muted-foreground">Logs / min</div>
          <div className="text-2xl font-semibold mt-1">0</div>
        </div>
      </div>
    </div>
  );
}
