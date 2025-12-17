import { useState } from "react";
import { askGemini } from "../services/geminiApi";

export function useGemini() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  async function sendPrompt(prompt: string) {
    setLoading(true);
    setResponse("");

    try {
      const data = await askGemini(prompt);
      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta";
      setResponse(text);
    } catch {
      setResponse("Erro ao chamar a IA");
    } finally {
      setLoading(false);
    }
  }

  return { sendPrompt, response, loading };
}
