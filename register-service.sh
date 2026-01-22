#!/bin/bash
# Script to register HTTP service for Sprite Hatchery
# Usage: ./register-service.sh <SPRITES_API_TOKEN> <SPRITE_NAME>

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <SPRITES_API_TOKEN> <SPRITE_NAME>"
  echo "Example: $0 spr_xxxxx sprites-hatchery"
  exit 1
fi

TOKEN="$1"
SPRITE_NAME="$2"

echo "Registering HTTP service for $SPRITE_NAME..."

curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "cmd": "node",
    "args": ["/home/sprite/sprite-shell/.next/standalone/sprite-shell/server.js"],
    "http_port": 3000,
    "needs": []
  }' \
  "https://api.sprites.dev/v1/sprites/$SPRITE_NAME/services/nextjs"

echo ""
echo "Service registered. Testing URL..."
sleep 2
curl -s -I "https://$SPRITE_NAME-hrn5.sprites.app/" | head -n 5
