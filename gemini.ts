import type { Handler } from "@netlify/functions";

const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export const handler: Handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: "Prompt vazio" };
    }

    const { prompt } = JSON.parse(event.body);

    const response = await fetch(
      `${API_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
