# Security Guidelines

## API Token Security

### ⚠️ Never Commit Tokens
- API tokens are sensitive credentials that must NEVER be committed to git
- Use environment variables or MCP client configuration instead
- The `.gitignore` file blocks `.env*` files to prevent accidental commits

### Creating Secure API Tokens
1. Visit: https://id.atlassian.com/manage-profile/security/api-tokens
2. Create token with minimal required scopes:
   - **Account: Read** (for authentication)
   - **Repositories: Read** (for repository access)
   - **Pull requests: Read** (for PR diffs and metadata)
   - **Issues: Read** (for issue management)

### Configuration Methods
1. **Environment Variables** (recommended for local development):
   ```bash
   export BITBUCKET_API_TOKEN="ATATT3x..."
   export BITBUCKET_EMAIL="your-email@domain.com"
   ```

2. **MCP Client Configuration** (recommended for production):
   Use the `configure-bitbucket` tool through your MCP client

3. **Local .env file** (development only):
   Copy `.env.example` to `.env.local` and fill in your values

### Token Permissions
- Use the **principle of least privilege**
- Only grant scopes needed for your use case
- Regularly rotate tokens (recommended: every 3-6 months)
- Revoke unused tokens immediately

### Access Patterns
- **Code Review**: Individual commit diff access works even with limited repository permissions
- **Repository Owner**: Full PR diff access available
- **External Reviewer**: May need to be added as PR reviewer for full access

## Data Privacy
- The MCP server does not store or log sensitive data
- API responses are cached temporarily in memory only
- No persistent storage of credentials or diff content

## Network Security
- All communication uses HTTPS
- API calls are made directly to api.bitbucket.org
- No third-party services involved in the data flow