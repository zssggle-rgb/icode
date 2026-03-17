import { AclService } from './acl';

export class LeakageService {
  // Mock patterns mapping content to repo source
  private static patterns = [
    { pattern: 'SECRET_CODE_FROM_REPO_A', repo: 'repo_a' },
    { pattern: 'SECRET_CODE_FROM_REPO_B', repo: 'repo_b' }
  ];

  static check(content: string, userId: string): { detected: boolean; source?: string; reason?: string } {
    for (const p of this.patterns) {
      if (content.includes(p.pattern)) {
        // Check if user has access to this repo
        const hasAccess = AclService.checkPermission(userId, p.repo);
        if (!hasAccess) {
          return {
            detected: true,
            source: p.repo,
            reason: `Content contains confidential code from ${p.repo} which user ${userId} cannot access.`
          };
        }
      }
    }
    return { detected: false };
  }
}
