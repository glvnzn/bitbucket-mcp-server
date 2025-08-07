# Deployment Guide

## Production Deployment

### Prerequisites
- Node.js 18+ installed
- Access to Bitbucket repositories you want to integrate
- Bitbucket API token with appropriate scopes

### Build Process
```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Verify build
npm run start --dry-run
```

### Configuration

#### Option 1: MCP Client Configuration (Recommended)
Configure through your MCP client using the `configure-bitbucket` tool:
- Credentials are not persisted
- Secure runtime configuration
- Easy to update without redeployment

#### Option 2: Environment Variables
```bash
export BITBUCKET_BASE_URL="https://api.bitbucket.org"
export BITBUCKET_EMAIL="your-email@domain.com"
export BITBUCKET_API_TOKEN="ATATT3x..."
export BITBUCKET_WORKSPACE="default-workspace"
```

### MCP Integration

#### Claude Desktop
Add to `~/.config/claude-desktop/config.json`:
```json
{
  "mcpServers": {
    "bitbucket-mcp-server": {
      "command": "node",
      "args": ["/path/to/bitbucket-mcp-server/dist/index.js"],
      "env": {
        "BITBUCKET_BASE_URL": "https://api.bitbucket.org"
      }
    }
  }
}
```

#### Other MCP Clients
Use the provided `mcp-server.json` as a template and adjust paths as needed.

### Performance Considerations
- **Caching**: The server includes intelligent caching for repository metadata
- **Rate Limiting**: Built-in rate limiting prevents API quota exhaustion
- **Fallback Methods**: Multiple API approaches ensure reliability
- **Token Limits**: API tokens have usage limits - monitor your consumption

### Security Checklist
- [ ] API tokens use minimal required scopes
- [ ] No credentials committed to version control
- [ ] Regular token rotation schedule established
- [ ] Access logs monitoring configured (if needed)
- [ ] Network access restricted to api.bitbucket.org

### Monitoring
The server provides structured error messages and handles:
- Network timeouts and retries
- API rate limiting with exponential backoff
- Permission errors with helpful suggestions
- Invalid credentials with clear error messages

### Troubleshooting

#### Common Issues
1. **403 Forbidden**: Check API token scopes and repository permissions
2. **404 Not Found**: Verify workspace and repository names
3. **Rate Limited**: Built-in backoff will handle this automatically
4. **Token Expired**: Rotate API token and reconfigure

#### Debug Mode
For development/troubleshooting, you can enable debug logging by setting:
```bash
export NODE_ENV=development
```

### Updates
To update the server:
```bash
git pull origin main
npm ci
npm run build
# Restart your MCP client to pick up changes
```