import { sql } from '@vercel/postgres';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  try {
    const { email, pass } = req.body;
    if (!email || !pass) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Use "passwordHash" in quotes to match the column name
    const { rows } = await sql`
      SELECT * FROM users WHERE email = ${email} AND "passwordHash" = ${pass};
    `;
    
    if (rows.length > 0) {
      const user = rows[0];
      // Note: In a real app, we would generate and return a JWT here.
      // For this step, we just return the user object for simplicity.
      return res.status(200).json(user);
    } else {
      return res.status(401).json({ error: 'Invalid email or password' });
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
    return res.status(500).json({ error: errorMessage });
  }
}