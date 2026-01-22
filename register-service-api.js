#!/usr/bin/env node
// Script to register HTTP service using Sprites API
// Usage: node register-service-api.js <SPRITES_TOKEN> <SPRITE_NAME>

const SPRITES_API_BASE = "https://api.sprites.dev/v1";

async function registerService(token, spriteName) {
  const servicePath = "/home/sprite/sprite-shell/.next/standalone/sprite-shell";
  
  const response = await fetch(
    `${SPRITES_API_BASE}/sprites/${spriteName}/services/nextjs`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cmd: "node",
        args: [`${servicePath}/server.js`],
        http_port: 3000,
        needs: [],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register service: ${response.status} ${error}`);
  }

  return await response.json();
}

const token = process.argv[2];
const spriteName = process.argv[3] || "sprites-hatchery";

if (!token) {
  console.error("Usage: node register-service-api.js <SPRITES_TOKEN> [SPRITE_NAME]");
  console.error("Get your token from: https://sprites.dev/dashboard");
  process.exit(1);
}

registerService(token, spriteName)
  .then((result) => {
    console.log("Service registered successfully:");
    console.log(JSON.stringify(result, null, 2));
    console.log("\nTesting URL in 3 seconds...");
    setTimeout(() => {
      fetch(`https://${spriteName}-hrn5.sprites.app/`)
        .then((res) => {
          console.log(`\nURL test: ${res.status} ${res.statusText}`);
          if (res.status === 200 || res.status === 307) {
            console.log("✓ Service is working!");
          } else {
            console.log("⚠ Service registered but URL still returns", res.status);
          }
        })
        .catch((err) => console.error("URL test failed:", err.message));
    }, 3000);
  })
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });
