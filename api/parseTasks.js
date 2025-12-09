export default async function handler(req, res) {
    try {
      const body = await req.json();
      const text = body.text;
  
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: 
                "You are a task parser. Extract tasks from text and return JSON array. " +
                "Each task must have: title, deadline (ISO yyyy-mm-dd or null), category (work/personal/leisure)."
            },
            {
              role: "user",
              content: text
            }
          ]
        })
      });
  
      const data = await openaiRes.json();
  
      // AI returns JSON as text inside choices[0].message.content
      const parsed = JSON.parse(data.choices[0].message.content);
  
      return res.status(200).json(parsed);
  
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Parsing failed" });
    }
  }
  