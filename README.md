# Emomon

Emomon is the shared context agent for EmoHub products. It runs as its own app and also exposes a hosted embed script that other products can include without duplicating chatbot code.

## Scripts

- `npm run dev` starts the Next.js app on port `3107`.
- `npm run build` builds the standalone app, widget route, and API routes.
- `npm run lint` runs TypeScript checks.

## RAG Environment

Copy `.env.example` to `.env.local` and fill the values below when the hosted RAG path is ready.

- `GOOGLE_GENERATIVE_AI_API_KEY`: Google AI Studio key used by `@ai-sdk/google`.
- `GOOGLE_GENERATIVE_MODEL`: Defaults to `gemini-1.5-flash`.
- `GOOGLE_EMBEDDING_MODEL`: Defaults to `text-embedding-004`.
- `UPSTASH_VECTOR_REST_URL`: Upstash Vector REST endpoint.
- `UPSTASH_VECTOR_REST_TOKEN`: Upstash Vector REST token.

Without those values, Emomon still runs with the built-in local knowledge fallback so the LP/widget can be reviewed without backend setup.

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
