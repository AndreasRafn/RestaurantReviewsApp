/* app.js
 * 
 * This file provides classes representing the site's data and views, as well as a
 * controller managing these to ensure separation of concerns. Code follows the MVC
 * architecture pattern.
 */

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
    
    async update(updateFiltered = true) {
        this.restaurants = await this._fetchRestaurants();
        this.cuisines = new Set(this.restaurants.map(restaurant => restaurant.cuisine_type));
        this.neighborhoods = new Set(this.restaurants.map(restaurant => restaurant.neighborhood));
        if(updateFiltered) this.filter();  
    }

    filter() {        
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
        window.addEventListener("hashchange", (event) => this.handleUrlHashChange(event));
    }

    async initialize() {        
        await model.update();
        
        filterView.render();
        restaurantsView.render();
        mapView.render();
    }

    async applyFilter(cuisineValue = null, neighborhoodValue = null) {
        if (cuisineValue) {
            filterView.cuisinesSelectElement.value = cuisineValue;
            filterView.isExpanded = true;
        } 
        if (neighborhoodValue) {
            filterView.neighborhoodsSelectElement.value = neighborhoodValue;
            filterView.isExpanded = true;
        } 

        let cuisine = filterView.cuisinesSelectElement.value;
        let neighborhood = filterView.neighborhoodsSelectElement.value;

        if (neighborhood === "all") neighborhood = null;
        if (cuisine === "all") cuisine = null;

        model.selectedCuisine = cuisine;
        model.selectedNeighborhood = neighborhood;        
        await model.update();

        restaurantsView.render();
        mapView.render();
    }

    _getUrlDetails(url) {
        const indexOf = url.lastIndexOf("#");
        const hasHash = indexOf > -1;
        const hasId = hasHash && !(indexOf + 1 === url.length);
        const id = hasId ? parseInt(url.slice(indexOf + 1)) : null;

        return {
            hasHash: hasHash,
            hasId: hasId,
            id: id
        }
    }

    async handleUrlHashChange() {
        const url = document.URL;
        const urlDetails = this._getUrlDetails(url);

        if (urlDetails.hasId) {
            const restaurant = model.restaurants.find(restaurant => restaurant.id === urlDetails.id);
            if (restaurant) {
                this.selectedRestaurant = restaurant;
            }
            appView.scrollToTop();
            return;
        }

        this.selectedRestaurant = null;
        await this.applyFilter();
        return;
    }

    setUrl(restaurant) {        
        window.location.href = restaurant ? restaurant.url : "/#";
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

    set selectedRestaurant(restaurant) {
        model.selectedRestaurant = restaurant;
        restaurantsView.render();
        appView.render();
        mapView.render();
    }

    get filteredRestaurants() {
        return model.filteredRestaurants;
    } 

    get centerCoordinatesOfFiltered() {
        return model.centerCoordinatesOfFiltered;
    }
}

class AppView {
    constructor() {
        this.bodyElement = document.querySelector("body");
    }

    scrollToTop() {
        window.scrollTo(0,0);
    }

    render() {        
        if (controller.selectedRestaurant) {            
            this.bodyElement.classList.toggle("details", true);
            return;
        }
        this.bodyElement.classList.toggle("details", false);
    }
}

class RestaurantsListPanelView {
    constructor(listPanelElement) {
        this.panelElement = listPanelElement;
    }
    
    clearList() {
        this.panelElement.innerHTML = "";
    }

    clearPanel() {
        this.panelElement.innerHTML = "";
    }

    addList() {
        if(!this.hasList) {
            this.clearPanel();            
            this.listElement = RestaurantsListPanelView.createListElement();
            this.panelElement.append(this.listElement);
        }
    }

    get hasList() {
        return Boolean(this.panelElement.querySelector("ul.restaurant-list"));
    }

    render() {
        this.clearPanel();
        if (controller.selectedRestaurant) {            
            this.addList();
            const listItemDetailsElement = RestaurantsListPanelView.createListItemDetailsElement(controller.selectedRestaurant);
            this.listElement.append(listItemDetailsElement);
            const header = listItemDetailsElement.querySelector("h2");
            if (header) header.focus();
            return;
        }
        if (controller.filteredRestaurants && controller.filteredRestaurants.length) {
            this.addList();
            for (const restaurant of controller.filteredRestaurants) {
                const listItemElement = RestaurantsListPanelView.createListItemElement(restaurant);
                this.listElement.append(listItemElement);
            }
            const header = this.listElement.firstChild.querySelector("h2");
            if(header) header.focus();
            return;
        }
        const messageElement = RestaurantsListPanelView.createMessageElement("No Matches")
        this.panelElement.append(messageElement);
    }

    static createListElement() {
        const listElement = document.createElement("ul");
        listElement.className = "restaurant-list";
        return listElement;
    }

    static createMessageElement(message) {
        const messageElement = document.createElement("p");
        messageElement.className = "restaurant-list-panel-message";
        messageElement.innerHTML = message;
        return messageElement;
    }

    static createListItemImageElement(restaurant, sidePanelWidth) {
        const imageElement = document.createElement('img');
        imageElement.className = "restaurant-list-item-image";
        imageElement.src = restaurant.imageUrl;
        imageElement.srcset = `img/${restaurant.id}_800px.jpg 800w, 
                               img/${restaurant.id}_640px.jpg 640w, 
                               img/${restaurant.id}_480px.jpg 480w, 
                               img/${restaurant.id}_320px.jpg 320w`;
        imageElement.sizes = `(max-width: 500px) ${sidePanelWidth},
                              (max-width: 1200px) ${sidePanelWidth},
                              (max-width: 1600px) ${sidePanelWidth},
                               100vw`;
        imageElement.alt = `Photo of the restaurant ${restaurant.name}`;
        return imageElement;
    }

    static createListItemAddressSectionElement(restaurant, {isHeaderVisible = true, isNeighborhoodBold = false} = {}) {
        const addressSectionElement = document.createElement("section");
        addressSectionElement.className = "restaurant-list-item-address-section";
        
        const addressSectionHeaderElement = document.createElement("h3");
        if (typeof isHeaderVisible !== 'undefined' && !isHeaderVisible) addressSectionHeaderElement.className = "screenreader";
        addressSectionHeaderElement.innerHTML = "Address";
        addressSectionElement.append(addressSectionHeaderElement);

        const neighborhoodElement = document.createElement('p');
        neighborhoodElement.innerHTML = isNeighborhoodBold ? `<strong>${restaurant.neighborhood}</strong>` : restaurant.neighborhood;
        addressSectionElement.append(neighborhoodElement);

        const addressElement = document.createElement('p');
        addressElement.innerHTML = restaurant.address;
        addressSectionElement.append(addressElement);
        
        return addressSectionElement;
    }

    static createListItemTitleElement(restaurant) {
        const titleElement = document.createElement('h2');
        titleElement.innerHTML = restaurant.name;
        titleElement.className = "text-accent";
        return titleElement;
    }

    static createListItemViewDetailsElement(restaurant) {
        const viewDetailsElement = document.createElement('a');
        viewDetailsElement.innerHTML = 'View Details';
        viewDetailsElement.className = "restaurant-list-item-button panel-button-accent";
        viewDetailsElement.setAttribute("aria-label", `view details for the restaurant: ${restaurant.name}`)
        viewDetailsElement.href = restaurant.url;
        return viewDetailsElement;
    }

    static createListItemCuisineTagElement(restaurant) {
        const cuisineTagElement = document.createElement("p");
        cuisineTagElement.className = "restaurant-list-item-tag text-all-caps";
        cuisineTagElement.setAttribute("role","img");
        cuisineTagElement.setAttribute("aria-label", `cuisine: ${restaurant.cuisine_type}`);
        cuisineTagElement.innerHTML = restaurant.cuisine_type;
        return cuisineTagElement;
    }

    static createListItemOperatingHoursSectionElement(restaurant) {
        const operatingHoursSectionElement = document.createElement("section");
        operatingHoursSectionElement.className = "restaurant-list-item-operating-hours-section";
        
        const operatingHoursSectionHeaderElement = document.createElement("h3");
        operatingHoursSectionHeaderElement.innerHTML = "Operating Hours";
        operatingHoursSectionElement.append(operatingHoursSectionHeaderElement);

        const operatingHoursTableElement = document.createElement("table");
        operatingHoursTableElement.className = "restaurant-list-item-operating-hours-table"
        
        for (let day in restaurant.operating_hours) {
            const rowElement = document.createElement('tr');

            const dayElement = document.createElement('td');
            dayElement.innerHTML = day;
            rowElement.appendChild(dayElement);
            
            const hoursElement = document.createElement('td');
            hoursElement.innerHTML = restaurant.operating_hours[day];
            rowElement.appendChild(hoursElement);

            operatingHoursTableElement.appendChild(rowElement);
        }
        operatingHoursSectionElement.append(operatingHoursTableElement);

        return operatingHoursSectionElement;
    }

    static createListItemReviewsSectionElement(restaurant) {
        const reviewsSectionElement = document.createElement("section");
        reviewsSectionElement.className = "restaurant-list-item-reviews-section";
        
        const reviewsSectionHeaderElement = document.createElement("h3");
        reviewsSectionHeaderElement.innerHTML = "Reviews";
        reviewsSectionElement.append(reviewsSectionHeaderElement);

        if (restaurant.reviews && restaurant.reviews.length) {
            const reviewListElement = document.createElement("ul");
            reviewListElement.className = "restaurant-list-item-review-list";
            reviewsSectionElement.append(reviewListElement);

            for (const review of restaurant.reviews) {
                const reviewElement = RestaurantsListPanelView.createListItemReviewElement(review);
                reviewListElement.append(reviewElement);
            }
        }
        else {
            const messageElement = RestaurantsListPanelView.createMessageElement("No Reviews Yet");
            reviewsSectionElement.append(messageElement);
        }

        return reviewsSectionElement;
    }

    static createListItemReviewRatingElement(rating) {
        const reviewRatingElement = document.createElement("span");
        reviewRatingElement.className = "star-rating-span";
        reviewRatingElement.setAttribute("role","img");
        reviewRatingElement.setAttribute("aria-label", `Rating: ${rating} out of 5 stars`);
        
        for (let starIndex = 1; starIndex <= 5; starIndex++) {
            let starElement = document.createElement("i");
            starElement.className = `${(starIndex <= rating ? "fas" : "far")} fa-star`;
            reviewRatingElement.append(starElement);
        }

        return reviewRatingElement;
    }

    static createListItemReviewElement(review) {
        const reviewElement = document.createElement("li");
        reviewElement.className = "restaurant-list-item-review";        

        const reviewHeaderElement = document.createElement("p");
        reviewHeaderElement.className = "restaurant-list-item-review-header";
        reviewElement.append(reviewHeaderElement);

        const reviewPosterNameElement = document.createElement("span");
        reviewPosterNameElement.className = "restaurant-list-item-review-poster-name";
        reviewPosterNameElement.innerHTML = review.name;
        reviewHeaderElement.append(reviewPosterNameElement);

        const reviewDateElement = document.createElement("span");
        reviewDateElement.className = "restaurant-list-item-review-date";
        reviewDateElement.innerHTML = ` on ${review.date}`;
        reviewHeaderElement.append(reviewDateElement);

        const rating = parseInt(review.rating);
        const reviewRatingElement = RestaurantsListPanelView.createListItemReviewRatingElement(rating);
        reviewHeaderElement.append(reviewRatingElement);

        const reviewCommentsElement = document.createElement("p");
        reviewCommentsElement.className = "restaurant-list-item-review-comments";
        reviewCommentsElement.innerHTML = review.comments;
        reviewElement.append(reviewCommentsElement);

        return reviewElement;
    }

    static createListItemElement(restaurant) {
        const itemElement = document.createElement('li');
        itemElement.className = "restaurant-list-item";

        const imageElement = RestaurantsListPanelView.createListItemImageElement(restaurant, "33vw");
        itemElement.append(imageElement);

        const infoPanelElement = document.createElement("section");
        infoPanelElement.className = "restaurant-list-item-info-panel";

        const titleElement = RestaurantsListPanelView.createListItemTitleElement(restaurant);
        infoPanelElement.append(titleElement);

        const addressSectionElement = RestaurantsListPanelView.createListItemAddressSectionElement(
            restaurant, {isHeaderVisible: false, isNeighborhoodBold: true});
        infoPanelElement.append(addressSectionElement);

        itemElement.append(infoPanelElement);

        const viewDetailsElement = RestaurantsListPanelView.createListItemViewDetailsElement(restaurant);
        itemElement.append(viewDetailsElement);        

        return itemElement;
    }

    static createListItemDetailsElement(restaurant) {
        const itemElement = document.createElement('li');
        itemElement.className = "restaurant-list-item";

        const titleElement = RestaurantsListPanelView.createListItemTitleElement(restaurant);
        titleElement.classList.add("text-center");
        itemElement.append(titleElement);

        const imageElement = RestaurantsListPanelView.createListItemImageElement(restaurant, "50vw");
        itemElement.append(imageElement);

        const cuisineTagElement = RestaurantsListPanelView.createListItemCuisineTagElement(restaurant);
        itemElement.append(cuisineTagElement);

        const infoPanelElement = document.createElement("section");
        infoPanelElement.className = "restaurant-list-item-info-panel";        

        const addressSectionElement = RestaurantsListPanelView.createListItemAddressSectionElement(
            restaurant, { isHeaderVisible: true, isNeighborhoodBold: false });
        infoPanelElement.append(addressSectionElement);

        const operatingHoursSectionElement = RestaurantsListPanelView.createListItemOperatingHoursSectionElement(restaurant);
        infoPanelElement.append(operatingHoursSectionElement);       

        itemElement.append(infoPanelElement);

        const reviewsSectionElement = RestaurantsListPanelView.createListItemReviewsSectionElement(restaurant);
        itemElement.append(reviewsSectionElement);

        return itemElement;
    }
}

class RestaurantsFilterPanelView {
    constructor(filterPanelElement) {

        this.panelElement = filterPanelElement;
        this.expanderButtonElement = filterPanelElement.querySelector(".filter-panel-expander-button");
        this.expanderIconElement = filterPanelElement.querySelector(".filter-panel-expander-icon");
        this.expanderContentElement = filterPanelElement.querySelector(".filter-panel-expander-content");
        
        this.cuisinesSelectElement = document.querySelector("#cuisines-select");
        this.neighborhoodsSelectElement = document.querySelector("#neighborhoods-select");

        this.expanderButtonElement.addEventListener("click", () => this.toggleExpansionState());

        this.cuisinesSelectElement.addEventListener("change", function() {
            controller.applyFilter();
        });

        this.neighborhoodsSelectElement.addEventListener("change", function() {
            controller.applyFilter();
        });      
    }

    get isExpanded() {
        return this.expanderButtonElement.getAttribute("aria-expanded") === "true";
    }

    set isExpanded(isExpanded) {
        if(isExpanded) {
            this.expanderButtonElement.setAttribute("aria-expanded","true");
            this.expanderButtonElement.setAttribute("aria-label", "filter panel, click to collapse");
            this.expanderIconElement.classList.add("fa-chevron-circle-down");
            this.expanderIconElement.classList.remove("fa-chevron-circle-up");
            this.expanderContentElement.classList.remove("hidden");
            this.expanderContentElement.classList.add("expanded");
        }   
        else{
            this.expanderButtonElement.setAttribute("aria-expanded", "false");
            this.expanderButtonElement.setAttribute("aria-label", "filter panel, click to expand");
            this.expanderIconElement.classList.add("fa-chevron-circle-up");
            this.expanderIconElement.classList.remove("fa-chevron-circle-down");
            this.expanderContentElement.classList.add("hidden");
            this.expanderContentElement.classList.remove("expanded");
        }
    }

    toggleExpansionState() {
        this.isExpanded = !this.isExpanded;
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
            scrollWheelZoom: true,
            keyboard: false
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
        this.mapElement = document.querySelector("#map");
    }

    _clearMarkers() {
        for (const marker of this.markers) {
            marker.remove();            
        }
        this.markers = [];
    }

    _center() {
        if(controller.selectedRestaurant) {
            this.map.setView(controller.selectedRestaurant.latlng, 16);
            return;
        }
        if(controller.filteredRestaurants) {
            this.map.setView(controller.centerCoordinatesOfFiltered, 12);
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

/** register service worker */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
        navigator.serviceWorker.register('/sw.js').then(function (registration) {
            // Registration was successful
            console.log('ServiceWorker registration successful with scope: ', registration.scope);
        }, function (err) {
            // registration failed :(
            console.log('ServiceWorker registration failed: ', err.message);
        });
    });
}

const model = new RestaurantsModel();
const controller = new RestaurantsController();
const appView = new AppView();
const filterView = new RestaurantsFilterPanelView(document.querySelector(".filter-panel"));
const restaurantsView = new RestaurantsListPanelView(document.querySelector(".restaurant-list-panel"));
const mapView = new MapView();

controller.initialize();