import { sql } from '@vercel/postgres';
import { UserRole } from '../types';

export async function createUsersTable() {
  // Use "passwordHash" in quotes to preserve camelCase
  return sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      role VARCHAR(50) NOT NULL,
      "passwordHash" VARCHAR(255) NOT NULL
    );
  `;
}

export async function seedUsers() {
  const users = [
    { id: 'u1', name: 'Dr. Admin', email: 'admin@example.com', role: UserRole.ADMIN, passwordHash: '123' },
    { id: 'u2', name: 'Dr. Angelo C. Arguson', email: 'acarguson@feutech.edu.ph', role: UserRole.COURSE_ADVISER, passwordHash: '123' },
    { id: 'u3', name: 'Prof. Elisa V. Malasaga', email: 'evmalasaga@feutech.edu.ph', role: UserRole.COURSE_ADVISER, passwordHash: '123' },
    { id: 'u4', name: 'Dr. Beau Gray M. Habal', email: 'bmhabal@feutech.edu.ph', role: UserRole.PANEL, passwordHash: '123' },
    { id: 'u5', name: 'Mr. Jeneffer A. Sabonsolin', email: 'jasabonsolin@feutech.edu.ph', role: UserRole.PANEL, passwordHash: '123' },
    { id: 'u6', name: 'Dr. Shaneth C. Ambat', email: 'scambat@feutech.edu.ph', role: UserRole.PANEL, passwordHash: '123' },
  ];

  // Use ON CONFLICT DO NOTHING to avoid errors on subsequent runs
  const insertedUsers = await Promise.all(
    users.map(user => sql`
      INSERT INTO users (id, name, email, role, "passwordHash")
      VALUES (${user.id}, ${user.name}, ${user.email}, ${user.role}, ${user.passwordHash})
      ON CONFLICT (email) DO NOTHING;
    `)
  );
  return insertedUsers;
}
