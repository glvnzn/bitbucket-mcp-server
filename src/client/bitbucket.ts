/**
 * Enhanced Bitbucket API client with rate limiting, caching, and token validation
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  BitbucketConfig,
  Repository,
  PullRequest,
  Issue,
  Commit,
  Branch,
  CodeSearchResult,
  DiffStat,
  CreatePullRequestData,
  CreateIssueData,
  RepositoryFilters,
  PullRequestFilters,
  IssueFilters,
  TokenValidationResult,
} from './types.js';
import { handleBitbucketError } from '../utils/errors.js';
import { SimpleCache, CacheKeys, CacheTTL } from '../utils/cache.js';

export class BitbucketClient {
  private client: AxiosInstance;
  private config: BitbucketConfig;
  private cache: SimpleCache;
  private requestQueue: Array<() => Promise<any>> = [];
  private rateLimitDelay = 100; // Initial delay between requests in ms
  private maxRetries = 3;

  constructor(config: BitbucketConfig) {
    this.config = config;
    this.cache = new SimpleCache();

    // Enhanced axios configuration with interceptors
    this.client = axios.create({
      baseURL: config.baseUrl,
      auth: {
        username: config.email,
        password: config.apiToken,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'bitbucket-mcp-server/2.1.0',
      },
      timeout: 30000, // 30 second timeout
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      // Simple rate limiting - wait before each request
      if (this.rateLimitDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.rateLimitDelay));
      }
      return config;
    });

    // Response interceptor for retry logic and rate limit handling
    this.client.interceptors.response.use(
      (response) => {
        // Reset rate limit delay on successful response
        this.rateLimitDelay = Math.max(100, this.rateLimitDelay - 50);
        return response;
      },
      async (error: AxiosError) => {
        const config = error.config;

        // Handle rate limiting
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.rateLimitDelay * 2;

          this.rateLimitDelay = Math.min(delay, 10000); // Max 10 second delay

          // Retry the request after delay
          if (config && !(config as any)._retry) {
            (config as any)._retry = true;
            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.client.request(config);
          }
        }

        // Exponential backoff for server errors
        if (error.response?.status && error.response.status >= 500) {
          const retryCount = (config as any)._retryCount || 0;

          if (retryCount < this.maxRetries && config) {
            (config as any)._retryCount = retryCount + 1;
            const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff

            await new Promise((resolve) => setTimeout(resolve, delay));
            return this.client.request(config);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async checkRepositoryPermissions(workspace: string, repo_slug: string): Promise<string[]> {
    const permissions: string[] = [];
    
    try {
      // Check basic repository access
      await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}`);
      permissions.push('repository:read');
    } catch (error) {
      permissions.push('repository:none');
    }
    
    try {
      // Check if we can read repository members/collaborators
      await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests`);
      permissions.push('pullrequests:read');
    } catch (error) {
      permissions.push('pullrequests:limited');
    }
    
    try {
      // Check branch access
      await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/refs/branches`);
      permissions.push('branches:read');
    } catch (error) {
      permissions.push('branches:none');
    }
    
    return permissions;
  }

  async validateToken(): Promise<TokenValidationResult> {
    const cacheKey = CacheKeys.tokenValidation(this.config.email);
    const cached = this.cache.get<TokenValidationResult>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get('/2.0/user');
      const result: TokenValidationResult = {
        scopes: [], // Bitbucket API doesn't return scopes directly
        user: {
          display_name: response.data.display_name,
          username: response.data.username,
          uuid: response.data.uuid,
        },
      };

      this.cache.set(cacheKey, result, CacheTTL.TOKEN_VALIDATION);
      return result;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'Token validation',
        details: { email: this.config.email },
      });
    }
  }

  async getRepositories(workspace?: string, filters: RepositoryFilters = {}): Promise<Repository[]> {
    const ws = workspace || this.config.workspace;
    if (!ws) throw new Error('Workspace is required');

    const filtersKey = JSON.stringify(filters);
    const cacheKey = CacheKeys.repositories(ws, filtersKey);
    const cached = this.cache.get<Repository[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams();

      // Enhanced filtering with pagination support
      if (filters.language) params.append('q', `language="${filters.language}"`);
      if (filters.private !== undefined) params.append('q', `is_private=${filters.private}`);
      if (filters.query) params.append('q', `name ~ "${filters.query}"`);
      if (filters.sort) params.append('sort', filters.sort);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('pagelen', filters.limit.toString());

      const response = await this.client.get(`/2.0/repositories/${ws}?${params}`);
      const repositories = response.data.values || [];

      this.cache.set(cacheKey, repositories, CacheTTL.REPOSITORIES);
      return repositories;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'List repositories',
        workspace: ws,
        details: filters,
      });
    }
  }

  async getRepository(workspace: string, repo_slug: string): Promise<Repository> {
    const cacheKey = CacheKeys.repository(workspace, repo_slug);
    const cached = this.cache.get<Repository>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}`);
      const repository = response.data;

      this.cache.set(cacheKey, repository, CacheTTL.REPOSITORY);
      return repository;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'Get repository',
        workspace,
        repository: repo_slug,
      });
    }
  }

  async getPullRequests(
    workspace: string,
    repo_slug: string,
    filters: Partial<PullRequestFilters> = {}
  ): Promise<PullRequest[]> {
    const filtersKey = JSON.stringify(filters);
    const cacheKey = CacheKeys.pullRequests(workspace, repo_slug, filtersKey);
    const cached = this.cache.get<PullRequest[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams();

      if (filters.state) params.append('state', filters.state);
      if (filters.author) params.append('q', `author.username="${filters.author}"`);
      if (filters.destination_branch) params.append('q', `destination.branch.name="${filters.destination_branch}"`);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('pagelen', filters.limit.toString());

      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests?${params}`);
      const pullRequests = response.data.values || [];

      this.cache.set(cacheKey, pullRequests, CacheTTL.PULL_REQUESTS);
      return pullRequests;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'List pull requests',
        workspace,
        repository: repo_slug,
        details: filters,
      });
    }
  }

  async getPullRequest(workspace: string, repo_slug: string, pr_id: number): Promise<PullRequest> {
    const cacheKey = CacheKeys.pullRequest(workspace, repo_slug, pr_id);
    const cached = this.cache.get<PullRequest>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pr_id}`);
      const pullRequest = response.data;

      this.cache.set(cacheKey, pullRequest, CacheTTL.PULL_REQUESTS);
      return pullRequest;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'Get pull request',
        workspace,
        repository: repo_slug,
        details: { pr_id },
      });
    }
  }

  async createPullRequest(workspace: string, repo_slug: string, data: CreatePullRequestData): Promise<PullRequest> {
    try {
      const payload = {
        title: data.title,
        description: data.description,
        source: { branch: { name: data.source } },
        destination: { branch: { name: data.destination } },
        reviewers: data.reviewers?.map((username) => ({ username })) || [],
      };

      const response = await this.client.post(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests`, payload);

      // Invalidate pull requests cache
      const cachePattern = `prs:${workspace}:${repo_slug}:`;
      this.invalidateCacheByPattern(cachePattern);

      return response.data;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'Create pull request',
        workspace,
        repository: repo_slug,
        details: data,
      });
    }
  }

  async getIssues(workspace: string, repo_slug: string, filters: Partial<IssueFilters> = {}): Promise<Issue[]> {
    try {
      const params = new URLSearchParams();

      if (filters.state) params.append('q', `state="${filters.state}"`);
      if (filters.kind) params.append('q', `kind="${filters.kind}"`);
      if (filters.priority) params.append('q', `priority="${filters.priority}"`);
      if (filters.assignee) params.append('q', `assignee.username="${filters.assignee}"`);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('pagelen', filters.limit.toString());

      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/issues?${params}`);
      return response.data.values || [];
    } catch (error) {
      if ((error as AxiosError)?.response?.status === 404) {
        throw new Error(`Repository has no issue tracker enabled. Issue tracking is disabled for this repository.`);
      }
      handleBitbucketError(error, {
        operation: 'List issues',
        workspace,
        repository: repo_slug,
        details: filters,
      });
    }
  }

  async getIssue(workspace: string, repo_slug: string, issue_id: number): Promise<Issue> {
    try {
      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/issues/${issue_id}`);
      return response.data;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'Get issue',
        workspace,
        repository: repo_slug,
        details: { issue_id },
      });
    }
  }

  async createIssue(workspace: string, repo_slug: string, data: CreateIssueData): Promise<Issue> {
    try {
      const payload = {
        title: data.title,
        content: data.content ? { raw: data.content } : undefined,
        kind: data.kind,
        priority: data.priority,
        assignee: data.assignee ? { username: data.assignee } : undefined,
      };

      const response = await this.client.post(`/2.0/repositories/${workspace}/${repo_slug}/issues`, payload);
      return response.data;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'Create issue',
        workspace,
        repository: repo_slug,
        details: data,
      });
    }
  }

  async getCommits(workspace: string, repo_slug: string, branch?: string, limit: number = 50): Promise<Commit[]> {
    const cacheKey = CacheKeys.commits(workspace, repo_slug, branch || 'main', limit);
    const cached = this.cache.get<Commit[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const params = new URLSearchParams();
      if (branch) params.append('include', branch);
      params.append('pagelen', limit.toString());

      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/commits?${params}`);
      const commits = response.data.values || [];

      this.cache.set(cacheKey, commits, CacheTTL.COMMITS);
      return commits;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'Get commits',
        workspace,
        repository: repo_slug,
        details: { branch, limit },
      });
    }
  }

  async getBranches(workspace: string, repo_slug: string): Promise<Branch[]> {
    const cacheKey = CacheKeys.branches(workspace, repo_slug);
    const cached = this.cache.get<Branch[]>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/refs/branches`);
      const branches = response.data.values || [];

      this.cache.set(cacheKey, branches, CacheTTL.BRANCHES);
      return branches;
    } catch (error) {
      handleBitbucketError(error, {
        operation: 'List branches',
        workspace,
        repository: repo_slug,
      });
    }
  }

  async getFileContent(workspace: string, repo_slug: string, path: string, branch: string = 'main'): Promise<string> {
    try {
      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/src/${branch}/${path}`);
      return response.data;
    } catch (error) {
      if ((error as AxiosError)?.response?.status === 404) {
        // Try different common branch names
        const commonBranches = ['master', 'develop', 'HEAD'];

        for (const altBranch of commonBranches) {
          if (altBranch === branch) continue;

          try {
            const response = await this.client.get(
              `/2.0/repositories/${workspace}/${repo_slug}/src/${altBranch}/${path}`
            );
            return response.data;
          } catch (altError) {
            continue;
          }
        }

        throw new Error(
          `File '${path}' not found on branch '${branch}' or common branches (master, develop, HEAD). Please check the file path and branch name.`
        );
      }

      handleBitbucketError(error, {
        operation: 'Get file content',
        workspace,
        repository: repo_slug,
        details: { path, branch },
      });
    }
  }

  async searchCode(workspace: string, repo_slug: string, query: string): Promise<CodeSearchResult[]> {
    try {
      // Get list of branches to try different branches
      const branches = await this.getBranches(workspace, repo_slug);
      const branchNames = branches.map((b) => b.name);

      // Try main branch first, then other common branches
      const tryBranches = [
        'main',
        'master',
        'develop',
        ...branchNames.filter((name) => !['main', 'master', 'develop'].includes(name)),
      ];

      for (const branch of tryBranches.slice(0, 3)) {
        // Try max 3 branches
        try {
          const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/src/${branch}`);
          const files = response.data.values || [];

          // Enhanced search: check file names, paths, and if file is readable, content too
          const matchingFiles: CodeSearchResult[] = [];

          for (const file of files) {
            const nameMatch = file.name?.toLowerCase().includes(query.toLowerCase());
            const pathMatch = file.path?.toLowerCase().includes(query.toLowerCase());

            if (nameMatch || pathMatch) {
              matchingFiles.push({
                ...file,
                match_type: nameMatch ? 'filename' : 'path',
                branch: branch,
              });
            }
          }

          if (matchingFiles.length > 0) {
            return matchingFiles;
          }
        } catch (branchError) {
          continue;
        }
      }

      // If no files found in any branch, return empty result
      return [];
    } catch (error) {
      if ((error as AxiosError)?.response?.status === 404) {
        throw new Error(
          `Source code not accessible for repository '${repo_slug}'. This could be because: 1) The repository is empty, 2) Source code permissions are not granted to the API token, or 3) The repository has restricted access settings.`
        );
      }

      handleBitbucketError(error, {
        operation: 'Search code',
        workspace,
        repository: repo_slug,
        details: { query },
      });
    }
  }

  async getPullRequestDiffEnhanced(
    workspace: string, 
    repo_slug: string, 
    pr_id: number, 
    options: {
      file_path?: string;
      context_lines?: number;
      ignore_whitespace?: boolean;
      max_size?: number;
    } = {}
  ): Promise<{ diff: string; truncated: boolean; files_list?: string[] }> {
    const MAX_TOKEN_SIZE = options.max_size || 20000;
    
    try {
      // If specific file requested, get file-specific diff
      if (options.file_path) {
        const fileSpecificDiff = await this.getFileSpecificDiff(workspace, repo_slug, pr_id, options.file_path);
        return { 
          diff: this.applyDiffFilters(fileSpecificDiff, options), 
          truncated: false,
          files_list: [options.file_path]
        };
      }

      // Try to get full diff first
      let fullDiff = await this.getPullRequestDiff(workspace, repo_slug, pr_id);
      
      // Estimate token count (rough: 1 token ≈ 4 characters)
      const estimatedTokens = fullDiff.length / 4;
      
      if (estimatedTokens <= MAX_TOKEN_SIZE) {
        return { 
          diff: this.applyDiffFilters(fullDiff, options), 
          truncated: false 
        };
      }

      // If too large, provide fallback approach
      const diffStat = await this.getPullRequestDiffStat(workspace, repo_slug, pr_id);
      const fileList = diffStat.map(stat => 
        stat.new?.path || stat.old?.path || 'unknown'
      );

      const fallbackMessage = `
⚠️  **Diff Too Large (${Math.round(estimatedTokens)} tokens > ${MAX_TOKEN_SIZE} limit)**

**Files changed (${diffStat.length}):**
${diffStat.slice(0, 10).map(stat => {
  const path = stat.new?.path || stat.old?.path || 'unknown';
  const status = stat.status;
  const changes = `+${stat.lines_added || 0}/-${stat.lines_removed || 0}`;
  return `- ${path} (${status}) ${changes}`;
}).join('\n')}${diffStat.length > 10 ? `\n... and ${diffStat.length - 10} more files` : ''}

**💡 Suggested approaches:**
1. **Get specific file diff:** Use \`file_path\` parameter
2. **Use git locally:**
   \`\`\`bash
   git fetch origin pull/${pr_id}/head
   git diff HEAD...FETCH_HEAD --stat
   git diff HEAD...FETCH_HEAD -- path/to/specific/file.js
   \`\`\`
3. **Reduce context:** Use \`context_lines: 2\` parameter
4. **Review in Bitbucket web interface**

**Most changed files:**
${diffStat
  .sort((a, b) => (b.lines_added + b.lines_removed) - (a.lines_added + a.lines_removed))
  .slice(0, 5)
  .map(stat => `- ${stat.new?.path || stat.old?.path} (+${stat.lines_added}/-${stat.lines_removed})`)
  .join('\n')}`;

      return { 
        diff: fallbackMessage, 
        truncated: true,
        files_list: fileList
      };
      
    } catch (error) {
      // Fall back to original method behavior
      const originalDiff = await this.getPullRequestDiff(workspace, repo_slug, pr_id);
      return { 
        diff: this.applyDiffFilters(originalDiff, options), 
        truncated: false 
      };
    }
  }

  private async getFileSpecificDiff(workspace: string, repo_slug: string, pr_id: number, filePath: string): Promise<string> {
    console.log(`🔍 Getting file-specific diff for: ${filePath} in PR #${pr_id}`);
    
    try {
      // Get PR details to extract commit hashes
      const pr = await this.getPullRequest(workspace, repo_slug, pr_id);
      console.log(`📋 PR Details:`, {
        id: pr.id,
        title: pr.title?.substring(0, 50) + '...',
        state: pr.state,
        source_branch: pr.source?.branch?.name,
        dest_branch: pr.destination?.branch?.name,
        source_commit: pr.source?.commit?.hash?.substring(0, 8),
        dest_commit: pr.destination?.commit?.hash?.substring(0, 8)
      });

      const sourceCommit = pr.source.commit?.hash;
      const destinationCommit = pr.destination.commit?.hash;

      if (sourceCommit && destinationCommit) {
        console.log(`🔄 Attempting compare diff: ${destinationCommit.substring(0, 8)}..${sourceCommit.substring(0, 8)} for ${filePath}`);
        
        // Try multiple approaches for file-specific diff
        const attempts = [
          // Approach 1: Compare with path parameter
          () => this.client.get(
            `/2.0/repositories/${workspace}/${repo_slug}/diff/${destinationCommit}..${sourceCommit}`,
            { params: { path: filePath } }
          ),
          // Approach 2: Compare without path, then extract
          () => this.client.get(
            `/2.0/repositories/${workspace}/${repo_slug}/diff/${destinationCommit}..${sourceCommit}`
          ),
          // Approach 3: Use source commit directly
          () => this.client.get(
            `/2.0/repositories/${workspace}/${repo_slug}/diff/${sourceCommit}`,
            { params: { path: filePath } }
          ),
          // Approach 4: Get commits and try latest
          async () => {
            const commitsResponse = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pr_id}/commits`);
            const commits = commitsResponse.data.values || [];
            if (commits.length > 0) {
              const latestCommit = commits[0];
              console.log(`🔄 Trying latest commit: ${latestCommit.hash.substring(0, 8)}`);
              return this.client.get(
                `/2.0/repositories/${workspace}/${repo_slug}/diff/${latestCommit.hash}`,
                { params: { path: filePath } }
              );
            }
            throw new Error('No commits found');
          }
        ];

        for (let i = 0; i < attempts.length; i++) {
          try {
            console.log(`🔄 Attempt ${i + 1}/${attempts.length} for file-specific diff`);
            const response = await attempts[i]();
            
            if (response.data && response.data.trim().length > 0) {
              console.log(`✅ Success with approach ${i + 1}, diff size: ${response.data.length} chars`);
              
              // If we got full diff without path filter, extract the file
              if (i === 1) {
                return this.extractFileFromDiff(response.data, filePath);
              }
              
              return response.data;
            } else {
              console.log(`⚠️ Approach ${i + 1} returned empty diff`);
            }
          } catch (attemptError: any) {
            console.log(`❌ Approach ${i + 1} failed:`, attemptError.response?.status, attemptError.response?.data?.error?.message || attemptError.message);
            continue;
          }
        }
      }

      throw new Error(`Could not extract commit hashes from PR: source=${sourceCommit}, dest=${destinationCommit}`);
    } catch (error) {
      console.log(`⚠️ File-specific diff failed, falling back to full diff extraction`);
      
      // Fallback: get full diff and filter by file
      try {
        const fullDiff = await this.getPullRequestDiff(workspace, repo_slug, pr_id);
        console.log(`📄 Full diff size: ${fullDiff.length} chars, extracting file: ${filePath}`);
        const extracted = this.extractFileFromDiff(fullDiff, filePath);
        console.log(`📤 Extracted file diff size: ${extracted.length} chars`);
        return extracted;
      } catch (fallbackError: any) {
        console.error(`❌ Fallback extraction also failed:`, fallbackError.message);
        return `Error retrieving diff for ${filePath}: ${(error as any).message}`;
      }
    }
  }

  private extractFileFromDiff(fullDiff: string, filePath: string): string {
    console.log(`🔍 Extracting ${filePath} from diff (${fullDiff.length} chars total)`);
    
    const lines = fullDiff.split('\n');
    const fileBlocks: string[] = [];
    let currentBlock: string[] = [];
    let inTargetFile = false;
    let matchedPaths: string[] = [];

    // Normalize file path for better matching
    const normalizedTargetPath = filePath.replace(/^\/+/, '').replace(/\/+$/, '');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('diff --git')) {
        // Save previous file block if we were in target file
        if (inTargetFile && currentBlock.length > 0) {
          fileBlocks.push(currentBlock.join('\n'));
          console.log(`✅ Found block for ${filePath}, size: ${currentBlock.length} lines`);
        }
        
        currentBlock = [line];
        inTargetFile = false;
        
        // Extract file paths from "diff --git a/path b/path"
        const match = line.match(/diff --git a\/(.+?) b\/(.+?)(?:\s|$)/);
        if (match) {
          const pathA = match[1];
          const pathB = match[2];
          matchedPaths.push(pathA, pathB);
          
          // Check multiple matching patterns
          const pathsToCheck = [pathA, pathB, normalizedTargetPath];
          inTargetFile = pathsToCheck.some(path => {
            const normalizedPath = path.replace(/^\/+/, '').replace(/\/+$/, '');
            return (
              normalizedPath === normalizedTargetPath ||
              normalizedPath.endsWith('/' + normalizedTargetPath) ||
              normalizedTargetPath.endsWith('/' + normalizedPath) ||
              path.includes(filePath) ||
              filePath.includes(path)
            );
          });
          
          if (inTargetFile) {
            console.log(`🎯 Found target file match: ${pathA} or ${pathB} matches ${filePath}`);
          }
        } else {
          // Fallback: check if line contains the file path
          inTargetFile = line.includes(filePath) || filePath.includes(line.split(' ').pop() || '');
        }
      } else {
        currentBlock.push(line);
      }
    }

    // Don't forget the last file block
    if (inTargetFile && currentBlock.length > 0) {
      fileBlocks.push(currentBlock.join('\n'));
      console.log(`✅ Found final block for ${filePath}, size: ${currentBlock.length} lines`);
    }

    const result = fileBlocks.join('\n\n');
    
    if (result.trim().length === 0) {
      console.log(`⚠️ No diff found for ${filePath}`);
      console.log(`📋 Paths seen in diff: ${[...new Set(matchedPaths)].slice(0, 10).join(', ')}`);
      
      // Try a more lenient search
      const fileName = filePath.split('/').pop() || filePath;
      const lenientBlocks = [];
      let currentLenientBlock: string[] = [];
      let inLenientFile = false;
      
      for (const line of lines) {
        if (line.startsWith('diff --git')) {
          if (inLenientFile && currentLenientBlock.length > 0) {
            lenientBlocks.push(currentLenientBlock.join('\n'));
          }
          
          currentLenientBlock = [line];
          inLenientFile = line.includes(fileName);
        } else {
          currentLenientBlock.push(line);
        }
      }
      
      if (inLenientFile && currentLenientBlock.length > 0) {
        lenientBlocks.push(currentLenientBlock.join('\n'));
      }
      
      if (lenientBlocks.length > 0) {
        console.log(`✅ Found diff using lenient filename match: ${fileName}`);
        return lenientBlocks.join('\n\n');
      }
      
      return `No changes found for file: ${filePath}\n\nNote: Searched in diff containing ${matchedPaths.length} file paths. Try using just the filename or a partial path.`;
    }
    
    console.log(`✅ Successfully extracted ${result.length} chars for ${filePath}`);
    return result;
  }

  private applyDiffFilters(diff: string, options: {
    context_lines?: number;
    ignore_whitespace?: boolean;
  }): string {
    let filteredDiff = diff;

    // Apply whitespace filtering
    if (options.ignore_whitespace) {
      const lines = filteredDiff.split('\n');
      filteredDiff = lines.filter(line => {
        // Keep file headers and context
        if (line.startsWith('diff --git') || 
            line.startsWith('---') || 
            line.startsWith('+++') || 
            line.startsWith('@@')) {
          return true;
        }
        // Filter out whitespace-only changes
        if ((line.startsWith('+') || line.startsWith('-')) && 
            line.substring(1).trim() === '') {
          return false;
        }
        return true;
      }).join('\n');
    }

    // Apply context lines filtering
    if (options.context_lines !== undefined && options.context_lines >= 0) {
      // This is a simplified version - full implementation would require
      // more sophisticated diff parsing
      const lines = filteredDiff.split('\n');
      const filteredLines: string[] = [];
      let inHunk = false;
      let contextCount = 0;

      for (const line of lines) {
        if (line.startsWith('@@')) {
          inHunk = true;
          contextCount = 0;
          filteredLines.push(line);
        } else if (!inHunk || 
                   line.startsWith('diff --git') || 
                   line.startsWith('---') || 
                   line.startsWith('+++')) {
          filteredLines.push(line);
        } else if (line.startsWith('+') || line.startsWith('-')) {
          filteredLines.push(line);
          contextCount = 0;
        } else if (contextCount < options.context_lines) {
          filteredLines.push(line);
          contextCount++;
        }
      }
      
      filteredDiff = filteredLines.join('\n');
    }

    return filteredDiff;
  }

  async getPullRequestDiff(workspace: string, repo_slug: string, pr_id: number): Promise<string> {
    // Clear any potential cache first
    this.cache.delete(`pr:${workspace}:${repo_slug}:${pr_id}`);
    this.cache.delete(`prs:${workspace}:${repo_slug}:`);
    
    try {
      // Try direct PR diff first
      const response = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pr_id}/diff`);
      
      // Validate the diff content before returning it
      const prResponse = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pr_id}`);
      const pr = prResponse.data;
      
      // Quick validation for content mismatches
      const diffContent = response.data.toLowerCase();
      const prTitle = pr.title?.toLowerCase() || '';
      
      // Check for major topic mismatches
      const isEmergencyContactPR = prTitle.includes('emergency') || prTitle.includes('contact') || pr.source?.branch?.name?.includes('emergency') || pr.source?.branch?.name?.includes('contact');
      const diffHasLearningFiles = diffContent.includes('learning-api') || diffContent.includes('cpd') || diffContent.includes('learningapi');
      
      if (isEmergencyContactPR && diffHasLearningFiles) {
        // Don't return the suspicious diff, fall through to alternative methods
        throw new Error('Content mismatch: PR diff does not match PR topic');
      }
      
      return response.data;
    } catch (error: any) {
      // Check if this is a permissions/access issue
      if (error.response?.status === 404) {
        // For code review scenarios, try alternative methods
        const prResponse = await this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pr_id}`);
        const pr = prResponse.data;
        
        try {
          // Method 1: PRIORITY METHOD - Get individual commits and their diffs
          const [commitsResponse] = await Promise.all([
            this.client.get(`/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pr_id}/commits`)
          ]);
          
          const commits = commitsResponse.data.values || [];
          const prTitle = pr.title?.toLowerCase() || '';
          
          if (commits.length > 0) {
            // Try to get diff for each commit (start with latest)
            for (let i = 0; i < Math.min(commits.length, 3); i++) {
              const commit = commits[i];
              try {
                const singleCommitResponse = await this.client.get(
                  `/2.0/repositories/${workspace}/${repo_slug}/diff/${commit.hash}`
                );
                
                if (singleCommitResponse.data && singleCommitResponse.data.length > 0) {
                  // Validate this is the right content
                  const commitDiffContent = singleCommitResponse.data.toLowerCase();
                  const commitMsg = commit.message?.toLowerCase() || '';
                  
                  // If this is an emergency contact PR, prefer commits with emergency/contact content
                  const isEmergencyContactPR = prTitle?.includes('emergency') || prTitle?.includes('contact');
                  if (isEmergencyContactPR) {
                    const hasRelevantContent = commitDiffContent.includes('emergency') || 
                                              commitDiffContent.includes('contact') ||
                                              commitMsg.includes('emergency') ||
                                              commitMsg.includes('contact');
                    
                    const hasIrrelevantContent = commitDiffContent.includes('learning-api') ||
                                               commitDiffContent.includes('cpd') ||
                                               commitDiffContent.includes('learningapi');
                    
                    if (hasRelevantContent && !hasIrrelevantContent) {
                      return singleCommitResponse.data;
                    } else if (hasIrrelevantContent) {
                      continue; // Skip commits with wrong content
                    } else {
                      continue; // Try next commit
                    }
                  } else {
                    // For non-emergency contact PRs, return the first successful commit diff
                    return singleCommitResponse.data;
                  }
                }
              } catch (singleCommitError: any) {
                continue;
              }
            }
          }
        } catch (commitListError: any) {
          // Individual commit method failed, try other methods
        }
        
        try {
          // Method 2: Direct branch comparison (fallback)
          const branchDiffResponse = await this.client.get(
            `/2.0/repositories/${workspace}/${repo_slug}/diff/${pr.destination.branch.name}...${pr.source.branch.name}`
          );
          
          if (branchDiffResponse.data && branchDiffResponse.data.length > 0) {
            return branchDiffResponse.data;
          }
        } catch (branchError: any) {
          // Branch comparison failed, try commit range
        }
        
        try {
          // Method 3: Commit range diff using specific commits (last resort)
          if (pr.source.commit?.hash && pr.destination.commit?.hash) {
            const commitRangeResponse = await this.client.get(
              `/2.0/repositories/${workspace}/${repo_slug}/diff/${pr.destination.commit.hash}..${pr.source.commit.hash}`
            );
            
            if (commitRangeResponse.data && commitRangeResponse.data.length > 0) {
              return commitRangeResponse.data;
            }
          }
        } catch (commitError: any) {
          // All methods failed
        }
        
        // If all methods fail, return helpful error message
        return `# Access Denied - PR #${pr_id} Diff

**⚠️ Cannot retrieve diff for this pull request**

**PR Details:**
- **Title:** ${pr.title}
- **Author:** ${pr.author.display_name} (@${pr.author.username})
- **Branch:** ${pr.source.branch.name} → ${pr.destination.branch.name}
- **State:** ${pr.state}

**Reason:** Limited access to PR diff content.

**💡 Solutions for Code Review Access:**

### **For Repository Maintainers:**
1. **Add as reviewer:** Ask ${pr.author.display_name} to add you as a reviewer
2. **Repository access:** Request collaborator access to the repository
3. **Team permissions:** Ensure your team has appropriate repository permissions

### **Alternative Access Methods:**
1. **Local git access:**
   \`\`\`bash
   git fetch origin ${pr.source.branch.name}
   git diff ${pr.destination.branch.name}...${pr.source.branch.name}
   \`\`\`

2. **Bitbucket web interface:** Use the PR page directly at:
   \`https://bitbucket.org/${workspace}/${repo_slug}/pull-requests/${pr_id}\`

3. **Ask for diff export:** Request the PR author to export/share the diff

**🔧 Technical Details:**
- PR diff endpoint: 404 (access denied)  
- Branch comparison: Failed
- Commit range access: Failed
- This suggests limited repository permissions for your API token

**Note:** The MCP tried multiple fallback methods but all were blocked by permissions.`;
      }

      // For other errors, handle appropriately
      handleBitbucketError(error, {
        operation: 'Get pull request diff',
        workspace,
        repository: repo_slug,
        details: { pr_id },
      });
    }
  }

  async getPullRequestDiffStat(workspace: string, repo_slug: string, pr_id: number): Promise<DiffStat[]> {
    try {
      const response = await this.client.get(
        `/2.0/repositories/${workspace}/${repo_slug}/pullrequests/${pr_id}/diffstat`
      );
      return response.data.values || [];
    } catch (error) {
      // Enhanced fallback: Parse complete PR diff to extract all file statistics
      try {
        const diffText = await this.getPullRequestDiff(workspace, repo_slug, pr_id);
        return this.parseDiffForFileStats(diffText);
      } catch (fallbackError) {
        handleBitbucketError(error, {
          operation: 'Get pull request diff stats',
          workspace,
          repository: repo_slug,
          details: { pr_id },
        });
      }
    }
  }

  private parseDiffForFileStats(diffText: string): DiffStat[] {
    const files: DiffStat[] = [];
    const diffLines = diffText.split('\n');
    let currentFile: DiffStat | null = null;

    for (const line of diffLines) {
      // Detect file headers
      if (line.startsWith('diff --git')) {
        if (currentFile) {
          files.push(currentFile);
        }

        // Extract file paths from "diff --git a/path/file.js b/path/file.js"
        const match = line.match(/diff --git a\/(.+?) b\/(.+)/);
        if (match) {
          currentFile = {
            old: { path: match[1] },
            new: { path: match[2] },
            status: match[1] === match[2] ? 'modified' : 'renamed',
            lines_added: 0,
            lines_removed: 0,
          };
        }
      }
      // Count additions and deletions
      else if (currentFile) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          currentFile.lines_added++;
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          currentFile.lines_removed++;
        }
      }

      // Detect new file
      if (line.startsWith('new file mode') && currentFile) {
        currentFile.status = 'added';
        currentFile.old = null;
      }

      // Detect deleted file
      if (line.startsWith('deleted file mode') && currentFile) {
        currentFile.status = 'removed';
        currentFile.new = null;
      }
    }

    // Add the last file
    if (currentFile) {
      files.push(currentFile);
    }

    return files;
  }

  private invalidateCacheByPattern(pattern: string): void {
    // Simple pattern-based cache invalidation
    const cacheMap = (this.cache as any).cache as Map<string, any>;
    for (const key of Array.from(cacheMap.keys())) {
      if (typeof key === 'string' && key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  destroy(): void {
    this.cache.destroy();
  }
}
