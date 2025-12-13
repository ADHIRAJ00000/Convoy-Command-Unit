# HawkRoute Pilot Vehicle - Weather Integration Guide

## 🌦️ Real-Time Weather Integration

The Pilot Vehicle page now features **real-time weather data** fetched from OpenWeatherMap API along the convoy route. Weather conditions are assessed to determine terrain hazard levels.

---

## 🔑 Setup Instructions

### 1. Get OpenWeatherMap API Key (FREE)

1. Visit [OpenWeatherMap](https://openweathermap.org/api)
2. Click **Sign Up** (free tier includes 1,000 calls/day)
3. After registration, go to **API Keys** section
4. Copy your API key

### 2. Add API Key to Environment Variables

Create or update `.env.local` in the `Frontend` directory:

```bash
# Frontend/.env.local

# OpenWeatherMap API Key
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_api_key_here

# Mapbox Token (existing)
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

**Important:** Replace `your_api_key_here` with your actual OpenWeatherMap API key.

### 3. Restart Development Server

```bash
cd Frontend
npm run dev
```

---

## ✨ New Features

### 🌤️ Weather Card
- **Real-time weather conditions** at current checkpoint location
- Temperature, humidity, wind speed, visibility, cloud cover
- **Weather emoji icons** for quick visual identification
- **Terrain condition assessment** (CLEAR / CAUTION / HAZARDOUS)
- **Hazard level calculation** (0-100%) based on weather factors
- **Route forecast preview** showing weather at all checkpoints

### 🎯 Weather-Based Hazard Detection
The system automatically calculates hazard levels based on:
- **Rain/Snow**: Heavy precipitation increases hazard level
- **Wind Speed**: Strong winds (>15 km/h) add risk
- **Visibility**: Poor visibility (<5 km) increases hazard
- **Temperature**: Extreme temperatures affect safety
- **Cloud Cover**: Heavy clouds (>80%) impact conditions

### 📊 Hazard Level Scoring
- **0-30%**: 🟢 CLEAR - Safe conditions
- **30-60%**: 🟡 CAUTION - Monitor conditions
- **60-100%**: 🔴 HAZARDOUS - High risk conditions

---

## 🎨 Design Updates

### Matching Website Theme
The Pilot Vehicle page now matches the HawkRoute design system:

- ✅ **Navigation Bar**: Consistent top nav with logo and links
- ✅ **Color Palette**: 
  - `bg-slateDepth` - Main background (#0f1724)
  - `bg-panelNight` - Panel backgrounds (#111827)
  - `text-amberCommand` - Primary accent (#fbbf24)
  - `text-textNeutral` - Text color (#e5e7eb)
- ✅ **Typography**: Matching font sizes and spacing
- ✅ **Cards & Panels**: Consistent rounded corners and borders
- ✅ **Buttons**: Amber command style for primary actions
- ✅ **Status Indicators**: Green pulse dots for live data

### Component Styling
All components now use:
- `border-panelNight/40` for subtle borders
- `bg-panelNight/60` for card backgrounds
- `rounded-xl` for modern rounded corners
- `shadow-xl` for depth and elevation
- Gradient headers for visual hierarchy

---

## 📡 How It Works

### Weather Fetching Flow

1. **Select Convoy** → System identifies route checkpoints
2. **Fetch Weather** → API calls for each checkpoint location
3. **Assess Conditions** → Calculate hazard levels
4. **Display Data** → Show current weather + route forecast
5. **Auto-Update** → Weather refreshes as vehicle progresses

### API Integration

```typescript
// Fetch weather for route checkpoints
const waypoints = checkpoints.map(cp => ({
  lat: cp.position.lat,
  lng: cp.position.lng,
  name: cp.name
}));

const weather = await fetchRouteWeather(waypoints);
```

### Weather Service (`lib/weatherService.ts`)

```typescript
// Main functions
- fetchWeatherForLocation() // Get weather for single point
- fetchRouteWeather()        // Get weather for multiple points
- assessTerrainCondition()   // Calculate hazard level
- getWeatherEmoji()          // Get emoji for condition
```

---

## 🚀 Usage

### 1. Select a Convoy
Choose any convoy from the dropdown in the page header.

### 2. View Weather Data
The Weather Card appears in the left sidebar showing:
- Current weather at pilot vehicle location
- Temperature and description
- Terrain condition (CLEAR/CAUTION/HAZARDOUS)
- Detailed metrics (wind, humidity, visibility, clouds)
- Route forecast for all checkpoints

### 3. Monitor Hazards
- Weather-based hazards automatically appear
- System shows alerts for hazardous conditions
- Terrain condition updates as vehicle progresses

### 4. Simulate Movement
- Click **START** to begin simulation
- Weather updates dynamically based on position
- Watch the route forecast highlight current location

---

## 🔧 Configuration

### Weather API Settings

Located in `lib/weatherService.ts`:

```typescript
// API Configuration
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';

// Hazard Level Weights
- Rain: 0-30 points
- Snow: 0-40 points
- Wind: 0-20 points
- Visibility: 0-30 points
- Clouds: 0-10 points
- Temperature: 0-20 points
```

### Customizing Thresholds

Edit `assessTerrainCondition()` in `weatherService.ts`:

```typescript
// Current thresholds
if (hazardLevel < 30) terrainCondition = 'CLEAR';
else if (hazardLevel < 60) terrainCondition = 'CAUTION';
else terrainCondition = 'HAZARDOUS';
```

---

## 📱 Mobile Responsive

All components are responsive and work on:
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px+)
- ✅ Tablet (768px+)
- ✅ Mobile (375px+)

---

## 🐛 Troubleshooting

### "Could not fetch weather data" Error

**Cause**: Missing or invalid API key

**Solution**:
1. Check `.env.local` file exists in `Frontend/` directory
2. Verify API key is correct
3. Restart development server: `npm run dev`

### Weather Not Updating

**Cause**: API rate limit or network issue

**Solution**:
1. Free tier: 1,000 calls/day limit
2. Check browser console for errors
3. System falls back to mock data if API fails

### Incorrect Weather Location

**Cause**: Checkpoint coordinates may be invalid

**Solution**:
- Verify convoy route has valid lat/lng coordinates
- Check mock data in `pilotVehicleMockData.ts`

---

## 🎯 Key Features Summary

✅ **Real-time weather** from OpenWeatherMap API  
✅ **Terrain hazard assessment** (0-100% risk score)  
✅ **Route weather forecast** for all checkpoints  
✅ **Design matching** HawkRoute theme  
✅ **Automatic updates** as vehicle progresses  
✅ **Fallback mode** if API unavailable  
✅ **Weather-based alerts** and notifications  
✅ **Responsive design** for all devices  

---

## 🔐 Security Notes

- API key is **client-side** (NEXT_PUBLIC prefix)
- Free tier is sufficient for development/demo
- For production, consider server-side API calls
- Never commit `.env.local` to version control

---

## 📊 API Usage Stats

**OpenWeatherMap Free Tier:**
- 1,000 API calls per day
- 60 calls per minute
- Current weather data
- 5-day forecast (optional)

**Typical Usage:**
- 5 checkpoints per route = 5 API calls
- 10 convoys tested per day = 50 calls
- Well within free tier limits ✅

---

## 🚀 Production Deployment

### Environment Variables

Add to your hosting platform (Vercel, Netlify, etc.):

```bash
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_production_api_key
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

### Upgrade to Paid Plan (Optional)

For production with high traffic:
- Professional: $40/month (100,000 calls/month)
- Enterprise: Custom pricing

---

## 📝 Code Structure

```
Frontend/src/
├── lib/
│   └── weatherService.ts          # Weather API integration
├── components/PilotVehicle/
│   ├── WeatherCard.tsx             # Weather display component
│   ├── VehicleStatusCard.tsx       # Updated styling
│   ├── PilotTimeline.tsx           # Timeline component
│   ├── EventLogPanel.tsx           # Event logging
│   └── ...
├── app/pilot-vehicle/
│   └── page.tsx                    # Main page (updated design)
└── types/
    └── pilotVehicle.ts             # TypeScript types
```

---

## 🎉 Ready to Use!

Your Pilot Vehicle page now features:
- ✅ Professional HawkRoute design theme
- ✅ Real-time weather integration
- ✅ Automatic hazard detection
- ✅ Beautiful, responsive UI

**Just add your API key and start monitoring! 🦅**

For questions or issues, check the main README or open an issue.
