# Security Policy

## Reporting a vulnerability

The Ark Git Compare maintainers take security seriously. If you believe you
have found a security vulnerability in the extension, please report it
**privately** so we can address it before public disclosure.

### How to report

**Do NOT** open a public GitHub issue for security vulnerabilities.

Instead, use one of the following channels:

1. **Preferred** — GitHub Security Advisories:
   [Report a vulnerability](https://github.com/Tooark/vscode-ark-git-compare/security/advisories/new)
2. **Email** — `security@tooark.com` (PGP key available on request)

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce (proof of concept if possible)
- The affected extension version(s)
- Your VS Code version and operating system
- Your name / handle for credit (optional)

### What to expect

| Milestone                            | Target time                                             |
| ------------------------------------ | ------------------------------------------------------- |
| Acknowledgment of report             | Within **72 hours**                                     |
| Initial triage & severity assessment | Within **5 business days**                              |
| Fix and coordinated disclosure plan  | Within **30 days** (may be extended for complex issues) |
| Public advisory (if applicable)      | After a fixed release is published                      |

We follow the principles of
[Coordinated Vulnerability Disclosure (CVD)](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure).

## Supported versions

Only the **latest published version** of the extension receives security fixes.

| Version                    | Supported      |
| -------------------------- | -------------- |
| Latest Marketplace release | ✅             |
| Pre-release / older builds | ❌             |

Always update to the latest Marketplace or Open VSX release before reporting a
bug or vulnerability.

## Scope

In scope:

- Vulnerabilities in Ark Git Compare extension code
- Supply-chain issues in Ark Git Compare's declared dependencies
- Unsafe handling of repository content in the diff webview (e.g. HTML
  injection through file contents or commit messages)
- Unsafe execution of Git commands (e.g. argument or command injection through
  branch names, refs, or paths)

Out of scope:

- Vulnerabilities in VS Code itself (report to Microsoft)
- Vulnerabilities in third-party extensions installed alongside Ark Git Compare
- Vulnerabilities in Git itself (report upstream), unless Ark Git Compare
  invokes it unsafely
- Social engineering, physical attacks, and denial of service

## Safe harbor

We support security research conducted in good faith. If you follow this policy,
we will:

- Not pursue legal action against you
- Work with you to understand and resolve the issue
- Publicly credit you (if you wish) in the security advisory

## Bounties

Ark Git Compare is an open-source project maintained by volunteers. **No
monetary bounty program is currently offered**, but we deeply appreciate
responsible disclosure and will credit reporters publicly.
