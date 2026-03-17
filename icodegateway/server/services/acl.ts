import fs from 'fs';
import path from 'path';

const SVN_ROOT = '/Volumes/Lenovo PS9/abcwork/icode/svn_repos';
const PASSWD_FILE = path.join(SVN_ROOT, 'passwd');
const AUTHZ_FILE = path.join(SVN_ROOT, 'authz');

interface User {
  username: string;
  password?: string;
}

interface AuthzGroup {
  name: string;
  members: string[];
}

interface RepoAccess {
  [path: string]: {
    [userOrGroup: string]: string; // 'r', 'w', 'rw', ''
  }
}

export class AclService {
  private static parsePasswd(): Record<string, string> {
    try {
      const content = fs.readFileSync(PASSWD_FILE, 'utf-8');
      const lines = content.split('\n');
      const users: Record<string, string> = {};
      let inUsersSection = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '[users]') {
          inUsersSection = true;
          continue;
        }
        if (trimmed.startsWith('[') && trimmed !== '[users]') {
          inUsersSection = false;
        }
        if (inUsersSection && trimmed && !trimmed.startsWith('#')) {
          const [user, pass] = trimmed.split('=').map(s => s.trim());
          if (user && pass) {
            users[user] = pass;
          }
        }
      }
      return users;
    } catch (error) {
      console.error('Error reading passwd file:', error);
      return {};
    }
  }

  private static parseAuthz(): { groups: Record<string, string[]>, repos: RepoAccess } {
    try {
      const content = fs.readFileSync(AUTHZ_FILE, 'utf-8');
      const lines = content.split('\n');
      const groups: Record<string, string[]> = {};
      const repos: RepoAccess = {};
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          currentSection = trimmed.slice(1, -1);
          if (currentSection !== 'groups' && !repos[currentSection]) {
             // Handle repo sections like [repo_a:/] or [/]
             repos[currentSection] = {};
          }
          continue;
        }

        if (currentSection === 'groups') {
          const [group, membersStr] = trimmed.split('=').map(s => s.trim());
          if (group && membersStr) {
            groups[group] = membersStr.split(',').map(m => m.trim());
          }
        } else if (currentSection) {
          // Repo permission
          const [entity, perm] = trimmed.split('=').map(s => s.trim());
          if (entity) {
            repos[currentSection][entity] = perm || ''; // Empty perm means no access
          }
        }
      }
      return { groups, repos };
    } catch (error) {
      console.error('Error reading authz file:', error);
      return { groups: {}, repos: {} };
    }
  }

  static authenticate(username: string, password?: string): boolean {
    // If no password provided, assume already authenticated or trusted context (dev mode)
    // But for this task we want verification.
    if (!password) return false;
    const users = this.parsePasswd();
    return users[username] === password;
  }

  static checkPermission(username: string, repoName: string, path: string = '/'): boolean {
    const { groups, repos } = this.parseAuthz();
    
    // Construct section names to check
    // 1. [repoName:path]
    // 2. [repoName:/] if path is root
    // 3. [/] (global)
    
    // Simplify: just check [repoName:/] and [/] for now
    const sectionName = `${repoName}:/`;
    
    // Helper to check access in a specific section
    const checkSection = (section: string): string | null => {
      const permissions = repos[section];
      if (!permissions) return null;

      // 1. Check user specific
      if (permissions[username] !== undefined) {
        return permissions[username];
      }

      // 2. Check groups
      for (const [groupName, members] of Object.entries(groups)) {
        if (members.includes(username)) {
          const groupKey = `@${groupName}`;
          if (permissions[groupKey] !== undefined) {
            return permissions[groupKey];
          }
        }
      }

      // 3. Check * (everyone)
      if (permissions['*'] !== undefined) {
        return permissions['*'];
      }

      return null;
    };

    // Check specific repo first
    let access = checkSection(sectionName);
    if (access !== null) {
      return access.includes('r') || access.includes('w');
    }

    // Check global [/]
    access = checkSection('/');
    if (access !== null) {
       return access.includes('r') || access.includes('w');
    }
    
    // Default deny
    return false;
  }
}
