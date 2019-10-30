/* app.js
 *
 * This file provides classes representing the site's data and views, as well as a
 * controller managing these to ensure separation of concerns. Code follows the MVC
 * architecture pattern.
 */

"use strict";

/**
 * Represents a restaurant entry in the app
 */
class Restaurant {
  /**
   * @param {Function} json - A restaurant json object
   */
  constructor(json) {
    // base on provided json object
    Object.assign(this, json);
  }

  /**
   * @returns {string} A generated url targeting the image for the restaurant
   */
  get imageUrl() {
    return `/RestaurantReviewsApp/img/${this.photograph}`;
  }

  /**
   * @returns {string} A generated internal url for the restaurant
   */
  get url() {
    return `#${this.id}`;
  }
}

/**
 * the restaurants model handles storage and access to of restaurant data
 */
class RestaurantsModel {
  constructor() {
    /**
     * All fetched restaurants
     *
     * @type {Restaurant[]}
     */
    this.restaurants = [];
    /**
     * All available cuisines of fetched restaurants.
     *
     * @type {Set.<string>}
     */
    this.cuisines = new Set();
    /**
     * All available neighborhoods of fetched restaurants.
     *
     * @type {Set.<string>}
     */
    this.neighborhoods = new Set();
    /**
     * the cuisine selected by the user for filtering.
     *
     * @type {string}
     */
    this.selectedCuisine = null;
    /**
     * the neighborhood selected by the user for filtering.
     *
     * @type {string}
     */
    this.selectedNeighborhood = null;
    /**
     * the restaurant selected by the user when viewing details
     *
     * @type {Restaurant}
     */
    this.selectedRestaurant = null;
    /**
     * the restaurants matching the filter criteria provided by the user
     *
     * @type {Restaurant[]}
     * @protected
     */
    this._filteredRestaurants = this.restaurants;
  }

  /**
   * Updates restaurant data from the source, and updates filter selection options and
   * filtered results.
   *
   * @async
   */
  async update() {
    // fetch restaurant data async and await results before setting model variables
    this.restaurants = await this._fetchRestaurants("/RestaurantReviewsApp/data/restaurants.json");
    // set filter selection options based on fetched restaurants
    this.cuisines = new Set(this.restaurants.map(restaurant => restaurant.cuisine_type));
    this.neighborhoods = new Set(this.restaurants.map(restaurant => restaurant.neighborhood));
    //update filtered restaurants once based on user selections
    this._filteredRestaurants = this.restaurants
      .filter(
        restaurant => !this.selectedCuisine || restaurant.cuisine_type === this.selectedCuisine
      )
      .filter(
        restaurant =>
          !this.selectedNeighborhood || restaurant.neighborhood === this.selectedNeighborhood
      );
  }

  /**
   * @returns {Restaurant[]} The restaurants matching the filter criteria provided by the user
   */
  get filteredRestaurants() {
    return this._filteredRestaurants;
  }

  /**
   * Returns the coordinates of the center of all filtered restaurants.
   * The center coordinates can be used to e.g. center a map.
   *
   * @returns {{lat: number, lng: number}} the coordinates of the center of all filtered restaurants
   */
  get centerCoordinatesOfFiltered() {
    // return Udacity exercise provided static coordinate points if there are no matches.
    // In a real life scenario a different fallback should be applied.
    if (!this.filteredRestaurants || this.filteredRestaurants.length === 0) {
      return { lat: 40.722216, lng: -73.987501 };
    }
    //  if there are matches, calcualte the center coordinates
    const avgLat =
      this.filteredRestaurants
        .map(restaurant => parseFloat(restaurant.latlng.lat))
        .reduce((accumulator, lat) => accumulator + lat) / this.filteredRestaurants.length;
    const avgLng =
      this.filteredRestaurants
        .map(restaurant => parseFloat(restaurant.latlng.lng))
        .reduce((accumulator, lng) => accumulator + lng) / this.filteredRestaurants.length;
    return { lat: avgLat, lng: avgLng };
  }

  /**
   * Fetches restaurant data from a provided JSON source.
   * Then converts to an array of restaurant objects.
   *
   * @param {string} source - The source of a JSON file containing a valid list restaurant objects
   * @returns {Promise} Promise object resolves to an array of Restaurant objects, and rejects to an 
   * empty array
   * @protected
   */
  _fetchRestaurants(source) {
    return fetch(source)
      .then(response => response.json())
      .then(json => json.restaurants.map(restaurantJson => new Restaurant(restaurantJson)))
      .catch(error => {
        this.restaurants = [];
        console.log(error);
      });
  }
}

/**
 * The single MVC controller for the app.
 * Controls the views for: app, restaurants, and map, and the model for restaurants
 */
class RestaurantsController {
  constructor() {
    // listen for hashchange in the url to react to single-page app navigation events
    window.addEventListener("hashchange", event => this.setFromUrl(event.newURL));
  }

  /**
   * Updates data in the model, then render all views based on the updated data.
   * 
   * @async
   */
  async initialize() {
    await model.update();

    filterView.render();
    restaurantsView.render();
    mapView.render();
  }

  /**
   * Apply restaurant filter based on user filter input selections.
   */
  async applyFilter() {
    // get input values from view
    let cuisine = filterView.cuisinesSelectElement.value;
    let neighborhood = filterView.neighborhoodsSelectElement.value;

    // manage 'select all' values
    if (neighborhood === "all") neighborhood = null;
    if (cuisine === "all") cuisine = null;

    // set model
    model.selectedCuisine = cuisine;
    model.selectedNeighborhood = neighborhood;
    await model.update();

    // render views
    restaurantsView.render();
    mapView.render();
  }

  /**
   * Analyses a valid url in the context of the app and returns the details of the analysis.
   * The function is primarily used to determine whether a url refers to the app root, or is in view
   * details mode for a specific restaurant. 
   * 
   * @param {string} url - The url to analyze.
   * @returns {{hasHash: boolean, hasId: boolean, id: number}} the details of the provided url, if 
   * the url has an id, the id will always be an integer.
   * @protected
   */
  _getUrlDetails(url) {
    const indexOf = url.lastIndexOf("#");
    const hasHash = indexOf > -1;
    const hasId = hasHash && !(indexOf + 1 === url.length);
    const id = hasId ? parseInt(url.slice(indexOf + 1)) : null;

    return {
      hasHash: hasHash,
      hasId: hasId,
      id: id
    };
  }

  /**
   * Sets the application state based on a valid app url.
   * 
   * @param {string} url - The url to set the applicationstate from
   * @async
   */
  async setFromUrl(url) {
    if(!url) throw new Error("the url is empty");

    // check if the url is a valid app url
    const appUrl = new URL("/RestaurantReviewApp/");
    const newUrl = new URL(url);
    if(appUrl.hostname != newUrl.hostname) throw new Error("the url is not a valid app URL");

    // analyze the url in the context of the app
    const urlDetails = this._getUrlDetails(url);

    // if the url specifies a restaurant id set app state to view details state for the specified 
    // restaurant
    if (urlDetails.hasId) {
      const restaurant = model.restaurants.find(restaurant => restaurant.id === urlDetails.id);
      if (restaurant) {
        this.selectedRestaurant = restaurant;
      }
      appView.scrollToTop();
      return;
    }

    // else set app state to overview mode
    this.selectedRestaurant = null;
    await this.applyFilter();
    return;
  }

  /**
   * @returns {Restaurant[]} array containing all restaurants stored in the model
   */
  get restaurants() {
    return model.restaurants;
  }

  /**
   * @returns {Set.<string>} a set containing all available cuisines
   */
  get cuisines() {
    return model.cuisines;
  }

  /**
   * @returns {Set.<string>} a set containing all available neighborhoods
   */
  get neighborhoods() {
    return model.neighborhoods;
  }

  /**
   * @returns {Restaurant} the restaurant currently selected by the user, or null if none is 
   * selected
   */
  get selectedRestaurant() {
    return model.selectedRestaurant;
  }

  /**
   * Sets the selected restaurant and the state of the app according to this. 
   * If null is provided the app state will be set to overview mode.
   * 
   * @param {Restaurant} restaurant - the restaurant to be selected or null if the app is to be set 
   * to overview mode
   */
  set selectedRestaurant(restaurant) {
    // set model
    model.selectedRestaurant = restaurant;

    //then render views
    restaurantsView.render();
    appView.render();
    mapView.render();
  }

  /**
   * @returns {Restaurant[]} an array of the restaurants currently matching the filter criteria 
   * provided by the user.
   */
  get filteredRestaurants() {
    return model.filteredRestaurants;
  }

  /**
   * @returns {{lat: number, lng: number}} the coordinates of the center of all filtered restaurants.
   */
  get centerCoordinatesOfFiltered() {
    return model.centerCoordinatesOfFiltered;
  }
}

/**
 * The general view of the app, not including specific view elements of the app, which are contained 
 * in separate views
 */
class AppView {
  constructor() {
    /**
     * The body element of the app DOM
     * 
     * @type {Element} 
     */
    this.bodyElement = document.querySelector("body");
  }

  /**
   * Scrolls to the top of the app window.
   * This functionality is especially useable for narrow mobile devices.
   */
  scrollToTop() {
    window.scrollTo(0, 0);
  }

  /**
   * Renders the app as being in either overview or restaurant details state.
   */
  render() {
    this.bodyElement.classList.toggle("details", controller.selectedRestaurant !== null);
  }
}

/**
 * The view representing the restaurant list panel excluding the contained filter panel, which
 * has a dedicated view. The restaurant list panel is responsible for listing restaurant items in 
 * overview mode or the restaurant details view when a restaurant is selected. 
 */
class RestaurantsListPanelView {
  /**
   * @param {Element} listPanelElement - The list panel element that the view is to manage.
   */
  constructor(listPanelElement) {
    /**
     * The list panel element that the view is managing.
     *
     * @type {Element}
     */
    this.panelElement = listPanelElement;
  }

  /**
   * Clears the restaurant list if it exists. 
   * Returns if a list does not exist.
   */
  clearList() {
    if(this.listElement) this.listElement.innerHTML = "";
  }
  
  /**
   * Deletes all content from the list panel.
   */
  clearPanel() {
    this.panelElement.innerHTML = "";
  }
  
  /**
   * Add a restaurant list to the list panel if one does not exist already.
   * Returns if a list already exists.
   */
  addList() {
    // add list only if one does not exist already
    if (!this.hasList) {
      // clear the panel for non-list content such as messages
      this.clearPanel();
      // add empty list
      this.listElement = RestaurantsListPanelView.createListElement();
      this.panelElement.append(this.listElement);
    }
  }

  /**
   * @returns {boolean} true the panel contains a restaurant list
   */
  get hasList() {
    return Boolean(this.panelElement.querySelector("ul.restaurant-list"));
  }

  /**
   * Renders the restaurant list panel based on the current app state.
   */
  render() {
    // remove all content from the list panel
    this.clearPanel();

    // if a restaurant is selected, add a restaurant details element
    if (controller.selectedRestaurant) {
      // add empty list
      this.addList();

      // create and add a restaurant details element for the selected restaurant to the list
      const listItemDetailsElement = RestaurantsListPanelView.createListItemDetailsElement(
        controller.selectedRestaurant
      );      
      this.listElement.append(listItemDetailsElement);

      // set focus on restuarant details header containing the restaurant name
      const header = listItemDetailsElement.querySelector("h2");
      if (header) header.focus();
      
      return;
    }

    // if there are restaurants matching the filter criteria provided by the user, show filtered 
    // search results
    if (controller.filteredRestaurants && controller.filteredRestaurants.length) {
      // add empty list
      this.addList();

      // add list restaurant overview items corresponding to the restaurant matching the filter 
      // criteria provide by the user
      for (const restaurant of controller.filteredRestaurants) {
        const listItemElement = RestaurantsListPanelView.createListItemElement(restaurant);
        this.listElement.append(listItemElement);
      }

      // set focus on restaurant overview item header containing the restaurant name, for the first 
      // entry in the list
      const header = this.listElement.firstChild.querySelector("h2");
      if (header) header.focus();
      
      return;
    }

    // else add a message stating that there are no restaurants matching the filter criteria
    const messageElement = RestaurantsListPanelView.createMessageElement("No Matches");
    this.panelElement.append(messageElement);
  }

  /**
   * @returns {Element} a restaurant list element
   * @static
   */
  static createListElement() {
    const listElement = document.createElement("ul");
    listElement.className = "restaurant-list";
    return listElement;
  }

  /**
   * @param {string} message - The message to add to the element.
   * @returns {Element} a restaurant list message element containing the provided message.
   * @static
   */
  static createMessageElement(message) {
    const messageElement = document.createElement("p");
    messageElement.className = "restaurant-list-panel-message";
    messageElement.innerHTML = message;
    return messageElement;
  }

  /**
   * @param {Restaurant} restaurant - The restaurant to create an image for
   * @param {string} sidePanelWidth - A valid CSS width expression indicating the expected image 
   * width for non-narrow viewport devices (e.g. tablet, desktop). 100% viewport width is assumed 
   * for narrow viewport devices (e.g. phones with less than 500dip width)
   * @returns {Element} an img element representing a photo of the restaurant as well as associated 
   * metadata
   * @static
   */
  static createListItemImageElement(restaurant, sidePanelWidth) {
    const imageElement = document.createElement("img");
    imageElement.className = "restaurant-list-item-image";
    imageElement.src = restaurant.imageUrl;
    // add responsive image support
    imageElement.srcset = `img/${restaurant.id}_800px.jpg 800w, 
                               img/${restaurant.id}_640px.jpg 640w, 
                               img/${restaurant.id}_480px.jpg 480w, 
                               img/${restaurant.id}_320px.jpg 320w`;
    // for non-narrow viewports where images are shown in a side panel, define side panel width
    // for narrow viewports width is 100% of the viewport width
    imageElement.sizes = `(max-width: 500px) ${sidePanelWidth},
                              (max-width: 1200px) ${sidePanelWidth},
                              (max-width: 1600px) ${sidePanelWidth},
                               100vw`;
    // add restaurant specific alt text
    imageElement.alt = `Photo of the restaurant ${restaurant.name}`;
    return imageElement;
  }

  /**
   * @param {Restaurant} restaurant - The restaurant to create an address section for.
   * @param {boolean} param.isHeaderVisible - A boolean indicating if the section header is to be 
   * visible. If false the header will still be added to the DOM and be accessible for
   * screen readers, but not visually.
   * @param {boolean} param.isNeighborhoodBold - A boolean indicating if the neighboorhood should be
   * displayed in bold.
   * @returns {Element} a section element with address information
   * @static
   */
  static createListItemAddressSectionElement(
    restaurant, {isHeaderVisible = true, isNeighborhoodBold = false} = {}) {

    const addressSectionElement = document.createElement("section");
    addressSectionElement.className = "restaurant-list-item-address-section";

    // always add a section header to the DOM, but hide visually if specified
    const addressSectionHeaderElement = document.createElement("h3");
    if (typeof isHeaderVisible !== "undefined" && !isHeaderVisible)
      addressSectionHeaderElement.className = "screenreader";
    addressSectionHeaderElement.innerHTML = "Address";
    addressSectionElement.append(addressSectionHeaderElement);

    const neighborhoodElement = document.createElement("p");
    neighborhoodElement.innerHTML = isNeighborhoodBold
      ? `<strong>${restaurant.neighborhood}</strong>`
      : restaurant.neighborhood;
    addressSectionElement.append(neighborhoodElement);

    const addressElement = document.createElement("p");
    addressElement.innerHTML = restaurant.address;
    addressSectionElement.append(addressElement);

    return addressSectionElement;
  }

  /**
   * @param {Restaurant} restaurant - The restaurant to create a title element for.
   * @returns {Element} a restaurant title element.
   * @static
   */
  static createListItemTitleElement(restaurant) {
    const titleElement = document.createElement("h2");
    titleElement.innerHTML = restaurant.name;
    titleElement.className = "text-accent";
    return titleElement;
  }

  /**
   * @param {Restaurant} restaurant - The restaurant to create a view restaurant details link button
   * for.
   * @returns {Element} a restaurant details link button element
   * @static
   */
  static createListItemViewDetailsElement(restaurant) {
    const viewDetailsElement = document.createElement("a");
    viewDetailsElement.innerHTML = "View Details";
    viewDetailsElement.className = "restaurant-list-item-button panel-button-accent";
    
    // add restaurant specific aria-label making it accessible for screen readers
    viewDetailsElement.setAttribute(
      "aria-label",
      `view details for the restaurant: ${restaurant.name}`
    );
    
    viewDetailsElement.href = restaurant.url;
    return viewDetailsElement;
  }

  /**
   * @param {string} cuisine - The cuisine to create a cuisine tag for.
   * @returns {Element} a cuisine tag element for the provided cuisine.
   * @static
   */
  static createListItemCuisineTagElement(cuisine) {
    const cuisineTagElement = document.createElement("p");
    cuisineTagElement.className = "restaurant-list-item-tag text-all-caps";
    
    // use img role and aria-label for screen readers, ensuring the cusine context is clear for 
    // screen reader users
    cuisineTagElement.setAttribute("role", "img");
    cuisineTagElement.setAttribute("aria-label", `cuisine: ${cuisine}`);
    
    cuisineTagElement.innerHTML = cuisine;
    return cuisineTagElement;
  }

  /**
   * @param {Restaurant} restaurant - The restaurant to an operating hours section for.
   * @returns {Element} an operating hours section element for the provided restaurant.
   * @static
   */
  static createListItemOperatingHoursSectionElement(restaurant) {
    const operatingHoursSectionElement = document.createElement("section");
    operatingHoursSectionElement.className = "restaurant-list-item-operating-hours-section";

    const operatingHoursSectionHeaderElement = document.createElement("h3");
    operatingHoursSectionHeaderElement.innerHTML = "Operating Hours";
    operatingHoursSectionElement.append(operatingHoursSectionHeaderElement);

    const operatingHoursTableElement = document.createElement("table");
    operatingHoursTableElement.className = "restaurant-list-item-operating-hours-table";

    for (let day in restaurant.operating_hours) {
      const rowElement = document.createElement("tr");

      const dayElement = document.createElement("td");
      dayElement.innerHTML = day;
      rowElement.appendChild(dayElement);

      const hoursElement = document.createElement("td");
      hoursElement.innerHTML = restaurant.operating_hours[day];
      rowElement.appendChild(hoursElement);

      operatingHoursTableElement.appendChild(rowElement);
    }
    operatingHoursSectionElement.append(operatingHoursTableElement);

    return operatingHoursSectionElement;
  }

  /**
   * @param {Restaurant} restaurant - The restaurant to create a reviews section for.
   * @returns {Element} an reviews section element for the provided restaurant.
   * @static
   */
  static createListItemReviewsSectionElement(restaurant) {
    const reviewsSectionElement = document.createElement("section");
    reviewsSectionElement.className = "restaurant-list-item-reviews-section";

    const reviewsSectionHeaderElement = document.createElement("h3");
    reviewsSectionHeaderElement.innerHTML = "Reviews";
    reviewsSectionElement.append(reviewsSectionHeaderElement);

    // add a list of reviews if any reviews exist
    if (restaurant.reviews && restaurant.reviews.length) {
      const reviewListElement = document.createElement("ul");
      reviewListElement.className = "restaurant-list-item-review-list";
      reviewsSectionElement.append(reviewListElement);

      for (const review of restaurant.reviews) {
        const reviewElement = RestaurantsListPanelView.createListItemReviewElement(review);
        reviewListElement.append(reviewElement);
      }
    } else { // create a message element stating that no reviews exist
      const messageElement = RestaurantsListPanelView.createMessageElement("No Reviews Yet");
      reviewsSectionElement.append(messageElement);
    }

    return reviewsSectionElement;
  }

  /**
   * @param {number} rating - An integer between 1 and 5 representing a review rating.
   * @returns {Element} a review rating element
   * @static
   */
  static createListItemReviewRatingElement(rating) {
    // validate rqating input
    const parsedRating = parseInt(rating);
    if(isNaN(parsedRating)) throw new Error("rating is not a number");
    if(parsedRating < 1 || parsedRating > 5) throw new Error("rating must be in range 1-5");

    const reviewRatingElement = document.createElement("span");
    reviewRatingElement.className = "star-rating-span";

    // add aria attributes to make sure the visual star representation has a meaningful alt 
    // textual representation for screen reader users 
    reviewRatingElement.setAttribute("role", "img");
    reviewRatingElement.setAttribute("aria-label", `Rating: ${rating} out of 5 stars`);

    // create filled or empty stars in-line according to the provided rating
    for (let starIndex = 1; starIndex <= 5; starIndex++) {
      let starElement = document.createElement("i");
      starElement.className = `${starIndex <= rating ? "fas" : "far"} fa-star`;

      // ensure that individual stars are not visible for screen readers
      starElement.setAttribute("aria-hidden","true");
      reviewRatingElement.append(starElement);
    }

    return reviewRatingElement;
  }

  /**
   * @param {{name: string, date: string, rating: number, comments: string}} review - The review to
   * create an element for
   * @returns {Element} a review list item element representing the provided review
   * @static
   */
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

  /**
   * @param {Restaurant} restaurant - The restaurant to create an overview element for.
   * @returns {Element} a list item element containing restaurant overview info
   * @static
   */
  static createListItemElement(restaurant) {
    const itemElement = document.createElement("li");
    itemElement.className = "restaurant-list-item";

    const imageElement = RestaurantsListPanelView.createListItemImageElement(restaurant, "33vw");
    itemElement.append(imageElement);

    const infoPanelElement = document.createElement("section");
    infoPanelElement.className = "restaurant-list-item-info-panel";

    const titleElement = RestaurantsListPanelView.createListItemTitleElement(restaurant);
    infoPanelElement.append(titleElement);

    const addressSectionElement = RestaurantsListPanelView.createListItemAddressSectionElement(
      restaurant, { isHeaderVisible: false, isNeighborhoodBold: true });
    infoPanelElement.append(addressSectionElement);

    itemElement.append(infoPanelElement);

    const viewDetailsElement = RestaurantsListPanelView.createListItemViewDetailsElement(
      restaurant
    );
    itemElement.append(viewDetailsElement);

    return itemElement;
  }

  /**
   * @param {Restaurant} restaurant - The restaurant to create a restaurant details element for,
   * @returns {Element} a list item element containing restaurant details and reviews
   * @static
   */
  static createListItemDetailsElement(restaurant) {
    const itemElement = document.createElement("li");
    itemElement.className = "restaurant-list-item";

    const titleElement = RestaurantsListPanelView.createListItemTitleElement(restaurant);
    titleElement.classList.add("text-center");
    itemElement.append(titleElement);

    const imageElement = RestaurantsListPanelView.createListItemImageElement(restaurant, "50vw");
    itemElement.append(imageElement);

    const cuisineTagElement = 
      RestaurantsListPanelView.createListItemCuisineTagElement(restaurant.cuisine_type);
    itemElement.append(cuisineTagElement);

    const infoPanelElement = document.createElement("section");
    infoPanelElement.className = "restaurant-list-item-info-panel";

    const addressSectionElement = RestaurantsListPanelView.createListItemAddressSectionElement(
      restaurant, { isHeaderVisible: true, isNeighborhoodBold: false });
    infoPanelElement.append(addressSectionElement);

    const operatingHoursSectionElement = RestaurantsListPanelView.createListItemOperatingHoursSectionElement(
      restaurant
    );
    infoPanelElement.append(operatingHoursSectionElement);

    itemElement.append(infoPanelElement);

    const reviewsSectionElement = RestaurantsListPanelView.createListItemReviewsSectionElement(
      restaurant
    );
    itemElement.append(reviewsSectionElement);

    return itemElement;
  }
}

/**
 * The view representing the restaurant filter panel. 
 * The restaurant filter panel provides restaurant filtering options for the user.
 */
class RestaurantsFilterPanelView {
  /**
   * @param {Element} filterPanelElement - The filter panel element that the view is to manage.
   */
  constructor(filterPanelElement) {
    /**
     * The filter panel element that the view is managing
     * 
     * @type {Element}
     */
    this.panelElement = filterPanelElement;
    
    /**
     * The element representing the expander switch button in the filter panel
     * 
     * @type {Element} 
     */
    this.expanderButtonElement = filterPanelElement.querySelector(".filter-panel-expander-button");
    
    /**
     * The element representing the expander switch button icon in the filter panel
     * 
     * @type {Element} 
     */
    this.expanderIconElement = filterPanelElement.querySelector(".filter-panel-expander-icon");
    
    /**
     * The element representing the expander content container in the filter panel
     * 
     * @type {Element} 
     */
    this.expanderContentElement = filterPanelElement.querySelector(
      ".filter-panel-expander-content"
    );
    
    /**
     * The element representing the cuisine dropdown input element in the filter panel
     * 
     * @type {Element} 
     */
    this.cuisinesSelectElement = document.querySelector("#cuisines-select");

    /**
     * The element representing the neighborhood dropdown input element in the filter panel
     * 
     * @type {Element} 
     */
    this.neighborhoodsSelectElement = document.querySelector("#neighborhoods-select");

    // add event listener for expander button
    this.expanderButtonElement.addEventListener("click", () => this.toggleExpansionState());

    // add event listeners for filter inputs
    this.cuisinesSelectElement.addEventListener("change", function() {
      controller.applyFilter();
    });
    this.neighborhoodsSelectElement.addEventListener("change", function() {
      controller.applyFilter();
    });
  }

  /**
   * @returns {boolean} true if the expander content is visible
   */
  get isExpanded() {
    return this.expanderButtonElement.getAttribute("aria-expanded") === "true";
  }

  /**
   * @param {boolean} isExpanded - A boolean indicating if the expander content is to be visible
   */
  set isExpanded(isExpanded) {    
    if (isExpanded) {
      // set aria attributes, including expander usage explanation in label
      this.expanderButtonElement.setAttribute("aria-expanded", "true");
      this.expanderButtonElement.setAttribute("aria-label", "filter panel, click to collapse");
      
      // set icon
      this.expanderIconElement.classList.add("fa-chevron-circle-down");
      this.expanderIconElement.classList.remove("fa-chevron-circle-up");

      // show content
      this.expanderContentElement.classList.remove("hidden");
      this.expanderContentElement.classList.add("expanded");
    } else {
      // set aria attributes, including expander usage explanation in label
      this.expanderButtonElement.setAttribute("aria-expanded", "false");
      this.expanderButtonElement.setAttribute("aria-label", "filter panel, click to expand");

      // set icon
      this.expanderIconElement.classList.add("fa-chevron-circle-up");
      this.expanderIconElement.classList.remove("fa-chevron-circle-down");

      // hide content
      this.expanderContentElement.classList.add("hidden");
      this.expanderContentElement.classList.remove("expanded");
    }
  }

  /**
   * Toggles expansion state. Collapses if expanded. Expands if collapsed.
   */
  toggleExpansionState() {
    this.isExpanded = !this.isExpanded;
  }

  /**
   * Renders the filter panel.
   */
  render() {
    this.renderCuisinesInput();
    this.renderNeighborhoodsInput();
  }

  /**
   * Renders the cuisine dropdown input of the filter panel.
   */
  renderCuisinesInput() {
    this._renderSelectInput(this.cuisinesSelectElement, controller.cuisines, {
      allLabel: "All Cuisines",
      allValue: "all"
    });
  }

  /**
   * Renders the neighborhood dropdown input of the filter panel.
   */
  renderNeighborhoodsInput() {
    this._renderSelectInput(this.neighborhoodsSelectElement, controller.neighborhoods, {
      allLabel: "All Neighborhoods",
      allValue: "all"
    });
  }

  /**
   * Renders a dropdown select input in the filter panel based on a provided list of options, and
   * optionally, a 'select all' option (i.e. no filtering is applied). 
   * 
   * @param {Element} selectElement - The select element representing the dropdown input.
   * @param {string[]} values - The values to populate the dropdown with. Values are used for both label
   * and value of options.
   * @param {string} param2.allLabel - The label of the 'select all' option.
   * @param {string} param2.allValue - The value of the 'select all' option.
   * @protected
   */
  _renderSelectInput(selectElement, values, { allLabel, allValue } = {}) {
    // clear existing options
    selectElement.innerHTML = "";

    // add 'select all' option first (default) if provided
    if (allLabel && allValue) {
      let option = document.createElement("option");
      option.innerHTML = allLabel;
      option.value = allValue;
      selectElement.append(option);
    }

    // return if no option values are provided
    if (!values) return;

    // populate with provided option values
    for (const value of values) {
      let option = document.createElement("option");
      option.innerHTML = value;
      option.value = value;
      selectElement.append(option);
    }
  }
}

/**
 * The view representing the map in the app.
 * The map API is MapBox.js, now deprecated. Current MapBox alternative is MapBox GL
 */
class MapView {
  constructor() {
    /**
     * The MapBox Map object.
     * 
     * 
     * @type {L.Map}
     */
    this.map = L.map("map", {
      center: [40.722216, -73.987501],
      zoom: 12,
      scrollWheelZoom: true,
      keyboard: false
    });
    // add tile layer to map
    L.tileLayer(
      "https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}",
      {
        mapboxToken:
          "pk.eyJ1IjoiYW5kcmVhc3JhZm4iLCJhIjoiY2syM2pzaDh3MG5leDNibXpoZ29taHJwdyJ9.C4ToektHZj4A-0SSJTTVcQ",
        maxZoom: 18,
        attribution:
          `Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors,
          <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>,
          Imagery © <a href="https://www.mapbox.com/">Mapbox</a>`,
        id: "mapbox.streets"
      }
    ).addTo(this.map);
    /**
     * A list of markers currently added to the map.
     * 
     * @type {L.Marker[]}
     */
    this.markers = [];
    /**
     * The DOM element hosting the map
     * 
     * @type {Element}
     */
    this.mapElement = document.querySelector("#map");
  }

  /**
   * Removes all existing markers from the map and clears the markers list.
   * 
   * @protected
   */
  _clearMarkers() {
    for (const marker of this.markers) {
      marker.remove();
    }
    this.markers = [];
  }

  /**
   * Centers the map based on markers and app state.
   * 
   * @protected
   */
  _center() {
    // zoom in further on single marker in restaurant details view
    if (controller.selectedRestaurant) {
      this.map.setView(controller.selectedRestaurant.latlng, 16);
      return;
    }
    // zoom in less on center of 1-n markers in overview view
    if (controller.filteredRestaurants) {
      this.map.setView(controller.centerCoordinatesOfFiltered, 12);
    }
  }

  /**
   * Adds a marker for the provided restaurant using location information stored in the Restaurant
   * object.
   * 
   * @param {Restaurant} restaurant - The restaurant to add a marker for
   */
  _addMarker(restaurant) {
    // create marker    
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], {
      title: restaurant.name,
      alt: `Map marker for the restaurant: ${restaurant.name} 
        with coordinates: latitude: ${restaurant.latlng.lat},
        longitude: ${restaurant.latlng.lng}`,
      url: restaurant.url
    });
    marker.addTo(this.map);
  
    // add event handler to make to marker a link to view details for its restaurant
    marker.on("click", () => (window.location.href = marker.options.url));
    
    // add marker to collection
    this.markers.push(marker);
  }

  /**
   * Renders the map based on the current app state.
   */
  render() {
    // remove existing markers
    this._clearMarkers();

    // if a restaurant is selected, mark and center on this restaurant
    if (controller.selectedRestaurant) {
      this._addMarker(controller.selectedRestaurant);
      this._center();
      return;
    }

    // else mark all restaurants matching filter criteria and center in the middle of these
    if (controller.filteredRestaurants) {
      for (const restaurant of controller.filteredRestaurants) {
        this._addMarker(restaurant);
      }
    }
    this._center();
  }
}

// register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("/RestaurantReviewsApp/sw.js").then(
      function(registration) {
        // Registration was successful
        console.log("ServiceWorker registration successful with scope: ", registration.scope);
      },
      function(err) {
        // registration failed :(
        console.log("ServiceWorker registration failed: ", err.message);
      }
    );
  });
}

// initialize MVC variables
const model = new RestaurantsModel();
const controller = new RestaurantsController();
const appView = new AppView();
const filterView = new RestaurantsFilterPanelView(document.querySelector(".filter-panel"));
const restaurantsView = new RestaurantsListPanelView(
  document.querySelector(".restaurant-list-panel")
);
const mapView = new MapView();

// Start app
controller.initialize();
