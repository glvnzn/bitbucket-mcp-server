/**
 * Issue-related MCP tools
 */

import { BitbucketClient } from '../client/bitbucket.js';
import { IssueFilterSchema, GetIssueSchema, CreateIssueSchema } from '../schemas/validation.js';
import { formatIssueList, formatIssue, formatSuccessMessage } from '../utils/formatters.js';
import { formatErrorForUser, EnhancedMcpError } from '../utils/errors.js';

export async function listIssues(client: BitbucketClient, args: any) {
  try {
    const filters = IssueFilterSchema.parse(args);
    const issues = await client.getIssues(filters.workspace, filters.repo_slug, filters);

    return {
      content: [
        {
          type: 'text',
          text: formatIssueList(issues),
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
    } else if (error instanceof Error) {
      return {
        content: [
          {
            type: 'text',
            text: `⚠️ Issues not available: ${error.message}\n\nThis repository either has issue tracking disabled or your API token lacks issue access permissions.`,
          },
        ],
      };
    }
    throw error;
  }
}

export async function getIssue(client: BitbucketClient, args: any) {
  try {
    const { workspace, repo_slug, issue_id } = GetIssueSchema.parse(args);
    const issue = await client.getIssue(workspace, repo_slug, issue_id);

    return {
      content: [
        {
          type: 'text',
          text: formatIssue(issue),
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

export async function createIssue(client: BitbucketClient, args: any) {
  try {
    const data = CreateIssueSchema.parse(args);
    const issue = await client.createIssue(data.workspace, data.repo_slug, {
      title: data.title,
      content: data.content,
      kind: data.kind,
      priority: data.priority,
      assignee: data.assignee,
    });

    return {
      content: [
        {
          type: 'text',
          text: formatSuccessMessage('issue-created', issue),
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

export const issueToolDefinitions = [
  {
    name: 'list-issues',
    description: 'List issues for a repository with optional filtering and pagination',
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
          enum: ['new', 'open', 'resolved', 'on hold', 'invalid', 'duplicate', 'wontfix', 'closed'],
          description: 'Filter by issue state',
        },
        kind: {
          type: 'string',
          enum: ['bug', 'enhancement', 'proposal', 'task'],
          description: 'Filter by issue kind',
        },
        priority: {
          type: 'string',
          enum: ['trivial', 'minor', 'major', 'critical', 'blocker'],
          description: 'Filter by issue priority',
        },
        assignee: {
          type: 'string',
          description: 'Filter by assignee username',
        },
        page: {
          type: 'number',
          description: 'Page number for pagination (1-100)',
          minimum: 1,
          maximum: 100,
        },
        limit: {
          type: 'number',
          description: 'Number of issues per page (1-100)',
          minimum: 1,
          maximum: 100,
        },
      },
      required: ['workspace', 'repo_slug'],
    },
  },
  {
    name: 'get-issue',
    description: 'Get detailed information about a specific issue',
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
        issue_id: {
          type: 'number',
          description: 'Issue ID',
          minimum: 1,
        },
      },
      required: ['workspace', 'repo_slug', 'issue_id'],
    },
  },
  {
    name: 'create-issue',
    description: 'Create a new issue',
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
          description: 'Issue title',
          minLength: 1,
          maxLength: 255,
        },
        content: {
          type: 'string',
          description: 'Issue description/content',
          maxLength: 65535,
        },
        kind: {
          type: 'string',
          enum: ['bug', 'enhancement', 'proposal', 'task'],
          description: 'Issue kind',
        },
        priority: {
          type: 'string',
          enum: ['trivial', 'minor', 'major', 'critical', 'blocker'],
          description: 'Issue priority',
        },
        assignee: {
          type: 'string',
          description: 'Assignee username',
        },
      },
      required: ['workspace', 'repo_slug', 'title', 'kind', 'priority'],
    },
  },
];
