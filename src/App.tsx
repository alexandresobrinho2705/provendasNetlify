import { useState } from "react";
import { useGemini } from "./hooks/useGemini";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const { sendPrompt, response, loading } = useGemini();

  return (
    <div style={{ padding: 20 }}>
      <h2>Gemini funcionando no Netlify</h2>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        style={{ width: "100%" }}
      />

      <button onClick={() => sendPrompt(prompt)} disabled={loading}>
        {loading ? "Pensando..." : "Enviar"}
      </button>

      <pre>{response}</pre>
    </div>
  );
}
