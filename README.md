# OpenAI Rate Limit MCP Repro

Minimal repro for debugging OpenAI Responses API rate-limit headers and token usage when calling an MCP tool many times.

## Setup

```sh
npm install
cp .env.example .env
```

Set only these values in `.env`:

```env
OPENAI_API_KEY=
MCP_PUBLIC_URL=
```

`MCP_PUBLIC_URL` should point at the MCP endpoint exposed by this project, for example:

```env
MCP_PUBLIC_URL=https://example.ngrok-free.app/mcp
```

## Run

Start the minimal MCP echo server:

```sh
npm run mcp
```

Expose the MCP server publicly with ngrok:

```sh
ngrok http 3001 --host-header=rewrite
```

Set `MCP_PUBLIC_URL` to the public ngrok URL with `/mcp` appended, then run the debug request:

```sh
npm run debug
```

The debug script streams the response, logs MCP events, usage, request IDs, and rate-limit related response headers.
