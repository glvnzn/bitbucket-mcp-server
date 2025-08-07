# Bitbucket MCP Server Examples

This document provides practical examples of using the Bitbucket MCP Server.

## Configuration

First, configure the server with your Bitbucket credentials:

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

## Repository Operations

### List All Repositories
```json
{
  "tool": "list-repositories",
  "arguments": {
    "workspace": "my-workspace"
  }
}
```

### Filter Repositories by Language
```json
{
  "tool": "list-repositories",
  "arguments": {
    "workspace": "my-workspace",
    "language": "javascript",
    "sort": "updated_on"
  }
}
```

### Get Repository Details
```json
{
  "tool": "get-repository",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-awesome-project"
  }
}
```

## Pull Request Management

### List Open Pull Requests
```json
{
  "tool": "list-pull-requests",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "state": "OPEN"
  }
}
```

### Get Pull Request Details
```json
{
  "tool": "get-pull-request",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "pr_id": 123
  }
}
```

### Create a New Pull Request
```json
{
  "tool": "create-pull-request",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "title": "Add user authentication system",
    "description": "This PR implements JWT-based authentication with login/logout functionality",
    "source": "feature/auth",
    "destination": "develop",
    "reviewers": ["john.doe", "jane.smith"]
  }
}
```

## Issue Management

### List Issues by State
```json
{
  "tool": "list-issues",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "state": "open",
    "priority": "major"
  }
}
```

### Get Issue Details
```json
{
  "tool": "get-issue",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "issue_id": 456
  }
}
```

### Create a Bug Report
```json
{
  "tool": "create-issue",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "title": "Login form validation not working",
    "content": "When users enter invalid credentials, the form doesn't show proper error messages. Steps to reproduce:\n1. Go to login page\n2. Enter invalid email\n3. Click submit\n4. No error message appears",
    "kind": "bug",
    "priority": "major",
    "assignee": "developer.name"
  }
}
```

### Create an Enhancement Request
```json
{
  "tool": "create-issue",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "title": "Add dark mode theme support",
    "content": "Users have requested a dark mode theme option in the application settings. This would improve usability in low-light environments.",
    "kind": "enhancement",
    "priority": "minor"
  }
}
```

## Code Analysis

### Get Recent Commits
```json
{
  "tool": "get-commits",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "branch": "main",
    "limit": 20
  }
}
```

### List All Branches
```json
{
  "tool": "list-branches",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project"
  }
}
```

### Get File Content
```json
{
  "tool": "get-file-content",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "path": "src/components/LoginForm.tsx",
    "branch": "develop"
  }
}
```

### Search Code
```json
{
  "tool": "search-code",
  "arguments": {
    "workspace": "my-workspace",
    "repo_slug": "my-project",
    "query": "authentication"
  }
}
```

## Advanced Workflows

### Code Review Workflow
1. List open pull requests to see what needs review
2. Get specific pull request details to understand changes
3. Check file content to review specific implementations
4. Create issues for any bugs found during review

### Bug Triage Workflow
1. List issues filtered by priority and state
2. Get issue details to understand the problem
3. Check related file content to investigate
4. Search code for similar patterns or implementations

### Release Planning Workflow
1. List repositories to see all projects
2. Get commits to understand recent changes
3. List branches to see feature development
4. Create issues for release planning tasks

## Error Handling Examples

The server provides detailed error messages for common scenarios:

- **Authentication errors**: When credentials are invalid
- **Resource not found**: When repositories, PRs, or issues don't exist
- **Validation errors**: When required parameters are missing
- **Rate limiting**: When API limits are exceeded

Always check the error messages for guidance on resolving issues.