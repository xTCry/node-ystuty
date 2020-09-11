import axios from 'axios';
import md5 from 'md5';
import qs from 'querystring';
import Iconv from 'iconv-lite';
import cm from './cacheman';

const API_URL = 'https://www.ystu.ru';
const COOKIES_FILE = 'cookies';

export default class API {
    private login: string;
    private password: string;

    private _PHPSESSID: string = null;

    constructor({ login = undefined, password = undefined }) {
        this.login = login;
        this.password = password;
    }

    /**
     * Init
     */
    public async Init() {
        if (!this._PHPSESSID) {
            let res = await cm.read(COOKIES_FILE);
            if (res) {
                let { cookies } = res;
                if (cookies.PHPSESSID) {
                    this._PHPSESSID = cookies.PHPSESSID;
                }
            }
        }


        let response = await this.go('/WPROG/lk/lkstud.php');
        let isAuth = !API.IsNeedAuth(response);

        if (!isAuth) {
            let isAuth2 = await this.Auth();
            if (isAuth === isAuth2) {
                console.error('Failed auth');
            }
        }

        await cm.update(COOKIES_FILE, { cookies: { PHPSESSID: this._PHPSESSID } });
    }

    private UpdateCookie(response) {
        if (Array.isArray(response.headers['set-cookie'])) {
            let _PHPSESSID = response.headers['set-cookie'].find((str) => str.includes('PHPSESSID')) as string;
            if (_PHPSESSID) {
                let [, , PHPSESSID] = _PHPSESSID.match(/(.+)=(.+);/i);
                if (PHPSESSID) {
                    this._PHPSESSID = PHPSESSID;
                }
            }
        }
    }

    public async Auth() {
        if (!this.login || !this.password) {
            return false;
        }

        let response = await this.go('/WPROG/auth1.php', 'POST', {
            login: this.login,
            password: this.password,
        });

        let response2 = await this.go('/WPROG/lk/lkstud.php');
        let isAuth = !API.IsNeedAuth(response2);
        return isAuth;
    }

    /**
     * GO with cache
     */
    public async goc(url, method = 'GET', postData = {}, axiosData: any = {}) {
        method = method.toUpperCase();

        if ((null === axiosData.data || void 0 === axiosData.data) && 'GET' !== method) {
            axiosData.data = postData;
        }

        if (!axiosData.headers) axiosData.headers = {};

        if ('GET' !== method) {
            axiosData.data = qs.stringify(postData);
            Object.assign(axiosData.headers, {
                'Content-Type': 'application/x-www-form-urlencoded',
            });
        }

        if (this._PHPSESSID) {
            if (axiosData.headers['Cookie']) {
                axiosData.headers['Cookie'] += `; PHPSESSID=${this._PHPSESSID};`;
            } else {
                axiosData.headers['Cookie'] = `PHPSESSID=${this._PHPSESSID};`;
            }
        }

        axiosData.params = 'GET' === method ? postData : {};
        axiosData.responseType = 'arraybuffer';

        let file = `${url}_${method}_${md5(axiosData)}`;
        let isTimed = await cm.isTimed(file);

        if (isTimed === false) {
            let { data } = await cm.read(file);
            return {
                isCache: true,
                data,
            };
        }

        let response = await this.go(url, method, postData, axiosData);
        await cm.update(file, { data: response.data });
        return response;
    }

    public async go(url, method = 'GET', postData = {}, axiosData: any = {}) {
        method = method.toUpperCase();

        if ((null === axiosData.data || void 0 === axiosData.data) && 'GET' !== method) {
            axiosData.data = postData;
        }

        if (!axiosData.headers) axiosData.headers = {};

        if ('GET' !== method) {
            axiosData.data = qs.stringify(postData);
            Object.assign(axiosData.headers, {
                'Content-Type': 'application/x-www-form-urlencoded',
            });
        }

        if (this._PHPSESSID) {
            if (axiosData.headers['Cookie']) {
                axiosData.headers['Cookie'] += `; PHPSESSID=${this._PHPSESSID};`;
            } else {
                axiosData.headers['Cookie'] = `PHPSESSID=${this._PHPSESSID};`;
            }
        }

        axiosData.params = 'GET' === method ? postData : {};
        axiosData.responseType = 'arraybuffer';

        try {
            const response = await this.Xt(`${API_URL}${url}`, method, axiosData);
            return response;
        } catch (e_2) {
            console.error(e_2);
            return e_2;
        }
    }

    public Xt(url, method, data) {
        return axios({
            ...data,
            method,
            url,
        }).then((response) => {
            let data = Iconv.decode(response.data, 'windows-1251');
            this.UpdateCookie(response);

            return { ...response, data };
        }, Promise.reject);
    }

    public static IsNeedAuth({ request }) {
        return request.path.includes('auth.php') /* || request._redirectable._isRedirect */;
    }
}
