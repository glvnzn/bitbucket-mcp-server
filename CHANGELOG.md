# Changelog

## [2.1.0] - 2025-08-07

### 🎯 **Major Enhancement: Code Review Reliability**
This release significantly improves the ability to retrieve pull request diffs for code review purposes, even when you're not the PR author.

### ✨ **Added**
- **Enhanced PR Diff Access**: Smart fallback methods for accessing colleague's PR diffs
- **Individual Commit Diff Priority**: Prioritizes working individual commit diff retrieval
- **Content Validation**: Prevents returning mismatched diff content
- **Comprehensive Error Handling**: Better error messages for access denied scenarios

### 🔧 **Changed**
- **Improved Fallback Logic**: Reorganized diff retrieval methods for better success rates
- **API Token Authentication**: Switched from app passwords to modern API tokens
- **Reduced Debug Logging**: Cleaner production output with less noise

### 🛡️ **Security**
- **Token Security**: Enhanced security practices and documentation
- **No Credential Storage**: Runtime configuration prevents credential persistence
- **Secure Defaults**: Production-ready configuration templates

### 🐛 **Fixed**
- **Wrong Diff Data**: Fixed issue where PR diffs returned incorrect file changes
- **Content Mismatch Detection**: Added validation to prevent returning wrong PR content
- **Access Denied Handling**: Better handling of permission-limited scenarios

### 📚 **Documentation**
- **SECURITY.md**: Comprehensive security guidelines
- **DEPLOYMENT.md**: Production deployment guide
- **Enhanced README**: Updated with code review workflow examples

### 🗂️ **Project Structure**
- **Clean Test Files**: Removed debug and test scripts from production
- **Production Templates**: Added `.env.example` and `mcp-server.json`
- **Enhanced Gitignore**: Better security practices for sensitive files

## [2.0.0] - Previous Release
- Initial API token support
- Enhanced error handling
- Modular architecture

## [1.x.x] - Legacy
- App password authentication (deprecated)
- Basic MCP functionality