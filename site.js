'use strict';

var map;
var distance;
var $stops;
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

// Event listener for search button
$('#search').on('click', function(evt){
    evt.preventDefault();
    $('#load').show();
    distance = $('input:first').val();
    navigator.geolocation.getCurrentPosition(geo_success, geo_error, geo_options);
})


// Update the map with stops in search distance.
function updateStops($stops) {
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
        var stop = {lat: $stops[i]['lat'], lng: $stops[i]['lng']};
        var marker = new google.maps.Marker({
          position: stop,
          title: $stops[i]['desc'],
          animation: google.maps.Animation.DROP
        });
        marker.setMap(map);
        
        $markers.push(marker);
        
        var $lStop = $('<p>').text(i+1 + ": " + " Location: " + $stops[i]['desc'] + " Direction: " + $stops[i]['dir'] +" Stop ID: " + $stops[i]['locid']);
        
        $lStop.data('pos', i);
        
        $lStop.on('click', toggleBounce);
        
        var $getDir = $('<button>').text('Get Directions');
        
        $getDir.data('pos', i);
        
        $getDir.on('click', getDirs);
        
        $lStop.append($getDir);
        
        $('#output').append($lStop);
    }
}

// Get a JSON object with all stops within search radius.  
function getStops () {
    var data = {'ll': $userLoc.lat+', '+$userLoc.lng,
               'json': true,
               'meters': distance,
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
    
    var directionsDisplay = new google.maps.DirectionsRenderer;
    var directionsService = new google.maps.DirectionsService;
    
    var map = new google.maps.Map(document.getElementById('map'), {
        zoom: 15,
        center: $userLoc
    })
    directionsDisplay.setMap(map);
    
    calculateAndDisplayRoute(directionsService, directionsDisplay, markerLat, markerLng);
}

// Calculate the walking directions to selected bus stop.
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
        } else {
            alert('Directions request failed due to ' + status);
        }
    });
}


// Put a map on the screen centered on Portland, OR
function initMap() {
    var pdx = {lat: 45.5231, lng: -122.6765};
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 10,
      center: pdx
    });
}

$(document).ready(function(){
    $('#load').hide();
})