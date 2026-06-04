# RESQNET — AI-Assisted Emergency Response System

> A real-time emergency response web application that lets users report emergencies, view nearby services on a live map, and receive AI-prioritized dispatch with ETA tracking.

---

## 🌐 Live Deployment

| Service | URL |
|---------|-----|
| 🖥️ Frontend (Netlify) | [https://resqnetapp.netlify.app](https://resqnetapp.netlify.app) |
| ⚙️ Backend API (Render) | [https://resqnet-mktu.onrender.com](https://resqnet-mktu.onrender.com) |

---

## 📸 Features

- 🆘 **Submit Emergency Requests** — Report Medical, Fire, Flood, Earthquake, Accident, Drowning, and more
- 🤖 **AI Priority Engine** — Automatically classifies requests as CRITICAL, HIGH, or MEDIUM based on description keywords
- 📍 **GPS Location Detection** — One-click location capture using the browser's Geolocation API
- 🔍 **Location Name Search** — Search any address or place name (powered by OpenStreetMap Nominatim, no API key needed)
- 🗺️ **Live Interactive Map** — Real nearby hospitals, fire stations, and police stations pulled from OpenStreetMap
- 🕐 **ETA Tracking** — Countdown timer + live map marker showing responder arrival time after submission
- 🚑 **Responder Dispatch** — Automatically dispatches the nearest service unit based on emergency type
- 📊 **Live Dashboard** — Real-time statistics for total, critical, high, and medium priority requests
- 🌙 **Dark / Light Mode** — Toggle between themes
- 📞 **Emergency Contacts** — Quick-access buttons for Police (100), Ambulance (102), Fire Brigade (101), Disaster Management (108)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite 8 | Build tool |
| React Leaflet + Leaflet.js | Interactive maps |
| OpenStreetMap (Nominatim) | Free geocoding (place name → coordinates) |
| Netlify | Hosting & deployment |

### Backend
| Technology | Purpose |
|------------|---------|
| Python 3.10 | Runtime |
| Flask | Web framework |
| Flask-CORS | Cross-origin requests |
| SQLite | Database (requests & responders) |
| Overpass API (OpenStreetMap) | Real nearby services data |
| Gunicorn | Production WSGI server |
| Render | Hosting & deployment |

---

## 📁 Project Structure

```
RESQNET/
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   ├── runtime.txt         # Python version (3.10.13)
│   └── resqnet.db          # SQLite database
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React application
│   │   ├── App.css         # Styles
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── vite.config.js
└── requirements.txt
```

---

## ⚙️ API Endpoints

Base URL: `https://resqnet-mktu.onrender.com`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/request-help` | Submit a new emergency request |
| `GET` | `/requests` | Fetch all emergency requests |
| `GET` | `/responders` | Fetch all active responders |
| `PUT` | `/responders/<id>` | Update a responder's location/status |
| `POST` | `/nearby/hospitals` | Get nearby hospitals for a lat/lng |
| `POST` | `/nearby/fire-stations` | Get nearby fire stations for a lat/lng |
| `POST` | `/nearby/police-stations` | Get nearby police stations for a lat/lng |
| `POST` | `/requests/clear` | Clear all requests (for testing) |

### Example — Submit Emergency Request

```json
POST /request-help
Content-Type: application/json

{
  "name": "Sangini",
  "emergencyType": "Medical",
  "description": "Elderly person injured and trapped",
  "lat": 22.7196,
  "lng": 75.8577
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Sangini",
  "emergencyType": "Medical",
  "priority": "CRITICAL",
  "timestamp": "04 Jun 2026, 10:30 AM",
  "eta_minutes": 3
}
```

### Priority Logic

The backend scores each request based on keywords in the description:

| Keywords Found | Priority | ETA |
|----------------|----------|-----|
| 3+ keywords (score ≥ 60) | 🔴 CRITICAL | 3 mins |
| 1–2 keywords (score ≥ 20) | 🟠 HIGH | 5 mins |
| No keywords | 🟡 MEDIUM | 5 mins |

**Trigger keywords:** `trapped`, `injured`, `child`, `elderly`, `critical`, `medical`, `accident`, `severe`

---

## 🚀 Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Server runs at `http://127.0.0.1:5000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

> **Note:** For local development, change the API base URL in `frontend/src/App.jsx` from `https://resqnet-mktu.onrender.com` to `http://127.0.0.1:5000`.

---

## 🔮 Future Scope

- 🌊 Flood level monitoring via IoT sensors
- 📡 GPS rescue beacons integration
- 🌡️ Environmental monitoring nodes
- 🔔 Automatic disaster alert notifications
- 📱 Mobile app (React Native)
- 🗣️ Voice-based emergency reporting
- 🤝 Multi-agency coordination dashboard

---

## 👩‍💻 Author

**Sangini** — [github.com/sanginiv11](https://github.com/sanginiv11)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
