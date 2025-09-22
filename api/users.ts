import { sql } from '@vercel/postgres';
import { User } from '../types';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  const { method } = request;

  try {
    switch (method) {
      case 'GET': {
        const users = await sql`SELECT * FROM users ORDER BY name;`;
        return new Response(JSON.stringify(users.rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      case 'POST': {
        const newUser: Omit<User, 'id'> = await request.json();
        const id = `u_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await sql`
          INSERT INTO users (id, name, email, role, "passwordHash")
          VALUES (${id}, ${newUser.name}, ${newUser.email}, ${newUser.role}, ${newUser.passwordHash});
        `;
        const result = await sql`SELECT * FROM users WHERE id = ${id};`;
        return new Response(JSON.stringify(result.rows[0]), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      case 'PUT': {
        const user: User = await request.json();
        await sql`
          UPDATE users
          SET name = ${user.name}, email = ${user.email}, role = ${user.role}, "passwordHash" = ${user.passwordHash}
          WHERE id = ${user.id};
        `;
        const result = await sql`SELECT * FROM users WHERE id = ${user.id};`;
        return new Response(JSON.stringify(result.rows[0]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      case 'DELETE': {
        const host = request.headers.get('host');
        const requestUrl = new URL(request.url, `https://${host}`);
        const id = requestUrl.searchParams.get('id');

        if (!id) {
          return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        await sql`DELETE FROM users WHERE id = ${id};`;
        return new Response(null, { status: 204 });
      }

      default:
        return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
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
    
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}