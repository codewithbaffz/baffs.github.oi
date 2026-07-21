import http from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT || 5000);
const DB_PATH = process.env.SCHEDULFY_DB_PATH || path.resolve(process.cwd(), 'data', 'schedulfy.sqlite');

mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    token TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL,
    priority TEXT NOT NULL,
    due_date TEXT,
    tags TEXT,
    source TEXT,
    attachments TEXT,
    is_ai_generated INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT
  );
`);

const userColumns = db.prepare('PRAGMA table_info(users)').all();
if (!userColumns.some((col) => col.name === 'role')) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';");
}

const seedUser = db.prepare(`
  INSERT OR IGNORE INTO users (id, email, full_name, password_hash, token, role, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

seedUser.run(
  'user-1',
  'demo@schedulfy.com',
  'Demo User',
  hashPassword('password123'),
  null,
  'admin',
  new Date().toISOString()
);

const seedTasks = db.prepare(`
  INSERT OR IGNORE INTO tasks (id, user_id, title, description, status, priority, due_date, tags, source, attachments, is_ai_generated, completed_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

seedTasks.run(
  'task-1',
  'user-1',
  'Ship onboarding flow',
  'Finish the first-run experience and welcome copy.',
  'todo',
  'high',
  new Date().toISOString(),
  JSON.stringify(['work', 'product']),
  'manual',
  JSON.stringify([]),
  0,
  null,
  new Date().toISOString(),
  null
);

seedTasks.run(
  'task-2',
  'user-1',
  'Review sprint plan',
  'Check the team priorities before the standup.',
  'in_progress',
  'medium',
  new Date(Date.now() + 86400000).toISOString(),
  JSON.stringify(['planning']),
  'manual',
  JSON.stringify([]),
  0,
  null,
  new Date().toISOString(),
  null
);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

function hashPassword(password) {
  return createHash('sha256').update(password).digest('hex');
}

function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const row = db.prepare('SELECT * FROM users WHERE token = ?').get(token);
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role || 'member',
  };
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function toTaskPayload(row) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority,
    due_date: row.due_date,
    tags: row.tags ? JSON.parse(row.tags) : [],
    source: row.source || 'manual',
    attachments: row.attachments ? JSON.parse(row.attachments) : [],
    is_ai_generated: Boolean(row.is_ai_generated),
    completed_at: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUserPayload(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role || 'member',
    createdAt: row.created_at,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/health') {
    sendJson(res, 200, { ok: true, service: 'schedulfy-api' });
    return;
  }

  if (!pathname.startsWith('/api')) {
    sendJson(res, 404, { message: 'Not found' });
    return;
  }

  const segments = pathname.split('/').filter(Boolean);
  const apiSegments = segments.slice(1);

  if (apiSegments[0] === 'auth' && apiSegments[1] === 'login') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const email = String(body.email || '').toLowerCase();
      const passwordHash = hashPassword(String(body.password || ''));
      const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

      if (!row || row.password_hash !== passwordHash) {
        sendJson(res, 401, { message: 'Invalid email or password' });
        return;
      }

      const token = `sched-${randomUUID()}`;
      db.prepare('UPDATE users SET token = ? WHERE id = ?').run(token, row.id);
      sendJson(res, 200, {
        token,
        user: {
          id: row.id,
          email: row.email,
          full_name: row.full_name,
          role: row.role || 'member',
        },
      });
    } catch (error) {
      sendJson(res, 400, { message: error.message || 'Bad request' });
    }
    return;
  }

  if (apiSegments[0] === 'auth' && apiSegments[1] === 'register') {
    if (req.method !== 'POST') {
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }

    try {
      const body = await parseJsonBody(req);
      const email = String(body.email || '').toLowerCase();
      if (!email || !body.password) {
        sendJson(res, 400, { message: 'Email and password are required' });
        return;
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        sendJson(res, 409, { message: 'User already exists' });
        return;
      }

      const id = `user-${randomUUID()}`;
      const token = `sched-${randomUUID()}`;
      const fullName = String(body.full_name || email.split('@')[0]);
      db.prepare(`
        INSERT INTO users (id, email, full_name, password_hash, token, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, email, fullName, hashPassword(String(body.password)), token, new Date().toISOString());

      sendJson(res, 201, {
        token,
        user: {
          id,
          email,
          full_name: fullName,
          role: 'member',
        },
      });
    } catch (error) {
      sendJson(res, 400, { message: error.message || 'Bad request' });
    }
    return;
  }

  if (apiSegments[0] === 'auth' && apiSegments[1] === 'me') {
    if (req.method !== 'GET') {
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }

    const user = getUserFromRequest(req);
    if (!user) {
      sendJson(res, 401, { message: 'Authentication required' });
      return;
    }

    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    sendJson(res, 200, toUserPayload(row));
    return;
  }

  if (apiSegments[0] === 'users') {
    const currentUser = getUserFromRequest(req);
    if (!currentUser) {
      sendJson(res, 401, { message: 'Authentication required' });
      return;
    }

    const currentRow = db.prepare('SELECT * FROM users WHERE id = ?').get(currentUser.id);
    if (!currentRow || currentRow.role !== 'admin') {
      sendJson(res, 403, { message: 'Admin access required' });
      return;
    }

    if (req.method === 'GET' && apiSegments.length === 1) {
      const rows = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all();
      sendJson(res, 200, rows.map(toUserPayload));
      return;
    }

    const targetUserId = apiSegments[1];
    if (!targetUserId) {
      sendJson(res, 404, { message: 'User not found' });
      return;
    }

    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
    if (!targetUser) {
      sendJson(res, 404, { message: 'User not found' });
      return;
    }

    if (req.method === 'PUT') {
      try {
        const body = await parseJsonBody(req);
        const role = String(body.role || targetUser.role).toLowerCase();
        const fullName = String(body.full_name || targetUser.full_name);

        db.prepare('UPDATE users SET full_name = ?, role = ? WHERE id = ?').run(fullName, role, targetUserId);
        const updatedRow = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId);
        sendJson(res, 200, toUserPayload(updatedRow));
      } catch (error) {
        sendJson(res, 400, { message: error.message || 'Bad request' });
      }
      return;
    }

    if (req.method === 'DELETE') {
      if (targetUserId === currentUser.id) {
        sendJson(res, 400, { message: 'Admin cannot delete themselves' });
        return;
      }
      db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { message: 'Method not allowed' });
    return;
  }

  if (apiSegments[0] === 'tasks') {
    const user = getUserFromRequest(req);
    if (!user) {
      sendJson(res, 401, { message: 'Authentication required' });
      return;
    }

    if (req.method === 'GET') {
      const rows = db.prepare('SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
      sendJson(res, 200, rows.map(toTaskPayload));
      return;
    }

    if (req.method === 'POST') {
      try {
        const body = await parseJsonBody(req);
        const id = `task-${randomUUID()}`;
        const now = new Date().toISOString();
        db.prepare(`
          INSERT INTO tasks (id, user_id, title, description, status, priority, due_date, tags, source, attachments, is_ai_generated, completed_at, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          user.id,
          body.title || 'Untitled task',
          body.description || '',
          body.status || 'todo',
          body.priority || 'medium',
          body.due_date || null,
          JSON.stringify(body.tags || []),
          body.source || 'manual',
          JSON.stringify(body.attachments || []),
          Boolean(body.is_ai_generated) ? 1 : 0,
          body.completed_at || null,
          now,
          null
        );
        const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        sendJson(res, 201, toTaskPayload(row));
      } catch (error) {
        sendJson(res, 400, { message: error.message || 'Bad request' });
      }
      return;
    }

    const id = apiSegments[1];
    if (!id) {
      sendJson(res, 405, { message: 'Method not allowed' });
      return;
    }

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?').get(id, user.id);
    if (!existing) {
      sendJson(res, 404, { message: 'Task not found' });
      return;
    }

    if (req.method === 'PUT') {
      try {
        const body = await parseJsonBody(req);
        const updatedAt = new Date().toISOString();
        db.prepare(`
          UPDATE tasks
          SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, tags = ?, source = ?, attachments = ?, is_ai_generated = ?, completed_at = ?, updated_at = ?
          WHERE id = ? AND user_id = ?
        `).run(
          body.title ?? existing.title,
          body.description ?? existing.description,
          body.status ?? existing.status,
          body.priority ?? existing.priority,
          body.due_date ?? existing.due_date,
          JSON.stringify(body.tags ?? (existing.tags ? JSON.parse(existing.tags) : [])),
          body.source ?? existing.source,
          JSON.stringify(body.attachments ?? (existing.attachments ? JSON.parse(existing.attachments) : [])),
          body.is_ai_generated !== undefined ? (body.is_ai_generated ? 1 : 0) : existing.is_ai_generated,
          body.completed_at ?? existing.completed_at,
          updatedAt,
          id,
          user.id
        );
        const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
        sendJson(res, 200, toTaskPayload(row));
      } catch (error) {
        sendJson(res, 400, { message: error.message || 'Bad request' });
      }
      return;
    }

    if (req.method === 'DELETE') {
      db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?').run(id, user.id);
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  sendJson(res, 404, { message: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Schedulfy API listening on http://localhost:${PORT}`);
});
