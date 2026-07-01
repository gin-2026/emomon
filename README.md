# Emomon

Emomon is the shared context agent for EmoHub products. It runs as its own app and also exposes a hosted embed script that other products can include without duplicating chatbot code.

## Scripts

- `npm run dev` starts the Vite app on port `3107`.
- `npm run build` builds the standalone app and the widget route.
- `npm run lint` runs TypeScript checks.

## Embed

Other products only need the central script:

```html
<script
  defer
  src="https://emomon.vercel.app/emomon-embed.js"
  data-emomon-module="hub"
  data-emomon-plan="free"
></script>
```

The script opens the shared widget route at `/widget`, so chat behavior, RAG assets, and upgrade messaging stay in one service.

