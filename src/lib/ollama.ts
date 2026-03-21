import { getSetting } from './db'

function getOllamaUrl(): string {
  return getSetting('ollama_url') || 'http://localhost:11434'
}

function getOllamaModel(): string {
  return getSetting('ollama_model') || 'llama3'
}

export async function queryOllama(prompt: string, system: string): Promise<string> {
  const url = getOllamaUrl()
  const model = getOllamaModel()

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
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 2048,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.message.content
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Ollama. Make sure it is running: ollama serve')
    }
    throw error
  }
}

export async function streamOllama(
  prompt: string,
  system: string
): Promise<ReadableStream<Uint8Array>> {
  const url = getOllamaUrl()
  const model = getOllamaModel()

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
      options: {
        temperature: 0.3,
        num_predict: 2048,
      },
    }),
  })

  if (!response.ok || !response.body) {
    throw new Error(`Ollama returned ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  return new ReadableStream({
    async pull(controller) {
      const { done, value } = await reader.read()
      if (done) {
        controller.close()
        return
      }
      const text = decoder.decode(value, { stream: true })
      const lines = text.split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const json = JSON.parse(line)
          if (json.message?.content) {
            controller.enqueue(new TextEncoder().encode(json.message.content))
          }
        } catch {
          // skip malformed lines
        }
      }
    },
  })
}

export async function checkOllamaStatus(): Promise<{ available: boolean; models: string[] }> {
  const url = getOllamaUrl()
  try {
    const response = await fetch(`${url}/api/tags`)
    if (!response.ok) return { available: false, models: [] }
    const data = await response.json()
    return {
      available: true,
      models: data.models?.map((m: any) => m.name) || [],
    }
  } catch {
    return { available: false, models: [] }
  }
}
