import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export interface CallOptions {
  systemPrompt: string;
  userMessage: string;
  model?: string;
  maxTokens?: number;
}

export async function callClaude(options: CallOptions): Promise<string> {
  const {
    systemPrompt,
    userMessage,
    model = "claude-sonnet-4-6",
    maxTokens = 4096,
  } = options;

  const response = await getClient().messages.create({
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const block = response.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude API");
  }
  return block.text;
}
