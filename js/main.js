/* Map of GeoJSON data from time_series.geojson */
// Declare global variables.
var map;
var dataStats = {};

// Create createMap function.
function createMap(){
    console.log("starting createMap.")
    // Configure the map.
    map = L.map('mapid', {
        center: [0, 0],
        zoom: 1
    });
    
    // Load OSM base tilelayer to map.
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);

    // Call getData function to load data to map.
    getData(map);
    console.log("createMap complete.")
};

// Build a legend based on feature attributes.
function createLegend(attributes){
    // Create legendControl variable.
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function () {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            container.innerHTML = '<p class="temporalLegend">Average August temperature in <span class="year">2018</span></p>';

            // Create svg variable.
            var svg = '<svg id="attribute-legend" width="130px" height="130px">';

            // Create array of circle names to base loop on.
            var circles = ["max", "mean", "min"];

            //Step 2: loop to add each circle and text to svg string
            for (var i=0; i<circles.length; i++){

                // Assign radius and cy values.
                var radius = calcProportionalRadius(dataStats[circles[i]]);  
                var cy = 59 - radius;       

                // Continue building the svg string.
                svg += '<circle class="legend-circle" id="' + circles[i] + '" r="' + radius + '"cy="' + cy + '" fill="#F47821" fill-opacity="0.8" stroke="#000000" cx="65"/>';
            
                // Evenly space out labels.  
                var textY = i * 20 + 20;

                // Continue building the svg string.     
                svg += '<text id="' + circles[i] + '-text" x="65" y="' + textY + '">' + Math.round(dataStats[circles[i]]*100)/100 + "° F" + '</text>';
            };  

            // Close the svg string.
            svg += "</svg>";

            // Add attribute legend svg to container.
            container.insertAdjacentHTML('beforeend',svg);

            return container;
        }
    });

    map.addControl(new LegendControl());
};

// Update the legend based on attribute values.
function updateLegend(attribute) {
    // Load the correct year based on selection.
    var year = attribute.split("_")[1];
    // Replace legend content.
    document.querySelector("span.year").innerHTML = year;

    // Load circleValues based on attribute values.
    var circleValues = getCircleValues(attribute);

    // Loop through each key in the circleValues.
    for (var key in circleValues) {
        // Load radius with proportional radius values for each circle value.
        var radius = calcProportionalRadius(circleValues[key]);
        // Set the cy attribute to 59 minus the radius value.
        document.querySelector("#" + key).setAttribute("cy", 59 - radius);
        // Set the r attribute to the radius value.
        document.querySelector("#" + key).setAttribute("r", radius)

        // Set the text content.
        document.querySelector("#" + key + "-text").textContent = Math.round(circleValues[key] * 100) / 100 + "° F";
    }
};

// Create a slider object for sequence controls.
function createSequenceControls(attributes){   
    // Create Sequence Control variable.
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function () {
            // Create the control container div and set ID.
            var container = L.DomUtil.create('div', 'sequence-control-container');

            // Create the range input element (slider).
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')

            // Create skip buttons.
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse"><img src="img/reverse.png"></button>'); 
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward"><img src="img/forward.png"></button>');

            // Disable mouse event listeners for the container.
            L.DomEvent.disableClickPropagation(container);

            return container;
        }
    });

    map.addControl(new SequenceControl());   

    // Set the slider attributes.
    document.querySelector(".range-slider").max = 7;
    document.querySelector(".range-slider").min = 0;
    document.querySelector(".range-slider").value = 0;
    document.querySelector(".range-slider").step = 1;

    // Set the steps attribute.
    var steps = document.querySelectorAll('.step');

    // Loop through each step.
    steps.forEach(function(step){
        // Add event listener for each step.
        step.addEventListener("click", function(){
            var index = document.querySelector('.range-slider').value;
            // Increment or decrement button values.
            if (step.id == 'forward'){
                index++;
                // If past the last attribute, wrap around to first attribute.
                index = index > 7 ? 0 : index;
            } else if (step.id == 'reverse'){
                index--;
                // If past the first attribute, wrap around to last attribute.
                index = index < 0 ? 6 : index;
            };

            // Update the slider with new index value.
            document.querySelector('.range-slider').value = index;

            // Pass new attribute to update proportional symbols.
            updateProportionalSymbols(attributes[index]);
        })
    });

    // Add input listener for slider.
    document.querySelector('.range-slider').addEventListener('input', function(){
        // Load the new index value.
        var index = this.value;

        // Pass new attribute to update proportional symbols.
        updateProportionalSymbols(attributes[index]);
    });
};

// Determine the minimum value from an array of numbers.
function calculateStatistics(data){
    // Create empty array to store all data values.
    var allValues = [];
    // Loop through each row.
    for(var city of data.features){
        // Loop through data value
        for(var year = 2018; year <= 2025; year++){
              // Load value for current year.
              var value = city.properties["Temp_" + String(year)];
              // Append value to array.
              allValues.push(value);
        };
    };
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
