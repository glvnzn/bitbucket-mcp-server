/**
 * Repository-related MCP tools
 */

import { BitbucketClient } from '../client/bitbucket.js';
import { RepositoryFilterSchema, GetRepositorySchema } from '../schemas/validation.js';
import { formatRepositoryList, formatRepository } from '../utils/formatters.js';
import { formatErrorForUser, EnhancedMcpError } from '../utils/errors.js';

export async function listRepositories(client: BitbucketClient, args: any) {
  try {
    const filters = RepositoryFilterSchema.parse(args);
    const repos = await client.getRepositories(filters.workspace, filters);

    return {
      content: [
        {
          type: 'text',
          text: formatRepositoryList(repos),
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

export async function getRepository(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug } = GetRepositorySchema.parse(args);
    const repo = await client.getRepository(workspace, repo_slug);

    return {
      content: [
        {
          type: 'text',
          text: formatRepository(repo),
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

export const repositoryToolDefinitions = [
  {
    name: 'list-repositories',
    description: 'List repositories in a workspace with optional filtering and pagination',
    inputSchema: {
      type: 'object',
      properties: {
        workspace: {
          type: 'string',
          description: 'Workspace name (optional if configured globally)',
        },
        language: {
          type: 'string',
          description: 'Filter by programming language',
        },
        private: {
          type: 'boolean',
          description: 'Filter by repository visibility',
        },
        query: {
          type: 'string',
          description: 'Search query for repository names (max 100 characters)',
          maxLength: 100,
        },
        sort: {
          type: 'string',
          enum: ['created_on', 'updated_on', 'name'],
          description: 'Sort repositories by field',
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (1-100)',
          minimum: 1,
          maximum: 100,
        },
        limit: {
          type: 'number',
          description: 'Number of repositories per page (1-100)',
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  {
    name: 'get-repository',
    description: 'Get detailed information about a specific repository',
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
];
