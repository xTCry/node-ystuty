import API from './api';
import TTMan from './ttman';
import './server';

require('dotenv').config();

const api = new API({
    login: process.env.LOGIN,
    password: process.env.PASSWORD,
});

(async () => {
    await api.Init();
    await TTMan.Init(api);
})();
