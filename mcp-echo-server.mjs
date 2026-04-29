import "dotenv/config"

import express from "express"
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { z } from "zod"

const HOST = "0.0.0.0"
const PORT = 3001
const MCP_PATH = "/mcp"

function createEchoServer() {
  const server = new McpServer({
    name: "openai-rate-limit-echo-repro",
    version: "0.0.1",
  })

  server.registerTool(
    "echo",
    {
      title: "Echo",
      description: "Return the provided message.",
      inputSchema: {
        message: z.string().describe("The message to echo back."),
      },
    },
    async ({ message }) => {
      console.log(`echo called: ${message}`)

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ message }),
          },
        ],
      }
    }
  )

  return server
}

function applyCors(req, res) {
  const requestOrigin = req.headers.origin

  if (requestOrigin) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin)
    res.setHeader("Vary", "Origin")
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ?? "content-type"
  )
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id")
}

async function handleMcpRequest(req, res) {
  const server = createEchoServer()
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  })
  let didCleanup = false

  const cleanup = () => {
    if (didCleanup) {
      return
    }

    didCleanup = true
    void transport.close()
    void server.close()
  }

  res.on("close", cleanup)

  try {
    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  } catch (error) {
    cleanup()
    console.error("Error handling MCP request:", error)

    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      })
    }
  }
}

function respondWithMethodNotAllowed(res) {
  res.status(405).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Method not allowed.",
    },
    id: null,
  })
}

const app = express()

app.use((req, res, next) => {
  applyCors(req, res)

  if (req.method === "OPTIONS") {
    res.sendStatus(204)
    return
  }

  next()
})

app.use(express.json({ limit: "1mb" }))

app.post(MCP_PATH, async (req, res) => {
  await handleMcpRequest(req, res)
})

app.get(MCP_PATH, (_req, res) => {
  respondWithMethodNotAllowed(res)
})

app.delete(MCP_PATH, (_req, res) => {
  respondWithMethodNotAllowed(res)
})

app.listen(PORT, HOST, () => {
  console.log(`MCP echo server listening at http://localhost:${PORT}${MCP_PATH}`)
})
