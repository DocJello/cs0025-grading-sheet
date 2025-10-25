const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3001;

// --- Database Connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- CORS Configuration ---
// This allows your Vercel frontend to communicate with this backend.
const corsOptions = {
    origin: (origin, callback) => {
        // Regex to match all possible Vercel deployment URLs for this project
        // e.g. https://cs0025-grading-sheet.vercel.app
        // e.g. https://cs0025-grading-sheet-git-main-....vercel.app
        const vercelRegex = /^https:\/\/cs0025-grading-sheet.*\.vercel\.app$/;

        // Allow requests with no origin (like server-to-server or REST tools)
        if (!origin) {
            return callback(null, true);
        }

        // Allow the specific frontend URL from environment variables, if set.
        if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
            return callback(null, true);
        }
        
        // Allow if the origin matches the Vercel deployment URL pattern.
        if (vercelRegex.test(origin)) {
            return callback(null, true);
        }
        
        console.error(`CORS Error: Request from origin '${origin}' blocked.`);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' })); // Increase payload limit for backups


// --- Automatic Database Initialization ---
const initializeDatabase = async () => {
    const client = await pool.connect();
    try {
        // Create users table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                role VARCHAR(50) NOT NULL,
                "passwordHash" VARCHAR(255) NOT NULL
            );
        `);

        // Create grade_sheets table if it doesn't exist
        await client.query(`
            CREATE TABLE IF NOT EXISTS grade_sheets (
                id VARCHAR(50) PRIMARY KEY,
                "groupName" VARCHAR(100) NOT NULL,
                proponents JSONB,
                "proposedTitles" JSONB,
                "selectedTitle" VARCHAR(255),
                program VARCHAR(50),
                date VARCHAR(50),
                venue VARCHAR(100),
                "panel1Id" VARCHAR(50),
                "panel2Id" VARCHAR(50),
                "panel1Grades" JSONB,
                "panel2Grades" JSONB,
                status VARCHAR(50) NOT NULL
            );
        `);

        console.log('Database tables verified/created successfully.');

        // Check if the users table is empty
        const res = await client.query('SELECT COUNT(*) FROM users');
        if (res.rows[0].count === '0') {
            console.log('Users table is empty. Seeding initial data...');
            // Insert default users
            await client.query(`
                INSERT INTO users (id, name, email, role, "passwordHash") VALUES
                ('u_admin_01', 'Admin User', 'admin@example.com', 'Admin', '123'),
                ('u_ca_01', 'Course Adviser', 'ca@example.com', 'Course Adviser', '123'),
                ('u_p_01', 'Panel User 1', 'panel1@example.com', 'Panel', '123'),
                ('u_p_02', 'Panel User 2', 'panel2@example.com', 'Panel', '123'),
                ('u_p_03', 'Panel User 3', 'panel3@example.com', 'Panel', '123');
            `);
            console.log('Default users seeded successfully.');
        } else {
            console.log('Users table already contains data. Skipping seed.');
        }
    } catch (err) {
        console.error('Error during database initialization:', err.stack);
        throw err; // Throw error to prevent server from starting in a bad state
    } finally {
        client.release();
    }
};

// --- API Endpoints ---

// NEW: Special endpoint to reset the admin user
app.get('/api/setup/reset-admin', async (req, res) => {
    try {
        const query = `
            INSERT INTO users (id, name, email, role, "passwordHash") 
            VALUES ('u_admin_01', 'Admin User', 'admin@example.com', 'Admin', '123')
            ON CONFLICT (email) 
            DO UPDATE SET 
                name = EXCLUDED.name, 
                role = EXCLUDED.role, 
                "passwordHash" = EXCLUDED."passwordHash";
        `;
        await pool.query(query);
        res.status(200).send('Admin user created or reset successfully. You can now log in with email: admin@example.com and password: 123');
    } catch (err) {
        console.error('Admin reset failed:', err);
        res.status(500).json({ error: 'Failed to reset admin user: ' + err.message });
    }
});


// Login
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    try {
        // FIX: Use LOWER() on both email input and DB column for case-insensitive login
        const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND "passwordHash" = $2', [email, pass]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Users CRUD
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users ORDER BY name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', async (req, res) => {
    const { name, email, role, passwordHash } = req.body;
    const id = `u_${Date.now()}`;
    try {
        const result = await pool.query(
            'INSERT INTO users (id, name, email, role, "passwordHash") VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, name, email, role, passwordHash]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/:id/change-password', async (req, res) => {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body;
    try {
        // First, verify the old password
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1 AND "passwordHash" = $2', [id, oldPassword]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid old password." });
        }
        // If old password is correct, update to the new one
        const updateResult = await pool.query('UPDATE users SET "passwordHash" = $1 WHERE id = $2 RETURNING *', [newPassword, id]);
        res.json(updateResult.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GradeSheets CRUD
app.get('/api/gradesheets', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM grade_sheets ORDER BY "groupName"');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/gradesheets', async (req, res) => {
    const { groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status } = req.body;
    // FIX: Append a random string to the ID to ensure uniqueness during fast, consecutive requests.
    const id = `gs_${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
        const result = await pool.query(
            'INSERT INTO grade_sheets (id, "groupName", proponents, "proposedTitles", "selectedTitle", program, date, venue, "panel1Id", "panel2Id", "panel1Grades", "panel2Grades", status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
            [id, groupName, JSON.stringify(proponents || []), JSON.stringify(proposedTitles || []), selectedTitle, program, date, venue, panel1Id, panel2Id, JSON.stringify(panel1Grades || null), JSON.stringify(panel2Grades || null), status]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/gradesheets/:id', async (req, res) => {
    const { id } = req.params;
    const { groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status } = req.body;
    try {
        const result = await pool.query(
            'UPDATE grade_sheets SET "groupName" = $1, proponents = $2, "proposedTitles" = $3, "selectedTitle" = $4, program = $5, date = $6, venue = $7, "panel1Id" = $8, "panel2Id" = $9, "panel1Grades" = $10, "panel2Grades" = $11, status = $12 WHERE id = $13 RETURNING *',
            [groupName, JSON.stringify(proponents || []), JSON.stringify(proposedTitles || []), selectedTitle, program, date, venue, panel1Id, panel2Id, JSON.stringify(panel1Grades || null), JSON.stringify(panel2Grades || null), status, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/gradesheets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM grade_sheets WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/gradesheets/all', async (req, res) => {
    try {
        // TRUNCATE is faster and resets any auto-incrementing counters if they existed.
        await pool.query('TRUNCATE TABLE grade_sheets RESTART IDENTITY');
        res.status(204).send();
    } catch (err) {
        console.error('Error truncating grade_sheets table:', err.stack);
        res.status(500).json({ error: `Failed to delete all grade sheets: ${err.message}` });
    }
});


// Restore Endpoint
app.post('/api/restore', async (req, res) => {
    const { users, gradeSheets } = req.body;

    if (!Array.isArray(users) || !Array.isArray(gradeSheets)) {
        return res.status(400).json({ error: 'Invalid backup data format.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Clear existing data. TRUNCATE is faster and resets identity columns.
        await client.query('TRUNCATE TABLE grade_sheets, users RESTART IDENTITY');

        // Restore users
        for (const user of users) {
            const userQuery = `
                INSERT INTO users (id, name, email, role, "passwordHash") 
                VALUES ($1, $2, $3, $4, $5)
            `;
            const userValues = [user.id, user.name, user.email, user.role, user.passwordHash];
            await client.query(userQuery, userValues);
        }

        // Restore grade sheets
        for (const sheet of gradeSheets) {
            const sheetQuery = `
                INSERT INTO grade_sheets (id, "groupName", proponents, "proposedTitles", "selectedTitle", program, date, venue, "panel1Id", "panel2Id", "panel1Grades", "panel2Grades", status) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            `;
            const sheetValues = [
                sheet.id,
                sheet.groupName,
                JSON.stringify(sheet.proponents || []),
                JSON.stringify(sheet.proposedTitles || []),
                sheet.selectedTitle || null,
                sheet.program || null,
                sheet.date || null,
                sheet.venue || null,
                sheet.panel1Id || null,
                sheet.panel2Id || null,
                JSON.stringify(sheet.panel1Grades || null),
                JSON.stringify(sheet.panel2Grades || null),
                sheet.status
            ];
            await client.query(sheetQuery, sheetValues);
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Database restored successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error during database restore:', err.stack);
        res.status(500).json({ error: `Failed to restore database: ${err.message}` });
    } finally {
        client.release();
    }
});

// --- Start Server ---
const startServer = async () => {
    try {
        // Wait for the database to be initialized before starting the server
        await initializeDatabase();
        app.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    } catch (error) {
        console.error("FATAL: Failed to start server due to database initialization error.");
        process.exit(1);
    }
};

startServer();
