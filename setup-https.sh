#!/bin/bash
set -e

CERT_DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$CERT_DIR"

LAN_IP="${1:-}"

echo ""
echo "=== FinTrack HTTPS Setup ==="
echo ""

# Option 1: mkcert available, localhost only
if command -v mkcert &> /dev/null && [ -z "$LAN_IP" ]; then
    echo "Using mkcert for locally-trusted certificates..."
    mkcert -install
    mkcert -cert-file "$CERT_DIR/server.crt" -key-file "$CERT_DIR/server.key" \
        localhost 127.0.0.1 ::1
    echo ""
    echo "Trusted HTTPS ready for https://localhost"

# Option 2: mkcert available, with LAN IP
elif command -v mkcert &> /dev/null && [ -n "$LAN_IP" ]; then
    echo "Using mkcert for locally-trusted certificates (LAN: $LAN_IP)..."
    mkcert -install
    mkcert -cert-file "$CERT_DIR/server.crt" -key-file "$CERT_DIR/server.key" \
        localhost 127.0.0.1 ::1 "$LAN_IP"
    echo ""
    echo "Trusted HTTPS ready for https://localhost and https://$LAN_IP"
    echo "To trust on other machines, copy the root CA: mkcert -CAROOT"

# Option 3: No mkcert — self-signed fallback
else
    if [ -z "$LAN_IP" ]; then
        echo "mkcert not found — generating self-signed certificate for localhost..."
        SAN="DNS:localhost,IP:127.0.0.1"
        CN="localhost"
    else
        echo "Generating self-signed certificate for $LAN_IP..."
        SAN="DNS:localhost,IP:127.0.0.1,IP:$LAN_IP"
        CN="$LAN_IP"
    fi

    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$CERT_DIR/server.key" \
        -out "$CERT_DIR/server.crt" \
        -subj "/CN=$CN" \
        -addext "subjectAltName=$SAN" \
        -addext "basicConstraints=CA:FALSE" \
        -addext "keyUsage=digitalSignature,keyEncipherment" \
        -addext "extendedKeyUsage=serverAuth" 2>/dev/null

    echo ""
    echo "Self-signed HTTPS certificate generated."
    [ -n "$LAN_IP" ] && echo "Access: https://$LAN_IP" || echo "Access: https://localhost"
    echo ""
    echo "To trust in Chrome (Linux):"
    echo "  certutil -d sql:\$HOME/.pki/nssdb -A -t 'CT,C,C' -n FinTrack -i $CERT_DIR/server.crt"
    echo ""
    echo "For zero-warning HTTPS, install mkcert: https://github.com/FiloSottile/mkcert"
fi

echo ""
echo "Now start the app:"
echo "  docker compose up -d --build"
echo ""
