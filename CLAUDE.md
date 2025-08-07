# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern Model Context Protocol (MCP) server for Bitbucket integration built with TypeScript and Node.js. It uses **API tokens exclusively** (no app passwords) and provides comprehensive tools for repository management, pull requests, issues, and code analysis through the Bitbucket API.

**Version 2.0** - Modernized for API token authentication (future-proof for 2025-2026 app password deprecation).

## Development Commands

### Building and Running
- `npm run build` - Compile TypeScript to JavaScript in dist/
- `npm run dev` - Run development server with tsx for hot reloading
- `npm start` - Run the built server from dist/index.js
- `npm run mcp` - Run the MCP server (alias for start)

### Code Quality
- `npm run lint` - Lint TypeScript files with ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run Jest tests

## Architecture

### Core Structure
- **Single file architecture**: All functionality is contained in `src/index.ts` (1100+ lines)
- **MCP SDK integration**: Uses @modelcontextprotocol/sdk for server implementation
- **TypeScript with ES Modules**: Configured for ES2020 target with strict type checking
- **Axios HTTP client**: All Bitbucket API calls use a configured axios instance

### Key Components

#### BitbucketClient Class
- Handles all API interactions with Bitbucket
- Uses modern API token authentication (email + token)
- Methods for repositories, pull requests, issues, commits, branches, file operations, and PR diffs
- Enhanced source code access capabilities

#### Tool System
The server exposes 15 MCP tools:
- **configure-bitbucket**: Set up API token authentication and workspace
- **Repository tools**: list-repositories, get-repository
- **Pull request tools**: list-pull-requests, get-pull-request, create-pull-request
- **PR diff tools**: get-pull-request-diff, get-pull-request-files (NEW in v2.0)
- **Issue tools**: list-issues, get-issue, create-issue
- **Code analysis tools**: get-commits, list-branches, get-file-content, search-code

#### Error Handling
- Uses MCP error codes for consistent error reporting
- Axios errors are transformed into MCP errors with proper status codes and messages
- API token validation and scope checking
- Enhanced error messages for permission issues

### Authentication Flow (API Tokens)
1. Client calls `configure-bitbucket` with email and API token
2. Creates BitbucketClient instance using official Atlassian authentication format
3. All subsequent API calls use email + API token for Basic auth
4. Supports optional default workspace setting

## Technical Details

### TypeScript Configuration
- ES2020 modules with strict type checking
- Output to `dist/` directory
- Source maps and declarations enabled
- Excludes test files from compilation

### Dependencies
- **Runtime**: @modelcontextprotocol/sdk, axios, zod
- **Development**: TypeScript, ESLint, Prettier, Jest, tsx

### API Coverage
Covers these Bitbucket API v2.0 endpoints:
- `/2.0/repositories/{workspace}` - Repository operations
- `/2.0/repositories/{workspace}/{repo_slug}/pullrequests` - PR management
- `/2.0/repositories/{workspace}/{repo_slug}/issues` - Issue management
- `/2.0/repositories/{workspace}/{repo_slug}/commits` - Commit history
- `/2.0/repositories/{workspace}/{repo_slug}/refs/branches` - Branch listing
- `/2.0/repositories/{workspace}/{repo_slug}/src` - File content and search

## Configuration

### MCP Server Setup
The `test-config.json` file shows the server configuration:
```json
{
  "mcpServers": {
    "bitbucket-mcp-server": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

### Bitbucket Authentication (API Tokens)
Requires Bitbucket API Token created at: https://id.atlassian.com/manage-profile/security/api-tokens

Required scopes:
- **Account: Read** (for user authentication)
- **Repositories: Read** (for repository access)
- **Pull requests: Read** (for PR access and diffs)
- **Issues: Read** (for issue management)

Configuration format:
```json
{
  "tool": "configure-bitbucket",
  "arguments": {
    "baseUrl": "https://api.bitbucket.org",
    "email": "your-atlassian-email@domain.com",
    "apiToken": "ATATT3x...",
    "workspace": "your-workspace"
  }
}
```

## Code Patterns

### Schema Validation
Uses Zod schemas for input validation:
- **BitbucketConfigSchema**: API token authentication (email + token + workspace)
- **RepositoryFilterSchema**: Repository queries and filtering
- **PullRequestFilterSchema**: PR filtering and search

### Response Formatting
All tool responses use MCP content format with:
- Structured markdown output
- Consistent emoji usage for status indicators
- Error handling with proper MCP error codes