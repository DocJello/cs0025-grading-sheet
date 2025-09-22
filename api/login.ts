import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });
  }
  
  try {
    const { email, pass } = await request.json();
    if (!email || !pass) {
        return new Response(JSON.stringify({ error: 'Email and password are required' }), { status: 400 });
    }

    // Use "passwordHash" in quotes to match the column name
    const { rows } = await sql`
      SELECT * FROM users WHERE email = ${email} AND "passwordHash" = ${pass};
    `;
    
    if (rows.length > 0) {
      const user = rows[0];
      // Note: In a real app, we would generate and return a JWT here.
      // For this step, we just return the user object for simplicity.
      return new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    console.error('Login Error:', error);
    let errorMessage = 'An unknown error occurred.';
    if (error instanceof Error) {
        errorMessage = error.message;
        if (error.message.includes('must be provided') || error.message.includes('is not configured')) {
            errorMessage = 'Database connection is not configured. Please ensure Vercel Postgres is set up and environment variables are linked to your project.';
        }
    }
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}