# Contributing to facebook-mcp-server

Thank you for your interest in contributing! This document outlines the process for contributing to this project.

## Code of Conduct

Be respectful and constructive in all interactions. We welcome contributors of all experience levels.

## How to Contribute

### Reporting Bugs

1. Check the [existing issues](https://github.com/gauravakash/facebook-mcp-server/issues) to avoid duplicates
2. Open a new issue with a descriptive title
3. Include:
   - Steps to reproduce the bug
   - Expected behavior
   - Actual behavior
   - Node.js version and OS
   - Any relevant error messages or logs

### Suggesting Features

1. Open an issue with the `enhancement` label
2. Describe the feature and the problem it solves
3. Include example usage if possible

### Submitting Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes** with clear, focused commits
4. **Test your changes** locally:
   ```bash
   cp .env.example .env
   # Fill in test credentials
   npm install
   npm run dev
   ```
5. **Commit** using conventional commit messages:
   - `feat: add new MCP tool for X`
   - `fix: handle error when Y`
   - `docs: update README for Z`
   - `chore: bump dependencies`
6. **Push** your branch and open a Pull Request against `main`
7. Fill in the PR description explaining what changed and why

## Development Setup

```bash
git clone https://github.com/gauravakash/facebook-mcp-server.git
cd facebook-mcp-server
npm install
cp .env.example .env
# Set your FB_PAGE_ACCESS_TOKEN and FB_PAGE_ID in .env
npm run dev
```

## Project Structure

```
facebook-mcp-server/
├── server.js          # All MCP tools, SSE transport, Express routes
├── package.json       # Dependencies and npm scripts
├── .env.example       # Environment variable template
├── .gitignore
├── railway.toml       # Railway deployment config
└── render.yaml        # Render deployment config
```

## Adding a New MCP Tool

All tools are defined inside the `buildMcpServer()` function in `server.js`. To add a new tool:

1. Add a new `mcp.tool(...)` call inside `buildMcpServer()`
2. Use `z.object(...)` for parameter validation with Zod
3. Use the `fbGet`, `fbPost`, or `fbDelete` helpers for API calls
4. Return `ok(...)` for success or `err(...)` for errors
5. Update the `tools` count in the health-check endpoint
6. Document the new tool in `README.md`

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
