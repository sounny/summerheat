/* Map of GeoJSON data from time_series.geojson */
// Declare global map variable.
var map;

// Create createMap function.
function createMap(){
    // Configure the map.
    map = L.map('mapid', {
        center: [20, 0],
        zoom: 2
    });
    
    // Load OSM base tilelayer to map.
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // Call getData function to load data to map.
    getData(map);
};

// Create onEachFeature function.
function onEachFeature(feature, layer) {
    // Create popupContent variable to hold html string.
    var popupContent = "";
    if (feature.properties) {
        // Use loop to load feature property names and values to popupContent.
        for (var property in feature.properties){
            popupContent += "<p>" + property + ": " + feature.properties[property] + "</p>";
        }
        layer.bindPopup(popupContent);
    };
};

// Get data from data file, convert it to point features, and load to map.
function getData(map){
    // Get data from geojson file.
    fetch("data/MegaCities.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            var geojsonMarkerOptions = {
                radius: 5,
                fillColor: "#000000",
                color: "#ffffff",
            };

            // Create a Leaflet GeoJSON layer and add it to the map.
            L.geoJson(json, {
                pointToLayer: function(feature, latlng) {
                    return L.circleMarker(latlng, geojsonMarkerOptions);
                }
            }).addTo(map);

            // Add popup functionality to each feature.
            L.geoJson(json, { onEachFeature : onEachFeature
            }).addTo(map);
        })
};

// Add event listener.
document.addEventListener('DOMContentLoaded',createMap)