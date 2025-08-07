/**
 * Simple in-memory cache with TTL support for frequently accessed data
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor(cleanupIntervalMs: number = 60000) {
    // Clean up expired entries every minute by default
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, cleanupIntervalMs);
  }

  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    // 5 minutes default TTL
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Cache key generators for consistent cache keys
export const CacheKeys = {
  repository: (workspace: string, repo_slug: string) => `repo:${workspace}:${repo_slug}`,
  repositories: (workspace: string, filters: string) => `repos:${workspace}:${filters}`,
  branches: (workspace: string, repo_slug: string) => `branches:${workspace}:${repo_slug}`,
  pullRequest: (workspace: string, repo_slug: string, pr_id: number) => `pr:${workspace}:${repo_slug}:${pr_id}`,
  pullRequests: (workspace: string, repo_slug: string, filters: string) => `prs:${workspace}:${repo_slug}:${filters}`,
  commits: (workspace: string, repo_slug: string, branch: string, limit: number) =>
    `commits:${workspace}:${repo_slug}:${branch}:${limit}`,
  tokenValidation: (email: string) => `token:${email}`,
};

// TTL constants (in milliseconds)
export const CacheTTL = {
  REPOSITORY: 300000, // 5 minutes
  REPOSITORIES: 180000, // 3 minutes
  BRANCHES: 600000, // 10 minutes
  PULL_REQUESTS: 60000, // 1 minute
  COMMITS: 300000, // 5 minutes
  TOKEN_VALIDATION: 3600000, // 1 hour
  FILE_CONTENT: 300000, // 5 minutes
} as const;
