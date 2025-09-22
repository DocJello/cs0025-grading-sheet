import { createUsersTable, seedUsers } from './db';

// This function can be called once to set up the database.
// e.g., by sending a POST request to /api/setup
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    await createUsersTable();
    await seedUsers();
    return res.status(200).json({ message: 'Database setup successful.' });
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return res.status(500).json({ error: 'Failed to set up database.', details: errorMessage });
  }
}