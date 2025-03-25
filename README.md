# distributedSystemAssignment
# Food Delivery App - Microservices Architecture

A microservices-based food delivery application built with the MERN stack and RabbitMQ.

## Architecture

The application is built using the following microservices:

1. **Auth Service**: Handles user authentication and authorization
2. **User Service**: Manages user profiles
3. **API Gateway**: Routes client requests to the appropriate microservices

## Technologies Used

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Message Broker**: RabbitMQ
- **Authentication**: JWT
- **Docker**: For containerization

## Services

### Auth Service (Port 3001)

Responsible for:
- User registration
- User login/logout
- JWT token generation and validation
- Publishing events to RabbitMQ when a user is created

### User Service (Port 3002)

Responsible for:
- Managing user profiles
- CRUD operations for user details
- Subscribing to events from the Auth Service

### API Gateway (Port 3000)

Serves as a single entry point for the frontend, routing requests to the appropriate microservices.

## Setup and Installation

### Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose
- MongoDB Atlas account (or local MongoDB instance)
- RabbitMQ (included in Docker Compose)

### Local Development

1. Clone the repository:
   ```
   git clone <repository-url>
   cd food-delivery-app
   ```

2. Install dependencies for each service:
   ```
   cd auth-service && npm install
   cd ../user-service && npm install
   cd ../api-gateway && npm install
   ```

3. Create `.env` files in each service directory with the appropriate configuration.

4. Start each service in development mode:
   ```
   cd auth-service && npm run dev
   cd ../user-service && npm run dev
   cd ../api-gateway && npm run dev
   ```

### Docker Deployment

1. Build and start all services using Docker Compose:
   ```
   docker-compose up --build
   ```

2. Access the API Gateway at http://localhost:3000

## API Documentation

### Auth Service Endpoints

- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: Authenticate and get JWT token
- `POST /api/auth/logout`: Invalidate JWT token
- `GET /api/auth/me`: Get authenticated user data

### User Service Endpoints

- `GET /api/user/:id`: Get user profile by ID
- `PUT /api/user/:id`: Update user profile
- `DELETE /api/user/:id`: Delete user account

## Inter-Service Communication

Services communicate asynchronously using RabbitMQ with the following events:

- `user.created`: Published by Auth Service, consumed by User Service

## License

This project is licensed under the MIT License. 