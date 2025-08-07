/**
 * Enhanced error handling utilities with detailed context and suggestions
 */

import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AxiosError } from 'axios';

export interface ErrorContext {
  operation: string;
  workspace?: string;
  repository?: string;
  details?: Record<string, any>;
}

export class EnhancedMcpError extends McpError {
  constructor(
    code: ErrorCode,
    message: string,
    public context?: ErrorContext,
    public suggestions?: string[]
  ) {
    super(code, message);
  }
}

export function createDetailedError(error: AxiosError, context: ErrorContext): EnhancedMcpError {
  const status = error.response?.status;
  const responseData = error.response?.data as any;
  const errorMessage = responseData?.error?.message || error.message;

  let suggestions: string[] = [];
  let mcpErrorCode = ErrorCode.InternalError;

  // Provide specific suggestions based on error status
  switch (status) {
    case 401:
      mcpErrorCode = ErrorCode.InvalidRequest;
      suggestions = [
        'Verify your API token is correct and not expired',
        'Check that your email matches your Atlassian account',
        'Ensure the API token has required scopes: Account:Read, Repositories:Read, Pull requests:Read',
        'Create a new API token at https://id.atlassian.com/manage-profile/security/api-tokens',
      ];
      break;

    case 403:
      mcpErrorCode = ErrorCode.InvalidRequest;
      suggestions = [
        'Check if your API token has sufficient permissions',
        'Verify you have access to the specified workspace/repository',
        'Ensure the API token includes required scopes for this operation',
        'Contact your workspace administrator if access is restricted',
      ];
      break;

    case 404:
      mcpErrorCode = ErrorCode.InvalidRequest;
      if (context.operation.includes('repository')) {
        suggestions = [
          'Verify the workspace and repository names are correct',
          'Check if the repository exists and is accessible',
          'Ensure you have read access to the repository',
        ];
      } else if (context.operation.includes('pull-request')) {
        suggestions = [
          'Verify the pull request ID is correct',
          'Check if the pull request exists in the specified repository',
          'Ensure the repository has pull requests enabled',
        ];
      } else if (context.operation.includes('issue')) {
        suggestions = [
          'Check if the issue tracker is enabled for this repository',
          'Verify the issue ID is correct',
          'Ensure you have access to view issues',
        ];
      } else {
        suggestions = [
          'Double-check all provided identifiers (workspace, repository, etc.)',
          'Verify the resource exists and is accessible',
        ];
      }
      break;

    case 429:
      mcpErrorCode = ErrorCode.InternalError;
      suggestions = [
        'You have exceeded the API rate limit',
        'Wait a few minutes before retrying',
        'Consider implementing exponential backoff in your requests',
      ];
      break;

    case 500:
    case 502:
    case 503:
      mcpErrorCode = ErrorCode.InternalError;
      suggestions = [
        'Bitbucket API is experiencing issues',
        'Try again in a few minutes',
        'Check Bitbucket status page for known issues',
      ];
      break;

    default:
      suggestions = [
        'Check the Bitbucket API documentation for this endpoint',
        'Verify all required parameters are provided',
        'Try again with different parameters if applicable',
      ];
  }

  const contextStr =
    context.workspace || context.repository
      ? ` (${[context.workspace, context.repository].filter(Boolean).join('/')})`
      : '';

  const message = `${context.operation}${contextStr}: ${errorMessage}`;

  return new EnhancedMcpError(mcpErrorCode, message, context, suggestions);
}

export function createGenericError(error: Error, context: ErrorContext): EnhancedMcpError {
  const suggestions = [
    'Check your network connection',
    'Verify all input parameters are correct',
    'Try the operation again',
  ];

  return new EnhancedMcpError(ErrorCode.InternalError, `${context.operation}: ${error.message}`, context, suggestions);
}

export function formatErrorForUser(error: EnhancedMcpError): string {
  let output = `❌ **Error:** ${error.message}\n`;

  if (error.context?.details) {
    output += `\n**Context:**\n`;
    for (const [key, value] of Object.entries(error.context.details)) {
      output += `- ${key}: ${value}\n`;
    }
  }

  if (error.suggestions && error.suggestions.length > 0) {
    output += `\n**Suggestions:**\n`;
    error.suggestions.forEach((suggestion, index) => {
      output += `${index + 1}. ${suggestion}\n`;
    });
  }

  return output;
}

export function handleBitbucketError(error: unknown, context: ErrorContext): never {
  if (error instanceof EnhancedMcpError) {
    throw error;
  }

  if (error instanceof McpError) {
    throw error;
  }

  if ((error as any)?.isAxiosError) {
    throw createDetailedError(error as AxiosError, context);
  }

  if (error instanceof Error) {
    throw createGenericError(error, context);
  }

  throw new EnhancedMcpError(ErrorCode.InternalError, `${context.operation}: Unknown error occurred`, context, [
    'Please try again or contact support if the issue persists',
  ]);
}
