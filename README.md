# Bitbucket MCP Server

A comprehensive Model Context Protocol (MCP) server for Bitbucket integration, providing tools for repository management, pull requests, issues, and code analysis.

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

## Usage

### Configuration
First, configure your Bitbucket connection:

```json
{
  "tool": "configure-bitbucket",
  "arguments": {
    "baseUrl": "https://api.bitbucket.org",
    "username": "your-username",
    "appPassword": "your-app-password",
    "workspace": "your-workspace"
  }
}
```

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