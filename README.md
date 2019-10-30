# Restaurant Reviews App

Implementation of a read-only fictional restaurant info and reviews site based on a provided
solution of intentionally poor quality. The original solution had bugs, loads of duplicated and 
redundant code, was non-responsive, non-accessible and non-cached. This solution tries to rectify
all of the above issues. 

This site is the fifth project submission on the Udacity Front-End Developer Nanodegree.

Try it live here: [https://andreasrafn.github.io/RestaurantReviewsApp/](https://andreasrafn.github.io/RestaurantReviewsApp/)

## Implementation notes

It was a requirement not to use any front-end frameworks (e.g. React, Angular, etc.) or similar 
remedies (that's how I interpreted it), so everything is vanilla, even the MVC architecture
implementation.

Note furthermore that certain parts of the app (data, images, etc.) are handled in a non-dynamic manner due to
the nature of the provided materials and requirements to the exercise. 

## Prerequisites

* An Internet Browser
* A simple http server to host the app, e.g. [Python's http.server](https://docs.python.org/3/library/http.server.html)

## How To Clone & Run

To clone and run this application, you'll need [Git](https://git-scm.com) installed on your computer. From your command line, clone like this:

```bash
# Navigate to the directory you would like to clone to
$ cd "c:/a/folder/i/would/like/to/clone/to"

# Clone this repository
$ git clone https://github.com/AndreasRafn/RestaurantReviewsApp.git
```

Then use a server to serve the cloned repository. Using [Python's http.server](https://docs.python.org/3/library/http.server.html) this can be done by installing [Python](https://www.python.org/downloads/) and running a local http.server instance. From your command line, do the following:

```bash
# Navigate to the repository (here using same path as above)
$ cd "c:/a/folder/i/would/like/to/clone/to"

# Start server on port 8000 - use a unblocked port of your choice
$ python -m http.server 8000
```

## How To Use

General use should be self-explanatory, but includes:

* Click the filter to filter the restaurant list by cuisine and neighborhood respectively
* Click *View Details* on a restaurant item to view details
* Click *Back to results* to go back to ´the overview from the restaurant details view

### Keyboard & Screen Reader Users

The app has been optimized for accessibility by requirement. To use with keyboard and most screen readers:

* Navigate between interactive elements with TAB (forward) and SHIFT + TAB (backward)
* Hit ENTER to follow links and push buttons
* Use ARROW keys to select dropdown options

## Built With

* [Visual Studio Code](https://code.visualstudio.com/) - The IDE used
* [VS Code Debugger for Chrome](https://github.com/Microsoft/vscode-chrome-debug) - The debugger used
* [MapBox.js](https://docs.mapbox.com/mapbox.js/api/v3.2.1/) - The map API used
* [Font Awesome](https://fontawesome.com/) - Symbols and icons
* [Roboto Font](https://fonts.google.com/specimen/Roboto) - App font

## Authors

* **Andreas Rafn**  

## Acknowledgments

* Inspired by materials provided by the [Udacity Front-End Developer Nanodegree](https://eu.udacity.com/course/front-end-web-developer-nanodegree--nd001)