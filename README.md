# BuildClub.io Official MCP Server

## Connect Claude Desktop to your remote MCP server

Update the Claude configuration file to point to your `workers.dev` URL (ex: `worker-name.account-name.workers.dev/sse`) and restart Claude

```json
{
  "mcpServers": {
    "math": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://buildclub-mcp-server.timwheeler.workers.dev/sse"
      ]
    }
  }
}
```
