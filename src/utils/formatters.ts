/**
 * Response formatting utilities for consistent output
 */

import { Repository, PullRequest, Issue, Commit, Branch, CodeSearchResult, DiffStat, FilesChangedResponse } from '../client/types.js';

export function formatRepositoryList(repos: Repository[]): string {
  if (repos.length === 0) {
    return 'No repositories found matching the criteria.';
  }

  const repoList = repos
    .map(
      (repo) =>
        `**${repo.name}** ${repo.private ? '🔒' : '🌐'}\n` +
        `- Description: ${repo.description || 'No description'}\n` +
        `- Language: ${repo.language || 'Not specified'}\n` +
        `- Updated: ${new Date(repo.updated_on).toLocaleDateString()}\n` +
        `- Clone: ${repo.clone_links?.find((link) => link.name === 'https')?.href || 'N/A'}`
    )
    .join('\n\n');

  return `# Repositories (${repos.length} found)\n\n${repoList}`;
}

export function formatRepository(repo: Repository): string {
  return (
    `# ${repo.name} ${repo.private ? '🔒' : '🌐'}\n\n` +
    `**Full Name:** ${repo.full_name}\n` +
    `**Description:** ${repo.description || 'No description'}\n` +
    `**Language:** ${repo.language || 'Not specified'}\n` +
    `**Created:** ${new Date(repo.created_on).toLocaleDateString()}\n` +
    `**Updated:** ${new Date(repo.updated_on).toLocaleDateString()}\n\n` +
    `**Clone URLs:**\n${repo.clone_links?.map((link) => `- ${link.name}: ${link.href}`).join('\n') || 'Not available'}`
  );
}

export function formatPullRequestList(prs: PullRequest[]): string {
  if (prs.length === 0) {
    return 'No pull requests found matching the criteria.';
  }

  const prList = prs
    .map((pr) => {
      const stateEmoji = pr.state === 'OPEN' ? '🟢' : pr.state === 'MERGED' ? '🟣' : '🔴';
      const approvals = pr.participants.filter((p) => p.approved).length;

      return (
        `**#${pr.id}** ${stateEmoji} ${pr.title}\n` +
        `- Author: ${pr.author.display_name}\n` +
        `- Branch: ${pr.source.branch.name} → ${pr.destination.branch.name}\n` +
        `- Approvals: ${approvals}/${pr.participants.length}\n` +
        `- Updated: ${new Date(pr.updated_on).toLocaleDateString()}`
      );
    })
    .join('\n\n');

  return `# Pull Requests (${prs.length} found)\n\n${prList}`;
}

export function formatPullRequest(pr: PullRequest): string {
  const stateEmoji = pr.state === 'OPEN' ? '🟢' : pr.state === 'MERGED' ? '🟣' : '🔴';
  
  // Handle both old and new data structures
  const approvals = pr.reviewers?.filter((r) => r.approved) || pr.participants.filter((p) => p.approved);
  const pendingReviews = pr.reviewers?.filter((r) => !r.approved) || pr.participants.filter((p) => !p.approved);

  return (
    `# Pull Request #${pr.id} ${stateEmoji}\n\n` +
    `**Title:** ${pr.title}\n` +
    `**State:** ${pr.state}\n` +
    `**Author:** ${pr.author.display_name} (@${pr.author.username})\n` +
    `**Branch:** ${pr.source.branch.name} → ${pr.destination.branch.name}\n` +
    `**Created:** ${new Date(pr.created_on).toLocaleDateString()}\n` +
    `**Updated:** ${new Date(pr.updated_on).toLocaleDateString()}\n\n` +
    `**Description:**\n${pr.description || 'No description provided'}\n\n` +
    `**Approvals (${approvals.length}):**\n${approvals.map((p) => `✅ ${p.display_name || ('user' in p ? p.user?.display_name : '')}`).join('\n') || 'None'}\n\n` +
    `**Pending Reviews (${pendingReviews.length}):**\n${pendingReviews.map((p) => `⏳ ${p.display_name || ('user' in p ? p.user?.display_name : '')}`).join('\n') || 'None'}` +
    (pr.merge_commit ? `\n\n**Merge Commit:** ${pr.merge_commit.hash}` : '')
  );
}

export function formatIssueList(issues: Issue[]): string {
  if (issues.length === 0) {
    return 'No issues found matching the criteria.';
  }

  const issueList = issues
    .map((issue) => {
      const priorityEmoji =
        {
          blocker: '🚨',
          critical: '🔴',
          major: '🟠',
          minor: '🟡',
          trivial: '⚪',
        }[issue.priority] || '⚪';

      const kindEmoji =
        {
          bug: '🐛',
          enhancement: '✨',
          proposal: '💡',
          task: '📋',
        }[issue.kind] || '📋';

      return (
        `**#${issue.id}** ${priorityEmoji} ${kindEmoji} ${issue.title}\n` +
        `- State: ${issue.state}\n` +
        `- Reporter: ${issue.reporter.display_name}\n` +
        `- Assignee: ${issue.assignee?.display_name || 'Unassigned'}\n` +
        `- Updated: ${new Date(issue.updated_on).toLocaleDateString()}`
      );
    })
    .join('\n\n');

  return `# Issues (${issues.length} found)\n\n${issueList}`;
}

export function formatIssue(issue: Issue): string {
  const priorityEmoji =
    {
      blocker: '🚨',
      critical: '🔴',
      major: '🟠',
      minor: '🟡',
      trivial: '⚪',
    }[issue.priority] || '⚪';

  const kindEmoji =
    {
      bug: '🐛',
      enhancement: '✨',
      proposal: '💡',
      task: '📋',
    }[issue.kind] || '📋';

  return (
    `# Issue #${issue.id} ${priorityEmoji} ${kindEmoji}\n\n` +
    `**Title:** ${issue.title}\n` +
    `**State:** ${issue.state}\n` +
    `**Kind:** ${issue.kind}\n` +
    `**Priority:** ${issue.priority}\n` +
    `**Reporter:** ${issue.reporter.display_name}\n` +
    `**Assignee:** ${issue.assignee?.display_name || 'Unassigned'}\n` +
    `**Created:** ${new Date(issue.created_on).toLocaleDateString()}\n` +
    `**Updated:** ${new Date(issue.updated_on).toLocaleDateString()}\n\n` +
    `**Description:**\n${issue.content?.raw || 'No description provided'}`
  );
}

export function formatCommitList(commits: Commit[], branch?: string): string {
  if (commits.length === 0) {
    return 'No commits found.';
  }

  const commitList = commits
    .map(
      (commit) =>
        `**${commit.hash.substring(0, 8)}** ${commit.message.split('\n')[0]}\n` +
        `- Author: ${commit.author.raw}\n` +
        `- Date: ${new Date(commit.date).toLocaleDateString()}`
    )
    .join('\n\n');

  return `# Commits (${commits.length} found)\n${branch ? `\n**Branch:** ${branch}\n` : ''}\n${commitList}`;
}

export function formatBranchList(branches: Branch[]): string {
  if (branches.length === 0) {
    return 'No branches found.';
  }

  const branchList = branches.map((branch) => `**${branch.name}** - ${branch.target.hash.substring(0, 8)}`).join('\n');

  return `# Branches (${branches.length} found)\n\n${branchList}`;
}

export function formatFileContent(path: string, content: string, branch: string = 'main'): string {
  return `# File: ${path}\n**Branch:** ${branch}\n\n\`\`\`\n${content}\n\`\`\``;
}

export function formatCodeSearchResults(results: CodeSearchResult[], query: string): string {
  if (results.length === 0) {
    return `No code found matching query: "${query}"`;
  }

  const resultList = results
    .map(
      (result) =>
        `**${result.path || result.name}**\n- Type: ${result.type}\n- Size: ${result.size || 'N/A'} bytes\n- Match: ${result.match_type}\n- Branch: ${result.branch}`
    )
    .join('\n\n');

  return `# Code Search Results (${results.length} found)\n**Query:** "${query}"\n\n${resultList}`;
}

export function formatPullRequestDiff(pr_id: number, diff: string): string {
  return `# Pull Request #${pr_id} - Code Changes\n\n\`\`\`diff\n${diff}\n\`\`\``;
}

export function formatPullRequestFiles(pr_id: number, files: DiffStat[]): string {
  if (files.length === 0) {
    return `# Pull Request #${pr_id} - No Files Changed\n\nNo file changes found for this pull request.`;
  }

  const fileList = files
    .map((file) => {
      const status =
        file.status === 'added' ? '✅' : file.status === 'removed' ? '❌' : file.status === 'modified' ? '📝' : '🔄';
      const path = file.old?.path || file.new?.path || 'Unknown';
      const changes = `+${file.lines_added || 0} -${file.lines_removed || 0}`;

      return `${status} **${path}** (${file.status})\n   ${changes} lines`;
    })
    .join('\n\n');

  const totalAdded = files.reduce((sum, file) => sum + (file.lines_added || 0), 0);
  const totalRemoved = files.reduce((sum, file) => sum + (file.lines_removed || 0), 0);

  return (
    `# Pull Request #${pr_id} - Files Changed (${files.length})\n\n` +
    `**Summary:** +${totalAdded} -${totalRemoved} lines across ${files.length} files\n\n${fileList}`
  );
}

// New formatter that matches the actual MCP output structure
export function formatFilesChangedResponse(pr_id: number, data: FilesChangedResponse): string {
  if (data.files.length === 0) {
    return `# Pull Request #${pr_id} - No Files Changed\n\nNo file changes found for this pull request.`;
  }

  const fileList = data.files
    .map((file) => {
      const status =
        file.type === 'added' ? '✅' : file.type === 'removed' ? '❌' : file.type === 'modified' ? '📝' : '🔄';
      const changes = `+${file.lines_added} -${file.lines_removed}`;

      return `${status} **${file.file}** (${file.type})\n   ${changes} lines`;
    })
    .join('\n\n');

  return (
    `# Pull Request #${pr_id} - Files Changed (${data.summary.total_files})\n\n` +
    `**Summary:** +${data.summary.total_additions} -${data.summary.total_deletions} lines across ${data.summary.total_files} files\n\n${fileList}`
  );
}

export function formatSuccessMessage(type: string, data: any): string {
  switch (type) {
    case 'pull-request-created':
      return (
        `✅ Pull request created successfully!\n\n` +
        `**#${data.id}** ${data.title}\n` +
        `**Branch:** ${data.source.branch.name} → ${data.destination.branch.name}\n` +
        `**Author:** ${data.author.display_name}\n` +
        `**Reviewers:** ${data.reviewers?.join(', ') || 'None assigned'}`
      );

    case 'issue-created': {
      const priorityEmojiMap = {
        blocker: '🚨',
        critical: '🔴',
        major: '🟠',
        minor: '🟡',
        trivial: '⚪',
      } as const;
      const priorityEmoji = priorityEmojiMap[data.priority as keyof typeof priorityEmojiMap] || '⚪';

      const kindEmojiMap = {
        bug: '🐛',
        enhancement: '✨',
        proposal: '💡',
        task: '📋',
      } as const;
      const kindEmoji = kindEmojiMap[data.kind as keyof typeof kindEmojiMap] || '📋';

      return (
        `✅ Issue created successfully!\n\n` +
        `**#${data.id}** ${priorityEmoji} ${kindEmoji} ${data.title}\n` +
        `**Kind:** ${data.kind}\n` +
        `**Priority:** ${data.priority}\n` +
        `**Assignee:** ${data.assignee?.display_name || 'Unassigned'}`
      );
    }

    case 'bitbucket-configured':
      return (
        `✅ Bitbucket configured successfully with API token!\n\n` +
        `**Base URL:** ${data.baseUrl}\n` +
        `**Email:** ${data.email}\n` +
        `**API Token:** ${data.apiToken.substring(0, 25)}...\n` +
        `**Workspace:** ${data.workspace || 'Not set'}\n\n` +
        `🔒 Using modern API token authentication (future-proof for 2025-2026 transition)`
      );

    default:
      return `✅ Operation completed successfully!`;
  }
}
