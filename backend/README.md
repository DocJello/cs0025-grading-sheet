# CS0025 Grading Sheet - Backend

This directory contains the Node.js backend for the Online Grading Sheet application. It uses Express.js to provide a REST API and connects to a PostgreSQL database.

## Deployment on Render

Follow these steps to deploy both the database and the backend service on Render.

### Step 1: Deploy the PostgreSQL Database

1.  From the Render Dashboard, click **New +** and select **PostgreSQL**.
2.  Give your database a unique name (e.g., `grading-sheet-db`).
3.  Select a region close to you.
4.  Ensure the plan is **Free** and click **Create Database**.
5.  Wait for the database to become available. Once it is, go to its page, find the **Info** section, and copy the **Internal Database URL**. You will need this in the next step.

---

### Step 2: Deploy the Backend Web Service

1.  From the Render Dashboard, click **New +** and select **Web Service**.
2.  Connect your GitHub repository where this project is located.
3.  On the settings page, fill in the following details:
    *   **Name**: Give your service a name (e.g., `grading-sheet-api`).
    *   **Root Directory**: `backend` (This is very important! It tells Render to run commands from this folder).
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
4.  Scroll down to the **Environment** section. Click **"Add Environment Variable"** twice to create the following two variables:

    | Key            | Value                                                              |
    | -------------- | ------------------------------------------------------------------ |
    | `DATABASE_URL` | Paste the **Internal Database URL** you copied from Step 1.        |
    | `FRONTEND_URL` | **(REQUIRED)** Enter the main URL of your deployed Vercel frontend. It should look like `https://your-project-name.vercel.app`. **Your app will not start without this variable.** |

5.  Ensure the plan is **Free** and click **Create Web Service**.

---

### Step 3: Automatic Database Setup

**You do not need to do anything for this step.**

The backend server is designed to be self-configuring. On its very first startup, it will automatically:
1.  Connect to your new database.
2.  Create the `users` and `grade_sheets` tables if they don't exist.
3.  Add the default users (including `admin@example.com`) to the database.

This process happens automatically after the deployment in Step 2 finishes.

---

### Step 4: Connect Your Frontend

1.  After your Web Service is deployed, Render will give you its public URL (e.g., `https://grading-sheet-api.onrender.com`).
2.  Copy this URL.
3.  In your frontend code, open the file `context/api.ts`.
4.  Replace the placeholder URL with the real backend URL you just copied.
5.  Commit and push this change to GitHub. Vercel will redeploy your frontend, and your application will now be fully connected!
