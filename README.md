# Bitbucket MCP Server

A secure, production-ready Model Context Protocol (MCP) server for Bitbucket integration. Designed specifically for code review workflows, it provides reliable access to pull request diffs even with limited repository permissions.

## ✨ **Key Highlights**
- **Enhanced PR Diff Access**: Works even when you're not the PR author
- **Smart Fallback Methods**: Multiple approaches to retrieve diff data
- **Secure by Default**: No credentials stored, comprehensive security practices
- **Code Review Optimized**: Perfect for reviewing colleagues' pull requests

## Features

### Repository Management
- **list-repositories**: List repositories with filtering by language, visibility, and search queries
- **get-repository**: Get detailed repository information including clone URLs and metadata

### Pull Request Management
- **list-pull-requests**: List pull requests with filtering by state, author, and destination branch
- **get-pull-request**: Get detailed pull request information including approvals and reviews
- **create-pull-request**: Create new pull requests with reviewers

### Issue Management
- **list-issues**: List issues with filtering by state, kind, priority, and assignee
- **get-issue**: Get detailed issue information
- **create-issue**: Create new issues with proper categorization

### Code Analysis
- **get-commits**: Get commit history for repositories
- **list-branches**: List all repository branches
- **get-file-content**: Get the content of specific files
- **search-code**: Search for code within repositories

## Setup

1. Install dependencies:
```bash
npm install
```

2. Build the server:
```bash
npm run build
```

3. Configure Bitbucket credentials using the `configure-bitbucket` tool with:
   - **baseUrl**: Bitbucket API base URL (e.g., https://api.bitbucket.org)
   - **username**: Your Bitbucket username
   - **appPassword**: Your Bitbucket app password
   - **workspace**: Default workspace name (optional)

## 🚀 **Quick Start**

### 1. Installation
```bash
# Clone and build
git clone <repository-url>
cd bitbucket-mcp-server
npm install
npm run build
```

### 2. MCP Client Configuration
Add to your MCP client configuration (e.g., `~/.config/mcp/servers.json`):
```json
{
  "mcpServers": {
    "bitbucket-mcp-server": {
      "command": "node",
      "args": ["/path/to/bitbucket-mcp-server/dist/index.js"]
    }
  }
}
```

### 3. Configure Bitbucket Access
**Create API Token**: Visit [Atlassian Account Settings](https://id.atlassian.com/manage-profile/security/api-tokens)

**Configure via MCP**:
```json
{
  "tool": "configure-bitbucket",
  "arguments": {
    "baseUrl": "https://api.bitbucket.org",
    "email": "your-email@domain.com",
    "apiToken": "ATATT3x...",
    "workspace": "your-workspace"
  }
}
```

## Usage Examples

### 🔍 **Code Review Workflow**
```json
{
  "tool": "get-pull-request-diff",
  "arguments": {
    "workspace": "company-workspace",
    "repo_slug": "main-app",
    "pr_id": 1524,
    "max_size": 20000
  }
}
```

**Why This Matters**: Even if you're not the PR author, this MCP server uses smart fallback methods to retrieve diff data for code review. Perfect for reviewing colleagues' work!

### Example Operations

#### List Repositories
```json
{
  "tool": "list-repositories",
  "arguments": {
    "workspace": "my-workspace",
    "language": "javascript",
    "private": false,
    "sort": "updated_on"
  }
}
```

#### Create Pull Request
```json
{
  "tool": "create-pull-request",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-repo",
    "title": "Feature: Add new authentication system",
    "description": "This PR adds a new JWT-based authentication system",
    "source": "feature/auth",
    "destination": "main",
    "reviewers": ["reviewer1", "reviewer2"]
  }
}
```

#### Create Issue
```json
{
  "tool": "create-issue",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-repo",
    "title": "Bug: Login form validation error",
    "content": "The login form shows validation errors incorrectly",
    "kind": "bug",
    "priority": "major",
    "assignee": "developer1"
  }
}
```

## Authentication

The server uses Bitbucket App Passwords for authentication. To create an app password:

1. Go to your Bitbucket settings
2. Navigate to App passwords
3. Create a new app password with required permissions:
   - Repositories: Read, Write
   - Pull requests: Read, Write
   - Issues: Read, Write

## Error Handling

The server provides comprehensive error handling for:
- API authentication errors
- Network connectivity issues
- Invalid request parameters
- Bitbucket API rate limiting
- Resource not found errors

## Development

### Running in Development
```bash
npm run dev
```

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

## API Coverage

This MCP server covers the following Bitbucket API endpoints:

- `/2.0/repositories/{workspace}` - Repository listing and details
- `/2.0/repositories/{workspace}/{repo_slug}/pullrequests` - Pull request management
- `/2.0/repositories/{workspace}/{repo_slug}/issues` - Issue management
- `/2.0/repositories/{workspace}/{repo_slug}/commits` - Commit history
- `/2.0/repositories/{workspace}/{repo_slug}/refs/branches` - Branch listing
- `/2.0/repositories/{workspace}/{repo_slug}/src` - File content and code search

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License