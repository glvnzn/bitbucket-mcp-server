#!/usr/bin/env node

/**
 * Bitbucket MCP Server v2.1 - Modular Architecture
 * Model Context Protocol server for Bitbucket integration
 * Enhanced with rate limiting, caching, token validation, and comprehensive error handling
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

import { BitbucketClient } from './client/bitbucket.js';
import { BitbucketConfigSchema } from './schemas/validation.js';
import { formatSuccessMessage } from './utils/formatters.js';
import { EnhancedMcpError, formatErrorForUser } from './utils/errors.js';

// Tool modules
import { repositoryToolDefinitions, listRepositories, getRepository } from './tools/repository.js';
import {
  pullRequestToolDefinitions,
  listPullRequests,
  getPullRequest,
  createPullRequest,
  getPullRequestDiff,
  getPullRequestFiles,
} from './tools/pullrequest.js';
import { issueToolDefinitions, listIssues, getIssue, createIssue } from './tools/issue.js';
import { codeToolDefinitions, getCommits, listBranches, getFileContent, searchCode } from './tools/code.js';

// Global Bitbucket client instance
let bitbucketClient: BitbucketClient | null = null;

// Server setup
const server = new Server(
  {
    name: 'bitbucket-mcp-server',
    version: '2.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Configuration tool definition
const configurationToolDefinition = {
  name: 'configure-bitbucket',
  description:
    'Configure Bitbucket connection using API tokens with validation (modern authentication). API tokens are replacing app passwords as of 2025.',
  inputSchema: {
    type: 'object',
    properties: {
      baseUrl: {
        type: 'string',
        description: 'Bitbucket base URL (e.g., https://api.bitbucket.org)',
        format: 'uri',
      },
      email: {
        type: 'string',
        description: 'Your Atlassian account email address',
        format: 'email',
      },
      apiToken: {
        type: 'string',
        description: 'Bitbucket API token (create at https://id.atlassian.com/manage-profile/security/api-tokens)',
        minLength: 1,
      },
      workspace: {
        type: 'string',
        description: 'Default workspace name',
      },
    },
    required: ['baseUrl', 'email', 'apiToken'],
  },
};

// Combine all tool definitions
const allToolDefinitions = [
  configurationToolDefinition,
  ...repositoryToolDefinitions,
  ...pullRequestToolDefinitions,
  ...issueToolDefinitions,
  ...codeToolDefinitions,
];

// Tool definitions handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allToolDefinitions,
  };
});

// Tool execution handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'configure-bitbucket': {
        const config = BitbucketConfigSchema.parse(args);
        bitbucketClient = new BitbucketClient(config);

        // Validate token on configuration
        try {
          const validation = await bitbucketClient.validateToken();
          console.error(`Token validated for user: ${validation.user.display_name} (${validation.user.username})`);
        } catch (error) {
          console.error('Token validation failed during configuration:', error);
          // Continue anyway as some tokens might work for operations but not user endpoint
        }

        return {
          content: [
            {
              type: 'text',
              text: formatSuccessMessage('bitbucket-configured', config),
            },
          ],
        };
      }

      // Repository tools
      case 'list-repositories': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await listRepositories(bitbucketClient, args);
      }

      case 'get-repository': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await getRepository(bitbucketClient, args);
      }

      // Pull request tools
      case 'list-pull-requests': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await listPullRequests(bitbucketClient, args);
      }

      case 'get-pull-request': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await getPullRequest(bitbucketClient, args);
      }

      case 'create-pull-request': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await createPullRequest(bitbucketClient, args);
      }

      case 'get-pull-request-diff': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await getPullRequestDiff(bitbucketClient, args);
      }

      case 'get-pull-request-files': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await getPullRequestFiles(bitbucketClient, args);
      }

      // Issue tools
      case 'list-issues': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await listIssues(bitbucketClient, args);
      }

      case 'get-issue': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await getIssue(bitbucketClient, args);
      }

      case 'create-issue': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await createIssue(bitbucketClient, args);
      }

      // Code analysis tools
      case 'get-commits': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await getCommits(bitbucketClient, args);
      }

      case 'list-branches': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await listBranches(bitbucketClient, args);
      }

      case 'get-file-content': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await getFileContent(bitbucketClient, args);
      }

      case 'search-code': {
        if (!bitbucketClient) {
          throw new McpError(ErrorCode.InvalidRequest, 'Bitbucket not configured. Use configure-bitbucket first.');
        }
        return await searchCode(bitbucketClient, args);
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }

    if (error instanceof EnhancedMcpError) {
      throw new McpError(error.code, formatErrorForUser(error));
    }

    // Handle Zod validation errors
    if (error && typeof error === 'object' && 'issues' in error) {
      const validationError = error as any;
      const errorMessages = validationError.issues
        .map((issue: any) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new McpError(ErrorCode.InvalidParams, `Validation error: ${errorMessages}`);
    }

    // Generic error handling
    console.error('Unexpected error:', error);
    throw new McpError(ErrorCode.InternalError, `Unexpected error: ${String(error)}`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  if (bitbucketClient) {
    bitbucketClient.destroy();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  if (bitbucketClient) {
    bitbucketClient.destroy();
  }
  process.exit(0);
});

// Start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Bitbucket MCP Server v2.1 (Enhanced) running on stdio');
    console.error('Features: Modular architecture, rate limiting, caching, token validation, enhanced error handling');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
