import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { userId, oldPassword, newPassword } = req.body;

        if (!userId || !oldPassword || !newPassword) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Specifically select the password hash to check it
        const { rows } = await sql`SELECT "passwordHash" FROM users WHERE id = ${userId};`;

        if (rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = rows[0];
        // The key should be camelCased because it was quoted in the CREATE TABLE statement
        if (user.passwordHash !== oldPassword) {
             return res.status(401).json({ error: 'Incorrect old password' });
        }

        await sql`UPDATE users SET "passwordHash" = ${newPassword} WHERE id = ${userId};`;
        
        return res.status(200).json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Change Password Error:', error);
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
            errorMessage = error.message;
             if (error.message.includes('must be provided') || error.message.includes('is not configured')) {
                errorMessage = 'Database connection is not configured. Please ensure Vercel Postgres is set up and environment variables are linked to your project.';
            }
        }
        return res.status(500).json({ error: errorMessage });
    }
}