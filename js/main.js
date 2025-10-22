/*
  Summer Heat Map Application
  - Loads GeoJSON time-series temperature data and visualizes it as proportional circle markers on a Leaflet map.
  - Includes a time (year) sequence control, and an explanatory legend that scales with data.
  - This file is heavily commented to help beginners understand the flow and key Leaflet concepts.
*/

/* Map of GeoJSON data from time_series.geojson */
// Declare global variables used across functions.
// 'map' holds the Leaflet map instance; 'dataStats' stores global stats for legend scaling.
var map;
var dataStats = {};

// Create createMap function.
function createMap(){
    // Create a Leaflet map in the div with id="mapid".
    // Center at [0,0] with a world view zoom. These can be adjusted for your dataset.
    console.log("starting createMap.")
    map = L.map('mapid', {
        center: [0, 0],
        zoom: 1
    });
    
    // Add a base map (OpenStreetMap tiles). You can swap to other providers if desired.
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // Kick off the data pipeline: load data -> process -> draw symbols -> controls + legend
    getData(map);
    console.log("createMap complete.")
};

// Build a legend based on feature attributes.
function createLegend(attributes){
    // Leaflet custom control for the legend (bottom-right corner by default).
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // The control is just a DOM element with custom content.
            var container = L.DomUtil.create('div', 'legend-control-container');

            // Title for the legend. <span class="year"> gets replaced as the year changes.
            container.innerHTML = '<p class="temporalLegend">Average August<br>temperature in <span class="year">2018</span></p>';

            // SVG used to draw proportional circles and their labels.
            // Width/height tuned to avoid overlap and align items in rows.
            var svg = '<svg id="attribute-legend" width="180px" height="140px">';

            // We render rows from top to bottom: largest (max), mean, then smallest (min).
            var circles = ["max", "mean", "min"];
            // Fixed Y positions so circles line up neatly with their text labels.
            var rowYs = [30, 70, 110];

            // Loop through each row, create a circle and a text label.
            for (var i=0; i<circles.length; i++){
                var key = circles[i];
                // Radius is derived from global stats using the same proportional formula.
                var radius = calcProportionalRadius(dataStats[key]);  
                var cy = rowYs[i];

                // Draw the circle for this row.
                svg += '<circle class="legend-circle" id="' + key + '" r="' + radius + '" cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="30"/>';
            
                // Add a label in the same row, vertically centered with the circle.
                var textY = rowYs[i];
                svg += '<text id="' + key + '-text" x="70" y="' + textY + '" dominant-baseline="middle">' + (Math.round(dataStats[key]*100)/100) + '° F' + '</text>';
            }  

            // Close the SVG and add it to the control container.
            svg += "</svg>";
            container.insertAdjacentHTML('beforeend',svg);

            return container;
        }
    });

    // Add the legend control to the map.
    map.addControl(new LegendControl());
};

// Update the legend based on attribute values (called whenever the year changes).
function updateLegend(attribute) {
    // Update the year displayed in the legend title.
    var year = attribute.split("_")[1];
    document.querySelector("span.year").innerHTML = year;

    // Compute the current max/mean/min for the selected attribute (year),
    // so the legend reflects the current data being shown on the map.
    var circleValues = getCircleValues(attribute);

    // Fixed row centers (must match positions used in createLegend).
    var rowYMap = { max: 30, mean: 70, min: 110 };

    // Update each legend circle and its label.
    for (var key in circleValues) {
        var radius = calcProportionalRadius(circleValues[key]);
        var cy = rowYMap[key]; // keep the same row alignment regardless of radius
        document.querySelector("#" + key).setAttribute("cy", cy);
        document.querySelector("#" + key).setAttribute("r", radius)

        // Update the label text with the newly computed value.
        document.querySelector("#" + key + "-text").textContent = Math.round(circleValues[key] * 100) / 100 + "° F";
    }
};

// Create a slider object for sequence controls.
function createSequenceControls(attributes){   
    // NOTE for learners:
    // We create a Leaflet control that contains a range slider and two buttons.
    // This control is added to the map and updates the visualization when users interact with it.

    // TODO: Investigate persistent issues with button click events.
    // The 'forward' and 'reverse' buttons are still not consistently responsive.
    // This may be due to a conflict with Leaflet's map-based event listeners.
    // A potential solution could be to re-evaluate the event propagation logic
    // or the structure of the control container itself.

    // Custom Leaflet control class.
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // Build the control container and its elements (slider + buttons).
            var container = L.DomUtil.create('div', 'sequence-control-container');

            // Range slider for selecting the attribute index (year).
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            // Navigation buttons (reverse / forward years).
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse.png"></button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward.png"></button>');

            // Prevent interaction inside the control from triggering map pan/zoom.
            L.DomEvent.disableClickPropagation(container);
            L.DomEvent.disableScrollPropagation(container);

            return container;
        }
    });

    // Add the custom control instance to the map.
    map.addControl(new SequenceControl());   

    // Initialize slider attributes.
    // TIP: these bounds assume 8 attributes; for dynamic data, prefer attributes.length - 1.
    document.querySelector(".range-slider").max = 7;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    // Grab button elements for attaching events.
    var steps = document.querySelectorAll('.step');

    // Add click handlers to each button using Leaflet's event helpers to avoid map interference.
    steps.forEach(function(step){
        L.DomEvent.on(step, 'click', function(e){
            // Stop the event from bubbling up to the map and cancel default behavior.
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);
            
            // Read current index from the slider.
            var index = document.querySelector('.range-slider').value;

            // Move forward or backward through the attributes array.
            if (step.id == 'forward'){
                index++;
                // Wrap to the start if we go past the last index.
                index = index > 7 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                // Wrap to the end if we go below the first index.
                index = index < 0 ? 6 : index;
            };

            // Update the slider UI and map symbols to the new index.
            document.querySelector('.range-slider').value = index;
            updateProportionalSymbols(attributes[index]);
        })
    });

    // When the slider is dragged, update the map to the corresponding attribute index.
    document.querySelector('.range-slider').addEventListener('input', function(){
        var index = this.value;
        updateProportionalSymbols(attributes[index]);
    });
};

// Determine overall min, max, and mean across all Temp_* attributes in the dataset.
function calculateStatistics(data){
    var allValues = [];
    // Loop through each feature (city) and gather all year values.
    for(var city of data.features){
        for(var year = 2018; year <= 2025; year++){
    // Find the minimum, maximum, and mean value of the array. Store in global variable.
    dataStats.min = Math.min(...allValues);
    dataStats.max = Math.max(...allValues);
    var sum = allValues.reduce(function(a, b){return a+b;});
    dataStats.mean = sum / allValues.length;
};

// Calculate the radius of each proportional symbol.
function calcProportionalRadius(attributeValue) {
    // Constant factor adjusts symbol sizes evenly.
    var minRadius = 6;
    // Use Flannery Apperance Compensation formula.
    var radius = 1.0083 * Math.pow(attributeValue/dataStats.min,0.5715) * minRadius;

    return radius;
};

// Convert generic markers to proportional circle markers.
function pointToLayer(feature, latlng, attributes){
    console.log("running pointToLayer")
    // Set the attribute to visualize with proportional symbols.
    var attribute = attributes[0];

    console.log("Verifying attribute value in pointToLayer: " + attribute)

    // Create option variable to hold marker options.
    var options = {
        fillColor: "#ffffff",
        color: "#000000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    // For each feature, find its value for the selected attribute.
    var attributeValue = Number(feature.properties[attribute]);

    // Set feature circle marker radius based on its numeric attribute value.
    options.radius = calcProportionalRadius(attributeValue);

    // Create the circle marker layer.
    var layer = L.circleMarker(latlng, options);

    // Load feature data into a popup content string.
    var popupContent = createPopupContent(feature.properties, attribute);
    
    //  Bind the popup to the circle marker.
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-options.radius) 
    });

    // Return the circle marker to the L.geoJson pointToLayer option.
    console.log("pointToLayer complete.")
    return layer;
};

// Create proportional symbols and add them to the map.
function createProportionalSymbols(data, attributes){
    // Create a Leaflet GeoJSON layer and add it to the map.
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        },
        // EXTRA COMMA ABOVE?
    }).addTo(map);
};

function getCircleValues(attribute) {
    // Set minimum and maximum values to highest / lowest possible values.
    var min = Infinity, max = -Infinity;

    map.eachLayer(function (layer) {
        // Load the attribute value.
        if (layer.feature) {
            var attributeValue = Number(layer.feature.properties[attribute]);

            // If the attribute value is less than min, set min to attribute value.
            if (attributeValue < min) {
                min = attributeValue;
            };

            // If the attribute value is greater than max, set max to attribute value.
            if (attributeValue > max) {
                max = attributeValue;
            };
        };
    })

    // Set the mean value.
    var mean = (max + min) / 2;

    // Return max, mean, and min.
    return {
        max: max,
        mean: mean,
        min: min,
    };
};

function createPopupContent(properties, attribute){
    // Create popupContent string variable, add the city to it.
    var popupContent = "<p><b>City:</b> " + properties.City_Name + "</p>";

    // Add the formatted attribute to the panel content string.
    var year = attribute.split("_")[1];
    popupContent += "<p><b>Average August Temperature in " + year + ":</b> " + properties[attribute] + "</p>";

    return popupContent;
};

// Update the proportional symbols based on attribute parameter.
function updateProportionalSymbols(attribute) {
  map.eachLayer(function (layer) {
    if (layer.feature && layer.feature.properties[attribute]) {
      // Load props attribute with layer feature properties.
      var props = layer.feature.properties;

      // Update each feature's radius based on new attribute values.
      var radius = calcProportionalRadius(props[attribute]);
      layer.setRadius(radius);

      // Add the city to popup content string.
      var popupContent = "<p><b>City:</b> " + props.City_Name + "</p>";

      // Add formatted attribute information to panel content string.
      var year = attribute.split("_")[1];
      popupContent +=
        "<p><b>Average August Temperature in " +
        year +
        ":</b> " +
        props[attribute] +
        " degrees F</p>";

      // Update the popup with new content.
      popup = layer.getPopup();
      popup.setContent(popupContent).update();
    }
  });

  updateLegend(attribute);
};

// Import GeoJSON data from file.
function getData(map){
    console.log("Starting getData.")
    // Load data from file specified.
    fetch("data/time_series.geojson")
        .then(function(response){
            return response.json();
        })
        .then(function(json){
            // Create an attributes variable to hold array of values.
            var attributes = processData(json);
            // Call Calculate Statistics function to populate dataStats variable.
            calculateStatistics(json);
            // Call create proportional symbols function.
            createProportionalSymbols(json, attributes);
            // Call createSequenceControls to create control panel.
            createSequenceControls(attributes);
            // Call createLegend function to add the legend.
            createLegend(attributes);
        })
    console.log("getData complete.")
};

// Function to process input data into organized array.
function processData(data){
    console.log("Starting processData.")
    // Create empty array.
    var attributes = [];

    // Create properties variable from the first feature in the dataset.
    var properties = data.features[0].properties;

    // Append each attribute name into attributes array.
    for (var attribute in properties){
        // Limit function to attributes with temperature values.
        if (attribute.indexOf("Temp") > -1){
            attributes.push(attribute);
        };
    };

    // Verify results on console.
    console.log("Attributes value after processData: " + attributes);

    return attributes;
};

// Add event listener.
console.log("starting addEventListener.")
document.addEventListener('DOMContentLoaded', createMap);
console.log("addEventListener complete.")
