// backend/server.js

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto'); // For password hashing and UUIDs

const app = express();
const port = process.env.PORT || 3001;

// --- CORS Configuration ---
// This is a critical security configuration.
const frontendUrl = process.env.FRONTEND_URL;

if (!frontendUrl) {
    console.error("FATAL ERROR: The FRONTEND_URL environment variable is not set.");
    console.error("The backend server will not start without knowing the frontend's origin for CORS security.");
    console.error("Please set this variable in your Render.com service configuration.");
    process.exit(1); // Exit with a failure code
}

console.log(`CORS is configured to allow requests from origin: ${frontendUrl}`);

const corsOptions = {
  origin: frontendUrl,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());


// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Simple password hashing function (for demonstration purposes)
// In a real production app, use bcrypt or argon2
const hashPassword = (password) => {
    if (!password) return null;
    return crypto.createHash('sha256').update(password).digest('hex');
};

// --- Database Initialization ---
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        role VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255) NOT NULL
      );
    `);

    // Create grade_sheets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS grade_sheets (
        id TEXT PRIMARY KEY,
        group_name VARCHAR(255) UNIQUE NOT NULL,
        proponents JSONB,
        proposed_titles JSONB,
        selected_title TEXT,
        program VARCHAR(50),
        date TEXT,
        venue TEXT,
        panel1_id UUID REFERENCES users(id) ON DELETE SET NULL,
        panel2_id UUID REFERENCES users(id) ON DELETE SET NULL,
        panel1_grades JSONB,
        panel2_grades JSONB,
        status VARCHAR(50)
      );
    `);

    // Seed default users if table is empty
    const res = await client.query('SELECT COUNT(*) FROM users');
    if (res.rows[0].count === '0') {
      const defaultUsers = [
        { name: 'Admin User', email: 'admin@example.com', role: 'Admin', pass: '123' },
        { name: 'Course Adviser', email: 'adviser@example.com', role: 'Course Adviser', pass: '123' },
        { name: 'Panel One', email: 'panel1@example.com', role: 'Panel', pass: '123' },
        { name: 'Panel Two', email: 'panel2@example.com', role: 'Panel', pass: '123' },
      ];
      for (const user of defaultUsers) {
        await client.query(
          'INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4)',
          [user.name, user.email, user.role, hashPassword(user.pass)]
        );
      }
      console.log('Default users seeded.');
    }

    await client.query('COMMIT');
    console.log('Database initialized successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error initializing database:', e);
    throw e;
  } finally {
    client.release();
  }
}

// --- API Endpoints ---

// Login
app.post('/api/login', async (req, res) => {
  const { email, pass } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1 AND password_hash = $2', [email, hashPassword(pass)]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      // Convert password_hash key for frontend compatibility
      const { password_hash, ...userResponse } = user;
      res.json({ ...userResponse, passwordHash: password_hash });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// User Endpoints
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, password_hash AS "passwordHash" FROM users ORDER BY name');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/users', async (req, res) => {
    const { name, email, role, passwordHash } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, password_hash AS "passwordHash"',
            [name, email, role, hashPassword(passwordHash)]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add user' });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, passwordHash } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2, role = $3, password_hash = $4 WHERE id = $5 RETURNING id, name, email, role, password_hash AS "passwordHash"',
            [name, email, role, passwordHash.length < 64 ? hashPassword(passwordHash) : passwordHash, id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

app.post('/api/users/:id/change-password', async (req, res) => {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (userResult.rows[0].password_hash !== hashPassword(oldPassword)) {
            return res.status(400).json({ error: 'Incorrect old password' });
        }
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, name, email, role, password_hash AS "passwordHash"',
            [hashPassword(newPassword), id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Grade Sheet Endpoints
app.get('/api/gradesheets', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, group_name AS "groupName", proponents, proposed_titles AS "proposedTitles", selected_title AS "selectedTitle", program, date, venue, panel1_id AS "panel1Id", panel2_id AS "panel2Id", panel1_grades AS "panel1Grades", panel2_grades AS "panel2Grades", status FROM grade_sheets ORDER BY "groupName"');
        res.json(result.rows.map(row => ({
            ...row,
            panel1Id: row.panel1Id || '',
            panel2Id: row.panel2Id || '',
        })));
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch grade sheets' });
    }
});

app.post('/api/gradesheets', async (req, res) => {
    const { groupName, proponents, selectedTitle, program, date, venue, panel1Id, panel2Id } = req.body;
    // Fix for duplicate key error on fast creation
    const newId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    try {
        const result = await pool.query(
            'INSERT INTO grade_sheets (id, group_name, proponents, selected_title, program, date, venue, panel1_id, panel2_id, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [newId, groupName, JSON.stringify(proponents), selectedTitle, program, date, venue, panel1Id || null, panel2Id || null, 'Not Started']
        );
        const newSheet = result.rows[0];
        res.status(201).json({
            id: newSheet.id,
            groupName: newSheet.group_name,
            proponents: newSheet.proponents,
            proposedTitles: newSheet.proposed_titles,
            selectedTitle: newSheet.selected_title,
            program: newSheet.program,
            date: newSheet.date,
            venue: newSheet.venue,
            panel1Id: newSheet.panel1_id || '',
            panel2Id: newSheet.panel2_id || '',
            panel1Grades: newSheet.panel1_grades,
            panel2Grades: newSheet.panel2_grades,
            status: newSheet.status,
        });
    } catch (error) {
        console.error('Error adding grade sheet:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/gradesheets/:id', async (req, res) => {
    const { id } = req.params;
    const { groupName, proponents, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE grade_sheets SET group_name = $1, proponents = $2, selected_title = $3, program = $4, date = $5, venue = $6, panel1_id = $7, panel2_id = $8, panel1_grades = $9, panel2_grades = $10, status = $11 WHERE id = $12 RETURNING *',
            [groupName, JSON.stringify(proponents), selectedTitle, program, date, venue, panel1Id || null, panel2Id || null, JSON.stringify(panel1Grades), JSON.stringify(panel2Grades), status, id]
        );
         const updatedSheet = result.rows[0];
         res.json({
            id: updatedSheet.id,
            groupName: updatedSheet.group_name,
            proponents: updatedSheet.proponents,
            proposedTitles: updatedSheet.proposed_titles,
            selectedTitle: updatedSheet.selected_title,
            program: updatedSheet.program,
            date: updatedSheet.date,
            venue: updatedSheet.venue,
            panel1Id: updatedSheet.panel1_id || '',
            panel2Id: updatedSheet.panel2_id || '',
            panel1Grades: updatedSheet.panel1_grades,
            panel2Grades: updatedSheet.panel2_grades,
            status: updatedSheet.status,
        });
    } catch (error) {
        console.error('Error updating grade sheet:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/gradesheets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM grade_sheets WHERE id = $1', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete grade sheet' });
    }
});

app.delete('/api/gradesheets/all', async (req, res) => {
    try {
        // This query now ONLY deletes from grade_sheets. User accounts are never touched.
        await pool.query('DELETE FROM grade_sheets');
        res.status(204).send();
    } catch (error) {
        console.error("Error deleting all grade sheets:", error);
        res.status(500).json({ error: 'Failed to delete all grade sheets' });
    }
});

// Restore Endpoint
app.post('/api/restore', async (req, res) => {
    const { users, gradeSheets } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Use DELETE FROM which is generally safer and requires fewer permissions than TRUNCATE
        await client.query('DELETE FROM grade_sheets');
        await client.query('DELETE FROM users');

        for (const user of users) {
             await client.query(
                'INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5)',
                [user.id, user.name, user.email, user.role, user.passwordHash]
            );
        }

        for (const sheet of gradeSheets) {
            await client.query(
                'INSERT INTO grade_sheets (id, group_name, proponents, selected_title, program, date, venue, panel1_id, panel2_id, panel1_grades, panel2_grades, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
                [sheet.id, sheet.groupName, JSON.stringify(sheet.proponents), sheet.selectedTitle, sheet.program, sheet.date, sheet.venue, sheet.panel1Id || null, sheet.panel2Id || null, JSON.stringify(sheet.panel1Grades), JSON.stringify(sheet.panel2Grades), sheet.status]
            );
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Restore successful' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Restore error:', error);
        res.status(500).json({ error: 'Restore failed' });
    } finally {
        client.release();
    }
});

// --- Server Startup ---
const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    // process.exit is handled by the initial check for FRONTEND_URL
  }
};

startServer();
