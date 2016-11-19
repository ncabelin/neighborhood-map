'use strict';

/* function callback on successful load of google Maps */
function googleSuccess() {
  /* constructor for ko observable list */
  function Placed(name, url, img, lat, long) {
    var self = this;
    self.name = ko.observable(name);
    self.url = ko.observable(url);
    self.img = ko.observable(img);
    self.lat = ko.observable(lat);
    self.long = ko.observable(long);
  }

  function appViewModel() {
    var self = this;
    self.titleMsg = ko.observable('Los Angeles Attractions')
    self.losAngelesWeather = ko.observable(); // weather in fahrenheit
    self.messageBox = ko.observable(); // error message
    self.placeTitle = ko.observable(); // modal title
    self.placeWiki = ko.observable(); // modal body
    self.placeVal = ko.observable(); // input value
    self.places = ko.observableArray([]); // places array
    self.visibleTable = ko.observable(true);
    self.placeWikiUrl = ko.observable();

    self.hideTable = function() { 
      self.showListButton(true); 
      self.hideListButton(false);
      self.visibleTable(false);
    };
    
    self.showTable = function() {
      self.showButton(false);
      self.showListButton(false); 
      self.hideListButton(true);
      self.visibleTable(true);      
    };
    
    self.searchWord = ko.observable();
    self.showButton = ko.observable(false);
    self.showListButton = ko.observable(false);
    self.hideListButton = ko.observable(true);

    var attractions = [ // initial array of objects
    { loc: 'Universal CityWalk', 
      url: 'http://www.universalstudioshollywood.com/',
      img: 'images/universal.png',
      lat: 34.1364911,
      long: -118.3553787
    },
    { loc: 'Griffith Observatory',
      url: 'http://wwww.griffithobservatory.com',
      img: 'images/griffith.png',
      lat: 34.1184341,
      long: -118.3025875
    },
    { loc: 'Hollywood Walk of Fame',
      url: 'http://www.walkoffame.com',
      img: 'images/walk.png',
      lat: 34.101285,
      long: -118.3443718
    },
    { loc: 'Santa Monica Pier',
      url: 'http://www.santamonicapier.org',
      img: 'images/pier.png',
      lat: 34.0092419,
      long: -118.4997977
    },
    { loc: 'Los Angeles County Museum of Art',
      url: 'http://www.lacma.org',
      img: 'images/lacma.png',
      lat: 34.0639323,
      long: -118.3614233
    },
    { loc: 'Cathedral of Our Lady of the Angels',
      url: 'http://www.olacathedral.org',
      img: 'images/cath.png',
      lat: 34.0577215,
      long: -118.2471888
    },
    { loc: 'Descanso Gardens',
      url: 'https://www.descansogardens.org',
      img: 'images/desc.png',
      lat: 34.2012661,
      long: -118.2119937
    },
    { loc: 'Madame Tussauds Hollywood',
      url: 'https://www2.madametussauds.com/hollywood/en',
      img: 'images/madame.png',
      lat: 34.101712,
      long: -118.343729
    }];

    /* generates initial ko.observable array places */
    function placeDestinations() {
      for (var i = 0; i < attractions.length ; i++ ) {
        self.places.push(new Placed(attractions[i].loc, attractions[i].url, attractions[i].img, attractions[i].lat, attractions[i].long));
      }  
    }

    /* filters displayed table list */
    self.filterList = function() {
      var searchReg = new RegExp(self.searchWord(), 'i');
      self.places().length = 0;
      attractions.forEach(function(data) {
        var str = data.loc.toLowerCase();
        var test = searchReg.test(str);
        if (test) {
          self.places.push(new Placed(data.loc, data.url, data.img, data.lat, data.long));
        }
      });
      markers.forEach(function(placedMarker) {
        placedMarker.setMap(null);
      });
      self.updateMarkers();
    };

    /* error handling for jsonp request for wikipedia */
    var wikiRequestTimeout = setTimeout(function() {
      self.placeTitle('Error');
      self.placeWiki('JSONP Error: No wikipedia summary found');
    }, 8000);

    /* gets Wikipedia entry */
    function getWiki(name) {
      var u = 'https://en.wikipedia.org/w/api.php?action=opensearch&search=' + name + '&limit=1&namespace=0&format=jsonfm';
      $.ajax({
        url: u,
        type: 'GET',
        dataType: 'jsonp',
        data: {
            format: 'json'
        },
      }).done(function(data) {
        var content = data[2][0];
        var link = data[3][0];
        self.placeTitle(name);
        self.placeWiki(content);
        self.placeWikiUrl(link);
        clearTimeout(wikiRequestTimeout);
      }).fail(function() {
        self.placeTitle('Error');
        self.placeWiki('Error: No wikipedia summary found');        
      });
    }

    function getWeather() { // Gets current weather in Los Angeles in fahrenheit from Openweather API
      $.get('http://api.openweathermap.org/data/2.5/weather?q=Los Angeles,CA&appid=f6528aa612e42b74b4f7bcf00cd1b0b1').done(function(data){
        var temp = (1.8 * (data.main.temp - 273)) + 32; // convert Kelvin to Fahrenheit
        var fTemp = Math.round(temp);
        self.losAngelesWeather(fTemp);
      }).fail(function() {
        self.losAngelesWeather('Error: failed to get temperature');
      });
    }

    getWeather();

    var infowindowArr = [];
    var markers = [];
    var markersPlaces = [];
    var map;
    var service;
    var infowindow;
    var losAngeles = new google.maps.LatLng(34.052,-118.243);

    /* Initializes google Map first */
    function initialize() {
      map = new google.maps.Map(document.getElementById('map'), {
          center: losAngeles,
          zoom: 10
        });
    }

    /* Sets the boundaries of the map based on pin locations */
    window.mapBounds = new google.maps.LatLngBounds();

    window.addEventListener('resize', function(e) {
      /* Makes sure the map bounds get updated on page resize */
      map.fitBounds(mapBounds);
      map.setZoom(10);
      map.setCenter(losAngeles);
    });

    initialize();

    /* Zoom out button */
    self.zoomOut = function() {
      map.setZoom(10);
      map.setCenter(losAngeles);
    };

    /* Adds a marker to the map by query */
    self.addMark = function(name, url, img, lati, long) {

      var request = {
        location: losAngeles,
        radius: '1000',
        query: name
      };

      service = new google.maps.places.PlacesService(map);
      service.textSearch(request, callback);
    

      function callback(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
          for (var i = 0; i < results.length; i++) {
            addMarker(results[i]);
          }
        }
      }
      

      function addMarker(results) {
        var openMsg = '';
        if (name !== 'Santa Monica Pier') {
          if (results.opening_hours.open_now) {
            openMsg = 'OPEN right now';
          } else {
            openMsg = 'CLOSED right now';
          }
        }
        var contentArea = '<img src="' + img  + '" class="infoImg"><br><strong>' + 
          name + '</strong></a><br>' + results.formatted_address + '<br><em>' + openMsg + '</em><br><a href="' + url +
          '" target="_blank">visit website</a><br>';
        var infowindow = new google.maps.InfoWindow({
          content: contentArea,
          maxWidth: 200
        });
        var myLatLng = {lat: lati, lng: long};
        var marker = new google.maps.Marker({
          map: map,
          animation: google.maps.Animation.DROP,
          position: myLatLng
        });

        markers.push(marker);
        markersPlaces.push(name);
        infowindowArr.push(infowindow);

        marker.addListener('click', function() {
          /* Closes all infowindows first */
          var closeInfoWindow = function() {
            self.showButton(false);
            infowindowArr.forEach(function(x) {
             x.close();
            });
          };
          closeInfoWindow();
          /* Clicking anywhere in the map also calls closeInfoWindow */
          google.maps.event.addListener(map, 'click', closeInfoWindow);

          infowindow.open(map, marker);
          if (marker.getAnimation() !== null) {
            marker.setAnimation(null);
          } else {
            markers.forEach(function(x, y) {
              x.setAnimation(null);
            });
            marker.setAnimation(google.maps.Animation.BOUNCE);
          }
          self.showButton(false);
        });
      } // end addMarker

      /* Gets wiki info displays it in hidden modal, closes other infoWindows and bounces current marker */
      self.viewIt = function(name) {
        getWiki(name);
        var ind = markersPlaces.indexOf(name);
        map.setCenter(markers[ind].getPosition());
        map.setZoom(15);
        infowindowArr.forEach(function(x) {
          x.close();
        });
        infowindowArr[ind].open(map, markers[ind]);
        markers.forEach(function(x) {
          x.setAnimation(null);
        });
        markers[ind].setAnimation(google.maps.Animation.BOUNCE);
      };

      /* clicking place name on the table list cell invokes this function */
      self.viewMarker = function() {
        self.viewIt(this.name()); 
        self.showListButton(true); 
        self.hideListButton(false);
        self.visibleTable(false); 
        self.showButton(true);  
      };

      self.inputSearch = function() { // use value of input to search and view marker and wiki info

      };

    }; // end self.mark

    /* Adds all items in attractions array to self.places ko.observable(array) 
     * by default
    */
    placeDestinations();

    /* Places markers on map based on current self.places ko.observable(array) */
    self.updateMarkers = function() {
      self.places().forEach(function(data, index) {
          self.addMark(data.name(), data.url(), data.img(), data.lat(), data.long());
      });
    };

    /* by default place all markers */
    self.updateMarkers();
  }

  ko.applyBindings(new appViewModel()); // start app
}

function googleError() {
  function errorViewModel() {
    this.titleMsg = ko.observable('Sorry, Error loading Map !');
  }

  ko.applyBindings(new errorViewModel());
}