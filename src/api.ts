import axios from 'axios';
// import https from 'https';
import Fs from 'fs-extra';
import FormData from 'form-data';
import qs from 'querystring';
import Iconv from 'iconv-lite';

const API_URL = 'https://www.ystu.ru';
const COOKIES_PATH = './temp/cookies.data';

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
        let te = this._PHPSESSID;
        if (!this._PHPSESSID && Fs.existsSync(COOKIES_PATH)) {
            try {
                let str = await Fs.readFile(COOKIES_PATH, 'utf8');
                te = str;
                let { cookies } = JSON.parse(str);
                te = cookies;
                if (cookies.PHPSESSID) {
                    this._PHPSESSID = cookies.PHPSESSID;
                }
            } catch (error) {}
        }


        let response = await this.go('/WPROG/lk/lkstud.php');
        let isAuth = !API.IsNeedAuth(response);

        if (!isAuth) {
            let isAuth2 = await this.Auth();
            if (isAuth === isAuth2) {
                console.error('Failed auth');
            }
        }

        await Fs.writeFile(COOKIES_PATH, JSON.stringify({ cookies: { PHPSESSID: this._PHPSESSID } }));
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

    public async go(url, method = 'GET', postData = {}, axiosData: any = {}, useFormData = false) {
        method = method.toUpperCase();

        if ((null === axiosData.data || void 0 === axiosData.data) && 'GET' !== method) {
            axiosData.data = postData;
        }

        if (!axiosData.headers) axiosData.headers = {};

        if ('GET' !== method && useFormData) {
            let s = new FormData();

            Object.keys(postData).forEach(function (e) {
                let t = postData[e];
                Array.isArray(t)
                    ? t.forEach(function (t) {
                          s.append(e, t);
                      })
                    : s.append(e, t);
            });

            axiosData.data = s;
            Object.assign(axiosData.headers, {
                // 'Content-Type': 'multipart/form-data',
                'Content-Type': 'application/x-www-form-urlencoded',
            });
        } else if ('GET' !== method) {
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
            const e_1 = await this.Xt(`${API_URL}${url}`, method, axiosData);
            return e_1;
        } catch (e_2) {
            console.error(e_2);
            return e_2;
        }
    }

    public Xt(url, method, data) {
        // const httpsAgent = new https.Agent({ keepAlive: true });
        return axios({
            ...data,
            method,
            url,
            // httpsAgent,
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
