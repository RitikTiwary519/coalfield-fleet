# 🚛 Coalfield Fleet Management System

A real-time truck tracking and fleet management system with live GPS tracking, WebSocket streaming, and mobile device integration. Built with Next.js, TypeScript, and WebSocket technology.

![Fleet Management Dashboard](https://img.shields.io/badge/Status-Live%20Tracking-success)
![Next.js](https://img.shields.io/badge/Next.js-15.2.4-blueviolet)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange)

## 🌟 Features

### 🎯 **Core Functionality**
- **Real-time Truck Tracking** - Live GPS location updates every 2 seconds
- **Interactive Dashboard** - Visual map with truck positions and status
- **Network-based Management** - Group trucks by router networks
- **Mobile Device Support** - Turn any phone into a trackable truck
- **WebSocket Streaming** - Real-time data communication
- **Route Optimization** - Smart routing and fuel efficiency analysis

### 📱 **Mobile Integration**
- **GPS Auto-detection** - Automatic location capture from mobile devices
- **Dynamic Registration** - Register phones as new truck nodes
- **Live Position Streaming** - Real-time mobile tracking
- **Cross-platform Support** - Works on any device with GPS and browser

### 🌐 **Network Features**
- **Multi-router Support** - ROUTER_NORTH, ROUTER_SOUTH, ROUTER_EAST, ROUTER_MOBILE
- **Connection Management** - Monitor network status and signal strength
- **Scalable Architecture** - Support for unlimited truck connections
- **Automatic Reconnection** - Robust connection handling

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Modern web browser
- GPS-enabled device (for mobile tracking)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/coalfield-fleet.git
   cd coalfield-fleet
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   # or
   pnpm install --shamefully-hoist
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📱 Mobile Truck Setup

### For Phone/Tablet Tracking:

1. **Connect to same WiFi network** as the server
2. **Open browser** on mobile device
3. **Navigate to**: `http://[YOUR_SERVER_IP]:3000`
4. **Click**: "📱 Mobile Truck Mode"
5. **Click**: "🚛 Register as Truck"
6. **Allow GPS permissions**
7. **Click**: "▶️ Start Tracking"

**🎉 Your phone is now a tracked truck on the dashboard!**

## 🎮 How to Use

### 🖥️ **Dashboard Operations**

1. **View Truck Locations**
   - See all trucks on the interactive map
   - Click trucks for detailed information
   - Real-time position updates

2. **Network Monitoring**
   - Click "Show Truck Login" to see network groups
   - Click "Start Network Monitoring" for any router
   - View connection status and signal strength

3. **Start Live Tracking**
   - Click on any truck on the map
   - Click "Start Tracking" in the truck details panel
   - Watch real-time location updates

4. **Mobile Truck Mode**
   - Click "📱 Mobile Truck Mode"
   - Register your device as a truck
   - Enable live GPS tracking

### 🌐 **Network Architecture**

```
┌─────────────────┐    WebSocket     ┌──────────────────┐
│   Dashboard     │ ←──────────────→ │  WebSocket       │
│   (Frontend)    │   ws://8080      │  Server          │
└─────────────────┘                  └──────────────────┘
         ↕                                      ↕
    HTTP REST API                        Location Updates
         ↕                                      ↕
┌─────────────────┐                  ┌──────────────────┐
│  Truck Login    │                  │  Live Tracking   │
│  API Routes     │                  │  Simulation      │
└─────────────────┘                  └──────────────────┘
```

## 🔧 API Endpoints

### REST API
- `GET /api/trucks` - Get all trucks
- `GET /api/truck-login` - Get network groups
- `POST /api/truck-login` - Start monitoring/tracking
- `GET /api/websocket` - WebSocket server status
- `POST /api/device-registration` - Register mobile device

### WebSocket
- `ws://localhost:8080?router_id=ROUTER_NAME` - Real-time updates
- Supports multiple connections per router
- Automatic location streaming every 2 seconds

## 🏗️ Project Structure

```
coalfield-fleet/
├── app/
│   ├── page.tsx                 # Main dashboard
│   ├── layout.tsx              # App layout
│   └── api/
│       ├── websocket/           # WebSocket server
│       ├── truck-login/         # Truck management
│       ├── device-registration/ # Mobile device API
│       ├── trucks/              # Truck data
│       └── map-data/           # Map and routing
├── components/
│   ├── ui/                     # UI components
│   └── mobile-truck-registration.tsx
├── hooks/
│   └── use-websocket.ts        # WebSocket hook
├── lib/
│   ├── shared-data.ts          # Data management
│   └── utils.ts                # Utilities
└── public/                     # Static assets
```

## 🚀 Deployment

### Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Vercel will automatically deploy on push
   - Live URL: `https://your-app.vercel.app`

### Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

### Environment Variables

Create `.env.local` for custom configuration:
```env
NEXT_PUBLIC_WS_PORT=8080
NEXT_PUBLIC_UPDATE_INTERVAL=2000
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Real-time**: WebSocket (ws), Custom hooks
- **Maps**: Canvas-based interactive mapping
- **Mobile**: Geolocation API, Progressive Web App
- **Deployment**: Vercel, Node.js compatible

## 📊 Features Overview

| Feature | Status | Description |
|---------|--------|-------------|
| 🗺️ Interactive Map | ✅ | Canvas-based truck visualization |
| 📍 Live GPS Tracking | ✅ | Real-time location updates |
| 📱 Mobile Integration | ✅ | Phone/tablet as truck nodes |
| 🌐 WebSocket Streaming | ✅ | Real-time data communication |
| 🚛 Multi-truck Support | ✅ | Unlimited truck connections |
| 📊 Route Optimization | ✅ | Fuel efficiency analysis |
| 🔧 Network Management | ✅ | Router-based organization |
| 📈 Real-time Dashboard | ✅ | Live status monitoring |

## 🧪 Testing

### Local Testing
```bash
# Start development server
npm run dev

# Open multiple browser tabs to test multi-user
# Use mobile device on same network for GPS testing
```

### WebSocket Testing
```bash
# Test WebSocket connection
wscat -c ws://localhost:8080?router_id=ROUTER_NORTH
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Troubleshooting

### Common Issues

**WebSocket Connection Failed**
- Ensure port 8080 is available
- Check firewall settings
- Verify same network connectivity

**GPS Not Working on Mobile**
- Allow location permissions
- Use HTTPS in production
- Check browser compatibility

**Trucks Not Appearing**
- Refresh the page
- Check browser console for errors
- Verify API endpoints are responding

## 🌟 Acknowledgments

- Inspired by [SensorServer](https://github.com/UmerCodez/SensorServer) for WebSocket architecture
- Built with [shadcn/ui](https://ui.shadcn.com/) components
- Powered by [Next.js](https://nextjs.org/) and [Vercel](https://vercel.com/)

---

**🚛 Start tracking your fleet today!** | **📱 Turn any device into a truck!** | **🌍 Real-time worldwide tracking!**

Made with ❤️ for fleet management and IoT tracking applications.