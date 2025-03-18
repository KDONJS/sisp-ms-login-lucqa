# SISP Login Microservice
This repository contains a login microservice for the SISP system, providing user authentication, management, and profile image handling.

## Features
- User authentication with JWT
- User management (CRUD operations)
- Profile image upload to AWS S3
- Role-based access control
- Redis caching for improved performance
## Tech Stack
- Node.js
- Express.js
- TypeScript
- PostgreSQL
- Prisma ORM
- AWS S3 for image storage
- Redis for caching
- Winston for logging
## Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- Redis server
- AWS S3 bucket
## Environment Variables
Create a .env file in the root directory with the following variables:

```plaintext
DATABASE_URL="postgresql://username:password@localhost:5432/userdb?schema=public"
JWT_SECRET="your-super-secret-key"
REDIS_URL="redis://localhost:6379"
PORT=3500
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=lucqa-dev
 ```
```

## Installation
1. Clone the repository
2. Install dependencies
```bash
npm install
 ```

3. Run Prisma migrations
```bash
npx prisma migrate dev
 ```

4. Start the development server
```bash
npm run dev
 ```

## API Endpoints
### Authentication
- POST /api/auth/login - User login
- POST /api/auth/refresh - Refresh access token
### Users
- POST /api/users - Create a new user
- GET /api/users - Get all users
- GET /api/users/:id - Get user by ID
- PUT /api/users/:id - Update user
- PATCH /api/users/:id/photo - Update user's photo
- DELETE /api/users/:id - Delete user
## File Upload
The API supports image uploads for user profiles. Images are stored in AWS S3.

## Testing with Postman
### Create User
- Method : POST
- URL : http://localhost:3500/api/users
- Headers :
  - Authorization: Bearer {token}
- Body : form-data
  - email: user@example.com
  - password: password123
  - name: User Name
  - role: USER
  - status: true
  - image: [file]
### Update User Photo
- Method : PATCH
- URL : http://localhost:3500/api/users/{userId}/photo
- Headers :
  - Authorization: Bearer {token}
- Body : form-data
  - image: [file]
## Logging
The application uses Winston for logging with different levels:

- error: For critical errors
- warn: For warnings
- info: For general information
- debug: For detailed debugging information

