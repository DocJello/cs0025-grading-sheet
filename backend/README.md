# Grading Sheet Backend

This is a simple Node.js and Express backend designed to be deployed on [Render](https://render.com) and connected to a PostgreSQL database.

## Deployment on Render

1.  **Fork this project** into your own GitHub account.
2.  Go to your Render Dashboard and create a **New PostgreSQL** database.
    *   Give it a name (e.g., `grading-sheet-db`).
    *   Copy the **Internal Connection String**. You will need this for the backend service.
3.  On the database's page, go to the **"Connect"** tab and find the **"External Shell"** section. Use the PSQL command provided to connect to your database from your local machine. Once connected, copy and paste the entire content of `backend/database.sql` into the shell and press Enter to create your tables.
    *   **Note:** You only need to create the tables. The server will automatically add the default users for you if the `users` table is empty.
4.  Go back to the Render Dashboard and create a **New Web Service**.
    *   Connect the GitHub repository you forked.
    *   Give the service a name (e.g., `grading-sheet-api`).
    *   **Root Directory:** Set this to `backend`.
    *   **Build Command:** `npm install`
    *   **Start Command:** `npm start`
5.  Under the **"Environment"** tab for your new Web Service, add two environment variables:
    *   **Key:** `DATABASE_URL`
      **Value:** Paste the **Internal Connection String** from your PostgreSQL database that you copied in step 2.
    *   **Key:** `FRONTEND_URL`
      **Value:** The URL of your deployed frontend application on Vercel (e.g., `https://your-frontend-app.vercel.app`).
6.  Click **"Create Web Service"**. Render will build and deploy your backend. Once it's live, copy its URL (e.g., `https://grading-sheet-api.onrender.com`).
7.  **Final Step:** Open `context/api.ts` in your code editor, and replace the placeholder URL with the real URL of your Render backend. Commit and push this change.

Your application should now be fully connected and working!
