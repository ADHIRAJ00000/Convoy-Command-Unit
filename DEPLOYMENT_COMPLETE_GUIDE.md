# 🚀 Complete Deployment Guide - HawkRoute/AICC

## ⚠️ Why You Couldn't Deploy (And How We Fixed It)

### **Problems:**
1. ❌ **No Render configuration** (`render.yaml` missing)
2. ❌ **No Vercel configuration** (`vercel.json` missing)
3. ❌ **Missing build scripts** in `package.json`
4. ❌ **Environment variables not documented**
5. ❌ **Backend API URLs pointing to localhost**
6. ❌ **Python optimizer service dependency not addressed**

### **Solutions Implemented:**
✅ Created `render.yaml` with complete backend configuration  
✅ Created `vercel.json` with frontend settings and API rewrites  
✅ Added build script to backend `package.json`  
✅ Documented all required environment variables  
✅ Configured production API URL routing  

---

## 📦 Backend Deployment on Render

### **Step 1: Prepare MongoDB Database**

You have **two options**:

#### Option A: MongoDB Atlas (Recommended)
```bash
1. Go to https://cloud.mongodb.com/
2. Create a free cluster
3. Get connection string: mongodb+srv://username:password@cluster.mongodb.net/hawkroute
4. Whitelist IP: 0.0.0.0/0 (allow access from anywhere)
```

#### Option B: Render Managed MongoDB
- Available in select regions
- Automatically managed by Render
- Less configuration needed

### **Step 2: Push Code to GitHub**

```bash
cd /Users/adhirajsingh/Downloads/Priyanshu_Version
git init
git add .
git commit -m "Initial commit with deployment configs"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### **Step 3: Configure Render**

1. **Go to https://render.com**
2. **Click "New +" → "Blueprint"**
3. **Connect your GitHub repository**
4. **Render will auto-detect `render.yaml`**

### **Step 4: Add Environment Variables in Render Dashboard**

After deploying, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `MONGODB_URI` | `mongodb+srv://...` | From MongoDB Atlas |
| `REDIS_URL` | `redis://...` | Optional - skip if not using |
| `CORS_ORIGINS` | `https://your-app.vercel.app,https://hawkroute-backend.onrender.com` | Your frontend URL + backend URL |
| `OPTIMIZER_SERVICE_URL` | `https://hawkroute-optimizer.onrender.com` | See Python service section below |

### **Step 5: Deploy!**

Render will automatically:
- Install dependencies: `npm install`
- Start server: `node src/server.js`
- Run on port 5000
- Health check: `/health`

---

## 🎨 Frontend Deployment on Vercel

### **Step 1: Connect to Vercel**

1. **Go to https://vercel.com**
2. **Import your GitHub repository**
3. **Select framework: Next.js**
4. **Root Directory: `Frontend`**

### **Step 2: Configure Build Settings**

Vercel auto-detects Next.js, but verify:

- **Framework Preset:** Next.js
- **Build Command:** `npm install && next build`
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install`

### **Step 3: Add Environment Variables**

In Vercel dashboard → Settings → Environment Variables:

| Variable | Value | Preview | Production |
|----------|-------|---------|------------|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Your Mapbox token | ✅ | ✅ |
| `NEXT_PUBLIC_OPENWEATHER_API_KEY` | OpenWeather API key | ✅ | ✅ |
| `NEXT_PUBLIC_API_URL` | `https://hawkroute-backend.onrender.com` | ✅ | ✅ |

### **Step 4: Deploy**

Click **Deploy** - Vercel will:
- Install dependencies
- Build Next.js app
- Deploy globally
- Give you a URL like: `https://your-app.vercel.app`

---

## 🔧 Critical: Update CORS Origins

After deploying both services, **you MUST update the backend CORS**:

### In Render Dashboard:
```
CORS_ORIGINS = https://your-app.vercel.app,https://hawkroute-backend.onrender.com
```

Without this, your frontend **cannot communicate** with the backend!

---

## 🐍 Python Optimizer Service (Optional)

Your backend calls a Python microservice for route optimization. You have options:

### Option 1: Deploy Python Service Separately

Create another Render service for the optimizer:

```yaml
# Add to render.yaml
services:
  - type: web
    name: hawkroute-optimizer
    env: python
    region: oregon
    plan: starter
    rootDir: Backend/optimizer-service
    buildCommand: pip install -r requirements.txt
    startCommand: python optimizer.py
    envVars:
      - key: PORT
        value: 8000
```

### Option 2: Disable Optimizer (Temporary)

If you don't need route optimization yet, comment it out:

In `Backend/src/routes/optimizerRoutes.js`:
```javascript
// Comment out optimizer service call
// const response = await axios.post(process.env.OPTIMIZER_SERVICE_URL, data);
res.json({ message: 'Optimizer temporarily disabled' });
```

### Option 3: Integrate Directly

Move Python logic into Node.js backend (more complex).

---

## 📝 Environment Variables Reference

### **Backend (Render)**

```env
# Required
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hawkroute
JWT_SECRET=<generate-random-256-bit-string>

# Recommended
REDIS_URL=redis://localhost:6379  # Optional
CORS_ORIGINS=https://your-app.vercel.app,https://hawkroute-backend.onrender.com
LOG_LEVEL=info
OPTIMIZER_SERVICE_URL=https://hawkroute-optimizer.onrender.com

# Optional
CONVOY_UPDATE_INTERVAL=5000
POSITION_BROADCAST_INTERVAL=3000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### **Frontend (Vercel)**

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
NEXT_PUBLIC_API_URL=https://hawkroute-backend.onrender.com
```

---

## 🧪 Testing After Deployment

### 1. Test Backend Health

```bash
curl https://hawkroute-backend.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### 2. Test Frontend

Open in browser: `https://your-app.vercel.app`

Check:
- ✅ Page loads without errors
- ✅ Map displays correctly (Mapbox working)
- ✅ Can login/register
- ✅ Console shows no CORS errors

### 3. Test API Integration

From browser console:
```javascript
fetch('https://hawkroute-backend.onrender.com/api/convoys')
  .then(r => r.json())
  .then(console.log)
```

Should return convoys array (not CORS error).

### 4. Test Socket.IO Connection

Frontend should automatically connect via Socket.IO. Check logs in both places:

**Render Logs:**
- Socket.IO connections
- Convoy position updates

**Browser Console:**
- "Connected to HawkRoute backend!"
- Real-time convoy movements

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Errors

**Symptom:** Frontend can't reach backend, console shows CORS errors

**Solution:**
```env
# In Render dashboard
CORS_ORIGINS = https://your-app.vercel.app
```

### Issue 2: MongoDB Connection Failed

**Symptom:** Backend won't start, logs show `MongoNetworkError`

**Solution:**
1. Check MongoDB Atlas connection string
2. Verify IP whitelist includes `0.0.0.0/0`
3. Ensure database user has correct permissions

### Issue 3: Port Already in Use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::5000`

**Solution:**
Render handles this automatically. If running locally, change PORT in `.env`.

### Issue 4: Build Fails on Vercel

**Symptom:** Vercel deployment fails during build

**Solution:**
```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Issue 5: WebSocket Not Connecting

**Symptom:** Real-time updates not working

**Solution:**
Check Socket.IO configuration in `server.js`:
```javascript
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS?.split(','),
    methods: ['GET', 'POST'],
    credentials: true
  }
});
```

### Issue 6: Environment Variables Not Working

**Symptom:** App uses default values instead of configured ones

**Solution:**
- For Vercel: Prefix with `NEXT_PUBLIC_` for client-side access
- For Render: Restart service after adding variables
- Redeploy after adding new variables

---

## 📊 Monitoring & Logs

### Render Logs

```bash
# View in Render dashboard
Dashboard → Services → hawkroute-backend → Logs
```

Look for:
- ✅ Server started successfully
- ✅ MongoDB connected
- ✅ Socket.IO ready
- ✅ Health checks passing

### Vercel Logs

```bash
# View in Vercel dashboard
Dashboard → Projects → your-app → Function Logs
```

Look for:
- ✅ Build successful
- ✅ No runtime errors
- ✅ API calls to backend succeeding

---

## 🔄 Updating After Initial Deployment

### Backend Updates

```bash
git push origin main
# Render auto-deploys on push to main branch
```

### Frontend Updates

```bash
cd Frontend
git push origin main
# Vercel auto-deploys on push
```

Both platforms support **automatic deployments** from your `main` branch!

---

## 💰 Cost Estimates

### Free Tier Limits

**Render:**
- 750 hours/month free (enough for 1 service always-on)
- 512MB RAM per service
- PostgreSQL/Redis included

**Vercel:**
- Unlimited deployments
- 100GB bandwidth/month
- Serverless functions: 100GB-hours/month

**MongoDB Atlas:**
- 512MB storage free tier
- Shared RAM
- Good for development/small apps

### Estimated Monthly Cost

For small-scale usage:
- Render Starter: $7/month
- Vercel Pro: $20/month (optional, free tier often sufficient)
- MongoDB Atlas M10: $57/month (optional, free tier available)

**Total: $7-84/month** depending on needs

---

## ✅ Deployment Checklist

Before going live:

- [ ] MongoDB Atlas cluster created and whitelisted
- [ ] All environment variables configured in Render
- [ ] All environment variables configured in Vercel
- [ ] CORS origins updated with production URLs
- [ ] Python optimizer service deployed or disabled
- [ ] Backend health check passing
- [ ] Frontend builds successfully
- [ ] API calls from frontend to backend working
- [ ] Socket.IO real-time connection established
- [ ] No console errors in browser
- [ ] Database seeded with initial data
- [ ] JWT secret generated and configured
- [ ] SSL certificates active (automatic on both platforms)

---

## 🎉 Success Indicators

You'll know everything is working when:

1. ✅ Visit `https://your-app.vercel.app` - page loads
2. ✅ Map displays with convays
3. ✅ Can login/register users
4. ✅ Real-time position updates visible
5. ✅ No errors in browser console
6. ✅ Backend logs show healthy activity
7. ✅ Database queries succeeding
8. ✅ Events and checkpoints working

---

## 🆘 Need Help?

### Render Support
- Docs: https://render.com/docs
- Community: https://community.render.com
- Status: https://status.render.com

### Vercel Support
- Docs: https://vercel.com/docs
- Community: https://github.com/vercel/next.js/discussions
- Status: https://www.vercel-status.com

### MongoDB Support
- Docs: https://www.mongodb.com/docs/atlas/
- Community: https://www.mongodb.com/community/forums/

---

## 📞 Quick Commands

### Seed Production Database
```bash
# After backend is deployed, SSH into Render or run locally with production DB
cd Backend
MONGODB_URI=mongodb+srv://... npm run seed
```

### Check Backend Health
```bash
curl https://hawkroute-backend.onrender.com/health
```

### Monitor Logs
```bash
# Render CLI (if installed)
render logs -s hawkroute-backend

# Vercel CLI
vercel logs your-app
```

---

**🚀 Your HawkRoute/AICC platform is now production-ready!**

The configuration files I created handle:
- Automatic deployments
- Environment variable management
- Health checks
- CORS configuration
- Build optimizations
- Security headers

Good luck with your deployment! 🎯
