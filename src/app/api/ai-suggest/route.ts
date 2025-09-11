import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "https://storycrat.ai", 
    "X-Title": "Storycrat",
  },
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: "deepseek/deepseek-coder",
      messages: [
        {
          "role": "user",
          "content": prompt,
        }
      ],
    });

    const suggestion = completion.choices[0].message.content;
    return NextResponse.json({ suggestion });

  } catch (error) {
    console.error('Error fetching AI suggestion:', error);
    return NextResponse.json({ error: 'Failed to fetch AI suggestion' }, { status: 500 });
  }
}
