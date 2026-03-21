import { getSetting } from './db'
import type { AIProvider } from './types'

function getProvider(): AIProvider {
  return (getSetting('ai_provider') as AIProvider) || 'ollama'
}

// ── Ollama ──────────────────────────────────────────────

async function queryOllamaProvider(prompt: string, system: string): Promise<string> {
  const url = getSetting('ollama_url') || 'http://localhost:11434'
  const model = getSetting('ollama_model') || 'llama3'

  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      stream: false,
      options: { temperature: 0.3, num_predict: 2048 },
    }),
  })
  if (!response.ok) throw new Error(`Ollama returned ${response.status}`)
  const data = await response.json()
  return data.message.content
}

function streamOllamaProvider(prompt: string, system: string): ReadableStream<Uint8Array> {
  const url = getSetting('ollama_url') || 'http://localhost:11434'
  const model = getSetting('ollama_model') || 'llama3'

  return new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(`${url}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: prompt },
            ],
            stream: true,
            options: { temperature: 0.3, num_predict: 2048 },
          }),
        })

        if (!response.ok || !response.body) {
          controller.enqueue(new TextEncoder().encode(`Error: Ollama returned ${response.status}`))
          controller.close()
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          for (const line of text.split('\n').filter(Boolean)) {
            try {
              const json = JSON.parse(line)
              if (json.message?.content) {
                controller.enqueue(new TextEncoder().encode(json.message.content))
              }
            } catch {}
          }
        }
        controller.close()
      } catch (e: any) {
        controller.enqueue(new TextEncoder().encode(`Error: ${e.message}`))
        controller.close()
      }
    },
  })
}

// ── Claude (Anthropic) ──────────────────────────────────

async function queryClaudeProvider(prompt: string, system: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const apiKey = getSetting('claude_api_key')
  if (!apiKey) throw new Error('Claude API key not configured. Go to Settings to add it.')

  const client = new Anthropic({ apiKey })
  const model = getSetting('claude_model') || 'claude-sonnet-4-6'

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = message.content.find((b: any) => b.type === 'text')
  return textBlock ? (textBlock as any).text : ''
}

function streamClaudeProvider(prompt: string, system: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        const Anthropic = (await import('@anthropic-ai/sdk')).default
        const apiKey = getSetting('claude_api_key')
        if (!apiKey) {
          controller.enqueue(new TextEncoder().encode('Error: Claude API key not configured. Go to Settings.'))
          controller.close()
          return
        }

        const client = new Anthropic({ apiKey })
        const model = getSetting('claude_model') || 'claude-sonnet-4-6'

        const stream = client.messages.stream({
          model,
          max_tokens: 2048,
          system,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && (event.delta as any).type === 'text_delta') {
            controller.enqueue(new TextEncoder().encode((event.delta as any).text))
          }
        }
        controller.close()
      } catch (e: any) {
        controller.enqueue(new TextEncoder().encode(`Error: ${e.message}`))
        controller.close()
      }
    },
  })
}

// ── OpenAI ──────────────────────────────────────────────

async function queryOpenAIProvider(prompt: string, system: string): Promise<string> {
  const OpenAI = (await import('openai')).default
  const apiKey = getSetting('openai_api_key')
  if (!apiKey) throw new Error('OpenAI API key not configured. Go to Settings to add it.')

  const client = new OpenAI({ apiKey })
  const model = getSetting('openai_model') || 'gpt-4o'

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.3,
    max_tokens: 2048,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
  })

  return completion.choices[0]?.message?.content || ''
}

function streamOpenAIProvider(prompt: string, system: string): ReadableStream<Uint8Array> {
  return new ReadableStream({
    async start(controller) {
      try {
        const OpenAI = (await import('openai')).default
        const apiKey = getSetting('openai_api_key')
        if (!apiKey) {
          controller.enqueue(new TextEncoder().encode('Error: OpenAI API key not configured. Go to Settings.'))
          controller.close()
          return
        }

        const client = new OpenAI({ apiKey })
        const model = getSetting('openai_model') || 'gpt-4o'

        const stream = await client.chat.completions.create({
          model,
          temperature: 0.3,
          max_tokens: 2048,
          stream: true,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt },
          ],
        })

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content
          if (text) {
            controller.enqueue(new TextEncoder().encode(text))
          }
        }
        controller.close()
      } catch (e: any) {
        controller.enqueue(new TextEncoder().encode(`Error: ${e.message}`))
        controller.close()
      }
    },
  })
}

// ── Public API ──────────────────────────────────────────

export async function queryAI(prompt: string, system: string): Promise<string> {
  const provider = getProvider()
  switch (provider) {
    case 'claude':
      return queryClaudeProvider(prompt, system)
    case 'openai':
      return queryOpenAIProvider(prompt, system)
    case 'ollama':
    default:
      return queryOllamaProvider(prompt, system)
  }
}

export function streamAI(prompt: string, system: string): ReadableStream<Uint8Array> {
  const provider = getProvider()
  switch (provider) {
    case 'claude':
      return streamClaudeProvider(prompt, system)
    case 'openai':
      return streamOpenAIProvider(prompt, system)
    case 'ollama':
    default:
      return streamOllamaProvider(prompt, system)
  }
}

export async function checkAIStatus(): Promise<{ available: boolean; provider: string; detail: string }> {
  const provider = getProvider()

  if (provider === 'ollama') {
    const url = getSetting('ollama_url') || 'http://localhost:11434'
    try {
      const response = await fetch(`${url}/api/tags`)
      if (!response.ok) return { available: false, provider, detail: 'Ollama not responding' }
      const data = await response.json()
      const models = data.models?.map((m: any) => m.name) || []
      return { available: true, provider, detail: `Models: ${models.join(', ')}` }
    } catch {
      return { available: false, provider, detail: 'Cannot connect to Ollama' }
    }
  }

  if (provider === 'claude') {
    const key = getSetting('claude_api_key')
    if (!key) return { available: false, provider, detail: 'API key not set' }
    return { available: true, provider, detail: `Model: ${getSetting('claude_model') || 'claude-sonnet-4-6'}` }
  }

  if (provider === 'openai') {
    const key = getSetting('openai_api_key')
    if (!key) return { available: false, provider, detail: 'API key not set' }
    return { available: true, provider, detail: `Model: ${getSetting('openai_model') || 'gpt-4o'}` }
  }

  return { available: false, provider, detail: 'Unknown provider' }
}
