#!/bin/bash
set -e

CERT_DIR="$(cd "$(dirname "$0")" && pwd)/certs"

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo ""
    echo "mkcert is not installed. Install it first:"
    echo ""
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "  brew install mkcert"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "  sudo apt install libnss3-tools"
        echo "  curl -JLO https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v*-linux-amd64"
        echo "  sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert && sudo chmod +x /usr/local/bin/mkcert"
    fi
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Install local CA (one-time, safe to re-run)
echo "Installing local CA (you may be prompted for your password)..."
mkcert -install

# Generate certs
mkdir -p "$CERT_DIR"
echo "Generating certificates in $CERT_DIR..."
mkcert -cert-file "$CERT_DIR/localhost.pem" -key-file "$CERT_DIR/localhost-key.pem" \
    localhost 127.0.0.1 ::1

echo ""
echo "Done! Now start the app with:"
echo ""
echo "  docker compose up -d --build"
echo ""
echo "Then open https://localhost in your browser."
