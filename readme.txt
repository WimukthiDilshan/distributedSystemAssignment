Group ID-Y3S1-WE-30

Prerequisites
- Docker (version 20.10.0 or higher)
- Docker Compose (version 2.0.0 or higher)
- Node.js (version 16 or higher)
- MongoDB (version 4.4 or higher)
- Git

Deployment Steps

1. Clone the Repository
```bash
git clone <repository-url>
cd <project-directory>
```

2. Environment Setup
Create `.env` files in each service directory with the following structure:

#### API Gateway (.env)
```env
PORT=3000
AUTH_SERVICE_URL=http://auth-service:3002
RESTAURANT_SERVICE_URL=http://restaurant-service:3001
ORDER_SERVICE_URL=http://order-service:3003
DELIVERY_SERVICE_URL=http://delivery-service:3004
```

#### Auth Service (.env)
```env
PORT=3002
MONGODB_URI=mongodb://mongodb:27017/auth
JWT_SECRET=your_jwt_secret
```

#### Restaurant Service (.env)
```env
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/restaurant
AUTH_SERVICE_URL=http://auth-service:3002
```

#### Order Service (.env)
```env
PORT=3003
MONGODB_URI=mongodb://mongodb:27017/order
AUTH_SERVICE_URL=http://auth-service:3002
RESTAURANT_SERVICE_URL=http://restaurant-service:3001
```

#### Delivery Service (.env)
```env
PORT=3004
MONGODB_URI=mongodb://mongodb:27017/delivery
AUTH_SERVICE_URL=http://auth-service:3002
ORDER_SERVICE_URL=http://order-service:3003
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3000
```

### 3. Build and Start Services
```bash
# Build all services
docker-compose build

# Start all services
docker-compose up -d
```

### 4. Verify Deployment
Check if all services are running:
```bash
docker-compose ps
```

### 5. Access Services
- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000
- Auth Service: http://localhost:3002
- Restaurant Service: http://localhost:3001
- Order Service: http://localhost:3003
- Delivery Service: http://localhost:3004

### 6. Monitoring
View logs for specific services:
```bash
docker-compose logs -f [service-name]
```

## Development Setup

### 1. Install Dependencies
For each service directory:
```bash
cd [service-directory]
npm install
```

### 2. Run Services Locally
```bash
# API Gateway
cd API-Gateway
npm run dev

# Auth Service
cd Auth-service
npm run dev

# Restaurant Service
cd Restaurant-Service
npm run dev

# Order Service
cd Order-Service
npm run dev

# Delivery Service
cd Delivery-Service
npm run dev

# Frontend
cd frontend
npm run dev
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   - Check if ports are already in use
   - Modify port numbers in .env files if needed

2. **Database Connection**
   - Ensure MongoDB is running
   - Verify connection strings in .env files

3. **Service Communication**
   - Check network connectivity between services
   - Verify service URLs in .env files

### Logs
View service logs:
```bash
docker-compose logs -f [service-name]
```

## Maintenance

### Updating Services
```bash
# Pull latest changes
git pull

# Rebuild and restart services
docker-compose up -d --build
```

### Backup
```bash
# Backup MongoDB data
docker-compose exec mongodb mongodump --out /backup
```

## Security Considerations

1. **Environment Variables**
   - Never commit .env files
   - Use strong secrets for JWT and database
   - Rotate secrets regularly

2. **Network Security**
   - Use HTTPS in production
   - Implement proper CORS policies
   - Set up firewalls

3. **Database Security**
   - Use strong passwords
   - Enable authentication
   - Regular backups