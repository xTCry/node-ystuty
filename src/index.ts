import API from './api';
import TTMan from './ttman';
import './server';

require('dotenv').config();

const api = new API({
    login: process.env.LOGIN,
    password: process.env.PASSWORD,
});

(async () => {
    try {
        await api.Init();
        await TTMan.Init(api);
    } catch (error) {
        console.log('Error', error.message);
    }
})();
