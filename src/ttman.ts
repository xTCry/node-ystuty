import { load } from 'cheerio';
import { parseWeekByCheerio, splitToWeeks } from './parser';
import cm from './cacheman';
import API from './api';

export class CTimeTableManager {
    FSLinks: any[] = null;
    api: API;

    constructor(api?: API) {
        this.api = api;
    }

    public async Init(api?: API) {
        if (api) {
            this.api = api;
        }

        // Find all list
        let { data } = await this.api.goc('/WPROG/rasp/raspz.php');
        let linkToFullList = this.getHrefToFullList(data);

        let { data: data2 } = await this.api.goc(linkToFullList);

        if (data2) {
            this.FSLinks = this.getFSLinks(data2);
        } else {
            console.error('Failed load FS Links');
        }
    }

    public get allGroups() {
        if (!this.FSLinks) {
            return [];
        }

        return this.FSLinks.reduce((a, f) => ([...a, ...f.links]), []);
    }

    public async getTTByName(name: string) {
        let cacheData = await this.getCache(name);
        if (cacheData !== null) {
            return {
                isCache: true,
                data: cacheData,
            };
        }

        let dataLink = this.getDataLinkByName(name);
        if (!dataLink) {
            return null;
        }

        let { data } = await this.api.goc(dataLink.link);
        let tt = await this.convertTT(data);
        await this.setCache(name, tt);
        return {
            isCache: false,
            data: tt,
        };
    }

    public async setCache(name: string, data: any) {
        return await cm.update(`${name}_tt`, data);
    }

    public async getCache(name: string) {
        let file = `${name}_tt`;
        let isTimed = await cm.isTimed(file);

        if (isTimed === false) {
            return await cm.read(file);
        }

        return null;
    }

    public getDataLinkByName(name: string) {
        if (!this.FSLinks) {
            return null;
        }
        return this.allGroups.find((e) => e.title.toLowerCase() === name.toLowerCase());
    }

    public getHrefToFullList(html) {
        const $ = load(html);
        return '/WPROG/rasp/' + $('#tab1 > tbody > tr:nth-child(1) > td:nth-child(1) > a').attr('href');
    }

    public getFSLinks(html) {
        const $ = load(html);
        let arr = [];

        let countFS = $(
            `body > div.WidthLimiter > div.Content > div.RightContentColumn > div > div > div.hidetext > table > tbody > tr`
        ).length;

        if (countFS % 2 === 0) {
            for (let index = 1; index < countFS; index += 2) {
                let title = $(
                    `body > div.WidthLimiter > div.Content > div.RightContentColumn > div > div > div.hidetext > table > tbody > tr:nth-child(${index})`
                ).text();
                let cententHTML = $(
                    `body > div.WidthLimiter > div.Content > div.RightContentColumn > div > div > div.hidetext > table > tbody > tr:nth-child(${
                        index + 1
                    }) > td:nth-child(2) > a`
                );

                let links = cententHTML.toArray().map((el) => {
                    let el2 = $(el);
                    return { title: el2.text(), link: '/WPROG/rasp/' + el2.attr('href') };
                });

                arr.push({
                    title,
                    links,
                });
            }
        }

        return arr;
    }

    public async convertTT(tableHTML) {
        const $ = load(tableHTML);

        let { days: allDays } = parseWeekByCheerio($);
        let out2 = splitToWeeks(allDays);

        return out2;
    }
}

const TTMan = new CTimeTableManager();
export default TTMan;
