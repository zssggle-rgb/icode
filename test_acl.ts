import { AclService } from './icodegateway/server/services/acl';

console.log('Testing ACL Service...');

// Mock data:
// Users: alice (password_a), bob (password_b), admin (password_admin)
// Repos: repo_a (alice, admin), repo_b (bob, admin)

console.log('--- Authentication ---');
console.log('alice/password_a:', AclService.authenticate('alice', 'password_a')); // true
console.log('alice/wrong:', AclService.authenticate('alice', 'wrong')); // false
console.log('bob/password_b:', AclService.authenticate('bob', 'password_b')); // true

console.log('--- Authorization ---');
// repo_a: group_a (alice, admin) = rw, bob = (no access)
console.log('alice -> repo_a:', AclService.checkPermission('alice', 'repo_a')); // true
console.log('bob -> repo_a:', AclService.checkPermission('bob', 'repo_a')); // false (explicitly denied)
console.log('admin -> repo_a:', AclService.checkPermission('admin', 'repo_a')); // true

// repo_b: group_b (bob, admin) = rw, alice = (no access)
console.log('alice -> repo_b:', AclService.checkPermission('alice', 'repo_b')); // false
console.log('bob -> repo_b:', AclService.checkPermission('bob', 'repo_b')); // true

console.log('--- Non-existent Repo ---');
console.log('alice -> repo_c:', AclService.checkPermission('alice', 'repo_c')); // false (default deny)

console.log('--- Global Access ---');
// [/] admin = rw
console.log('admin -> /:', AclService.checkPermission('admin', 'root')); // true (via global rule if applicable, but my checkPermission logic checks specific repo then global)
// Wait, checkPermission takes (username, repoName).
// If I pass 'root' as repoName, it checks [root:/] which doesn't exist, then [/].
// So admin -> any repo should be true because of [/] admin = rw?
// Let's see:
// checkSection('any_repo:/') returns null.
// checkSection('/') returns 'rw' for admin.
// So yes, admin has global access.
console.log('admin -> repo_random:', AclService.checkPermission('admin', 'repo_random')); // true
