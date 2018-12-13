import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(e) {
    e.preventDefault();

    axios
        .post(this.action)
        .then(result => {
            if(result.status !== 200) return;

            const isHearted = this.heart.classList.toggle('heart__button--hearted');

            const heartNumber = $('.heart-count');

            if(heartNumber) {
                heartNumber.innerText = result.data.hearts.length;
            }

            if(isHearted) {
                this.heart.classList.add('heart__button--float');
                setTimeout(() => {
                    return this.heart.classList.remove('heart__button--float');
                }, 2500);
            }

            return isHearted;
        })
        .catch(error => console.error(error));

}

export default ajaxHeart;