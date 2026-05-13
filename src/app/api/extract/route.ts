import { NextResponse } from "next/server";


export async function POST(req: Request) {
  const { transcript } = await req.json();
  if (!transcript) {
    return NextResponse.json({ error: "No transcript provided." }, { status: 400 });
  }

  // Replace with your OpenAI API key or use env variable
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "Missing OpenAI API key." }, { status: 500 });
  }

  const prompt = `Extract a concise, actionable list of tasks from this meeting transcript. Reply as a JSON array of short strings.\nTranscript:\n"""${transcript}"""`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 256,
    }),
  });


  if (!response.ok) {
    let errorText = await response.text();
    console.error("OpenAI API error:", errorText);
    return NextResponse.json({ error: "OpenAI API error: " + errorText }, { status: 500 });
  }

  const data = await response.json();
  let tasks: string[] = [];
  try {
    const text = data.choices?.[0]?.message?.content || "";
    tasks = JSON.parse(text);
  } catch {
    // fallback: try to extract lines
    const text = data.choices?.[0]?.message?.content || "";
    tasks = text.split("\n").map((t: string) => t.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
  }

  return NextResponse.json({ tasks });
}
