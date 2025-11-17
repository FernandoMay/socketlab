# Socket Programming Lab 1 - Next.js Implementation

## 🚀 Complete Next.js Application

A modern, feature-rich Next.js application implementing cross-computer file transfer with real-time capabilities, advanced visualizations, and comprehensive network tools.

### ✨ Key Features

#### 🎨 Modern UI/UX Design
- **Glassmorphic Design**: Beautiful frosted glass effects with backdrop blur
- **Dark Theme**: Elegant dark color scheme with gradient backgrounds
- **Responsive Layout**: Mobile-first design that works on all devices
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions
- **Interactive Components**: Hover effects, loading states, and progress indicators

#### 🌐 Real-Time Capabilities
- **Live Network Topology**: Interactive P5.js-based network visualization
- **Real-Time Statistics**: Live charts and performance metrics
- **Active Transfer Monitoring**: Real-time progress tracking with visual feedback
- **WebSocket Communication**: Socket.IO integration for real-time updates
- **Multi-Client Support**: Handle multiple simultaneous connections

#### 📊 Advanced Analytics Dashboard
- **Transfer Statistics**: Comprehensive metrics and historical data
- **Performance Monitoring**: CPU, memory, and network usage tracking
- **File Type Analysis**: Distribution charts for different file types
- **Network Health**: Connection status and system monitoring
- **Activity Logging**: Timestamped events with filtering capabilities

#### 🔧 Network Tools Integration
- **Connection Testing**: Ping, traceroute, and port scanning
- **Bandwidth Testing**: Upload/download speed measurement
- **DNS Lookup**: Forward and reverse DNS resolution
- **Network Configuration**: Interface information and system details
- **Port Monitoring**: Real-time port monitoring and analysis

### 🏗️ Architecture

#### Frontend (Next.js)
```
pages/
├── _app.tsx              # Root application component
├── _document.tsx          # Document head management
├── index.tsx              # Main dashboard page
├── 404.tsx                # Custom 404 page
└── api/                    # API routes
    ├── stats.tsx
    ├── clients.tsx
    └── files.tsx

components/
├── FileTransfer.tsx         # File transfer component
├── NetworkTopology.tsx     # Network visualization
├── TransferStats.tsx        # Statistics dashboard
├── NetworkTools.tsx         # Network diagnostic tools
└── UI Components            # Reusable UI elements
```

#### Backend (Node.js + Socket.IO)
```
server/
├── server.js                # Main server with Socket.IO
├── routes/                  # API route handlers
├── middleware/               # Express middleware
└── utils/                   # Utility functions
```

### 🚀 Getting Started

#### Prerequisites
- Node.js 16+ 
- npm or yarn
- Modern web browser

#### Installation
```bash
# Clone the repository
git clone <repository-url>
cd javascript_implementation

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

#### Environment Variables
```bash
# Create .env.local file
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### 📱 Usage Instructions

#### 1. Dashboard Overview
- **Real-time Statistics**: View live transfer metrics and system performance
- **Network Status**: Monitor connection health and active users
- **Quick Actions**: Access common tasks and tools

#### 2. File Transfer
- **Drag & Drop**: Intuitive file selection with visual feedback
- **Progress Tracking**: Real-time progress bars and transfer statistics
- **Client Selection**: Choose from available connected clients
- **Transfer History**: View completed and ongoing transfers

#### 3. Network Topology
- **Interactive Visualization**: Click and drag network nodes
- **Multiple Topologies**: Switch between LAN, WAN, and Mesh networks
- **Real-time Animation**: Animated data flow and connection status
- **Performance Overlay**: Live network performance metrics

#### 4. Statistics Dashboard
- **Live Charts**: Real-time updates using Chart.js
- **File Type Analysis**: Distribution of transferred file types
- **Performance Metrics**: CPU, memory, and network usage
- **Historical Data**: Track trends over time

#### 5. Network Tools
- **Connection Testing**: Ping, traceroute, and port scanning
- **Bandwidth Testing**: Measure upload and download speeds
- **DNS Resolution**: Forward and reverse DNS lookups
- **Network Info**: Interface configuration and system details

### 🔧 API Endpoints

#### File Management
- `GET /api/files` - List uploaded files
- `POST /api/upload` - Upload new file
- `GET /api/download/:filename` - Download file
- `DELETE /api/files/:filename` - Delete file

#### Network Tools
- `GET /api/test-connection` - Test connection to host:port
- `GET /api/ping` - Ping host with statistics
- `GET /api/scan-ports` - Scan ports on target host
- `GET /api/bandwidth-test` - Test bandwidth
- `GET /api/traceroute` - Trace route to host
- `GET /api/dns-lookup` - DNS resolution
- `GET /api/network-config` - Network configuration

#### Statistics
- `GET /api/stats` - Get server statistics
- `GET /api/clients` - Get connected clients
- `GET /api/network-performance` - Performance metrics

### 🎨 UI Components

#### Glassmorphic Cards
```typescript
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  dark = false 
}) => {
  return (
    <div className={`
      bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6
      ${dark ? 'bg-black/30' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
};
```

#### Animated Progress Bars
```typescript
interface ProgressBarProps {
  progress: number;
  color?: string;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  progress, 
  color = 'blue', 
  animated = true 
}) => {
  return (
    <div className="w-full bg-white/10 rounded-full h-2">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5 }}
        className={`h-2 rounded-full bg-${color}-500`}
      />
    </div>
  );
};
```

### 📊 Data Visualization

#### Network Topology (P5.js)
- Interactive node manipulation
- Real-time data flow animation
- Multiple topology support
- Connection status visualization

#### Transfer Statistics (Chart.js)
- Real-time line charts for transfer speeds
- Doughnut charts for file type distribution
- Bar charts for performance metrics
- Responsive and animated visualizations

### 🔒 Security Features

#### Input Validation
- File type restrictions
- Size limitations
- Path traversal prevention
- XSS protection

#### Connection Security
- CORS configuration
- Rate limiting
- Input sanitization
- Error handling

### 📈 Performance Optimizations

#### Frontend
- Code splitting with dynamic imports
- Image optimization with Next.js Image
- Bundle size optimization
- Service Worker caching

#### Backend
- Efficient Socket.IO implementation
- Memory management for large files
- Connection pooling
- Database query optimization

### 🧪 Testing

#### Unit Tests
```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

#### Integration Tests
```bash
# Run E2E tests
npm run test:e2e
```

### 📚 Documentation

#### API Documentation
- Comprehensive endpoint documentation
- Request/response examples
- Error handling guide
- Authentication documentation

#### Component Documentation
- Props interface documentation
- Usage examples
- Best practices guide

### 🚀 Deployment

#### Development
```bash
npm run dev
```

#### Production
```bash
npm run build
npm start
```

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### 🎯 Educational Value

This Next.js implementation demonstrates:
- **Modern React Development**: Hooks, context, and performance optimization
- **Real-Time Communication**: WebSocket integration with Socket.IO
- **Advanced UI/UX**: Glassmorphism, animations, and responsive design
- **Data Visualization**: Interactive charts and network topology
- **API Development**: RESTful API design and implementation
- **Full-Stack Development**: Frontend and backend integration
- **Performance Optimization**: Caching, code splitting, and lazy loading

### 🔮 Future Enhancements

- **End-to-End Encryption**: Implement file encryption
- **Cloud Storage**: Add cloud storage backend support
- **Advanced Analytics**: Machine learning for transfer optimization
- **Mobile App**: React Native mobile application
- **Desktop App**: Electron desktop application

This Next.js implementation provides a complete, production-ready solution for cross-computer file transfer with modern web technologies and best practices.