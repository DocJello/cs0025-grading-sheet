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
// FIX: Replaced restrictive CORS policy with a more open one to allow
// local development and fix "Failed to fetch" errors. For a production
// environment, this should be configured to only allow requests from
// the specific frontend domain.
app.use(cors());
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
                password_hash VARCHAR(255) NOT NULL
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

        // Create notifications table
        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                recipient_user_id VARCHAR(50) NOT NULL,
                message TEXT NOT NULL,
                grade_sheet_id VARCHAR(50),
                is_read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('Database tables verified/created successfully.');

        // --- Upsert Admin User ---
        // This ensures the admin account always exists and has the default password.
        // It's safer than seeding only when the table is empty.
        const adminUpsertQuery = `
            INSERT INTO users (id, name, email, role, password_hash) 
            VALUES ('u_admin_01', 'Admin User', 'admin@example.com', 'Admin', '123')
            ON CONFLICT (email) 
            DO UPDATE SET 
                name = EXCLUDED.name, 
                role = EXCLUDED.role, 
                password_hash = EXCLUDED.password_hash,
                id = 'u_admin_01';
        `;
        await client.query(adminUpsertQuery);
        console.log('Admin user account verified/created successfully.');

        // Check if the users table is otherwise empty to seed other default users
        const res = await client.query("SELECT COUNT(*) FROM users WHERE email != 'admin@example.com'");
        if (res.rows[0].count === '0') {
            console.log('No other users found. Seeding initial panel/adviser data...');
            // Insert other default users
            await client.query(`
                INSERT INTO users (id, name, email, role, password_hash) VALUES
                ('u_ca_01', 'Course Adviser', 'ca@example.com', 'Course Adviser', '123'),
                ('u_p_01', 'Panel User 1', 'panel1@example.com', 'Panel', '123'),
                ('u_p_02', 'Panel User 2', 'panel2@example.com', 'Panel', '123'),
                ('u_p_03', 'Panel User 3', 'panel3@example.com', 'Panel', '123')
                ON CONFLICT (email) DO NOTHING;
            `);
            console.log('Default panel/adviser users seeded successfully.');
        } else {
            console.log('Other users already exist. Skipping non-admin seed.');
        }
    } catch (err) {
        console.error('Error during database initialization:', err.stack);
        throw err; // Throw error to prevent server from starting in a bad state
    } finally {
        client.release();
    }
};

// --- API Endpoints ---

// Login
app.post('/api/login', async (req, res) => {
    const { email, pass } = req.body;
    try {
        // FIX: Use LOWER() on both email input and DB column for case-insensitive login
        const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) AND password_hash = $2', [email, pass]);
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
    const { name, email, role, password_hash } = req.body;
    const id = `u_${Date.now()}`;
    try {
        const result = await pool.query(
            'INSERT INTO users (id, name, email, role, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, name, email, role, password_hash]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, role, password_hash } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET name = $1, email = $2, role = $3, password_hash = $4 WHERE id = $5 RETURNING *',
            [name, email, role, password_hash, id]
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
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1 AND password_hash = $2', [id, oldPassword]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: "Invalid old password." });
        }
        // If old password is correct, update to the new one
        const updateResult = await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING *', [newPassword, id]);
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

app.get('/api/gradesheets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM grade_sheets WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Grade sheet not found' });
        }
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

const createNotification = async (client, recipientId, message, gradeSheetId) => {
    if (!recipientId) return;
    try {
        await client.query(
            'INSERT INTO notifications (recipient_user_id, message, grade_sheet_id) VALUES ($1, $2, $3)',
            [recipientId, message, gradeSheetId]
        );
    } catch (e) {
        console.error("Failed to create notification:", e);
    }
};

app.put('/api/gradesheets/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const oldSheetResult = await client.query('SELECT * FROM grade_sheets WHERE id = $1 FOR UPDATE', [id]);
        if (oldSheetResult.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ error: 'Grade sheet not found' });
        }
        const oldSheet = oldSheetResult.rows[0];

        const { groupName, proponents, proposedTitles, selectedTitle, program, date, venue, panel1Id, panel2Id, panel1Grades, panel2Grades, status } = req.body;
        const result = await client.query(
            'UPDATE grade_sheets SET "groupName" = $1, proponents = $2, "proposedTitles" = $3, "selectedTitle" = $4, program = $5, date = $6, venue = $7, "panel1Id" = $8, "panel2Id" = $9, "panel1Grades" = $10, "panel2Grades" = $11, status = $12 WHERE id = $13 RETURNING *',
            [groupName, JSON.stringify(proponents || []), JSON.stringify(proposedTitles || []), selectedTitle, program, date, venue, panel1Id, panel2Id, JSON.stringify(panel1Grades || null), JSON.stringify(panel2Grades || null), status, id]
        );
        const newSheet = result.rows[0];

        // --- Notification Logic ---
        const wasP1Submitted = oldSheet.panel1Grades?.submitted;
        const isP1Submitted = newSheet.panel1Grades?.submitted;
        const wasP2Submitted = oldSheet.panel2Grades?.submitted;
        const isP2Submitted = newSheet.panel2Grades?.submitted;
        const wasDetailsSet = oldSheet.selectedTitle && oldSheet.selectedTitle !== 'Untitled Project';
        const areDetailsSet = newSheet.selectedTitle && newSheet.selectedTitle !== 'Untitled Project';
        const wasCompleted = oldSheet.status === 'Completed';
        const isCompleted = newSheet.status === 'Completed';

        // Get names of panelists and list of advisers
        const panel1User = newSheet.panel1Id ? (await client.query('SELECT name FROM users WHERE id = $1', [newSheet.panel1Id])).rows[0] : null;
        const panel2User = newSheet.panel2Id ? (await client.query('SELECT name FROM users WHERE id = $1', [newSheet.panel2Id])).rows[0] : null;
        // Admins are now excluded from completion notifications.
        const courseAdvisers = await client.query("SELECT id FROM users WHERE role = 'Course Adviser'");
        
        // --- Event-based notifications ---
        
        // Panel 1 just submitted
        if (!wasP1Submitted && isP1Submitted && panel1User) {
            // If this submission *doesn't* complete the sheet, notify the other panelist.
            // The completion notification is handled separately below.
            if (!isCompleted) { 
                const msg = `${panel1User.name} has submitted grades for the group "${newSheet.groupName}".`;
                if (newSheet.panel2Id) {
                    await createNotification(client, newSheet.panel2Id, msg, newSheet.id);
                }
            }
        }
        
        // Panel 2 just submitted
        if (!wasP2Submitted && isP2Submitted && panel2User) {
            // If this submission *doesn't* complete the sheet, notify the other panelist.
            if (!isCompleted) {
                const msg = `${panel2User.name} has submitted grades for the group "${newSheet.groupName}".`;
                if (newSheet.panel1Id) {
                    await createNotification(client, newSheet.panel1Id, msg, newSheet.id);
                }
            }
        }

        // Group is newly completed: Notify panelists and advisers.
        if (!wasCompleted && isCompleted) {
            const msg = `Grading for group "${newSheet.groupName}" is now complete.`;
            // Notify both panelists
            if (newSheet.panel1Id) await createNotification(client, newSheet.panel1Id, msg, newSheet.id);
            if (newSheet.panel2Id) await createNotification(client, newSheet.panel2Id, msg, newSheet.id);
            
            // Notify course advisers, avoiding duplicate notifications for panelists who are also advisers.
            for (const user of courseAdvisers.rows) {
                if (user.id !== newSheet.panel1Id && user.id !== newSheet.panel2Id) {
                    await createNotification(client, user.id, msg, newSheet.id);
                }
            }
        }

        // Details were just set by Panel 1
        if (!wasDetailsSet && areDetailsSet && panel1User && panel2User) {
            const msg = `${panel1User.name} finalized details for "${newSheet.groupName}". You can now begin grading.`;
            await createNotification(client, newSheet.panel2Id, msg, newSheet.id);
        }

        // Panel 1 was newly assigned
        if (oldSheet.panel1Id !== newSheet.panel1Id && newSheet.panel1Id) {
            const msg = `You have been assigned as Panel 1 for the group "${newSheet.groupName}".`;
            await createNotification(client, newSheet.panel1Id, msg, newSheet.id);
        }

        // Panel 2 was newly assigned
        if (oldSheet.panel2Id !== newSheet.panel2Id && newSheet.panel2Id) {
            const msg = `You have been assigned as Panel 2 for the group "${newSheet.groupName}".`;
            await createNotification(client, newSheet.panel2Id, msg, newSheet.id);
        }
        
        await client.query('COMMIT');
        res.json(newSheet);
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
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
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // FIX: Replaced TRUNCATE with DELETE for more reliable execution in some environments.
        // This ensures the data is permanently removed as requested by the user.
        await client.query('DELETE FROM notifications');
        await client.query('DELETE FROM grade_sheets');
        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) {
        console.error('Error deleting all grade sheets:', err.stack);
        await client.query('ROLLBACK');
        res.status(500).json({ error: `Failed to delete all grade sheets: ${err.message}` });
    } finally {
        client.release();
    }
});

app.post('/api/gradesheets/reset-all', async (req, res) => {
    try {
        // This sets grades to null and status to Not Started for all sheets
        await pool.query(
            `UPDATE grade_sheets SET 
                "panel1Grades" = NULL, 
                "panel2Grades" = NULL,
                status = 'Not Started'`
        );
        res.status(200).json({ message: 'All grades have been reset.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        await client.query('TRUNCATE TABLE grade_sheets, users, notifications RESTART IDENTITY');

        // Restore users
        for (const user of users) {
            const userQuery = `
                INSERT INTO users (id, name, email, role, password_hash) 
                VALUES ($1, $2, $3, $4, $5)
            `;
            const userValues = [user.id, user.name, user.email, user.role, user.password_hash];
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

// --- Notification Endpoints ---

app.get('/api/users/:userId/notifications', async (req, res) => {
    const { userId } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE recipient_user_id = $1 AND is_read = FALSE ORDER BY created_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/notifications/read', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'Invalid input, expected an array of notification IDs.' });
    }
    try {
        // Use ANY($1) to match against an array of IDs
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ANY($1)', [ids]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
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
