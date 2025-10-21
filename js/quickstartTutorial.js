// Create map variable, set view to London, set zoom to 13.
var map = L.map('mapid').setView([51.505, -0.09], 13);

// Load OSM tilelayer to the map variable.
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Create marker object, add it to the map.
var marker = L.marker([51.5, -0.09]).addTo(map);

// Create circle object, set its size and color, add it to the map.
var circle = L.circle([51.508, -0.11], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 500
}).addTo(map);

// Create triangular polygon object, set outer points, add it to the map.
var polygon = L.polygon([
    [51.509, -0.08],
    [51.503, -0.06],
    [51.51, -0.047]
]).addTo(map);

// Bind popups to marker, circle, and polygon features. Set associated text.
marker.bindPopup("<strong>Hello world!</strong><br />I am a popup.").openPopup();
circle.bindPopup("I am a circle.");
polygon.bindPopup("I am a polygon.");

// Create standalone popup object, set its location, add associated text, and add it to the map.
var popup = L.popup()
    .setLatLng([51.5, -0.09])
    .setContent("I am a standalone popup.")
    .openOn(map);

// Create onMapClick function, creating a popup that displays lat/long values on click events.
function onMapClick(e) {
    popup
        .setLatLng(e.latlng)
        .setContent("You clicked the map at " + e.latlng.toString())
        .openOn(map);
}

// Load the onMapClick function to the map.
map.on('click', onMapClick);