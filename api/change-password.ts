import { sql } from '@vercel/postgres';

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const { userId, oldPassword, newPassword } = await request.json();

        if (!userId || !oldPassword || !newPassword) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Specifically select the password hash to check it
        const { rows } = await sql`SELECT "passwordHash" FROM users WHERE id = ${userId};`;

        if (rows.length === 0) {
            return new Response(JSON.stringify({ error: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const user = rows[0];
        // The key should be camelCased because it was quoted in the CREATE TABLE statement
        if (user.passwordHash !== oldPassword) {
             return new Response(JSON.stringify({ error: 'Incorrect old password' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        await sql`UPDATE users SET "passwordHash" = ${newPassword} WHERE id = ${userId};`;
        
        return new Response(JSON.stringify({ message: 'Password updated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Change Password Error:', error);
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