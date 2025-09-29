const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3001;

// Setup PostgreSQL connection pool
// Render provides the DATABASE_URL environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Middleware
// FIX: "Failed to fetch" errors are almost always a Cross-Origin Resource Sharing (CORS) issue.
// This simplifies the CORS setup to be more permissive, allowing your frontend to connect from any origin.
// For a production environment, you should tighten this by using a whitelist of your specific frontend URLs.
app.use(cors());
app.use(express.json()); // To parse JSON bodies

// API routes
// Helper for consistent error responses
const sendError = (res, message, status = 500) => {
    console.error(message);
    res.status(status).json({ error: message });
};

// --- AUTH ---
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    if (!email || !pass) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND "passwordHash" = $2',
            [email, pass]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        sendError(res, `Database query failed: ${err.message}`);
    }
});


// --- USERS ---
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        sendError(res, `Database query failed: ${err.message}`);
    }
});

app.post('/api/users', async (req, res) => {
    const { name, email, role, passwordHash } = req.body;
    const id = `u_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
        const result = await pool.query(
            'INSERT INTO users (id, name, email, role, "passwordHash") VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, name, email, role, passwordHash]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        sendError(res, `Failed to add user: ${err.message}`, 400);
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, passwordHash } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2, role = $3, "passwordHash" = $4 WHERE id = $5 RETURNING *',
            [name, email, role, passwordHash, id]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        sendError(res, `Failed to update user: ${err.message}`, 400);
    }
});

app.post('/api/users/:id/change-password', async (req, res) => {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    try {
        // First, get the user to verify the old password
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];
        if (user.passwordHash !== oldPassword) {
            return res.status(401).json({ error: 'Incorrect old password' });
        }

        // If old password is correct, update to the new one
        const updateResult = await pool.query(
            'UPDATE users SET "passwordHash" = $1 WHERE id = $2 RETURNING *',
            [newPassword, id]
        );
        
        res.json(updateResult.rows[0]);

    } catch (err) {
        sendError(res, `Failed to change password: ${err.message}`);
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        if (result.rowCount > 0) {
            res.status(204).send(); // No content
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        sendError(res, `Failed to delete user: ${err.message}`);
    }
});


// --- GRADE SHEETS ---
app.get('/api/gradesheets', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM grade_sheets ORDER BY "groupName"');
        res.json(result.rows);
    } catch (err) {
        sendError(res, `Database query failed: ${err.message}`);
    }
});

app.post('/api/gradesheets', async (req, res) => {
    const { groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status } = req.body;
    const id = `gs_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
        const result = await pool.query(
            'INSERT INTO grade_sheets (id, "groupName", proponents, "proposedTitles", "selectedTitle", program, date, venue, "panel1Id", "panel2Id", "panel1Grades", "panel2Grades", status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
            [id, groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        sendError(res, `Failed to add grade sheet: ${err.message}`, 400);
    }
});

app.put('/api/gradesheets/:id', async (req, res) => {
    const { id } = req.params;
    const { groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE grade_sheets SET "groupName" = $1, proponents = $2, "proposedTitles" = $3, "selectedTitle" = $4, program = $5, date = $6, venue = $7, "panel1Id" = $8, "panel2Id" = $9, "panel1Grades" = $10, "panel2Grades" = $11, status = $12 WHERE id = $13 RETURNING *',
            [groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status, id]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Grade sheet not found' });
        }
    } catch (err) {
        sendError(res, `Failed to update grade sheet: ${err.message}`, 400);
    }
});

app.delete('/api/gradesheets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM grade_sheets WHERE id = $1', [id]);
        if (result.rowCount > 0) {
            res.status(204).send(); // No content
        } else {
            res.status(404).json({ error: 'Grade sheet not found' });
        }
    } catch (err) {
        sendError(res, `Failed to delete grade sheet: ${err.message}`);
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Backend server is running on port ${port}`);
});