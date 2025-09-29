# Grading Sheet Backend

This is a simple Node.js and Express backend designed to be deployed on [Render](https://render.com) and connected to a PostgreSQL database.

## Deployment on Render

1.  **Fork this project** into your own GitHub account.
2.  Go to your Render Dashboard and create a **New PostgreSQL** database.
    *   Give it a name (e.g., `grading-sheet-db`).
    *   Copy the **Internal Database URL**. You will need this for the backend service.
    *   Also, go to the **Connect** tab and copy the **External Database URL**. You will need this for the setup step below.
3.  Go back to the Render Dashboard and create a **New Web Service**.
    *   Connect the GitHub repository you forked.
    *   Give the service a name (e.g., `grading-sheet-api`).
    *   **Root Directory:** Set this to `backend`.
    *   **Build Command:** `npm install`
    *   **Start Command:** `npm start`
4.  Under the **"Environment"** tab for your new Web Service, add two environment variables:
    *   **Key:** `DATABASE_URL`
      **Value:** Paste the **Internal Database URL** from your PostgreSQL database that you copied in step 2.
    *   **Key:** `FRONTEND_URL`
      **Value:** The URL of your deployed frontend application on Vercel (e.g., `https://your-frontend-app.vercel.app`).
5.  Click **"Create Web Service"**. Render will start building your backend. While it's building, proceed to the next critical step.

## Database Setup (The Correct Method)

Because the "Shell" tab is not available on Render's free tier, you must set up the database tables from your own computer.

### Step 1: Install PostgreSQL on Your Computer

You only need the command-line tools. You do not need the full server.
*   Go to the official PostgreSQL download page: [**PostgreSQL for Windows**](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
*   Download and run the installer.
*   During installation, you can uncheck all components **except for "Command Line Tools"**. This will install the `psql` command that you need.
*   After the installation is complete, you **must open a new terminal window** (PowerShell or Command Prompt).

### Step 2: Run the Setup Command

1.  Open a new PowerShell or Command Prompt terminal.
2.  Navigate to your project's root directory using the `cd` command.
    ```powershell
    # Example:
    cd C:\Users\jello\path\to\your\cs0025-grading-sheet
    ```
3.  Run the following command. You must replace `"YOUR_EXTERNAL_DATABASE_URL"` with the actual **External Database URL** you copied from your Render dashboard. **Keep the double quotes around the URL.**

    ```powershell
    psql "YOUR_EXTERNAL_DATABASE_URL" -f "backend/database.sql"
    ```
4.  The command will ask for your database password. You can find this password within the External Database URL itself (it's the part after your username and the colon `:`). Paste it in and press Enter.

This single command will execute the `database.sql` file and create all the necessary tables (`users`, `grade_sheets`) in your live Render database.

## Final Step

1.  Wait for your Web Service on Render to finish deploying. Once it's live, copy its URL (e.g., `https://grading-sheet-api.onrender.com`).
2.  Open `context/api.ts` in your code editor, and replace the placeholder URL with the real URL of your Render backend. Commit and push this change.

Your application should now be fully connected and working!
