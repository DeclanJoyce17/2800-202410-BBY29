// Generate Google map
// Note: This example requires that you consent to location sharing when
// prompted by your browser. If you see the error "The Geolocation service
// failed.", it means you probably did not give permission for the browser to
// locate you.
// This code is from Google Maps API, with modification for our project

let map, infoWindow;

function initMap() {
    map = new google.maps.Map(document.getElementById("googleMap"), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 6,
    });
    infoWindow = new google.maps.InfoWindow();

    const locationButton = document.createElement("button");

    locationButton.textContent = "Pan to Current Location";
    locationButton.style.backgroundColor = 'white';
    locationButton.style.borderRadius = '10px';
    locationButton.style.border= 'none';    
    locationButton.style.padding = '5px';
    locationButton.classList.add("custom-map-control-button");
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);
    locationButton.addEventListener("click", () => {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    infoWindow.setPosition(pos);
                    infoWindow.setContent("Location found.");
                    infoWindow.open(map);
                    map.setCenter(pos);
                },
                () => {
                    handleLocationError(true, infoWindow, map.getCenter());
                },
            );

            const pinGymButton = document.createElement("button");
            pinGymButton.textContent = "Pin All Gyms";
            pinGymButton.style.backgroundColor = 'white';
            pinGymButton.style.borderRadius = '10px';
            pinGymButton.style.border = 'none';
            pinGymButton.style.padding = '5px';
            pinGymButton.classList.add("custom-map-control-button");
            map.controls[google.maps.ControlPosition.TOP_CENTER].push(pinGymButton);
            pinGymButton.addEventListener("click", pinGym);
        } else {
            // Browser doesn't support Geolocation
            handleLocationError(false, infoWindow, map.getCenter());
        }
    });
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
    infoWindow.setPosition(pos);
    infoWindow.setContent(
        browserHasGeolocation
            ? "Error: The Geolocation service failed."
            : "Error: Your browser doesn't support geolocation.",
    );
    infoWindow.open(map);
}

window.initMap = initMap;

// Google Map API Code
(g => { var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window; b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => { await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]); e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load.")); a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a) })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n)) })({
    key: "AIzaSyDSsNPGiel4VXi9zgbCfhYRgfdZrBZ3SD4",
    v: "weekly",
    // Use the 'v' parameter to indicate the version to use (weekly, beta, alpha, etc.).
    // Add other bootstrap parameters as needed, using camel case.
});


function pinGym() {
    const gymAddresses = [
      { address: "4501 Kingsway, Burnaby, BC V5H 0E5", name: "GoodLife Fitness Burnaby Metrotown" },
      { address: "4277 Kingsway M35, Burnaby, BC V5H 3Z2", name: "GoodLife Fitness Metropolis" },
      { address: "5500 Kingsway, Burnaby BC V5H 2G2", name: "Fitness World" },
      { address: "2225 Willingdon Ave, Burnaby, BC V5C 0J9", name: "F45 Training Burnaby West" },

      // Add more addresses here
    ];
  
    const geocoder = new google.maps.Geocoder();
  
    // Display name and rating on the pin
    gymAddresses.forEach((location) => {
      geocoder.geocode({ address: location.address }, (results, status) => {
        if (status === "OK" && results.length > 0) {
          const latlng = results[0].geometry.location;
          const marker = new google.maps.Marker({
            position: latlng,
            map: map,
            title: location.name,
            myTitle: location.name, 
          });
          markers.push(marker);
  
          // Add a click event listener to the marker
          google.maps.event.addListener(marker, 'click', function() {
            let infowindow = new google.maps.InfoWindow({
              content: `
                <h2>${this.myTitle}</h2>
                <p>Rating: 4.5/5</p>
              `
            });
            infowindow.open(map, this);
          });
        } else {
          console.log("Failed to geocode gym address: " + location.address);
        }
      });
    });
  }
  
  var markers = [];

//---------------------------------------------------------------------------------
//-----------------------------------------------------------------------------------
// This block of code is for testing purposes, and later implementation

// let map;
// let infoWindow;

// function initMap() {
//   map = new google.maps.Map(document.getElementById('googleMap'), {
//     center: { lat: 0, lng: 0 },
//     zoom: 15
//   });
//   infoWindow = new google.maps.InfoWindow();

//   // Try HTML5 geolocation
//   if (navigator.geolocation) {
//     navigator.geolocation.getCurrentPosition(getPosition);
//   } else {
//     handleLocationError(true, infoWindow, map.getCenter());
//   }
// }

// function getPosition(position) {
//   const lat = position.coords.latitude;
//   const lng = position.coords.longitude;

//   map.setCenter({ lat, lng });
//   findGymsNearMe(lat, lng);
// }

// function findGymsNearMe(lat, lng) {
//     fetch('/api/place/nearbysearch/json')
//     .then(response => response.json())
//     .then(data => {
//       console.log(data);
//     })
//     .catch(error => {
//       console.error(error);
//     });
//   }

// function handleLocationError(browserHasGeolocation, infoWindow, pos) {
//   infoWindow.setPosition(pos);
//   infoWindow.setContent(browserHasGeolocation
//     ? "Error: Your browser doesn't support geolocation."
//     : "Error: Your browser doesn't support geolocation.");
//   infoWindow.open(map);
// }