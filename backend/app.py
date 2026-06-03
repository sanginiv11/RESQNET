from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import json
import requests as http_requests

app = Flask(__name__)
CORS(app)

# SQLite Database Setup
DATABASE = "resqnet.db"

def init_db():
    """Initialize SQLite database with tables"""
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    # Create requests table
    c.execute('''CREATE TABLE IF NOT EXISTS requests
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  emergencyType TEXT,
                  description TEXT,
                  lat REAL NOT NULL,
                  lng REAL NOT NULL,
                  priority TEXT,
                  timestamp TEXT,
                  eta_minutes INTEGER,
                  status TEXT DEFAULT 'pending')''')
    
    # Create responders table for vehicle tracking
    c.execute('''CREATE TABLE IF NOT EXISTS responders
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  request_id INTEGER,
                  service_type TEXT,
                  service_name TEXT,
                  current_lat REAL,
                  current_lng REAL,
                  destination_lat REAL,
                  destination_lng REAL,
                  status TEXT DEFAULT 'dispatched',
                  FOREIGN KEY(request_id) REFERENCES requests(id))''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Overpass API for Real OpenStreetMap Data
def fetch_nearby_services(lat, lng, service_type, radius=5000):
    """
    Fetch real nearby services using Overpass API
    service_type: 'hospital', 'fire_station', 'police'
    radius: search radius in meters
    """
    try:
        # Overpass API query for nearby amenities
        if service_type == "hospital":
            query = f"""[bbox={lat-0.05},{lng-0.05},{lat+0.05},{lng+0.05}];
                        (node["amenity"="hospital"];way["amenity"="hospital"];);
                        out center;"""
        elif service_type == "fire_station":
            query = f"""[bbox={lat-0.05},{lng-0.05},{lat+0.05},{lng+0.05}];
                        (node["amenity"="fire_station"];way["amenity"="fire_station"];);
                        out center;"""
        elif service_type == "police":
            query = f"""[bbox={lat-0.05},{lng-0.05},{lat+0.05},{lng+0.05}];
                        (node["amenity"="police"];way["amenity"="police"];);
                        out center;"""
        else:
            return []
        
        url = "http://overpass-api.de/api/interpreter"
        response = http_requests.post(url, data=query, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            services = []
            
            for element in data.get("elements", []):
                if "center" in element:
                    center = element["center"]
                elif "lat" in element:
                    center = {"lat": element["lat"], "lon": element["lon"]}
                else:
                    continue
                
                service = {
                    "name": element.get("tags", {}).get("name", f"Unnamed {service_type}"),
                    "lat": center["lat"],
                    "lng": center["lon"],
                    "phone": element.get("tags", {}).get("phone", "N/A"),
                    "distance": f"{((lat - center['lat'])**2 + (lng - center['lon'])**2)**0.5 * 111:.1f} km"
                }
                services.append(service)
            
            return services[:10]  # Return top 10 results
        else:
            return []
    except Exception as e:
        print(f"Error fetching from Overpass API: {e}")
        # Return fallback data if API fails
        return get_fallback_services(lat, lng, service_type)

def get_fallback_services(lat, lng, service_type):
    """Fallback to hardcoded data if API fails"""
    if service_type == "hospital":
        return [
            {"name": "City General Hospital", "lat": lat + 0.01, "lng": lng + 0.01, "phone": "1234567890", "distance": "2.3 km"},
            {"name": "Apollo Medical Center", "lat": lat - 0.01, "lng": lng - 0.01, "phone": "1234567891", "distance": "1.8 km"},
        ]
    elif service_type == "fire_station":
        return [
            {"name": "Central Fire Station", "lat": lat, "lng": lng, "phone": "101", "distance": "1.5 km"},
            {"name": "North Fire Station", "lat": lat + 0.02, "lng": lng, "phone": "101", "distance": "2.2 km"},
        ]
    elif service_type == "police":
        return [
            {"name": "Central Police Station", "lat": lat, "lng": lng, "phone": "100", "distance": "1.2 km"},
            {"name": "North Police Station", "lat": lat + 0.02, "lng": lng, "phone": "100", "distance": "2.1 km"},
        ]
    return []
# ---- HOME ----
@app.route("/")
def home():
    return jsonify({"message": "ResQNet Backend Running", "status": "online"})


# ---- SUBMIT REQUEST ----
@app.route("/request-help", methods=["POST"])
def request_help():
    data = request.json

    if not data:
        return jsonify({"error": "No data received"}), 400

    # Validate required fields
    if not data.get("name") or data.get("lat") is None or data.get("lng") is None:
        return jsonify({"error": "Missing required fields: name, lat, lng"}), 400

    description = (data.get("description") or "").lower()

    # ---- PRIORITY ENGINE ----
    score = 0
    keywords = ["trapped", "injured", "child", "elderly", "critical", "medical", "accident", "severe"]

    for word in keywords:
        if word in description:
            score += 20

    if score >= 60:
        priority = "CRITICAL"
    elif score >= 20:
        priority = "HIGH"
    else:
        priority = "MEDIUM"

    timestamp = datetime.now().strftime("%d %b %Y, %I:%M %p")
    eta_minutes = 3 if priority == "CRITICAL" else 5

    # Save to database
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    c.execute('''INSERT INTO requests 
                 (name, emergencyType, description, lat, lng, priority, timestamp, eta_minutes)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
              (data.get("name"), data.get("emergencyType"), data.get("description"),
               data.get("lat"), data.get("lng"), priority, timestamp, eta_minutes))
    
    request_id = c.lastrowid
    conn.commit()

    # Dispatch responders based on emergency type
    emergency_type = data.get("emergencyType", "Medical")
    service_type = "hospital" if emergency_type == "Medical" else "fire_station" if emergency_type == "Fire" else "police"
    
    nearby_services = fetch_nearby_services(data.get("lat"), data.get("lng"), service_type, radius=5000)
    
    if nearby_services:
        closest_service = nearby_services[0]
        c.execute('''INSERT INTO responders 
                     (request_id, service_type, service_name, current_lat, current_lng, 
                      destination_lat, destination_lng, status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  (request_id, service_type, closest_service["name"], 
                   closest_service["lat"], closest_service["lng"],
                   data.get("lat"), data.get("lng"), "dispatched"))
        conn.commit()

    conn.close()

    return jsonify({
        "id": request_id,
        "name": data.get("name"),
        "emergencyType": data.get("emergencyType"),
        "priority": priority,
        "timestamp": timestamp,
        "eta_minutes": eta_minutes
    }), 201


# ---- GET ALL REQUESTS ----
@app.route("/requests", methods=["GET"])
def get_requests():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM requests ORDER BY id DESC")
    requests_list = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return jsonify(requests_list)

# ---- GET RESPONDERS (FOR VEHICLE TRACKING) ----
@app.route("/responders", methods=["GET"])
def get_responders():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    c.execute("SELECT * FROM responders WHERE status = 'dispatched'")
    responders_list = [dict(row) for row in c.fetchall()]
    
    conn.close()
    return jsonify(responders_list)

# ---- UPDATE RESPONDER LOCATION ----
@app.route("/responders/<int:responder_id>", methods=["PUT"])
def update_responder(responder_id):
    data = request.json
    
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    c.execute('''UPDATE responders 
                 SET current_lat = ?, current_lng = ?, status = ?
                 WHERE id = ?''',
              (data.get("lat"), data.get("lng"), data.get("status", "dispatched"), responder_id))
    
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Responder updated"}), 200

# ---- GET NEARBY HOSPITALS ----
@app.route("/nearby/hospitals", methods=["POST"])
def nearby_hospitals():
    data = request.json
    lat = data.get("lat")
    lng = data.get("lng")
    
    hospitals = fetch_nearby_services(lat, lng, "hospital")
    return jsonify(hospitals)

# ---- GET NEARBY FIRE STATIONS ----
@app.route("/nearby/fire-stations", methods=["POST"])
def nearby_fire_stations():
    data = request.json
    lat = data.get("lat")
    lng = data.get("lng")
    
    stations = fetch_nearby_services(lat, lng, "fire_station")
    return jsonify(stations)

# ---- GET NEARBY POLICE STATIONS ----
@app.route("/nearby/police-stations", methods=["POST"])
def nearby_police_stations():
    data = request.json
    lat = data.get("lat")
    lng = data.get("lng")
    
    stations = fetch_nearby_services(lat, lng, "police")
    return jsonify(stations)

# ---- CLEAR ALL REQUESTS (FOR TESTING) ----
@app.route("/requests/clear", methods=["POST"])
def clear_requests():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    
    c.execute("DELETE FROM responders")
    c.execute("DELETE FROM requests")
    
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Cleared all requests and responders"}), 200


# ---- RUN SERVER ----
if __name__ == "__main__":
    app.run(debug=True)
