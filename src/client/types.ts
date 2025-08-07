/**
 * Type definitions for Bitbucket API responses and configurations
 */

export interface BitbucketConfig {
  baseUrl: string;
  email: string; // Atlassian account email (required for API tokens)
  apiToken: string; // API token (replaces app passwords)
  workspace?: string;
}

export interface Repository {
  name: string;
  full_name: string;
  description?: string;
  language?: string;
  private: boolean;
  created_on: string;
  updated_on: string;
  clone_links: Array<{ name: string; href: string }>;
}

export interface PullRequest {
  id: number;
  title: string;
  description?: string;
  state: 'OPEN' | 'MERGED' | 'DECLINED';
  author: { display_name: string; uuid: string };
  source: { branch: { name: string }; repository: { name: string }; commit?: { hash: string } };
  destination: { branch: { name: string }; repository: { name: string }; commit?: { hash: string } };
  created_on: string;
  updated_on: string;
  merge_commit?: { hash: string };
  participants: Array<{ user: { display_name: string }; approved: boolean }>;
}

export interface Issue {
  id: number;
  title: string;
  content?: { raw: string };
  state: 'new' | 'open' | 'resolved' | 'on hold' | 'invalid' | 'duplicate' | 'wontfix' | 'closed';
  kind: 'bug' | 'enhancement' | 'proposal' | 'task';
  priority: 'trivial' | 'minor' | 'major' | 'critical' | 'blocker';
  assignee?: { display_name: string };
  reporter: { display_name: string };
  created_on: string;
  updated_on: string;
}

export interface Commit {
  hash: string;
  message: string;
  author: { raw: string };
  date: string;
  parents: Array<{ hash: string }>;
}

export interface Branch {
  name: string;
  target: { hash: string };
}

export interface CodeSearchResult {
  name?: string;
  path?: string;
  type: string;
  size?: number;
  match_type: 'filename' | 'path' | 'content';
  branch: string;
}

export interface DiffStat {
  old?: { path: string } | null;
  new?: { path: string } | null;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  lines_added: number;
  lines_removed: number;
}

export interface CreatePullRequestData {
  title: string;
  description?: string;
  source: string;
  destination: string;
  reviewers?: string[];
}

export interface CreateIssueData {
  title: string;
  content?: string;
  kind: 'bug' | 'enhancement' | 'proposal' | 'task';
  priority: 'trivial' | 'minor' | 'major' | 'critical' | 'blocker';
  assignee?: string;
}

export interface RepositoryFilters {
  workspace?: string;
  language?: string;
  private?: boolean;
  query?: string;
  sort?: 'created_on' | 'updated_on' | 'name';
  page?: number;
  limit?: number;
}

export interface PullRequestFilters {
  workspace: string;
  repo_slug: string;
  state?: 'OPEN' | 'MERGED' | 'DECLINED';
  author?: string;
  destination_branch?: string;
  page?: number;
  limit?: number;
}

export interface IssueFilters {
  workspace: string;
  repo_slug: string;
  state?: string;
  kind?: string;
  priority?: string;
  assignee?: string;
  page?: number;
  limit?: number;
}

export interface TokenValidationResult {
  scopes: string[];
  user: {
    display_name: string;
    username: string;
    uuid: string;
  };
}
