# FastAPI Login System with Supabase and JWT

This is a complete authentication system built with FastAPI, Supabase, and JWT tokens.

## Features

- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- User profile endpoint
- CORS middleware for frontend communication
- Supabase database integration

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then fill in your Supabase credentials:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_KEY`: Your Supabase anonymous key
- `SECRET_KEY`: A secure random key for JWT signing (generate one: `python -c "import secrets; print(secrets.token_urlsafe(32))"`)

### 3. Set Up Supabase Database

Create a `users` table in your Supabase project with the following schema:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster email lookups
CREATE INDEX users_email_idx ON users(email);
```

### 4. Run the Server

```bash
python main.py
```

The API will be available at `http://localhost:8000`

API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Register
- **POST** `/api/auth/register`
- Request body:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "full_name": "John Doe"
  }
  ```
- Response: Access token and user info

### Login
- **POST** `/api/auth/login`
- Request body:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- Response: Access token and user info

### Get Current User
- **GET** `/api/auth/me`
- Headers: `Authorization: Bearer <access_token>`
- Response: Current user info

### Health Check
- **GET** `/health`
- Response: Server status

## Project Structure

```
backend/
├── main.py           # FastAPI application entry point
├── config.py         # Configuration and environment variables
├── auth.py           # JWT and password utilities
├── database.py       # Supabase database connection
├── schemas.py        # Pydantic models for request/response
├── routes.py         # Authentication endpoints
├── requirements.txt  # Python dependencies
├── .env.example      # Example environment variables
└── .env              # Actual environment variables (not in git)
```

## Security Notes

1. **Never commit `.env` file** to version control
2. **Change `SECRET_KEY`** in production to a strong random value
3. **Use HTTPS** in production
4. **Set appropriate CORS origins** for your frontend
5. **Store sensitive information** in environment variables

## Frontend Integration Example

```javascript
// Register
async function register(email, password, fullName) {
  const response = await fetch('http://localhost:8000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email, 
      password, 
      full_name: fullName 
    })
  });
  return response.json();
}

// Login
async function login(email, password) {
  const response = await fetch('http://localhost:8000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return response.json();
}

// Get current user
async function getCurrentUser(token) {
  const response = await fetch('http://localhost:8000/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

## Troubleshooting

### "Module not found" errors
Make sure all dependencies are installed:
```bash
pip install -r requirements.txt
```

### Supabase connection errors
- Verify `SUPABASE_URL` and `SUPABASE_KEY` in `.env`
- Check your Supabase project status
- Ensure the `users` table exists with correct schema

### JWT errors
- Verify `SECRET_KEY` is set in `.env`
- Check token hasn't expired (default: 30 minutes)
- Ensure token is passed correctly in Authorization header

## License

MIT
