import { sql } from '@vercel/postgres';
import { User } from '../types';

export default async function handler(req: any, res: any) {
  const { method, body, query } = req;

  try {
    switch (method) {
      case 'GET': {
        const users = await sql`SELECT * FROM users ORDER BY name;`;
        return res.status(200).json(users.rows);
      }

      case 'POST': {
        const newUser: Omit<User, 'id'> = body;
        const id = `u_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await sql`
          INSERT INTO users (id, name, email, role, "passwordHash")
          VALUES (${id}, ${newUser.name}, ${newUser.email}, ${newUser.role}, ${newUser.passwordHash});
        `;
        const result = await sql`SELECT * FROM users WHERE id = ${id};`;
        return res.status(201).json(result.rows[0]);
      }

      case 'PUT': {
        const user: User = body;
        await sql`
          UPDATE users
          SET name = ${user.name}, email = ${user.email}, role = ${user.role}, "passwordHash" = ${user.passwordHash}
          WHERE id = ${user.id};
        `;
        const result = await sql`SELECT * FROM users WHERE id = ${user.id};`;
        return res.status(200).json(result.rows[0]);
      }

      case 'DELETE': {
        const { id } = query;
        if (!id) {
          return res.status(400).json({ error: 'User ID is required' });
        }
        // req.query.id can be a string or an array of strings
        const userId = Array.isArray(id) ? id[0] : id;
        await sql`DELETE FROM users WHERE id = ${userId};`;
        return res.status(204).send(null);
      }

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error in /api/users:', error);
    
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
        // Provide a more helpful message for the most common setup error.
        if (error.message.includes('must be provided') || error.message.includes('is not configured')) {
            errorMessage = 'Database connection is not configured. Please ensure Vercel Postgres is set up and environment variables are linked to your project.';
        }
    }
    
    return res.status(500).json({ error: errorMessage });
  }
}