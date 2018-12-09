import axios from 'axios';
import dompurify from 'dompurify';

function resultsHTML(stores) {
    return stores.map(store => {
        const template = `
            <a class="search__result" href="/stores/${store.slug}">
                <strong>${store.name}</strong>
            </a>`;

        return dompurify.sanitize(template.trim());
    }).join('');
}

function resultsHandler(container, data, value) {
    if(data.length) {
        container.style.display = '';
        container.innerHTML = resultsHTML(data);
    } else {
        container.innerHTML = `<div class="search__result">No result found for <strong>${value}</strong></div>`;
    }
}

function typeAhead(search) {
    if(!search) return;

    const input = search.querySelector('.search__input');
    const results = search.querySelector('.search__results');

    input.on('input', () => {
        const value = input.value.trim();

        // quit when the input becomes empty
        if(!value) {
            results.style.display = 'none';
            return;
        }

        axios
            .get(`/api/search/?q=${value}`)
                .then((result) => {
                    resultsHandler(results, result.data, value);
                })
                .catch(error => console.warn(error));
    });

    // Keyboard navigation
    input.on('keyup', (e) => {
        const key = e.which;
        // Down arrow 40
        // Up arrow 38
        // Enter 13
        if(![40, 38, 13].includes(key)) {
            return;
        }
        const activeClass = 'search__result--active';
        const current = results.querySelector(`.${activeClass}`);
        const items = results.querySelectorAll('.search__result');
        let next;

        if(key === 40 && current) { // going down with something already selected
            next = current.nextElementSibling || items[0];
        } else if (key === 40) { // going down for the 1st time
            next = items[0];
        } else if(key === 38 && current) { // going up with something already selected
            next = current.previousElementSibling || items[items.length - 1];
        } else if(key === 38) { // going up for the first time
            next = items[items.length - 1]
        } else if (key === 13 && current) {
            window.location = current.href;
            return;
        }

        if(current) {
            current.classList.remove(activeClass);
        }
        next.classList.add(activeClass);
    })
}

export default typeAhead;