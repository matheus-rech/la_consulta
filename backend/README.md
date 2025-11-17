# Clinical Extractor Backend API

Complete backend infrastructure for the La Consulta Clinical Extractor application, implementing secure API proxy, authentication, database storage, and rate limiting.

## Overview

This FastAPI backend solves critical security vulnerabilities and scalability issues in the Clinical Extractor application:

- **Security**: Moves Gemini API key from client-side to server-side
- **Authentication**: JWT-based user authentication system
- **Database**: SQLite/PostgreSQL for persistent storage
- **Rate Limiting**: Token bucket algorithm for API request management
- **Circuit Breaker**: Resilience pattern for external API calls
- **API Proxy**: Secure proxy for all Gemini AI operations

## Architecture

```
┌─────────────────────────────────────────┐
│   Frontend (React/TypeScript)           │
│   - No exposed API keys                 │
│   - Calls backend API endpoints         │
└─────────────────────────────────────────┘
              ↓ HTTP/JSON
┌─────────────────────────────────────────┐
│   FastAPI Backend                        │
│   ├── Authentication (JWT)              │
│   ├── Rate Limiting Middleware          │
│   ├── Circuit Breaker                   │
│   └── API Routers                       │
│       ├── /api/auth                     │
│       ├── /api/gemini                   │
│       ├── /api/documents                │
│       └── /api/extractions              │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   SQLite/PostgreSQL Database            │
│   - Users                               │
│   - Documents                           │
│   - Extractions                         │
│   - Text Chunks                         │
│   - API Requests                        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│   Google Gemini API                     │
│   - API key stored server-side only     │
└─────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Python 3.12+
- Poetry (Python package manager)
- Gemini API key

### Installation

```bash
cd backend
poetry install
```

### Configuration

Create a `.env` file in the backend directory:

```bash
# Database
DATABASE_URL=sqlite:///./clinical_extractor.db

# Security
SECRET_KEY=your-secret-key-here-use-openssl-rand-hex-32
GEMINI_API_KEY=your-gemini-api-key-here

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60

# CORS (for development)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Optional: Supabase for cloud storage
SUPABASE_URL=
SUPABASE_KEY=

# App Settings
DEBUG=true
LOG_LEVEL=INFO
MAX_PDF_SIZE_MB=50
```

### Running the Server

Development mode with auto-reload:

```bash
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Production mode:

```bash
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

### API Documentation

Interactive API documentation is available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Health Check

```bash
GET /healthz
```

Returns server health status.

### Authentication

#### Register User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "secure_password"
}
```

#### Login

```bash
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=username&password=secure_password
```

Returns JWT access token.

#### Get Current User

```bash
GET /api/auth/me
Authorization: Bearer <token>
```

### Gemini AI Proxy

All endpoints require authentication via JWT token.

#### Generate Content

```bash
POST /api/gemini/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "Your prompt here",
  "model": "gemini-2.5-flash",
  "system_instruction": "Optional system instruction"
}
```

#### Extract PICO-T

```bash
POST /api/gemini/pico
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_text": "Full document text...",
  "document_id": 123
}
```

Returns structured PICO-T data (Population, Intervention, Comparator, Outcomes, Timing, Study Type).

#### Validate Field

```bash
POST /api/gemini/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "field_name": "population",
  "field_value": "57 patients with cerebellar infarction",
  "document_text": "Full document text...",
  "document_id": 123
}
```

#### Find Metadata

```bash
POST /api/gemini/metadata
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_text": "Full document text...",
  "document_id": 123
}
```

Returns DOI, PMID, journal, publication year, and authors.

### Documents

#### Create Document

```bash
POST /api/documents/
Authorization: Bearer <token>
Content-Type: application/json

{
  "filename": "study.pdf",
  "file_path": "s3://bucket/study.pdf",
  "file_size": 1024000,
  "total_pages": 12,
  "doc_metadata": {"key": "value"}
}
```

#### List Documents

```bash
GET /api/documents/?skip=0&limit=100
Authorization: Bearer <token>
```

#### Get Document

```bash
GET /api/documents/{document_id}
Authorization: Bearer <token>
```

#### Delete Document

```bash
DELETE /api/documents/{document_id}
Authorization: Bearer <token>
```

### Extractions

#### Create Extraction

```bash
POST /api/extractions/
Authorization: Bearer <token>
Content-Type: application/json

{
  "document_id": 123,
  "field_name": "population",
  "text": "57 patients with cerebellar infarction",
  "page": 3,
  "coordinates": {"x": 100, "y": 200, "width": 300, "height": 20},
  "method": "manual"
}
```

#### List Extractions

```bash
GET /api/extractions/?document_id=123&skip=0&limit=100
Authorization: Bearer <token>
```

#### Batch Create Extractions

```bash
POST /api/extractions/batch
Authorization: Bearer <token>
Content-Type: application/json

{
  "extractions": [
    {
      "document_id": 123,
      "field_name": "population",
      "text": "...",
      ...
    },
    ...
  ]
}
```

## Database Schema

### Users

- `id`: Primary key
- `email`: Unique email address
- `username`: Unique username
- `hashed_password`: Bcrypt hashed password
- `is_active`: Account status
- `created_at`: Registration timestamp
- `updated_at`: Last update timestamp

### Documents

- `id`: Primary key
- `user_id`: Foreign key to Users
- `filename`: Original filename
- `file_path`: Cloud storage path
- `file_size`: Size in bytes
- `total_pages`: Number of pages
- `upload_date`: Upload timestamp
- `doc_metadata`: JSON metadata

### Extractions

- `id`: Primary key
- `user_id`: Foreign key to Users
- `document_id`: Foreign key to Documents
- `field_name`: Extracted field name
- `text`: Extracted text content
- `page`: Page number
- `coordinates`: JSON bounding box
- `method`: Extraction method (manual, gemini-pico, etc.)
- `timestamp`: Extraction timestamp

### Text Chunks

- `id`: Primary key
- `document_id`: Foreign key to Documents
- `chunk_index`: Sequential index
- `page_number`: Page number
- `text`: Text content
- `bbox_*`: Bounding box coordinates
- `font_*`: Font metadata
- `confidence`: Extraction confidence
- `extraction_method`: Method used

### API Requests

- `id`: Primary key
- `user_id`: Foreign key to Users
- `endpoint`: API endpoint called
- `method`: HTTP method
- `timestamp`: Request timestamp
- `response_time_ms`: Response time
- `status_code`: HTTP status code

## Security Features

### Password Hashing

Uses bcrypt via passlib for secure password storage.

### JWT Tokens

- Algorithm: HS256
- Expiration: 30 days (configurable)
- Includes user ID and username in payload

### Rate Limiting

Token bucket algorithm:
- Default: 60 requests per minute per user
- Configurable via `RATE_LIMIT_PER_MINUTE`
- Returns 429 Too Many Requests when exceeded

### Circuit Breaker

Protects against Gemini API failures:
- Failure threshold: 5 consecutive failures
- Timeout: 60 seconds
- Success threshold: 2 consecutive successes to close circuit

### Input Validation

All inputs validated using Pydantic schemas.

### CORS

Configurable CORS origins for frontend integration.

## Development

### Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app and lifecycle
│   ├── config.py            # Configuration management
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── auth.py              # Authentication utilities
│   ├── middleware.py        # Rate limiting & circuit breaker
│   └── routers/
│       ├── __init__.py
│       ├── auth.py          # Authentication endpoints
│       ├── gemini.py        # Gemini API proxy
│       ├── documents.py     # Document management
│       └── extractions.py   # Extraction management
├── .env                     # Environment variables (gitignored)
├── .env.example             # Example environment variables
├── pyproject.toml           # Poetry dependencies
└── README.md                # This file
```

### Adding Dependencies

```bash
poetry add package-name
```

### Running Tests

```bash
poetry run pytest
```

## Deployment

### Fly.io Deployment

1. Install Fly CLI: `https://fly.io/docs/hands-on/install-flyctl/`

2. Login to Fly:
```bash
fly auth login
```

3. Create app:
```bash
fly launch
```

4. Set secrets:
```bash
fly secrets set SECRET_KEY=your-secret-key
fly secrets set GEMINI_API_KEY=your-gemini-key
```

5. Deploy:
```bash
fly deploy
```

### Environment Variables for Production

- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: Strong random key (use `openssl rand -hex 32`)
- `GEMINI_API_KEY`: Your Gemini API key
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `DEBUG=false`
- `LOG_LEVEL=WARNING`

## Frontend Integration

### Configuration

Update frontend `.env.local`:

```bash
VITE_BACKEND_API_URL=http://localhost:8000
# Remove VITE_GEMINI_API_KEY - no longer needed!
```

### Example: Calling Backend from Frontend

```typescript
// Login
const response = await fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    username: 'user',
    password: 'pass'
  })
});
const { access_token } = await response.json();

// Call Gemini API via backend
const picoResponse = await fetch('http://localhost:8000/api/gemini/pico', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    document_text: fullDocumentText,
    document_id: 123
  })
});
const picoData = await picoResponse.json();
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
ss -tlnp | grep :8000

# Kill process
kill -9 <PID>
```

### Database Issues

```bash
# Delete database and restart
rm clinical_extractor.db
poetry run uvicorn app.main:app --reload
```

### Import Errors

```bash
# Reinstall dependencies
poetry install
```

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally
4. Create pull request

## License

Apache-2.0

## Support

For issues and questions, please open a GitHub issue in the la_consulta repository.
