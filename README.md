# 🚦 Traffic Management System

A real-time smart traffic management system with AI-powered vehicle and ambulance detection using YOLOv8.

---

## 📁 Project Structure

```
traffic-management-system/
├── backend/
│   ├── server.py          # FastAPI backend with YOLO detection
│   ├── requirements.txt   # Python dependencies
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── App.css
│   │   ├── index.css
│   │   ├── pages/
│   │   │   └── Dashboard.js
│   │   └── components/
│   │       ├── VideoLaneCard.js
│   │       └── TrafficAnalytics.js
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone & enter project
cd traffic-management-system

# 2. Copy env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. Launch everything
docker-compose up --build
```

- Frontend: http://localhost:3000  
- Backend API: http://localhost:8000/api  
- API Docs: http://localhost:8000/docs

---

### Option 2: Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
# OR: venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Create .env
cp .env.example .env
# Edit .env with your MongoDB URL

# Run server from inside the backend folder
python server.py

# Or from the project root
python -m uvicorn backend.server:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env
cp .env.example .env

# Start app
npm start
```

---

## 🔑 Features

| Feature | Description |
|---|---|
| 🎥 4-Lane Video Feed | Upload and process video for each lane |
| 🚗 Vehicle Detection | YOLOv8 detects cars, trucks, buses, motorcycles |
| 🚑 Ambulance Detection | Multi-method HSV color analysis (white/red/blue) |
| 🚦 Smart Signals | Auto-adjusts green duration based on density |
| ⚡ Emergency Priority | Ambulance → immediate 60s green override |
| 📊 Live Analytics | Real-time density charts and signal status |
| 🔔 Toast Alerts | Popup notification when ambulance detected |

---

## 🧠 Ambulance Detection Logic

The system uses 4 parallel detection methods:

1. **White body** — If >40% of vehicle ROI is white
2. **Red lights** — If >5% is red (HSV range)
3. **Blue lights** — If >5% is blue (HSV range)
4. **Brightness + color** — Bright vehicle (>160) + any red/blue accent (>3%)

Any match = ambulance detected → priority signal override.

---

## 🌐 API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/` | Health check |
| POST | `/api/upload-video/{lane_id}` | Upload video file |
| POST | `/api/process-frame/{lane_id}` | Process single frame |
| GET | `/api/traffic-state` | All lanes state |
| GET | `/api/lane-status/{lane_id}` | Single lane state |
| POST | `/api/reset` | Reset entire system |

---

## ⚙️ Environment Variables

### Backend `.env`
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=traffic_management
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### Frontend `.env`
```
REACT_APP_BACKEND_URL=http://localhost:8000
```
