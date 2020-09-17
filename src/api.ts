import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import md5 from 'md5';
import qs from 'querystring';
import Iconv from 'iconv-lite';
import cm from './cacheman';

const API_URL = 'https://www.ystu.ru';
const COOKIES_FILE = 'cookies';

export default class API {
    private login?: string;
    private password?: string;

    private _PHPSESSID?: string;

    constructor({ login, password }: { login?: string; password?: string }) {
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

        await cm.update(COOKIES_FILE, { cookies: { PHPSESSID: this._PHPSESSID } });

        if (!isAuth) {
            let isAuth2 = await this.Auth();
            if (isAuth === isAuth2) {
                throw new Error('Failed auth');
            }
        }
    }

    private UpdateCookie(response: AxiosResponse<any>) {
        if (Array.isArray(response.headers['set-cookie'])) {
            let _PHPSESSID = response.headers['set-cookie'].find((str) => str.includes('PHPSESSID')) as string;
            if (_PHPSESSID) {
                const [, , PHPSESSID] = _PHPSESSID.match(/(.+)=(.+);/i)!;
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

        // if (response.data.toLowerCase().includes('неправильный логин или пароль')) {
        if (response.data.toLowerCase().includes('<a href="auth.php">')) {
            throw new Error('Wrong login:password');
            return false;
        }

        let response2 = await this.go('/WPROG/lk/lkstud.php');
        let isAuth = !API.IsNeedAuth(response2);
        return isAuth;
    }

    /**
     * GO with cache
     */
    public async goc(url: string, _method: Method = 'GET', postData: any = {}, axiosData: any = {}, forceReload: boolean = false): Promise<{
        data: string;
        status: number;
        statusText: string;
        headers: any;
        config: AxiosRequestConfig;
        request?: any;
    } | {
        isCache: boolean;
        data: string;
    }> {
        let method = _method.toUpperCase();

        if ((null === axiosData.data || undefined === axiosData.data) && 'GET' !== method) {
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

        let file = `${url}_${method}_${md5(axiosData)}`;
        let isTimed = await cm.isTimed(file);

        if (isTimed === false && !forceReload) {
            let { data } = await cm.read(file);
            if (!(data as string).includes('input type="submit" name="login1"')) {
                return {
                    isCache: true,
                    data,
                };
            }
        }

        let response = await this.go(url, _method, postData, axiosData);
        await cm.update(file, { data: response.data });
        return response;
    }

    public async go(url: string, _method: Method = 'GET', postData: any = {}, axiosData: any = {}): Promise<{
        data: string;
        status: number;
        statusText: string;
        headers: any;
        config: AxiosRequestConfig;
        request?: any;
    }> {
        let method = _method.toUpperCase();

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

        try {
            const response = await this.Xt(`${API_URL}${url}`, _method, axiosData);
            return response;
        } catch (e_2) {
            console.error(e_2);
            return e_2;
        }
    }

    public Xt(url: string, method: Method, data: any) {
        return axios({
            ...data,
            responseType: 'arraybuffer',
            method,
            url,
        }).then((response) => {
            let data = response.data;
            data = Iconv.decode(data, 'cp1251');

            this.UpdateCookie(response);

            return { ...response, data };
        }, Promise.reject);
    }

    public static IsNeedAuth({ request }: any) {
        return request.path.includes('auth.php') /* || request._redirectable._isRedirect */;
    }
}
