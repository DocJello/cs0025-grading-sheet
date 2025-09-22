import { createUsersTable, seedUsers } from './db';

export const config = {
  runtime: 'edge',
};

// This function can be called once to set up the database.
// e.g., by sending a POST request to /api/setup
export default async function handler(request: Request) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method Not Allowed. Please use POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await createUsersTable();
    await seedUsers();
    return new Response(JSON.stringify({ message: 'Database setup successful.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return new Response(JSON.stringify({ error: 'Failed to set up database.', details: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
