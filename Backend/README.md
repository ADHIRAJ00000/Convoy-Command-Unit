# Hawkroute Backend - Real-Time AI Mobility Intelligence Platform

Complete backend server for military convoy operations with real-time tracking, **Google OR-Tools route optimization**, and event management.

## 🏗️ Architecture

### Tech Stack

- **Node.js + Express** - REST API server
- **Socket.IO** - Real-time bidirectional communication
- **MongoDB** - NoSQL database for convoy/event data
- **Redis** - In-memory cache + pub/sub (optional)
- **Python + OR-Tools** - Route optimization microservice
- **JWT** - Authentication & authorization
- **Winston** - Structured logging

### Features

✅ **Real-time convoy position tracking**  
✅ **Google OR-Tools VRP optimization** - Production-grade route solving  
✅ **WebSocket connections** for live updates  
✅ **Multi-objective optimization** - Distance, terrain, fuel, risk  
✅ **Microservice architecture** - Python optimizer + Node.js backend  
✅ **Checkpoint logging** and event management  
✅ **Convoy simulation** for testing  
✅ **Role-based access control**  
✅ **RESTful API endpoints**

---

## 🚀 Quick Start

### Prerequisites

- **Node.js 16+** and npm
- **Python 3.11+** (for OR-Tools optimizer)
- **MongoDB** (local or Atlas)
- **Redis** (local or cloud) - _optional_

### 1. Install Node.js Dependencies

```bash
cd Backend
npm install
```

### 2. Install Python Optimizer (NEW!)

```bash
cd optimizer-service
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
```

See `optimizer-service/SETUP_GUIDE.md` for detailed instructions.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and configure:

```env
MONGODB_URI=mongodb://localhost:27017/hawkroute
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secure_secret_key
PORT=5000
```

### 3. Seed Database

```bash
npm run seed
```

This creates sample convoys and default users:

- **Admin**: `admin` / `admin123`
- **Commander**: `commander` / `commander123`
- **Operator**: `operator` / `operator123`
- **Viewer**: `viewer` / `viewer123`

### 4. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server runs on: **http://localhost:5000**

---

## 📡 API Endpoints

### Authentication

```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login (returns JWT token)
GET    /api/auth/verify        - Verify token
```

### Convoys

```
GET    /api/convoys            - Get all convoys (with filters)
GET    /api/convoys/:id        - Get convoy by ID
POST   /api/convoys            - Create new convoy
PUT    /api/convoys/:id        - Update convoy
DELETE /api/convoys/:id        - Delete convoy
PATCH  /api/convoys/:id/position - Update position (real-time)
POST   /api/convoys/:id/checkpoint/:checkpointId - Log checkpoint
```

### Events

```
GET    /api/events             - Get all events (with filters)
GET    /api/events/:id         - Get event by ID
POST   /api/events             - Create new event
PATCH  /api/events/:id/acknowledge - Acknowledge event
PATCH  /api/events/:id/resolve - Resolve event
DELETE /api/events/:id         - Delete event
```

### Checkpoints

```
POST   /api/checkpoints        - Log checkpoint arrival
GET    /api/checkpoints/:convoyId - Get checkpoint history
```

### Route Optimizer

```
POST   /api/optimizer/route           - Optimize route
POST   /api/optimizer/detect-conflicts - Detect convoy conflicts
POST   /api/optimizer/alternative     - Suggest alternative route
```

---

## 🔌 Socket.IO Events

### Client → Server

```javascript
'convoy:subscribe'     - Subscribe to convoy updates
'convoy:unsubscribe'   - Unsubscribe from convoy
'position:update'      - Update convoy position from field
'checkpoint:log'       - Log checkpoint from mobile
'incident:report'      - Report incident from field
'convoy:fetch'         - Request convoy data
'convoys:fetchAll'     - Request all active convoys
'event:acknowledge'    - Acknowledge event
```

### Server → Client

```javascript
'convoy:created'       - New convoy created
'convoy:updated'       - Convoy updated
'convoy:position'      - Position update
'convoy:checkpoint'    - Checkpoint logged
'convoy:completed'     - Convoy reached destination
'event:created'        - New event
'event:acknowledged'   - Event acknowledged
'event:resolved'       - Event resolved
'alert:critical'       - Critical alert
'clients:count'        - Connected clients count
```

---

## 🎮 Real-Time Simulation

The backend automatically simulates convoy movement for testing:

- Updates every 5 seconds (configurable)
- Calculates realistic GPS positions
- Generates random events (delays, weather, incidents)
- Auto-logs checkpoint arrivals
- Broadcasts all updates via Socket.IO

To disable simulation, comment out `startConvoySimulation(io)` in `server.js`.

---

## 🗄️ Database Schema

### Convoy Model

```javascript
{
  id: String (unique),
  name: String,
  origin: { lat, lng, name },
  destination: { lat, lng, name },
  currentPosition: { lat, lng },
  speedKmph: Number,
  priority: ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'],
  vehicleCount: Number,
  unitType: ['ARMY', 'AIRFORCE', 'NAVY', 'PARAMILITARY', 'LOGISTICS', 'MEDICAL'],
  status: ['PLANNED', 'EN_ROUTE', 'AT_CHECKPOINT', 'DELAYED', 'COMPLETED', 'CANCELLED'],
  assignedRoute: {
    segments: [...],
    checkpoints: [...]
  },
  commander: { name, rank, contact },
  incidents: [...]
}
```

### Event Model

```javascript
{
  id: String (unique),
  type: ['CHECKPOINT_LOG', 'DELAY', 'CONFLICT', 'WEATHER_ALERT', 'ROUTE_CHANGE', 'INCIDENT', 'BLOCKAGE', 'EMERGENCY'],
  convoyId: String,
  severity: ['INFO', 'WARNING', 'CRITICAL'],
  title: String,
  description: String,
  location: { lat, lng, name },
  acknowledged: Boolean,
  resolution: { status, action }
}
```

---

## 🔐 Security

- **JWT Authentication**: Token-based auth with expiration
- **Role-Based Access**: ADMIN, COMMANDER, OPERATOR, VIEWER
- **Password Hashing**: bcrypt with salt
- **Helmet**: Security headers
- **CORS**: Configurable origins
- **Rate Limiting**: Available (configure in .env)

---

## 📊 Logging

Winston logger writes to:

- **Console**: Colorized output
- **logs/error.log**: Error-level logs
- **logs/combined.log**: All logs

---

## 🔧 Production Deployment

### Using PM2

```bash
npm install -g pm2
pm2 start src/server.js --name hawkroute-backend
pm2 save
pm2 startup
```

### Environment Variables (Production)

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/hawkroute
REDIS_URL=redis://user:pass@hostname:port
JWT_SECRET=<strong-random-secret>
CORS_ORIGINS=https://yourdomain.com
```

---

## 🐳 Docker Support (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── config/          # Database, Redis, Logger config
│   ├── controllers/     # (Future: Business logic)
│   ├── middleware/      # Auth, validation middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API route handlers
│   ├── services/        # (Future: External services)
│   ├── simulation/      # Convoy movement simulation
│   ├── sockets/         # Socket.IO event handlers
│   ├── utils/           # Helpers, seeders
│   ├── validators/      # Joi validation schemas
│   └── server.js        # Main entry point
├── logs/                # Log files
├── .env.example         # Environment template
└── package.json
```

---

## 🧪 Testing

```bash
# API Testing with curl
curl http://localhost:5000/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get Convoys (with token)
curl http://localhost:5000/api/convoys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔮 Future Enhancements

- [ ] OR-Tools Python microservice integration
- [ ] PostgreSQL/TimescaleDB for time-series data
- [ ] GraphQL API support
- [ ] Kubernetes deployment configs
- [ ] Comprehensive test suite (Jest)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Metrics and monitoring (Prometheus)
- [ ] Multi-tenant support

---

## 📞 Support

For issues or questions:

- Check logs in `logs/` folder
- Verify MongoDB/Redis connections
- Ensure `.env` is configured correctly

---

**Built with ❤️ for Indian Armed Forces Convoy Operations**
