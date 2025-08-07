/**
 * Zod validation schemas for input validation
 */

import { z } from 'zod';

export const BitbucketConfigSchema = z
  .object({
    baseUrl: z.string().url('Invalid URL format'),
    email: z.string().email('Invalid email format'),
    apiToken: z.string().min(1, 'API token is required'),
    workspace: z.string().optional(),
  })
  .strict();

export const RepositoryFilterSchema = z
  .object({
    workspace: z.string().optional(),
    language: z.string().optional(),
    private: z.boolean().optional(),
    query: z.string().max(100, 'Query too long').optional(),
    sort: z.enum(['created_on', 'updated_on', 'name']).optional(),
    page: z.number().int().min(1).max(100).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const PullRequestFilterSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    state: z.enum(['OPEN', 'MERGED', 'DECLINED']).optional(),
    author: z.string().optional(),
    destination_branch: z.string().optional(),
    page: z.number().int().min(1).max(100).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const IssueFilterSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    state: z.enum(['new', 'open', 'resolved', 'on hold', 'invalid', 'duplicate', 'wontfix', 'closed']).optional(),
    kind: z.enum(['bug', 'enhancement', 'proposal', 'task']).optional(),
    priority: z.enum(['trivial', 'minor', 'major', 'critical', 'blocker']).optional(),
    assignee: z.string().optional(),
    page: z.number().int().min(1).max(100).optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const CreatePullRequestSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    description: z.string().max(65535, 'Description too long').optional(),
    source: z.string().min(1, 'Source branch is required'),
    destination: z.string().min(1, 'Destination branch is required'),
    reviewers: z.array(z.string()).optional(),
  })
  .strict();

export const CreateIssueSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
    content: z.string().max(65535, 'Content too long').optional(),
    kind: z.enum(['bug', 'enhancement', 'proposal', 'task']),
    priority: z.enum(['trivial', 'minor', 'major', 'critical', 'blocker']),
    assignee: z.string().optional(),
  })
  .strict();

export const GetRepositorySchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
  })
  .strict();

export const GetPullRequestSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    pr_id: z.number().int().min(1, 'Pull request ID must be positive'),
  })
  .strict();

export const GetPullRequestDiffSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    pr_id: z.number().int().min(1, 'Pull request ID must be positive'),
    file_path: z.string().optional().describe('Get diff for specific file only'),
    context_lines: z.number().int().min(0).max(10).optional().describe('Limit context lines around changes (0-10)'),
    ignore_whitespace: z.boolean().optional().describe('Ignore whitespace-only changes'),
    max_size: z.number().int().min(1000).max(20000).optional().describe('Maximum response size in tokens (1000-20000)'),
  })
  .strict();

export const GetIssueSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    issue_id: z.number().int().min(1, 'Issue ID must be positive'),
  })
  .strict();

export const GetCommitsSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    branch: z.string().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  })
  .strict();

export const GetFileContentSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    path: z.string().min(1, 'File path is required'),
    branch: z.string().optional(),
  })
  .strict();

export const SearchCodeSchema = z
  .object({
    workspace: z.string().min(1, 'Workspace is required'),
    repo_slug: z.string().min(1, 'Repository slug is required'),
    query: z.string().min(1, 'Search query is required').max(100, 'Query too long'),
  })
  .strict();
