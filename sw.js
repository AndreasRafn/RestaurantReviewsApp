/* sw.js
 *
 * provides service worker code for caching site assets. 
 * the service worker code is designed for offline first.
 * the site is assumed 
 */

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open("restaurant-reviews-cache").then(function (cache) {
            // add core app files to cache, images and data is added on first succesful fetch
            cache.addAll([
                "/index.html",
                "css/styles.css",
                "https://unpkg.com/leaflet@1.5.1/dist/leaflet.css",
                "https://unpkg.com/leaflet@1.5.1/dist/leaflet.js",
                "js/app.js"
            ]);
        })
    );
})

self.addEventListener("fetch", function (event) {
    event.respondWith(
        caches.open("restaurant-reviews-cache").then(function (cache) {
            return cache.match(event.request).then(function (response) {
                // return cache match if found or try fetch and add to cache if fetched
                return response || fetch(event.request).then(function (response) {
                    // note that for this exercise we cache everything, which is not sustainable in a real world scenario
                    cache.put(event.request, response.clone());
                    return response;
                });
            }).catch(reason => {
                console.log("caching failed", reason);
            });
        })
    );
});