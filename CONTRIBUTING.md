# Contributing to AutoPin

Thank you for your interest in contributing to AutoPin! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow
- Follow best practices

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:

1. **Clear title** - Describe the bug briefly
2. **Description** - Detailed explanation of the issue
3. **Steps to reproduce** - How to recreate the bug
4. **Expected behavior** - What should happen
5. **Actual behavior** - What actually happens
6. **Environment** - OS, Node version, library version
7. **Code sample** - Minimal reproducible example
8. **Screenshots** - If applicable

### Suggesting Features

To suggest a new feature:

1. Check if the feature already exists
2. Search existing issues for similar requests
3. Create a new issue with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach
   - Any relevant examples

### Pull Requests

#### Before Submitting

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test your changes thoroughly
5. Update documentation if needed
6. Commit with clear messages

#### PR Guidelines

- **One feature per PR** - Keep PRs focused
- **Clear description** - Explain what and why
- **Link issues** - Reference related issues
- **Update docs** - Include documentation updates
- **Add examples** - If adding features, add examples
- **Test coverage** - Ensure code is tested

#### Commit Messages

Use clear, descriptive commit messages:

```
feat: Add video pin support
fix: Resolve login timeout issue
docs: Update API reference
refactor: Improve stealth utilities
test: Add tests for board operations
```

Prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting
- `refactor:` - Code restructuring
- `test:` - Testing
- `chore:` - Maintenance

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/autopin.git
   cd autopin
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install Playwright browsers**
   ```bash
   npx playwright install chromium
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Run examples**
   ```bash
   npm run example
   ```

### Project Structure

```
autopin/
├── src/
│   ├── PinterestClient.ts      # Main client
│   ├── types.ts                # TypeScript types
│   ├── index.ts                # Exports
│   ├── example.ts              # Examples
│   ├── quick-start.ts          # Quick start
│   └── utils/
│       └── stealth.ts          # Stealth utilities
├── package.json
├── tsconfig.json
├── README.md
├── CHANGELOG.md
└── CONTRIBUTING.md
```

### Coding Standards

#### TypeScript Style

- Use TypeScript for all code
- Define proper types and interfaces
- Avoid `any` when possible
- Use async/await for asynchronous code
- Handle errors appropriately

#### Naming Conventions

- **Classes**: PascalCase (`PinterestClient`)
- **Methods**: camelCase (`createPin`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- **Interfaces**: PascalCase (`PinData`)
- **Files**: kebab-case or PascalCase

#### Code Quality

- Write clean, readable code
- Add comments for complex logic
- Keep functions focused and small
- Follow DRY principle
- Use meaningful variable names

### Testing

When adding new features:

1. Test manually with real Pinterest account
2. Verify stealth features work
3. Check error handling
4. Test edge cases
5. Document any limitations

### Documentation

Update documentation for:

- New features
- API changes
- Configuration options
- Breaking changes
- Usage examples

Include:
- Clear descriptions
- Code examples
- Parameter types
- Return values
- Error cases

### Stealth Features

When modifying stealth features:

1. Test detection avoidance
2. Verify fingerprint randomization
3. Check human-like behavior
4. Test with various settings
5. Document detection risks

### Areas for Contribution

#### High Priority

- Error handling improvements
- Better logging system
- Performance optimizations
- More examples
- Test coverage

#### Medium Priority

- Video pin support
- Story creation
- Message sending
- Pin analytics
- Scheduled pinning

#### Nice to Have

- CLI tool
- Docker support
- Cloud deployment guides
- Integration with other services
- GUI interface

### Getting Help

If you need help:

1. Check the README and documentation
2. Search existing issues
3. Create a new issue with your question
4. Be specific and provide context

### Code Review Process

1. Submit PR with clear description
2. Wait for maintainer review
3. Address feedback promptly
4. Keep discussion respectful
5. Be patient with the process

### License

By contributing, you agree that your contributions will be licensed under the MIT License.

### Recognition

Contributors will be recognized in:
- README contributors section
- CHANGELOG for significant contributions
- GitHub contributors page

## Thank You!

Your contributions make AutoPin better for everyone. We appreciate your time and effort! 🙏

---

**Happy Contributing! 🚀**


