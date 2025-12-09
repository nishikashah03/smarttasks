

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Invalid text input" });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    // -------------------------
    // STRONG JSON-ONLY PROMPT
    // -------------------------
    const prompt = `
You extract tasks from informal human text and output ONLY a JSON array.

INPUT:
"${text}"

RULES:
1. Output ONLY a JSON array of objects. No commentary.
2. Each task object must be:
   {
     "title": string,
     "deadline": "YYYY-MM-DD" or null,
     "category": "work" | "personal" | "leisure"
   }

3. Extract deadlines from:
   - Natural language: "tomorrow", "next friday", "in 3 days", "on 10 jan", etc.
   - Explicit formats: "2025-12-10", "10/12/2025"

4. If NO valid date → deadline = null.

5. Category rules:
   • work → assignment, study, exam, project, class, report, submission, office
   • personal → call, buy, groceries, gym, doctor, clean, family
   • leisure → movie, game, party, chill, hangout
   If unclear → default to "work".

6. Do NOT invent tasks. Only extract what is clearly written.

7. TODAY = current date in YYYY-MM-DD: ${new Date()
      .toISOString()
      .slice(0, 10)}

Output must be valid JSON. Nothing else.
`;

    // -------------------------
    // MAKE OPENAI REQUEST
    // -------------------------
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // light + cheap model but accurate
        messages: [
          { role: "system", content: "Return ONLY JSON. No extra text ever." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1, // deterministic parsing
      }),
    });

    const data = await response.json();

    // If OpenAI gives an error
    if (!data.choices || !data.choices[0]) {
      console.error("OpenAI error:", data);
      return res.status(500).json({ error: "AI response invalid" });
    }

    let rawOutput = data.choices[0].message.content.trim();

    // Ensure valid JSON (if model wraps inside ```json ... ```)
    rawOutput = rawOutput.replace(/```json|```/g, "").trim();

    let tasks;
    try {
      tasks = JSON.parse(rawOutput);
    } catch (err) {
      console.error("JSON parse error:", err, rawOutput);
      return res.status(500).json({ error: "Failed to parse AI JSON" });
    }

    return res.status(200).json(tasks);
  } catch (error) {
    console.error("SERVER ERROR:", error);
    return res.status(500).json({ error: "Server failed" });
  }
}
