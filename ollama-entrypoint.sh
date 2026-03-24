#!/bin/sh
# Start Ollama server in the background, pull default model, then keep running

/bin/ollama serve &
OLLAMA_PID=$!

# Wait for server to be ready
echo "[ollama-entrypoint] Waiting for Ollama to start..."
for i in $(seq 1 30); do
    if /bin/ollama list > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Pull model if not already present
MODEL="${OLLAMA_MODEL:-llama3}"
if ! /bin/ollama list | grep -q "$MODEL"; then
    echo "[ollama-entrypoint] Pulling $MODEL (first run only)..."
    /bin/ollama pull "$MODEL"
    echo "[ollama-entrypoint] $MODEL ready."
else
    echo "[ollama-entrypoint] $MODEL already available."
fi

# Keep the server running
wait $OLLAMA_PID
