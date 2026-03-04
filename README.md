# TradeFlow

TradeFlow is an advanced, premium Trade Management System designed for precise portfolio tracking. It features a modern, responsive UI and a robust Django backend, with support for advanced trading concepts such as LIFO profit calculations, accurate brokerage charge breakdowns, and real-time capital analytics.

## Tech Stack

*   **Frontend:** React (Vite), Tailwind CSS, React Router, Context API, Google Identity Services (Auth)
*   **Backend:** Django, Django REST Framework, SimpleJWT (Authentication)
*   **Database:** PostgreSQL (Hosted on Supabase)

## Features

*   **Premium Dashboard:** View total net worth, available capital, and a summary of your active holdings.
*   **Advanced Trade Execution:** Buy and sell with precise quantity and price entries.
*   **Intelligent Ledger:** Automatically calculates and deducts brokerage charges and taxes for every trade.
*   **LIFO Profit Calculation:** Sells calculate profit/loss using the Last-In-First-Out accounting method.
*   **Google Authentication:** Secure, one-click sign-in configured through Google Identity Services.
*   **Mobile-Ready:** Universal slide-over sidebar and responsive cards make the app usable on any device.

## Project Structure

The project is divided into two primary directories:
*   `backend/`: Contains the Django application and REST APIs.
*   `frontend/`: Contains the Vite+React single-page application.

## Local Setup

### 1. Database Configuration (Supabase/PostgreSQL)
This application utilizes PostgreSQL.
1. Create a `.env` file inside the `backend/` directory.
2. Add your Supabase Database URI (ensure you select the "URI" mapping utilizing connection pooling):
   ```env
   DATABASE_URL=postgresql://user:password@aws-pool-host:6543/postgres
   ```
*(Note: If your password contains special characters like `#`, they must be URL-encoded, e.g., `%23`).*

### 2. Backend Setup
1. Navigate to the backend folder: `cd backend`
2. Create and activate a Python virtual environment.
3. Install dependencies:
   ```bash
   pip install django djangorestframework djangorestframework-simplejwt django-cors-headers psycopg2-binary dj-database-url python-decouple
   ```
4. Run migrations to build the tables:
   ```bash
   python manage.py migrate
   ```
5. Start the Django server:
   ```bash
   python manage.py runserver
   ```

### 3. Frontend Setup
1. Open a new terminal and navigate to the frontend folder: `cd frontend`
2. Create a `.env` file inside the `frontend/` directory.
3. Add your backend API URL and Google OAuth Client ID:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Start the Vite development server:
   ```bash
   npm run dev
   ```

## Using Google Authentication (OAuth)

To enable authentication, you need to create OAuth credentials in the Google Cloud Console:
1. Go to Google Cloud Console -> APIs & Services -> Credentials.
2. Create an **OAuth client ID** (Web application).
3. Set your Authorized JavaScript origins to your frontend URL (e.g., `http://localhost:5173`).
4. Copy the Client ID and paste it into `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`.
*(Note: A Client Secret is not required since the frontend uses Google's implicit Identity Services flow).*
