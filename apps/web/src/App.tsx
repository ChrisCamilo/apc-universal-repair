import { useEffect, useState } from "react";
import type { HealthResponse } from "@apc/shared";
import "./App.css";

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
    <main>
      <h1>APC Universal Repair</h1>
      <p data-testid="health-status">
        {error ? error : health ? `API status: ${health.status}` : "Checking API status..."}
      </p>
    </main>
  );
}

export default App;
