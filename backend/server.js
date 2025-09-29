
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
// This allows your Vercel frontend to communicate with this backend
const frontendUrl = process.env.FRONTEND_URL;
if (!frontendUrl) {
    console.error("FATAL ERROR: FRONTEND_URL environment variable is not set.");
    // In a real production environment, you might want to exit the process
    // process.exit(1); 
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like server-to-server or REST tools)
        if (!origin) return callback(null, true);

        // Flexible whitelisting for Vercel's main and preview URLs
        // e.g. https://cs0025-grading-sheet-git-main-....vercel.app
        // and  https://cs0025-grading-sheet-....vercel.app
        const vercelBaseDomain = 'cs0025-grading-sheet';
        const vercelProjectDomain = 'vercel.app';
        
        if (origin.includes(vercelBaseDomain) && origin.endsWith(vercelProjectDomain)) {
            return callback(null, true);
        }

        // Also allow the exact URL from environment variable for safety
        if (origin === frontendUrl) {
            return callback(null, true);
        }
        
        console.error(`CORS Error: Request from origin '${origin}' blocked.`);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));
app.use(express.json());


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
    } finally {
        client.release();
    }
};

// --- API Endpoints ---

// Login
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1 AND "passwordHash" = $2', [email, pass]);
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
    const id = `gs_${Date.now()}`;
    try {
        const result = await pool.query(
            'INSERT INTO grade_sheets (id, "groupName", proponents, "proposedTitles", "selectedTitle", program, date, venue, "panel1Id", "panel2Id", "panel1Grades", "panel2Grades", status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
            [id, groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status]
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
            [groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status, id]
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

// --- Start Server ---
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    // Initialize the database when the server starts
    initializeDatabase();
});
