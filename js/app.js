class Restaurant {
    constructor(json) {
        Object.assign(this, json);
    }

    get imageUrl() {
        return (`/img/${this.photograph}`);
    }

    get url() {
        return (`#${this.id}`)
    }
}

class RestaurantsModel {    
    constructor() {
        this.restaurants = [];
        this.cuisines = new Set();
        this.neighborhoods = new Set();
        this.selectedCuisine = null;
        this.selectedNeighborhood = null;
        this.filteredRestaurants = this.restaurants;
        this.selectedRestaurant = null;
    }
    
    async _update() {
        this.restaurants = await this._fetchRestaurants();
        this.cuisines = new Set(this.restaurants.map(restaurant => restaurant.cuisine_type));
        this.neighborhoods = new Set(this.restaurants.map(restaurant => restaurant.neighborhood));
    }

    async filter() {
        await this._update();
        this.filteredRestaurants = this.restaurants
            .filter(restaurant => !this.selectedCuisine || restaurant.cuisine_type === this.selectedCuisine)
            .filter(restaurant => !this.selectedNeighborhood || restaurant.neighborhood === this.selectedNeighborhood);
    }

    get centerCoordinatesOfFiltered() {
        if(!this.filteredRestaurants || this.filteredRestaurants.length === 0) {
            return {lat: 40.722216, lng: -73.987501};
        }        
        const avgLat = this.filteredRestaurants
            .map(restaurant => parseFloat(restaurant.latlng.lat))
            .reduce((accumulator, lat) => accumulator + lat) / this.filteredRestaurants.length;
        const avgLng = this.filteredRestaurants
            .map(restaurant => parseFloat(restaurant.latlng.lng))
            .reduce((accumulator, lng) => accumulator + lng) / this.filteredRestaurants.length;
        return {lat: avgLat, lng: avgLng};
    }

    _fetchRestaurants() {        
        return fetch("../data/restaurants.json")
          .then(response => response.json())
          .then(json => json.restaurants.map(restaurantJson => new Restaurant(restaurantJson)))
          .catch(error => {
              this.restaurants = [];
              console.log(error);
          });
    }
}

class RestaurantsController {
    constructor() {
    }

    async initialize() {
        await model.filter();
        
        filterView.render();
        restaurantsView.render();
        mapView.render();
    }

    async applyFilter() {
        let cuisine = filterView.cuisinesSelectElement.value;
        let neighborhood = filterView.neighborhoodsSelectElement.value;

        if (neighborhood === "all") neighborhood = null;
        if (cuisine === "all") cuisine = null;

        model.selectedCuisine = cuisine;
        model.selectedNeighborhood = neighborhood;        
        await model.filter();

        restaurantsView.render();
        mapView.render();
    }   

    get restaurants() {
        return model.restaurants;
    }

    get cuisines() {
        return model.cuisines;
    }

    get neighborhoods() {
        return model.neighborhoods;
    }

    get selectedRestaurant() {
        return model.selectedRestaurant;
    }

    get filteredRestaurants() {
        return model.filteredRestaurants;
    } 

    get centerCoordinatesOfFiltered() {
        return model.centerCoordinatesOfFiltered;
    }
}

class RestaurantsView {
    constructor() {
        this.restaurantsList = document.querySelector("#restaurants-list");
    }
    
    _clearRestaurants() {
        this.restaurantsList.innerHTML = "";
    }    

    static createRestaurantListElement(restaurant) {
        const li = document.createElement('li');

        const image = document.createElement('img');
        image.className = 'restaurant-img';
        image.src = restaurant.imageUrl;
        li.append(image);

        const name = document.createElement('h1');
        name.innerHTML = restaurant.name;
        li.append(name);

        const neighborhood = document.createElement('p');
        neighborhood.innerHTML = restaurant.neighborhood;
        li.append(neighborhood);

        const address = document.createElement('p');
        address.innerHTML = restaurant.address;
        li.append(address);

        const more = document.createElement('a');
        more.innerHTML = 'View Details';
        more.href = restaurant.url;
        li.append(more)

        return li
    }

    render() {
        this._clearRestaurants();
        if(controller.selectedRestaurant) {
            const restaurantListElement = RestaurantsView.createRestaurantListElement(controller.selectedRestaurant);
            this.restaurantsList.append(restaurantListElement);
            return;
        }
        if(controller.filteredRestaurants) {
            for (const restaurant of controller.filteredRestaurants) {
                const restaurantListElement = RestaurantsView.createRestaurantListElement(restaurant);
                this.restaurantsList.append(restaurantListElement);
            }
        }
    }
}

class RestaurantsFilterView {
    constructor() {
        this.cuisinesSelectElement = document.querySelector("#cuisines-select");
        this.neighborhoodsSelectElement = document.querySelector("#neighborhoods-select");

        this.cuisinesSelectElement.addEventListener("change", function() {
            controller.applyFilter();
        });

        this.neighborhoodsSelectElement.addEventListener("change", function() {
            controller.applyFilter();
        });      
    }

    render() {
        this.renderCuisinesInput();
        this.renderNeighborhoodsInput();
    }

    renderCuisinesInput() {
        this._renderSelectInput(this.cuisinesSelectElement, 
            controller.cuisines, 
            {allLabel: "All Cuisines", allValue: "all"});    
    }

    renderNeighborhoodsInput() {
        this._renderSelectInput(this.neighborhoodsSelectElement, 
            controller.neighborhoods, 
            {allLabel: "All Neighborhoods", allValue: "all"});    
    }

    _renderSelectInput(selectElement, values, {allLabel, allValue} = {}) {
        selectElement.innerHTML = "";

        if(allLabel && allValue){
            let option = document.createElement("option");
            option.innerHTML = allLabel;
            option.value = allValue;
            selectElement.append(option);
        }

        if(!values) return;

        for (const value of values) {
            let option = document.createElement("option");
            option.innerHTML = value;
            option.value = value;
            selectElement.append(option);
        }    
    }
}

class MapView {
    constructor() {
        this.map = L.map('map', {
            center: [40.722216, -73.987501],
            zoom: 12,
            scrollWheelZoom: false
          });
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
            mapboxToken: 'pk.eyJ1IjoiYW5kcmVhc3JhZm4iLCJhIjoiY2syM2pzaDh3MG5leDNibXpoZ29taHJwdyJ9.C4ToektHZj4A-0SSJTTVcQ',
            maxZoom: 18,
            attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
            id: 'mapbox.streets'
        }).addTo(this.map);   
        this.markers = [];
    }

    _clearMarkers() {
        for (const marker of this.markers) {
            marker.remove();            
        }
        this.markers = [];
    }

    _center() {
        if(controller.selectedRestaurant) {            
            this.map.panTo(controller.selectedRestaurant.latlng);
            return;
        }
        if(controller.filteredRestaurants) {
            this.map.panTo(controller.centerCoordinatesOfFiltered);
        }
    }

    _addMarker(restaurant) {
        const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
            {title: restaurant.name, alt: restaurant.name, url: restaurant.url});
        marker.addTo(this.map);
        marker.on("click", () => window.location.href = marker.options.url);
        this.markers.push(marker);
    }

    render() {
        this._clearMarkers();
        if(controller.selectedRestaurant) { 
            this._addMarker(controller.selectedRestaurant);                
            this._center();
            return;
        }
        if(controller.filteredRestaurants) {
            for (const restaurant of controller.filteredRestaurants) {
                this._addMarker(restaurant);
            }
        }
        this._center();
    }
}

const model = new RestaurantsModel();
const controller = new RestaurantsController();
const filterView = new RestaurantsFilterView();
const restaurantsView = new RestaurantsView();
const mapView = new MapView();

controller.initialize();
