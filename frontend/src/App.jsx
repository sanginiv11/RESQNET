import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom Icons
const hospitalIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const fireIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const policeIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// Dummy hospital data - Many hospitals nearby
const hospitalData = [
  { name: "City General Hospital", lat: 20.5937, lng: 78.9629, phone: "1234567890", distance: "2.3 km" },
  { name: "Apollo Medical Center", lat: 20.5945, lng: 78.9640, phone: "1234567891", distance: "1.8 km" },
  { name: "St. Mary's Hospital", lat: 20.5925, lng: 78.9620, phone: "1234567892", distance: "3.1 km" },
  { name: "Max Healthcare", lat: 20.5950, lng: 78.9650, phone: "1234567893", distance: "2.9 km" },
  { name: "Fortis Hospital", lat: 20.5915, lng: 78.9610, phone: "1234567894", distance: "4.2 km" },
  { name: "AIIMS Delhi", lat: 20.5945, lng: 78.9655, phone: "1234567895", distance: "3.5 km" },
  { name: "Indraprastha Apollo", lat: 20.5925, lng: 78.9635, phone: "1234567896", distance: "2.7 km" },
  { name: "Batra Hospital", lat: 20.5955, lng: 78.9620, phone: "1234567897", distance: "3.8 km" },
];

// Fire Brigade Stations
const fireStations = [
  { name: "Central Fire Station", lat: 20.5940, lng: 78.9635, phone: "101", distance: "1.5 km" },
  { name: "North Delhi Fire Station", lat: 20.5960, lng: 78.9650, phone: "101", distance: "2.2 km" },
  { name: "South Delhi Fire Station", lat: 20.5920, lng: 78.9615, phone: "101", distance: "2.8 km" },
  { name: "East Delhi Fire Station", lat: 20.5945, lng: 78.9665, phone: "101", distance: "3.2 km" },
  { name: "West Delhi Fire Station", lat: 20.5930, lng: 78.9600, phone: "101", distance: "2.5 km" },
];

// Police Stations
const policeStations = [
  { name: "Central Police Station", lat: 20.5938, lng: 78.9638, phone: "100", distance: "1.2 km" },
  { name: "North Police Station", lat: 20.5955, lng: 78.9645, phone: "100", distance: "2.1 km" },
  { name: "South Police Station", lat: 20.5920, lng: 78.9620, phone: "100", distance: "2.6 km" },
  { name: "East Police Station", lat: 20.5948, lng: 78.9660, phone: "100", distance: "3.0 km" },
  { name: "West Police Station", lat: 20.5928, lng: 78.9605, phone: "100", distance: "2.4 km" },
];

// Emergency contacts
const emergencyContacts = [
  { name: "Police", number: "100" },
  { name: "Ambulance", number: "102" },
  { name: "Fire Brigade", number: "101" },
  { name: "Disaster Management", number: "108" },
];

function App() {
  const [name, setName] = useState("");
  const [emergencyType, setEmergencyType] = useState("Medical");
  const [description, setDescription] = useState("");
  const [requests, setRequests] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [customLocation, setCustomLocation] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPriority, setFilterPriority] = useState("ALL");
  const [theme, setTheme] = useState("light");
  const [lastSubmissionTime, setLastSubmissionTime] = useState(null);
  const [eta, setEta] = useState(null);
  const [reportedService, setReportedService] = useState(null);
  const [responders, setResponders] = useState([]);
  const [nearbyServices, setNearbyServices] = useState({ hospitals: [], fire: [], police: [] });

  // SAFE DATA LOADING
  const loadRequests = async () => {
    try {
      const response = await fetch("https://resqnet-mktu.onrender.com/requests");
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch error:", err);
      setRequests([]);
    }
  };

  // Load responders (vehicle tracking)
  const loadResponders = async () => {
    try {
      const response = await fetch("https://resqnet-mktu.onrender.com/responders");
      const data = await response.json();
      setResponders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Responder fetch error:", err);
      setResponders([]);
    }
  };

  // Fetch real nearby services
  const loadNearbyServices = async (lat, lng) => {
    try {
      const [hospitalsRes, fireRes, policeRes] = await Promise.all([
        fetch("https://resqnet-mktu.onrender.com/nearby/hospitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng })
        }),
        fetch("https://resqnet-mktu.onrender.com/nearby/fire-stations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng })
        }),
        fetch("https://resqnet-mktu.onrender.com/nearby/police-stations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng })
        })
      ]);

      const hospitals = await hospitalsRes.json();
      const fire = await fireRes.json();
      const police = await policeRes.json();

      setNearbyServices({
        hospitals: Array.isArray(hospitals) ? hospitals : [],
        fire: Array.isArray(fire) ? fire : [],
        police: Array.isArray(police) ? police : []
      });
    } catch (err) {
      console.error("Nearby services fetch error:", err);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          setUserLocation(location);
          loadNearbyServices(location.lat, location.lng);
        },
        () => {
          setGpsError("Location permission denied");
        }
      );
    }
    loadRequests();
    loadResponders();
    const interval = setInterval(() => {
      loadRequests();
      loadResponders();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // ETA countdown timer
  useEffect(() => {
    if (!lastSubmissionTime || !eta) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((new Date() - lastSubmissionTime) / 60000);
      const remaining = eta - elapsed;

      if (remaining <= 0) {
        setEta(null);
        setLastSubmissionTime(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastSubmissionTime, eta]);

  // GPS
  const getGPSLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("GPS not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsError("");
      },
      () => setGpsError("Permission denied")
    );
  };

  // Manual Location Handler
  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid latitude and longitude");
      return;
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert("Invalid coordinates. Lat: -90 to 90, Lng: -180 to 180");
      return;
    }

    setCustomLocation({ lat, lng });
    setUseCustomLocation(true);
    setGpsError("");
  };

  // SUBMIT REQUEST (FIXED)
  const submitRequest = async () => {
    const locationToUse = useCustomLocation ? customLocation : userLocation;

    if (!locationToUse) {
      alert("Please provide a location using GPS or manual entry");
      return;
    }

    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }

    if (!description.trim()) {
      alert("Please enter a description of the emergency");
      return;
    }

    try {
      const res = await fetch("https://resqnet-mktu.onrender.com/request-help", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          emergencyType,
          description,
          lat: locationToUse.lat,
          lng: locationToUse.lng,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.error || "Failed to submit request"}`);
        return;
      }

      const data = await res.json();
      console.log("Submitted:", data);

      alert(`Emergency request submitted! ETA: ${data.eta_minutes} minutes`);

      setName("");
      setEmergencyType("Medical");
      setDescription("");
      setManualLat("");
      setManualLng("");

      // Set submission time and ETA
      setLastSubmissionTime(new Date());
      setEta(data.eta_minutes);

      // Set the reported service
      let service = "Ambulance";
      if (emergencyType === "Fire") service = "Fire Brigade";
      else if (emergencyType === "Flood" || emergencyType === "Earthquake") service = "Disaster Management";
      else if (emergencyType === "Accident") service = "Police";
      setReportedService(service);

      loadRequests();
    } catch (err) {
      console.error("Submit failed:", err);
    }
  };

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = (req.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority =
      filterPriority === "ALL" || req.priority === filterPriority;

    return matchesSearch && matchesPriority;
  });

  const criticalCount = requests.filter((r) => r.priority === "CRITICAL").length;
  const highCount = requests.filter((r) => r.priority === "HIGH").length;
  const mediumCount = requests.filter((r) => r.priority === "MEDIUM").length;

  // Theme styles
  const themeStyles = {
    light: {
      bg: "#ff4444", // Red background
      text: "#000000", // Black text
      border: "#000000",
      cardBg: "#ffffff",
      inputBg: "#ffffff",
      headerBg: "#ff4444",
      buttonBg: "#ffc0cb", // Baby pink
      buttonText: "#000000",
    },
    dark: {
      bg: "#dc143c", // Cherry red
      text: "#ffffff", // White text
      border: "#ffffff",
      cardBg: "#b21030",
      inputBg: "#8b0a1a",
      headerBg: "#b21030",
      buttonBg: "#ff6b8a",
      buttonText: "#ffffff",
    },
  };

  const currentTheme = themeStyles[theme];

  // CSS Animations
  const animationStyles = `
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes gradient {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .pulse-animation {
      animation: pulse 2s infinite;
    }

    .slide-down {
      animation: slideDown 0.5s ease-out;
    }

    .spin-animation {
      animation: spin 2s linear infinite;
    }

    .gradient-bg {
      background: linear-gradient(-45deg, #ff4444, #ff6666, #ff3333, #ff5555);
      background-size: 400% 400%;
      animation: gradient 8s ease infinite;
    }
  `;

  return (
    <div>
      <style>{animationStyles}</style>
      <div
        style={{
          padding: "20px",
          maxWidth: "1200px",
          margin: "auto",
          backgroundColor: currentTheme.bg,
          color: currentTheme.text,
          minHeight: "100vh",
          transition: "all 0.3s ease",
          backgroundImage: theme === "light" ? "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1200 600\"><rect fill=\"%23ff4444\" width=\"1200\" height=\"600\"/><circle cx=\"20%\" cy=\"20%\" r=\"200\" fill=\"%23ff6666\" opacity=\"0.3\"/><circle cx=\"80%\" cy=\"80%\" r=\"250\" fill=\"%23ff3333\" opacity=\"0.3\"/></svg>')" : "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 1200 600\"><rect fill=\"%23dc143c\" width=\"1200\" height=\"600\"/><circle cx=\"20%\" cy=\"20%\" r=\"200\" fill=\"%238b0a1a\" opacity=\"0.5\"/><circle cx=\"80%\" cy=\"80%\" r=\"250\" fill=\"%23b21030\" opacity=\"0.5\"/></svg>')",
          backgroundAttachment: "fixed",
          backgroundSize: "cover",
        }}
      >
      {/* THEME TOGGLE */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            backgroundColor: currentTheme.buttonBg,
            color: currentTheme.buttonText,
            border: "2px solid #000",
            borderRadius: "5px",
            fontWeight: "bold",
          }}
        >
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </button>
      </div>

      {/* HEADER */}
      <h1
        style={{
          textAlign: "center",
          fontSize: "4em",
          fontWeight: "900",
          color: "#000000",
          margin: "20px 0 10px 0",
          letterSpacing: "2px",
        }}
      >
        RESQNET
      </h1>
      <p
        style={{
          textAlign: "center",
          fontSize: "1.3em",
          color: theme === "light" ? "#000000" : "#ffffff",
          marginBottom: "30px",
        }}
      >
        AI-Assisted Emergency Response System
      </p>

      {/* EMERGENCY CONTACTS SECTION */}
      <div
        style={{
          background: currentTheme.cardBg,
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: `2px solid ${currentTheme.border}`,
        }}
      >
        <h2 style={{ color: currentTheme.text }}>Emergency Contacts</h2>
        <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
          {emergencyContacts.map((contact) => (
            <button
              key={contact.name}
              onClick={() => alert(`Call ${contact.number} for ${contact.name}`)}
              style={{
                padding: "15px 20px",
                fontSize: "1em",
                cursor: "pointer",
                backgroundColor: "#ffc0cb",
                color: "#000000",
                border: "3px solid #000000",
                borderRadius: "8px",
                fontWeight: "bold",
                minWidth: "150px",
                transition: "transform 0.2s",
              }}
              onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
              onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
            >
              {contact.name}
              <br />
              <span style={{ fontSize: "0.8em" }}>{contact.number}</span>
            </button>
          ))}
        </div>
      </div>

      {/* GPS TRACKER - BIG BUTTON */}
      <div
        style={{
          background: currentTheme.cardBg,
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: `2px solid ${currentTheme.border}`,
          textAlign: "center",
        }}
      >
        <h3 style={{ color: currentTheme.text }}>GPS Tracking</h3>

        <button
          onClick={getGPSLocation}
          style={{
            padding: "20px 40px",
            fontSize: "1.5em",
            cursor: "pointer",
            backgroundColor: "#ffc0cb",
            color: "#000000",
            border: "3px solid #000000",
            borderRadius: "15px",
            fontWeight: "bold",
            marginBottom: "15px",
            transition: "transform 0.2s",
            width: "100%",
            maxWidth: "400px",
          }}
          onMouseOver={(e) => (e.target.style.transform = "scale(1.05)")}
          onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
        >
          Get My Location
        </button>

        {gpsError && (
          <p style={{ color: "#dc143c", fontWeight: "bold" }}>{gpsError}</p>
        )}

        {userLocation && (
          <p style={{ fontSize: "1.1em", fontWeight: "bold", color: currentTheme.text }}>
            Location Acquired
            <br />
            Lat: {userLocation.lat.toFixed(4)} | Lng: {userLocation.lng.toFixed(4)}
          </p>
        )}

        {customLocation && (
          <p style={{ fontSize: "1.1em", fontWeight: "bold", color: currentTheme.text }}>
            Custom Location Set
            <br />
            Lat: {customLocation.lat.toFixed(4)} | Lng: {customLocation.lng.toFixed(4)}
          </p>
        )}
      </div>

      {/* MANUAL LOCATION INPUT */}
      <div
        style={{
          background: currentTheme.cardBg,
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: `2px solid ${currentTheme.border}`,
          textAlign: "center",
        }}
      >
        <h3 style={{ color: currentTheme.text }}>Or Enter Location Manually</h3>
        <p style={{ fontSize: "0.9em", color: currentTheme.text }}>
          Use this if reporting for someone else at a different location
        </p>

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <input
            type="number"
            placeholder="Latitude (-90 to 90)"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
            step="0.0001"
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: currentTheme.inputBg,
              color: currentTheme.text,
              border: `2px solid ${currentTheme.border}`,
              borderRadius: "5px",
              fontSize: "1em",
            }}
          />
          <input
            type="number"
            placeholder="Longitude (-180 to 180)"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
            step="0.0001"
            style={{
              flex: 1,
              padding: "12px",
              backgroundColor: currentTheme.inputBg,
              color: currentTheme.text,
              border: `2px solid ${currentTheme.border}`,
              borderRadius: "5px",
              fontSize: "1em",
            }}
          />
        </div>

        <button
          onClick={handleManualLocation}
          style={{
            padding: "10px 30px",
            width: "100%",
            background: "#ffc0cb",
            color: "#000000",
            border: "3px solid #000000",
            borderRadius: "8px",
            fontSize: "1em",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "transform 0.2s",
          }}
          onMouseOver={(e) => (e.target.style.transform = "scale(1.02)")}
          onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
        >
          Set Manual Location
        </button>
      </div>

      {/* ETA MESSAGE - DELIVERY APP STYLE */}
      {eta !== null && lastSubmissionTime && (
        <div
          style={{
            background: "#ffc0cb",
            color: "#000000",
            padding: "25px",
            borderRadius: "15px",
            marginBottom: "20px",
            border: "3px solid #000000",
            textAlign: "center",
            fontSize: "1.5em",
            fontWeight: "bold",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          }}
        >
          <div style={{ fontSize: "2em", marginBottom: "10px" }}>
            {reportedService} Arriving Soon
          </div>
          <div
            style={{
              fontSize: "2.5em",
              color: "#dc143c",
              fontWeight: "900",
              marginBottom: "10px",
            }}
          >
            {Math.max(0, eta - Math.floor((new Date() - lastSubmissionTime) / 60000))} mins
          </div>
          <div style={{ fontSize: "0.9em" }}>
            Your location has been shared with {reportedService}
          </div>
        </div>
      )}

      {/* FORM */}
      <div
        style={{
          background: currentTheme.cardBg,
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: `2px solid ${currentTheme.border}`,
        }}
      >
        <h2 style={{ color: currentTheme.text }}>Submit Emergency Request</h2>

        <input
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            backgroundColor: currentTheme.inputBg,
            color: currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "5px",
            fontSize: "1em",
            boxSizing: "border-box",
          }}
        />

        <label style={{ display: "block", marginTop: "15px", fontWeight: "bold", color: currentTheme.text }}>
          Select Emergency Type:
        </label>
        <select
          value={emergencyType}
          onChange={(e) => setEmergencyType(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "8px",
            backgroundColor: currentTheme.inputBg,
            color: currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "5px",
            fontSize: "1em",
            boxSizing: "border-box",
          }}
        >
          <option>Medical</option>
          <option>Fire</option>
          <option>Flood</option>
          <option>Earthquake</option>
          <option>Accident</option>
          <option>Drowning</option>
          <option>Other</option>
        </select>

        <textarea
          placeholder="Describe the emergency in detail..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            backgroundColor: currentTheme.inputBg,
            color: currentTheme.text,
            border: `2px solid ${currentTheme.border}`,
            borderRadius: "5px",
            fontSize: "1em",
            minHeight: "100px",
            boxSizing: "border-box",
            fontFamily: "Arial",
          }}
        />

        <button
          onClick={submitRequest}
          style={{
            marginTop: "15px",
            padding: "15px 30px",
            width: "100%",
            background: "#ffc0cb",
            color: "#000000",
            border: "3px solid #000000",
            borderRadius: "8px",
            fontSize: "1.1em",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "transform 0.2s",
          }}
          onMouseOver={(e) => (e.target.style.transform = "scale(1.02)")}
          onMouseOut={(e) => (e.target.style.transform = "scale(1)")}
        >
          SUBMIT EMERGENCY
        </button>
      </div>

      <h2 style={{ color: currentTheme.text }}>Local Services & Hospitals Near You</h2>

      <div
        style={{
          height: "600px",
          marginBottom: "20px",
          borderRadius: "10px",
          overflow: "hidden",
          border: `3px solid ${currentTheme.border}`,
        }}
      >
        <MapContainer
          center={
            useCustomLocation && customLocation
              ? [customLocation.lat, customLocation.lng]
              : userLocation
              ? [userLocation.lat, userLocation.lng]
              : [20.5937, 78.9629]
          }
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User Location Marker */}
          {(userLocation || customLocation) && (
            <CircleMarker
              center={
                useCustomLocation && customLocation
                  ? [customLocation.lat, customLocation.lng]
                  : [userLocation.lat, userLocation.lng]
              }
              radius={8}
              fillColor="#dc143c"
              color="#000000"
              weight={3}
              opacity={1}
              fillOpacity={0.8}
            >
              <Popup>
                <strong>Your Location</strong>
              </Popup>
            </CircleMarker>
          )}

          {/* Hospital Markers - Green */}
          {(nearbyServices.hospitals && nearbyServices.hospitals.length > 0 ? nearbyServices.hospitals : hospitalData).map((hospital, idx) => (
            <Marker key={`hospital-${idx}`} position={[hospital.lat, hospital.lng]} icon={hospitalIcon}>
              <Popup>
                <strong>Hospital: {hospital.name}</strong>
                <br />
                Distance: {hospital.distance}
                <br />
                Phone: {hospital.phone}
                <br />
                <button
                  onClick={() => alert(`Calling ${hospital.name}...`)}
                  style={{
                    marginTop: "5px",
                    padding: "5px 10px",
                    backgroundColor: "#ffc0cb",
                    color: "#000000",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Call Now
                </button>
              </Popup>
            </Marker>
          ))}

          {/* Fire Station Markers - Orange */}
          {(nearbyServices.fire && nearbyServices.fire.length > 0 ? nearbyServices.fire : fireStations).map((station, idx) => (
            <Marker key={`fire-${idx}`} position={[station.lat, station.lng]} icon={fireIcon}>
              <Popup>
                <strong>Fire Station: {station.name}</strong>
                <br />
                Distance: {station.distance}
                <br />
                Phone: {station.phone}
                <br />
                <button
                  onClick={() => alert(`Calling ${station.name}...`)}
                  style={{
                    marginTop: "5px",
                    padding: "5px 10px",
                    backgroundColor: "#ffc0cb",
                    color: "#000000",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Call Now
                </button>
              </Popup>
            </Marker>
          ))}

          {/* Police Station Markers - Blue */}
          {(nearbyServices.police && nearbyServices.police.length > 0 ? nearbyServices.police : policeStations).map((station, idx) => (
            <Marker key={`police-${idx}`} position={[station.lat, station.lng]} icon={policeIcon}>
              <Popup>
                <strong>Police Station: {station.name}</strong>
                <br />
                Distance: {station.distance}
                <br />
                Phone: {station.phone}
                <br />
                <button
                  onClick={() => alert(`Calling ${station.name}...`)}
                  style={{
                    marginTop: "5px",
                    padding: "5px 10px",
                    backgroundColor: "#ffc0cb",
                    color: "#000000",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Call Now
                </button>
              </Popup>
            </Marker>
          ))}

          {/* Emergency Request Markers */}
          {requests.map(
            (req, index) =>
              req.lat &&
              req.lng && (
                <Marker
                  key={`request-${index}`}
                  position={[req.lat, req.lng]}
                >
                  <Popup>
                    <strong>Emergency: {req.name}</strong>
                    <br />
                    Type: {req.emergencyType}
                    <br />
                    Priority: <span style={{ color: "#dc143c", fontWeight: "bold" }}>
                      {req.priority}
                    </span>
                  </Popup>
                </Marker>
              )
          )}

          {/* Responder Vehicle Markers - Moving */}
          {responders.map((responder, idx) => (
            <Marker
              key={`responder-${idx}`}
              position={[responder.current_lat, responder.current_lng]}
              icon={L.icon({
                iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Crect fill='%23ff0000' width='32' height='32' rx='4'/%3E%3Ctext x='16' y='22' font-size='18' fill='white' text-anchor='middle' font-weight='bold'%3E+%3C/text%3E%3C/svg%3E",
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                popupAnchor: [0, -16],
              })}
            >
              <Popup>
                <strong>Responder: {responder.service_name}</strong>
                <br />
                Type: {responder.service_type}
                <br />
                Status: <span style={{ color: "#dc143c", fontWeight: "bold" }}>
                  {responder.status}
                </span>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {/* DASHBOARD */}
      <h2 style={{ color: currentTheme.text }}>Dashboard & Statistics</h2>

      <div style={{ display: "flex", gap: "15px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div
          style={{
            background: "#ffc0cb",
            padding: "15px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            minWidth: "150px",
            border: "3px solid #000000",
            color: "#000000",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          <h3>Total Requests</h3>
          <h2>{requests.length}</h2>
        </div>

        <div
          style={{
            background: "#dc143c",
            padding: "15px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            minWidth: "150px",
            border: "3px solid #000000",
            color: "#ffffff",
            textAlign: "center",
            fontWeight: "bold",
          }}
        >
          <h3>Critical</h3>
          <h2>{criticalCount}</h2>
        </div>

        <div
          style={{
            background: "#ffc0cb",
            padding: "15px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            minWidth: "150px",
            border: "3px solid #000000",
            color: "#000000",
            textAlign: "center",
            fontWeight: "bold",
            borderLeft: "5px solid #dc143c",
          }}
        >
          <h3>High Priority</h3>
          <h2>{highCount}</h2>
        </div>

        <div
          style={{
            background: "#ffc0cb",
            padding: "15px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            minWidth: "150px",
            border: "3px solid #000000",
            color: "#000000",
            textAlign: "center",
            fontWeight: "bold",
            borderLeft: "5px solid #ffd700",
          }}
        >
          <h3>Medium</h3>
          <h2>{mediumCount}</h2>
        </div>
      </div>

      {/* NEARBY SERVICES */}
      <div
        style={{
          background: currentTheme.cardBg,
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: `2px solid ${currentTheme.border}`,
        }}
      >
        <h2 style={{ color: currentTheme.text }}>Nearby Services</h2>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ color: currentTheme.text }}>Hospitals</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            {hospitalData.map((hospital, idx) => (
              <div
                key={idx}
                style={{
                  background: currentTheme.bg === "#ff4444" ? "#ffffff" : "#b21030",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `2px solid ${currentTheme.border}`,
                  color: currentTheme.text,
                }}
              >
                <strong>{hospital.name}</strong>
                <br />
                <small>Distance: {hospital.distance}</small>
                <br />
                <button
                  onClick={() => alert(`Calling ${hospital.name}...`)}
                  style={{
                    marginTop: "8px",
                    padding: "5px 10px",
                    backgroundColor: "#ffc0cb",
                    color: "#000000",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  Call
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ color: currentTheme.text }}>Fire Stations</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            {fireStations.map((station, idx) => (
              <div
                key={idx}
                style={{
                  background: currentTheme.bg === "#ff4444" ? "#ffffff" : "#b21030",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `2px solid ${currentTheme.border}`,
                  color: currentTheme.text,
                }}
              >
                <strong>{station.name}</strong>
                <br />
                <small>Distance: {station.distance}</small>
                <br />
                <button
                  onClick={() => alert(`Calling ${station.name}...`)}
                  style={{
                    marginTop: "8px",
                    padding: "5px 10px",
                    backgroundColor: "#ffc0cb",
                    color: "#000000",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  Call
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 style={{ color: currentTheme.text }}>Police Stations</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "15px" }}>
            {policeStations.map((station, idx) => (
              <div
                key={idx}
                style={{
                  background: currentTheme.bg === "#ff4444" ? "#ffffff" : "#b21030",
                  padding: "12px",
                  borderRadius: "8px",
                  border: `2px solid ${currentTheme.border}`,
                  color: currentTheme.text,
                }}
              >
                <strong>{station.name}</strong>
                <br />
                <small>Distance: {station.distance}</small>
                <br />
                <button
                  onClick={() => alert(`Calling ${station.name}...`)}
                  style={{
                    marginTop: "8px",
                    padding: "5px 10px",
                    backgroundColor: "#ffc0cb",
                    color: "#000000",
                    border: "none",
                    borderRadius: "3px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    width: "100%",
                  }}
                >
                  Call
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* REQUESTS LIST */}
      <div
        style={{
          background: currentTheme.cardBg,
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: `2px solid ${currentTheme.border}`,
        }}
      >
        <h2 style={{ color: currentTheme.text }}>Emergency Requests</h2>

        {filteredRequests.length === 0 ? (
          <p style={{ marginTop: 10, fontSize: "1.1em", color: currentTheme.text }}>No emergency requests yet.</p>
        ) : (
          filteredRequests.map((req, i) => (
            <div
              key={i}
              style={{
                border: `2px solid ${req.priority === "CRITICAL" ? "#dc143c" : "#ffc0cb"}`,
                marginTop: 15,
                padding: 15,
                borderRadius: 10,
                backgroundColor:
                  req.priority === "CRITICAL"
                    ? "#ffcccc"
                    : currentTheme.bg === "#ff4444"
                    ? "#fff8f8"
                    : "#8b0a1a",
              }}
            >
              <h3
                style={{
                  color: req.priority === "CRITICAL" ? "#dc143c" : currentTheme.text,
                  margin: "0 0 10px 0",
                }}
              >
                {req.priority}
              </h3>
              <p style={{ color: currentTheme.text }}>
                <b>Name:</b> {req.name}
              </p>
              <p style={{ color: currentTheme.text }}>
                <b>Type:</b> {req.emergencyType}
              </p>
              <p style={{ color: currentTheme.text }}>
                <b>Location:</b> ({req.lat?.toFixed(4)}, {req.lng?.toFixed(4)})
              </p>
              <p style={{ color: currentTheme.text }}>
                <b>Time:</b> {req.timestamp}
              </p>
              <p style={{ color: currentTheme.text }}>
                <b>Description:</b> {req.description}
              </p>
              <button
                onClick={() => alert(`Contacting responders for ${req.name}'s emergency...`)}
                style={{
                  marginTop: "10px",
                  padding: "8px 15px",
                  backgroundColor: "#ffc0cb",
                  color: "#000000",
                  border: "2px solid #000000",
                  borderRadius: "5px",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                Contact Responders
              </button>
            </div>
          ))
        )}
      </div>

      {/* FUTURE SCOPE */}
      <div
        style={{
          background: currentTheme.cardBg,
          padding: "20px",
          borderRadius: "10px",
          border: `2px solid ${currentTheme.border}`,
        }}
      >
        <hr style={{ borderColor: currentTheme.border }} />
        <h2 style={{ color: currentTheme.text }}>Future IoT Integration</h2>
        <ul style={{ fontSize: "1.1em", color: currentTheme.text }}>
          <li>Flood level monitoring sensors</li>
          <li>GPS rescue beacons</li>
          <li>Environmental monitoring nodes</li>
          <li>Automatic disaster alert system</li>
          <li>Smart emergency communication network</li>
        </ul>
      </div>
      </div>
    </div>
  );
}

export default App;