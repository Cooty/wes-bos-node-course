import axios from 'axios';
import { $ } from './bling';

const defaultLat = 43.2;
const defaultLng = -79.8;

const mapOptions = {
    center: {
        lat: defaultLat,
        lng: defaultLng,
    },
    zoom: 10,
};

function loadPlaces(map, lat= defaultLat, lng= defaultLng) {
    axios.get(`/api/stores/near?lat=${lat}&lng=${lng}`)
        .then(results => {
            const places = results.data;

            if(!results.data.length) {
                alert('No places found! :(');
                return;
            }

            const bounds = new google.maps.LatLngBounds();
            const infoWindow = new google.maps.InfoWindow();

            const markers = places.map(place => {
                const [placeLng, placeLat] = place.location.coordinates;
                // const position = new google.maps.LatLng(placeLat, placeLng);
                const position = {lat: placeLat, lng: placeLng};
                bounds.extend(position);
                const marker = new google.maps.Marker({map, position});
                // attach all the data of the Place that came from the API to the GMaps Marker
                // this will be useful for info bubbles
                marker.place = place;
                return marker;
            });

            markers.forEach(marker => marker.addListener('click', function() {
                const {
                    slug,
                    photo,
                    name,
                    location
                } = this.place;

                const html = `
                    <div class="popup">
                        <a href="/stores/${slug}">
                            <img src="/uploads/${photo || 'store.png'}" alt="A picture from ${name}" />
                            <p>
                                ${name} - ${location.address}
                            </p>
                        </a>
                    </div>
                `;

                infoWindow.setContent(html);
                infoWindow.open(map, this);
            }));

            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);

        });
}

function makeMap(mapDiv) {
    if(!mapDiv) return;

    const map = new google.maps.Map(mapDiv, mapOptions);
    loadPlaces(map);

    const input = $('[name="geolocate"]');
    const autocomplete = new google.maps.places.Autocomplete(input);

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng());
    });

    return {map, autocomplete};
}

export default makeMap;