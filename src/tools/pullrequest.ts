/**
 * Pull request-related MCP tools
 */

import { BitbucketClient } from '../client/bitbucket.js';
import { PullRequestFilterSchema, GetPullRequestSchema, GetPullRequestDiffSchema, CreatePullRequestSchema } from '../schemas/validation.js';
import {
  formatPullRequestList,
  formatPullRequest,
  formatPullRequestDiff,
  formatPullRequestFiles,
  formatSuccessMessage,
} from '../utils/formatters.js';
import { formatErrorForUser, EnhancedMcpError } from '../utils/errors.js';

export async function listPullRequests(client: BitbucketClient, args: any) {
  try {
    const filters = PullRequestFilterSchema.parse(args);
    const prs = await client.getPullRequests(filters.workspace, filters.repo_slug, filters);

    return {
      content: [
        {
          type: 'text',
          text: formatPullRequestList(prs),
        },
      ],
    };
  } catch (error) {
    if (error instanceof EnhancedMcpError) {
      return {
        content: [
          {
            type: 'text',
            text: formatErrorForUser(error),
          },
        ],
      };
    }
    throw error;
  }
}

export async function getPullRequest(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug, pr_id } = GetPullRequestSchema.parse(args);
    const pr = await client.getPullRequest(workspace, repo_slug, pr_id);

    return {
      content: [
        {
          type: 'text',
          text: formatPullRequest(pr),
        },
      ],
    };
  } catch (error) {
    if (error instanceof EnhancedMcpError) {
      return {
        content: [
          {
            type: 'text',
            text: formatErrorForUser(error),
          },
        ],
      };
    }
    throw error;
  }
}

export async function createPullRequest(client: BitbucketClient, args: any) {
  try {
    const data = CreatePullRequestSchema.parse(args);
    const pr = await client.createPullRequest(data.workspace, data.repo_slug, {
      title: data.title,
      description: data.description,
      source: data.source,
      destination: data.destination,
      reviewers: data.reviewers,
    });

    return {
      content: [
        {
          type: 'text',
          text: formatSuccessMessage('pull-request-created', { ...pr, reviewers: data.reviewers }),
        },
      ],
    };
  } catch (error) {
    if (error instanceof EnhancedMcpError) {
      return {
        content: [
          {
            type: 'text',
            text: formatErrorForUser(error),
          },
        ],
      };
    }
    throw error;
  }
}

export async function getPullRequestDiff(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug, pr_id, file_path, context_lines, ignore_whitespace, max_size } = GetPullRequestDiffSchema.parse(args);
    
    // Use enhanced diff method with fallback handling
    const result = await client.getPullRequestDiffEnhanced(workspace, repo_slug, pr_id, {
      file_path,
      context_lines,
      ignore_whitespace,
      max_size
    });

    let responseText = formatPullRequestDiff(pr_id, result.diff);
    
    if (result.truncated) {
      responseText = result.diff; // Already formatted with fallback message
    }

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    if (error instanceof EnhancedMcpError) {
      return {
        content: [
          {
            type: 'text',
            text: formatErrorForUser(error),
          },
        ],
      };
    }
    throw error;
  }
}

export async function getPullRequestFiles(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug, pr_id } = GetPullRequestSchema.parse(args);
    const files = await client.getPullRequestDiffStat(workspace, repo_slug, pr_id);

    return {
      content: [
        {
          type: 'text',
          text: formatPullRequestFiles(pr_id, files),
        },
      ],
    };
  } catch (error) {
    if (error instanceof EnhancedMcpError) {
      return {
        content: [
          {
            type: 'text',
            text: formatErrorForUser(error),
          },
        ],
      };
    }
    throw error;
  }
}

export const pullRequestToolDefinitions = [
  {
    name: 'list-pull-requests',
    description: 'List pull requests for a repository with optional filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name',
          minLength: 1,
        },
        repo_slug: {
          type: 'string',
          description: 'Repository slug/name',
          minLength: 1,
        },
        state: {
          type: 'string',
          enum: ['OPEN', 'MERGED', 'DECLINED'],
          description: 'Filter by pull request state',
        },
        author: {
          type: 'string',
          description: 'Filter by author username',
        },
        destination_branch: {
          type: 'string',
          description: 'Filter by destination branch',
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (1-100)',
          minimum: 1,
          maximum: 100,
        },
        limit: {
          type: 'number',
          description: 'Number of pull requests per page (1-100)',
          minimum: 1,
          maximum: 100,
        },
      },
      required: ['workspace', 'repo_slug'],
    },
  },
  {
    name: 'get-pull-request',
    description: 'Get detailed information about a specific pull request',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name',
          minLength: 1,
        },
        repo_slug: {
          type: 'string',
          description: 'Repository slug/name',
          minLength: 1,
        },
        pr_id: {
          type: 'number',
          description: 'Pull request ID',
          minimum: 1,
        },
      },
      required: ['workspace', 'repo_slug', 'pr_id'],
    },
  },
  {
    name: 'create-pull-request',
    description: 'Create a new pull request',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name',
          minLength: 1,
        },
        repo_slug: {
          type: 'string',
          description: 'Repository slug/name',
          minLength: 1,
        },
        title: {
          type: 'string',
          description: 'Pull request title',
          minLength: 1,
          maxLength: 255,
        },
        description: {
          type: 'string',
          description: 'Pull request description',
          maxLength: 65535,
        },
        source: {
          type: 'string',
          description: 'Source branch name',
          minLength: 1,
        },
        destination: {
          type: 'string',
          description: 'Destination branch name',
          minLength: 1,
        },
        reviewers: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of reviewer usernames',
        },
      },
      required: ['workspace', 'repo_slug', 'title', 'source', 'destination'],
    },
  },
  {
    name: 'get-pull-request-diff',
    description: 'Get the diff/code changes for a specific pull request with smart fallback for large diffs',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name',
          minLength: 1,
        },
        repo_slug: {
          type: 'string',
          description: 'Repository slug/name',
          minLength: 1,
        },
        pr_id: {
          type: 'number',
          description: 'Pull request ID',
          minimum: 1,
        },
        file_path: {
          type: 'string',
          description: 'Get diff for specific file only (avoids size limits)',
        },
        context_lines: {
          type: 'number',
          description: 'Limit context lines around changes (0-10)',
          minimum: 0,
          maximum: 10,
        },
        ignore_whitespace: {
          type: 'boolean',
          description: 'Ignore whitespace-only changes',
        },
        max_size: {
          type: 'number',
          description: 'Maximum response size in tokens (1000-20000)',
          minimum: 1000,
          maximum: 20000,
        },
      },
      required: ['workspace', 'repo_slug', 'pr_id'],
    },
  },
  {
    name: 'get-pull-request-files',
    description: 'Get the list of files changed in a pull request with statistics',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name',
          minLength: 1,
        },
        repo_slug: {
          type: 'string',
          description: 'Repository slug/name',
          minLength: 1,
        },
        pr_id: {
          type: 'number',
          description: 'Pull request ID',
          minimum: 1,
        },
      },
      required: ['workspace', 'repo_slug', 'pr_id'],
    },
  },
];
