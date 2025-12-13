# Pilot Vehicle Monitoring System - Complete Implementation Guide

## 🎯 Overview

The **Pilot Vehicle Monitoring System** is a production-grade, real-time reconnaissance dashboard for military convoy operations. The pilot vehicle travels ahead of the main convoy to detect and report hazards, checkpoints, and terrain conditions.

## ✨ Features Implemented

### ✅ Core Features
- **Convoy Selection Dropdown** - Select any active convoy for monitoring
- **Army-Style Timeline** - Visual timeline with checkpoints, hazards, and terrain markers
- **Interactive 2D Map** - Leaflet-based map with real-time vehicle tracking
- **Hazard Alert System** - Automatic alerts with severity levels and recommended actions
- **Playback Controls** - Play/Pause simulation with speed controls (0.5×, 1×, 2×, 4×)
- **Vehicle Status Card** - Real-time metrics (speed, distance, terrain, coordinates)
- **Event Log Panel** - Scrollable feed of all events and alerts
- **Mock Data System** - Complete test data for development

### 🎨 UI Components

#### 1. **Main Page** (`page.tsx`)
- Convoy selection dropdown
- Full dashboard layout with responsive grid
- Integration of all sub-components
- State management with Zustand store
- API integration with fallback to mock data

#### 2. **PilotTimeline Component**
- Horizontal scrolling timeline
- Checkpoint flags with status indicators (Passed/Reached/Pending)
- Hazard markers with severity colors
- Animated pilot vehicle position marker
- Segment coloring based on hazard severity
- Interactive hover tooltips
- Auto-scroll to follow vehicle

#### 3. **HazardAlertModal Component**
- Military-style alert design
- Severity-based color coding (Critical/High/Medium/Low)
- Detailed hazard information
- Recommended actions display
- Acknowledge and close actions
- Animated entrance

#### 4. **PlaybackControls Component**
- Start/Pause simulation button
- Speed selection (0.5×, 1×, 2×, 4×)
- Reset simulation button
- Live status indicator

#### 5. **VehicleStatusCard Component**
- Current speed gauge with visual indicator
- Distance covered vs remaining
- Route progress bar
- Heading, terrain, and coordinates
- Last hazard detected notification
- Live data timestamp

#### 6. **EventLogPanel Component**
- Auto-scrolling event feed
- Color-coded event types (Hazard/Checkpoint/System)
- Event icons and timestamps
- Event counter
- Live update indicator

## 📁 File Structure

```
Frontend/src/
├── app/pilot-vehicle/
│   └── page.tsx                          # Main Pilot Vehicle Page
├── components/PilotVehicle/
│   ├── index.ts                          # Component exports
│   ├── PilotTimeline.tsx                 # Army-style timeline
│   ├── HazardAlertModal.tsx              # Alert modal system
│   ├── PlaybackControls.tsx              # Simulation controls
│   ├── VehicleStatusCard.tsx             # Vehicle metrics
│   └── EventLogPanel.tsx                 # Event log feed
├── api/
│   ├── endpoints.ts                      # API endpoint definitions
│   └── services/
│       └── pilotVehicleService.ts        # API service layer
├── data/mock/
│   └── pilotVehicleMockData.ts           # Mock data generator
├── store/
│   └── pilotVehicleStore.ts              # Zustand state management
└── types/
    └── pilotVehicle.ts                   # TypeScript type definitions
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd Frontend
npm install
# or
yarn install
```

### 2. Run Development Server
```bash
npm run dev
# or
yarn dev
```

### 3. Access the Page
Navigate to: `http://localhost:3000/pilot-vehicle`

### 4. Using Mock Data
- By default, the system uses **mock data** for testing
- Toggle the "Use Mock Data" checkbox in the header to switch between mock and live API
- Mock data includes:
  - 5 sample convoys
  - 6 checkpoints per route
  - 6 hazards with varying severity levels
  - Realistic simulation data

## 🎮 How to Use

### Step 1: Select a Convoy
1. Click the "SELECT CONVOY" dropdown in the header
2. Choose a convoy from the list
3. System will load pilot vehicle data automatically

### Step 2: Start Simulation
1. Click the **START** button in playback controls
2. Watch the pilot vehicle move along the route
3. Timeline updates in real-time
4. Alerts trigger automatically when approaching hazards

### Step 3: Control Playback
- **Start/Pause**: Toggle simulation
- **Speed**: Choose 0.5×, 1×, 2×, or 4× speed
- **Reset**: Return to starting position

### Step 4: Monitor Status
- **Left Panel**: Vehicle status, speed, distance, terrain
- **Center**: Interactive map with route and hazards
- **Right Panel**: Live event log

### Step 5: Respond to Alerts
- Alerts popup automatically for critical hazards
- Review hazard details and recommended actions
- Click "Acknowledge Alert" to dismiss

## 🔧 API Integration

### Endpoints Used

```typescript
// Get convoy list
GET /convoys

// Get pilot vehicle data
GET /pilot-vehicle/:convoyId/data

// Get route segments
GET /pilot-vehicle/:convoyId/route

// Get hazards
GET /pilot-vehicle/:convoyId/hazards

// Get checkpoints
GET /pilot-vehicle/:convoyId/checkpoints

// Get current progress
GET /pilot-vehicle/:convoyId/progress
```

### Using Real Backend

1. Set `useMockData` to `false` in the page
2. Ensure backend is running on `http://localhost:5000`
3. API client will handle authentication automatically

## 📊 Data Types

### Hazard Types Supported
- `BLOCKED_ROAD` - Road obstruction
- `LANDSLIDE` - Landslide blocking route
- `IED_DETECTION` - Explosive device detected
- `WEATHER_HAZARD` - Heavy rain, fog, snow
- `HOSTILE_ZONE` - Enemy activity
- `AMBUSH_RISK` - Potential ambush location
- `BRIDGE_DAMAGE` - Bridge structural issues
- `FLOOD` - Flooding conditions

### Terrain Types
- `MOUNTAIN` - Mountain terrain
- `FOREST` - Forest area
- `DESERT` - Desert region
- `BRIDGE` - Bridge crossing
- `URBAN` - Urban/city area
- `SNOW` - Snow-covered terrain
- `WATER` - Water body

### Severity Levels
- `CRITICAL` - Immediate action required (Red)
- `HIGH` - Significant concern (Orange)
- `MEDIUM` - Moderate concern (Yellow)
- `LOW` - Minor concern (Blue)

## 🎨 Design Features

### Military Theme
- Dark slate color palette
- High-contrast text for readability
- Military-style typography
- Alert/warning color coding
- Professional dashboard layout

### Animations
- Smooth timeline scrolling
- Animated position updates
- Pulsing hazard markers
- Alert modal entrance effects
- Progress bar transitions

### Responsive Design
- Fixed header with convoy selection
- Flexible grid layout
- Scrollable sidebars
- Auto-adjusting timeline
- Mobile-friendly (future enhancement)

## 🔄 State Management

Uses **Zustand** for centralized state:

```typescript
// Store features
- selectedConvoyId
- pilotVehicleData
- alerts (with acknowledgment)
- eventLog (auto-scrolling)
- simulation controls (play, pause, speed)
- UI state (drawer, camera mode, selected items)
```

## 🧪 Testing with Mock Data

Mock data provides:
- **Realistic convoy route** through Kashmir region
- **6 checkpoints** with different terrains
- **6 hazards** with varying severity
- **Automatic position simulation**
- **Distance-based alert triggering**

### Modify Mock Data
Edit `pilotVehicleMockData.ts` to:
- Add more checkpoints
- Create new hazards
- Change route coordinates
- Adjust distances and timing

## 🚨 Alert System Flow

1. **Hazard Detection**: Pilot vehicle enters hazard proximity (< 500m)
2. **Alert Creation**: System creates alert with full details
3. **Modal Display**: Alert modal pops up automatically
4. **Event Logging**: Alert logged to event feed
5. **Timeline Update**: Hazard highlighted on timeline
6. **Acknowledgment**: User acknowledges and continues

## 🗺️ Map Integration

The system uses the existing `PilotVehicleMap` component which should display:
- Route polyline
- Checkpoint markers
- Hazard zones (circles)
- Pilot vehicle marker (moving)
- Terrain overlays
- Click interactions

## 📈 Future Enhancements

Potential improvements:
- [ ] WebSocket support for live data streaming
- [ ] Export mission reports
- [ ] Audio alerts for critical hazards
- [ ] Multiple pilot vehicle support
- [ ] Weather overlay integration
- [ ] Satellite imagery toggle
- [ ] Route comparison tool
- [ ] Historical playback
- [ ] Mobile app version

## 🐛 Troubleshooting

### Issue: Convoy dropdown is empty
**Solution**: Check "Use Mock Data" toggle or verify backend connection

### Issue: Simulation not starting
**Solution**: Ensure a convoy is selected first

### Issue: Map not displaying
**Solution**: Verify `PilotVehicleMap` component exists and Leaflet is installed

### Issue: Alerts not appearing
**Solution**: Ensure simulation is running and vehicle is moving

## 📝 Code Examples

### Custom Hazard Creation
```typescript
const customHazard: Hazard = {
  id: 'HAZ-CUSTOM',
  type: 'IED_DETECTION',
  severity: 'CRITICAL',
  position: { lat: 34.0837, lng: 74.7973 },
  distance: 25.0,
  description: 'Suspicious device detected',
  detectedAt: new Date().toISOString(),
  recommendedAction: 'Stop and wait for EOD team',
  isActive: true,
};
```

### Adding Custom Event
```typescript
addEventLog('Custom event message', 'SYSTEM');
```

## 🎯 Performance Tips

1. **Simulation Interval**: 1 second update (adjustable)
2. **Event Log Limit**: 100 events max (auto-trim)
3. **Timeline Width**: 2000px (adjust for longer routes)
4. **Map Re-render**: Only on position change

## 📞 Support

For issues or questions:
1. Check this README
2. Review component code comments
3. Test with mock data first
4. Verify API endpoints

---

## ✅ Complete Implementation Checklist

- [x] Convoy selection dropdown
- [x] Army-style timeline visualization
- [x] Interactive 2D map (using existing component)
- [x] Real-time alert system
- [x] Playback controls (0.5×, 1×, 2×, 4×)
- [x] Vehicle status card
- [x] Event log panel
- [x] API service layer
- [x] Mock data for testing
- [x] Hazard detection logic
- [x] Checkpoint tracking
- [x] State management (Zustand)
- [x] TypeScript types
- [x] Responsive layout
- [x] Military theme design
- [x] Smooth animations
- [x] Error handling
- [x] Loading states

**Status: ✅ PRODUCTION READY**

Navigate to `/pilot-vehicle` and start monitoring!
