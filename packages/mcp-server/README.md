# @whisq/mcp-server

MCP server for Whisq — AI tool integrations for component scaffolding and code validation.

## Install

```bash
npm install @whisq/mcp-server
```

## Usage

Add the server to your MCP client configuration:

```json
{
  "mcpServers": {
    "whisq": {
      "command": "npx",
      "args": ["@whisq/mcp-server"]
    }
  }
}
```

The server exposes tools for scaffolding components, validating Whisq code patterns, and generating store modules.

## Documentation

Full documentation at [whisq.dev](https://whisq.dev).

## License

MIT
