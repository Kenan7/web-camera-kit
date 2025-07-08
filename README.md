# Web Camera Kit 📸

A **lightweight, mobile-optimized camera boilerplate** designed for AI vision and computer vision projects. Built with React, TypeScript, and modern web APIs.

## 🚀 Live Demo

**[Learn More On Product Site](https://camera-kit.netlify.app)**

**[Live Demo](https://web-camera-kit-demo.netlify.app/)**

<img src="./public/demo1.gif" alt="Example" width="700" />

## ✨ Key Features

### 📱 **Mobile-First Design**
- Responsive interface optimized for mobile and desktop
- PWA capabilities with offline support
- Dynamic viewport handling for seamless mobile experience

### 📷 **Advanced Camera Functionality**
- Photo and video capture with high-quality output
- Real-time camera switching (front/back on mobile, device selection on desktop)
- Live video processing with canvas-based frame manipulation
- Robust error handling and retry mechanisms

### 💾 **Smart Storage System**
- IndexedDB integration for persistent media storage
- Automatic data recovery when app reopens
- Gallery with thumbnail generation for videos

### 🎨 **Modern UI/UX**
- Beautiful animations powered by GSAP
- Glassmorphism design with backdrop blur effects
- Adaptive layouts across all screen sizes
- Accessibility-first approach

### ⚡ **Performance Optimized**
- Lazy loading and efficient resource management
- Service worker for offline functionality
- Memory leak prevention with proper cleanup

## 🎯 Perfect For

- **AI Vision Projects** - Ready-to-use camera input for ML models
- **Computer Vision Applications** - Real-time video processing
- **Educational Tools** - Clean codebase for learning
- **Prototyping** - Quick setup for camera-based proof of concepts

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript
- **AI Integration**: Google Gemini API for video analysis
- **Styling**: Tailwind CSS with custom animations
- **Icons**: Lucide React
- **Animations**: GSAP
- **Storage**: IndexedDB for media persistence
- **PWA**: Service Worker + Web App Manifest
- **Build Tool**: Vite with PWA plugin

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/web-camera-kit.git
cd web-camera-kit

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🚀 Deployment

### Netlify (Recommended)
```bash
npm run build
# Deploy the 'dist' folder to Netlify
```

Works with any static hosting: Vercel, GitHub Pages, AWS S3, Firebase Hosting.

## 🔧 Configuration

### Environment Variables
```env
# Google Gemini API Configuration (for video analysis)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Disable loading screen (optional)
VITE_APP_DISABLE_LOADING_SCREEN=false

# Disable PWA features (optional)
VITE_APP_DISABLE_PWA=false
```

### Google Gemini Integration
This kit includes built-in support for Google Gemini API video analysis:

1. **Get API Key**: Visit [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key) to get your free API key
2. **Set Environment Variable**: Create a `.env` file with your API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
3. **Video Analysis**: Videos are automatically processed with Gemini when recorded
4. **Custom Prompts**: Modify the analysis prompt in `src/hooks/useMediaCapture.ts`

The integration supports:
- Automatic video analysis on recording
- Customizable analysis prompts
- Persistent storage of analysis results
- Error handling and retry logic

### Camera Settings
```typescript
// Modify in src/components/CameraPreview.tsx
const videoConstraints = {
  width: { ideal: 1920, max: 2560 },
  height: { ideal: 1080, max: 1440 },
  frameRate: { ideal: 30, max: 60 }
};
```

## 📱 Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Photo Capture | ✅ | ✅ | ✅ | ✅ |
| Video Recording | ✅ | ✅ | ✅ | ✅ |
| Camera Switching | ✅ | ✅ | ✅ | ✅ |
| PWA Install | ✅ | ✅ | ✅ | ✅ |

**Minimum Versions**: Chrome 63+, Firefox 65+, Safari 12+, Edge 79+

## 🏗️ Architecture

### Project Structure
```
src/
├── components/          # React components
│   ├── CameraPreview.tsx    # Main camera interface
│   ├── MediaGallery.tsx     # Gallery with thumbnails
│   └── MediaPreviewModal.tsx # Full-screen viewer
├── hooks/               # Custom React hooks
│   ├── useMediaCapture.ts   # Media capture logic
│   └── useMobileDetection.ts # Device detection
├── utils/               # Utility functions
│   ├── indexedDb.ts         # Database operations
│   ├── geminiService.ts     # Google Gemini API integration
│   └── pwa.ts              # PWA management
└── types/               # TypeScript definitions
```

### Key Components

- **CameraPreview**: Camera initialization, switching, and capture
- **MediaGallery**: Media display with thumbnails and batch operations  
- **MediaPreviewModal**: Full-screen viewing and sharing
- **useMediaCapture**: Media state management and IndexedDB persistence
- **useMobileDetection**: Device type detection and responsive behavior

## 🔐 Security & Privacy

- **No external data transmission** - All media stays on device
- **Local storage only** - IndexedDB for client-side persistence
- **HTTPS required** - Enforced for camera API access

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Integration Examples

#### Google Gemini Video Analysis
```typescript
import { geminiService } from './utils/geminiService';

const analyzeVideo = async (videoBlob: Blob) => {
  const result = await geminiService.processVideo(videoBlob, {
    prompt: 'Describe the actions and objects in this video in detail.',
    model: 'gemini-1.5-flash'
  });
  
  if (result.success) {
    console.log('Analysis:', result.result);
  } else {
    console.error('Error:', result.error);
  }
};
```

#### AI Model Integration
```typescript
const processWithAI = async (imageBlob: Blob) => {
  const formData = new FormData();
  formData.append('image', imageBlob);
  
  const response = await fetch('/api/ai-process', {
    method: 'POST',
    body: formData
  });
  
  return response.json();
};
```

#### Computer Vision
```typescript
const processWithOpenCV = (canvas: HTMLCanvasElement) => {
  const src = cv.imread(canvas);
  // Your CV processing here
  cv.imshow('output', src);
  src.delete();
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [GSAP](https://greensock.com/gsap/) - Animation library
- [Vite](https://vitejs.dev/) - Build tool

---

*Ready to build camera-powered applications? Star ⭐ this repo and start creating!*