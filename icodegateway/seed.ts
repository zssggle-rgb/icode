
import { db } from './server/db';
import { users, devices, sessions, auditLogs } from './server/db/schema';
import crypto from 'crypto';

async function seed() {
  console.log('Seeding database...');

  // Clear existing data
  await db.delete(auditLogs);
  await db.delete(sessions);
  await db.delete(devices);
  await db.delete(users);

  // Create Users
  const user1 = { id: 'u-alice', username: 'alice', password_hash: 'hash1', role: 'developer' };
  const user2 = { id: 'u-bob', username: 'bob', password_hash: 'hash2', role: 'admin' };
  
  await db.insert(users).values(user1).onConflictDoUpdate({ target: users.username, set: { id: user1.id } });
  await db.insert(users).values(user2).onConflictDoUpdate({ target: users.username, set: { id: user2.id } });

  // Create Devices
  const dev1 = { id: 'd-macbook', fingerprint: 'fp-alice-macbook', user_id: user1.id, status: 'active' };
  const dev2 = { id: 'd-windows', fingerprint: 'fp-bob-windows', user_id: user2.id, status: 'blocked' };

  await db.insert(devices).values(dev1).onConflictDoUpdate({ target: devices.fingerprint, set: { status: dev1.status } });
  await db.insert(devices).values(dev2).onConflictDoUpdate({ target: devices.fingerprint, set: { status: dev2.status } });

  // Create Audit Logs
  for (let i = 0; i < 5; i++) {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      request_id: crypto.randomUUID(),
      user_id: user1.id,
      device_id: dev1.id,
      action: 'chat_completion',
      prompt_summary: `Test prompt ${i}`,
      risk_level: i % 2 === 0 ? 'low' : 'medium',
      metadata: JSON.stringify({ context_files: i })
    });
  }

  console.log('Seeding complete.');
}

seed().catch(console.error);
