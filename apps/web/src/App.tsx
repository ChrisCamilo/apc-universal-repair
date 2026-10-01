import { useEffect, useState } from "react";
import type { HealthResponse } from "@apc/shared";

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthResponse) => setHealth(data))
      .catch(() => setError("Could not reach the API."));
  }, []);

  return (
    <main className="mx-auto max-w-xl px-6 py-16 text-center">
      <h1 className="font-display text-4xl font-bold uppercase tracking-display">APC Universal Repair</h1>
      <p data-testid="health-status" className="mt-4 text-text-muted">
        {error ? error : health ? `API status: ${health.status}` : "Checking API status..."}
      </p>
    </main>
  );
}

export default App;
