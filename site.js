'use strict';

var map;
var distance;
var $stops;
var $buses;
var $duration;
var $busMarkers = [];
var $markers = [];
var $userLoc = {lat: 0, lng: 0};
    
    
// Helper functions for getCurrentLocation:
function geo_success(position) {
    $userLoc.lng = position.coords.longitude;
    $userLoc.lat = position.coords.latitude;
    console.log($userLoc.lat + ' ' + $userLoc.lng);
    getStops();
}

function geo_error(position) {
    alert("Sorry, no position available! Try reloading the page!");
}

var geo_options = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5000
}
 

// Event listener for search button. Gets the user's geolocation and forwards it on.
$('#search').on('click', function(evt){
    evt.preventDefault();
    $('#load').show();
    
    if (window.intervalID !== 'undefined' && window.intervalID !== undefined){
        window.clearInterval(window.intervalID);
    }
    
    distance = $('input:first').val();
    navigator.geolocation.getCurrentPosition(geo_success, geo_error, geo_options);
    
})

// Event listenr
$('input:first').on('keypress', function (evt) {
    if (evt.keyCode === 13) {
        evt.preventDefault();
        $('#load').show();

        if (window.intervalID !== 'undefined' && window.intervalID !== undefined){
            window.clearInterval(window.intervalID);
        }

        distance = $('input:first').val();
        navigator.geolocation.getCurrentPosition(geo_success, geo_error, geo_options);
    }
})

// Update the map with stops (from TriMet) within search distance.
function updateStops($stops) {
    $('#return').hide();
    $('#load').hide();
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 15,
      center: $userLoc
    });
    
    
    var marker = new google.maps.Marker({
      position: $userLoc,
      title: 'You Are Here',
      icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
      draggable: true,
      map: map
    });
    
    $stops = $stops.resultSet.location;

    for (let i=0; i < $stops.length; i++){
        
        var $routes = Array();
        for (let k = 0; k < $stops[i].route.length; k++){
            $routes.push($stops[i].route[k].route);
        }
        
        var stop = {lat: $stops[i]['lat'], lng: $stops[i]['lng']};
        var marker = new google.maps.Marker({
          position: stop,
          title: $stops[i]['desc'],
          animation: google.maps.Animation.DROP,
          icon: 'http://individual.icons-land.com/IconsPreview/POI/PNG/Circled/24x24/BusStation_Circle_Blue.png'
        });
        marker.setMap(map);
        
        $markers.push(marker);
        
        var $lStop = $('<li>').text(i+1 + ": " + " Location: " + $stops[i]['desc'] + " Direction: " + $stops[i]['dir'] +" Stop ID: " + $stops[i]['locid']);
        
        $lStop.addClass('list-group-item');
        
        $lStop.data('pos', i);
        
        $lStop.on('click', toggleBounce);
        
        var $getDir = $('<button>').text('Get Directions');
        
        $getDir.data('pos', i).css('margin-left', '10px');
        
        $getDir.on('click', getDirs);
        
        var $findBus = $('<button>').text('View Buses');
        $findBus.data({'routes': $routes, 'stop': stop}).css('margin-left', '10px');
        $findBus.on('click', findBus);
        
        $lStop.append($getDir);
        $lStop.append($findBus);
        
        $lStop.append(' Buses: ');
        
        for (let i=0;i<$routes.length;i++){
            if (i !== $routes.length-1){
                $lStop.append($routes[i] + ', ');
            } else {
                $lStop.append($routes[i]);
            }
            
        }
       
        
        $('#output').append($lStop);
    }
}

// Get a JSON object with all stops within search radius from TriMet.
// ****APP_ID**** 
function getStops () {
    var data = {'ll': $userLoc.lat+', '+$userLoc.lng,
               'json': true,
               'meters': distance,
               'showRoutes': true,
               'appID': "APP_ID_HERE"}
    $.ajax({
        url: 'https://developer.trimet.org/ws/V1/stops',
        method: 'GET',
        data: data,
        success: function(rsp){
            $stops = rsp;
            console.log($stops)
            updateStops($stops);
        },
        error: function(err){
            console.log(err);
        }  
    });
}

// Toggles the bounce animation on a marker so that user can see what they are looking at.
function toggleBounce() {
    if ($markers[$(this).data('pos')].getAnimation() !== null) {
        $markers[$(this).data('pos')].setAnimation(null);
        $(this).css('background-color', 'white')
    } else {
        $markers[$(this).data('pos')].setAnimation(google.maps.Animation.BOUNCE);
        $(this).css('background-color', 'aliceblue')
    }
}

// Sets up directions to a bus stop.
function getDirs() {
    var markerLat = $markers[$(this).data('pos')].position.lat();
    var markerLng = $markers[$(this).data('pos')].position.lng();
    
    var directionsDisplay = new google.maps.DirectionsRenderer({
        draggable: true});
    var directionsService = new google.maps.DirectionsService;
    
    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: $userLoc
    })
    directionsDisplay.setMap(map);
    directionsDisplay.setPanel(document.getElementById('output'));
    
    calculateAndDisplayRoute(directionsService, directionsDisplay, markerLat, markerLng);
}

// Calculate the walking directions to selected bus stop and display on the map.
function calculateAndDisplayRoute(directionsService, directionsDisplay, markerLat, markerLng) {
    var selectedMode = 'WALKING';
    directionsService.route({
        origin: $userLoc,
        destination: {lat: markerLat, lng: markerLng},
        travelMode: google.maps.TravelMode[selectedMode]
    }, function(rsp, status){
        if (status === 'OK'){
            directionsDisplay.setDirections(rsp);
            $('#output').empty();
            $('#return').show();
            $('#return').on('click', function(evt){
                if (window.intervalID !== 'undefined' && window.intervalID !== undefined){
                    window.clearInterval(window.intervalID);
                }
                $('#output').empty();
                updateStops($stops);
            });
        } else {
            alert('Directions request failed due to ' + status);
        }
    });
}

// Gets bus information for a specific stop and displays it in real time on the map.
// ****APP_ID****
function findBus() {
    console.log($(this).data('routes'));
    
    var busStop = $(this);
    
    // Remove a previously updating bus route.
    if (window.intervalID !== 'undefined' && window.intervalID !== undefined){
        window.clearInterval(window.intervalID);
    }
    
    var routes = $(this).data('routes').toString();

    var data = {'routes': routes,
                'onRouteOnly': true,
               'appID': "APP_ID_HERE"}
    
    $.ajax({
        url: 'https://developer.trimet.org/ws/V2/vehicles',
        method: 'GET',
        data: data,
        success: function(rsp){
            $buses = rsp;
            console.log($buses);
            updateRoutes($buses, busStop.data('stop'));
        },
        error: function(err){
            console.log(err);
        }  
    })
    
    window.intervalID = setInterval(function(){$.ajax({
        url: 'https://developer.trimet.org/ws/V2/vehicles',
        method: 'GET',
        data: data,
        success: function(rsp){
            $buses = rsp;
            console.log($buses);
            updateRoutes($buses, busStop.data('stop'));
        },
        error: function(err){
            console.log(err);
        }  
    })}, 5000);
    
    
}

// Displays the buses on the map.
function updateRoutes($buses, stopLoc){
    
    $buses = $buses.resultSet.vehicle;
    
    for (let i=0;i<$markers.length;i++){
        $markers[i].setMap(null);
    }
    
    for (let k=0;k<$busMarkers.length;k++){
        $busMarkers[k].setMap(null);
    }
    
    $busMarkers = [];
    
    for (let i=0;i<$buses.length;i++){
        var busPos = {lat: $buses[i].latitude, lng: $buses[i].longitude};
        var busMsg = $buses[i].signMessage;
        
        var marker = new google.maps.Marker({
          position: busPos,
          title: busMsg,
          icon: 'https://maps.google.com/mapfiles/ms/icons/bus.png'
        });
        
        marker.addListener('click', function (evt){
            getTime(busPos, marker, stopLoc);
        })
        
        $busMarkers.push(marker);
        marker.setMap(map);
    }
    
    $('#return').show();
    $('#return').on('click', function(evt){
        if (window.intervalID !== 'undefined' && window.intervalID !== undefined){
            window.clearInterval(window.intervalID);
        }
        $('#output').empty();
        updateStops($stops);
    });
    
}

// Gets the time until bus gets to the bus stop.
function getTime(busPos, marker, stopLoc) {
    
    var currentPos = new google.maps.LatLng(busPos.lat, busPos.lng);
    var stopPos = new google.maps.LatLng(stopLoc.lat, stopLoc.lng);
    
    var service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
        origins: [currentPos],
        destinations: [stopPos],
        travelMode: 'DRIVING'
    }, parseTimeCallback)
    console.log($duration);
}

function parseTimeCallback (rsp, sts) {
    if (sts === 'OK') {
        $duration = rsp.rows[0].elements[0].duration.text;
    }
}

// Put a map on the screen centered on Portland, OR
function initMap() {
    var pdx = {lat: 45.5231, lng: -122.6765};
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 10,
      center: pdx
    });
}

// Ensure that the loading and return buttons are hidden until needed.
$(document).ready(function(){
    $('#load').hide();
    $('#return').hide();
})