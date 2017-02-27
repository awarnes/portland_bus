//(function () {
    

'use strict';

var map;
var distance;
var $stops;
var $markers = [];
    
    
// Helper functions for getCurrentLocation:
function geo_success(position) {
    var userLong = position.coords.longitude.toFixed(4);
    var userLat = position.coords.latitude.toFixed(4);
    console.log(userLat + ' ' + userLong);
    getStops(userLat, userLong);
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
function updateStops($stops, userLong, userLat) {
    $('#load').hide();
    var userLoc = {lat: Number(userLat), lng: Number(userLong)};
    map = new google.maps.Map(document.getElementById('map'), {
      zoom: 15,
      center: userLoc
    });
    
    
    var marker = new google.maps.Marker({
      position: userLoc,
      title: 'You Are Here',
      icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
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
        
        $('#output').append($lStop);
    }
}

// Get a JSON object with all stops within search radius.  
function getStops (userLat, userLong) {
    var data = {'ll': userLat+', '+userLong,
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
            updateStops($stops, userLong, userLat);
        },
        error: function(err){
            console.log(err);
        }  
    });
}

function toggleBounce() {
    if ($markers[$(this).data('pos')].getAnimation() !== null) {
        $markers[$(this).data('pos')].setAnimation(null);
        $(this).css('background-color', 'white')
    } else {
        $markers[$(this).data('pos')].setAnimation(google.maps.Animation.BOUNCE);
        $(this).css('background-color', 'aliceblue')
    }
}



  
//})();

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