# BuildClub.io Official MCP Server

## MCP Clients

### Claude Desktop

Add this to Claude Desktop by following these steps:

1. Navigate to `Settings > Developer > Edit Config`
2. Open the config file and paste this snippet below.

```json
{
  "mcpServers": {
    "buildclub": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://buildclub-mcp-server.timwheeler.workers.dev/sse"
      ]
    }
  }
}
```
