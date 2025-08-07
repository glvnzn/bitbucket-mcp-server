/**
 * Code analysis-related MCP tools
 */

import { BitbucketClient } from '../client/bitbucket.js';
import {
  GetCommitsSchema,
  GetFileContentSchema,
  SearchCodeSchema,
  GetRepositorySchema,
} from '../schemas/validation.js';
import { formatCommitList, formatBranchList, formatFileContent, formatCodeSearchResults } from '../utils/formatters.js';
import { formatErrorForUser, EnhancedMcpError } from '../utils/errors.js';

export async function getCommits(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug, branch, limit = 50 } = GetCommitsSchema.parse(args);
    const commits = await client.getCommits(workspace, repo_slug, branch, limit);

    return {
      content: [
        {
          type: 'text',
          text: formatCommitList(commits, branch),
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

export async function listBranches(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug } = GetRepositorySchema.parse(args);
    const branches = await client.getBranches(workspace, repo_slug);

    return {
      content: [
        {
          type: 'text',
          text: formatBranchList(branches),
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

export async function getFileContent(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug, path, branch = 'main' } = GetFileContentSchema.parse(args);
    const content = await client.getFileContent(workspace, repo_slug, path, branch);

    return {
      content: [
        {
          type: 'text',
          text: formatFileContent(path, content, branch),
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

export async function searchCode(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug, query } = SearchCodeSchema.parse(args);
    const results = await client.searchCode(workspace, repo_slug, query);

    return {
      content: [
        {
          type: 'text',
          text: formatCodeSearchResults(results, query),
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

export const codeToolDefinitions = [
  {
    name: 'get-commits',
    description: 'Get commit history for a repository with pagination support',
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
        branch: {
          type: 'string',
          description: 'Branch name (default: main)',
        },
        limit: {
          type: 'number',
          description: 'Number of commits to retrieve (1-100, default: 50)',
          minimum: 1,
          maximum: 100,
        },
      },
      required: ['workspace', 'repo_slug'],
    },
  },
  {
    name: 'list-branches',
    description: 'List all branches in a repository',
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
      },
      required: ['workspace', 'repo_slug'],
    },
  },
  {
    name: 'get-file-content',
    description: 'Get the content of a specific file from a repository',
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
        path: {
          type: 'string',
          description: 'File path in the repository',
          minLength: 1,
        },
        branch: {
          type: 'string',
          description: 'Branch name (default: main)',
        },
      },
      required: ['workspace', 'repo_slug', 'path'],
    },
  },
  {
    name: 'search-code',
    description: 'Search for code within a repository by filename or path',
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
        query: {
          type: 'string',
          description: 'Search query (max 100 characters)',
          minLength: 1,
          maxLength: 100,
        },
      },
      required: ['workspace', 'repo_slug', 'query'],
    },
  },
];
