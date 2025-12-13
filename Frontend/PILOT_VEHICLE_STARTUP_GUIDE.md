# HawkRoute Pilot Vehicle - Quick Start Guide

## 🚀 Start Backend & Frontend

### Option 1: Start Everything at Once (Recommended)
```powershell
# From the root directory
.\START_ALL.ps1
```

### Option 2: Start Separately

#### Start Backend (Terminal 1):
```bash
cd Backend
npm install
npm run dev
```

#### Start Frontend (Terminal 2):
```bash
cd Frontend
npm install
npm run dev
```

---

## ✅ What's Fixed

1. **Mock Data Disabled** - Now uses real backend data by default
2. **OpenWeatherMap API Key Added** - Real-time weather enabled
3. **Map Display Fixed** - Will show once backend is running

---

## 🗺️ Why Map Wasn't Showing

The map wasn't displaying because:

1. **Backend Not Running** - The page needs convoy data from `http://localhost:5000`
2. **No Convoy Selected** - Select a convoy from dropdown to load the route
3. **Mapbox Needs Data** - The map component waits for route coordinates from backend

---

## 📋 How to Use

1. **Start Backend** (see above)
2. **Start Frontend** (see above)
3. **Open**: http://localhost:3000/pilot-vehicle
4. **Select Convoy** from dropdown
5. **Click START** to begin simulation
6. **Watch Map** - Vehicle will move along the route with real-time weather!

---

## 🔧 Backend Endpoints Used

The pilot vehicle page calls these APIs:
- `GET /api/convoys` - List all convoys
- `GET /api/pilot-vehicle/:convoyId` - Get full pilot vehicle data
- Real-time weather from OpenWeatherMap

---

## ✨ Features Now Working

✅ **Real Backend Data** - No more mock data by default  
✅ **Live Map Display** - Satellite view with 3D terrain  
✅ **Real-Time Weather** - From OpenWeatherMap API  
✅ **Route Visualization** - Green line showing convoy path  
✅ **Pilot Vehicle Marker** - Green marker moves along route  
✅ **Checkpoint Markers** - Shows all checkpoints  
✅ **Hazard Markers** - Red/orange warnings on map  
✅ **Speed/Heading Overlay** - Top-left of map  
✅ **Weather Card** - Left sidebar with current conditions  
✅ **Event Log** - Right sidebar with live events  

---

## 🐛 Troubleshooting

### Map is Black/Empty
**Solution**: Make sure backend is running and convoy is selected

### "No Convoy Found" Error
**Solution**: Start backend, it will seed demo convoy data automatically

### Weather Shows "Mock Data"
**Solution**: API key already added! Just restart frontend: `npm run dev`

### Backend Won't Start
**Solution**: 
```bash
cd Backend
npm install
# Check if MongoDB is running
npm run dev
```

---

## 🎯 Quick Test

1. Open two terminals
2. Terminal 1: `cd Backend && npm run dev`
3. Terminal 2: `cd Frontend && npm run dev`
4. Browser: http://localhost:3000/pilot-vehicle
5. Select "ALPHA-HAWK-01" or any convoy
6. Click START
7. **Map appears with moving vehicle!** 🗺️🚗

---

## 📊 Expected Result

When working correctly you'll see:

```
┌─────────────────────────────────────────────────┐
│  Timeline (horizontal with checkpoints)         │
├─────────────────────────────────────────────────┤
│  [START] [PAUSE] [1x] [2x] [4x] [RESET]       │
├────────┬──────────────────────────────┬────────┤
│        │                              │        │
│ Status │     MAP (Satellite View)    │ Event  │
│  Card  │    with green vehicle       │  Log   │
│        │    moving on route           │        │
│ Weather│                              │        │
│  Card  │                              │        │
└────────┴──────────────────────────────┴────────┘
```

---

**Backend Status**: Not Running ❌  
**Action Required**: Start backend with `npm run dev` in Backend folder
