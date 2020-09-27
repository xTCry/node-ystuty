import { load } from 'cheerio';
import { IWeek, parseWeekByCheerio, splitToWeeks } from './parser';
import cm from './cacheman';
import API from './api';

export interface IFacultyLink {
    title: string;
    link: string;
    linkLecture?: string;
}

export interface ILinks2Facultets {
    title: string;
    links: IFacultyLink[];
}

export class CTimeTableManager {
    api: API;
    FSLinks?: ILinks2Facultets[];

    constructor(api?: API) {
        this.api = api!;
    }

    public async Init(api?: API) {
        if (api) {
            this.api = api;
        }

        // Find all list
        let { data } = await this.api.goc('/WPROG/rasp/raspz.php');
        let linkToFullList = this.getLinkToFullList(data);

        let { data: data2 } = await this.api.goc(linkToFullList);

        if (data2) {
            this.FSLinks = this.getFSLinks(data2);
            await cm.update('FSLinks', this.FSLinks);
        } else {
            console.error('Failed load FS Links');
        }
    }

    public get allGroups(): IFacultyLink[] {
        if (!this.FSLinks) {
            return [];
        }

        return this.FSLinks.reduce((a: IFacultyLink[], f) => [...a, ...f.links], []);
    }

    public async getTTByName(name: string) {
        let cacheData = await this.getCache(name);
        if (cacheData.length) {
            return {
                isCache: true,
                data: cacheData,
            };
        }

        let dataLink = this.getDataLinkByName(name);
        if (!dataLink) {
            return null;
        }

        let { data: data1 } = await this.api.goc(dataLink.link);
        let tt1 = await this.convertTT(data1, `${name}_sem`);
        let tt2: IWeek[] = [];

        if (dataLink.linkLecture) {
            let { data: data2 } = await this.api.goc(dataLink.linkLecture);
            tt2 = await this.convertTT(data2, `${name}_lec`);
        }

        let data = [...tt2, ...tt1];
        await this.setCache(name, data);
        return {
            isCache: false,
            data,
        };
    }

    public async setCache(name: string, data: any) {
        return await cm.update(`${name}_tt`, data, 86400);
    }

    public async getCache(name: string): Promise<IWeek[]> {
        let file = `${name}_tt`;
        let isTimed = await cm.isTimed(file);

        if (isTimed === false) {
            return await cm.read(file);
        }

        return [];
    }

    public getDataLinkByName(name: string) {
        if (!this.FSLinks) {
            return undefined;
        }
        return this.allGroups.find((e) => e.title.toLowerCase() === name.toLowerCase());
    }

    public getLinkToFullList(html: string) {
        const $ = load(html);
        return '/WPROG/rasp/' + $('#tab1 > tbody > tr:nth-child(1) > td:nth-child(1) > a').attr('href');
    }

    public getFSLinks(html: string) {
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
                let contentHTML = $(
                    `body > div.WidthLimiter > div.Content > div.RightContentColumn > div > div > div.hidetext > table > tbody > tr:nth-child(${
                        index + 1
                    }) > td:nth-child(2) > a`
                );
                let contentLectureHTML = $(
                    `body > div.WidthLimiter > div.Content > div.RightContentColumn > div > div > div.hidetext > table > tbody > tr:nth-child(${
                        index + 1
                    }) > td:nth-child(2) > div > a`
                );

                let lectureLinks = contentLectureHTML.toArray().map((el) => {
                    let el2 = $(el);
                    return {
                        title: el2.text(),
                        link: '/WPROG/rasp/' + el2.attr('href'),
                    };
                });
                let links = contentHTML.toArray().map((el) => {
                    let el2 = $(el);
                    let title = el2.text();
                    return {
                        title,
                        link: '/WPROG/rasp/' + el2.attr('href'),
                        linkLecture: (lectureLinks.find((l) => l.title.substr(0, l.title.length - 3) === title) || {})
                            .link,
                    };
                });

                arr.push({
                    title,
                    links,
                });
            }
        }

        return arr;
    }

    public async convertTT(tableHTML: string, name?: string) {
        const $ = load(tableHTML);

        let { days: allDays } = parseWeekByCheerio($);
        let out2 = splitToWeeks(allDays);
        if (name) {
            await this.setCache(`week_${name}`, allDays);
        }

        return out2;
    }
}

const TTMan = new CTimeTableManager();
export default TTMan;
