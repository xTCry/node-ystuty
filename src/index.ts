import { load } from 'cheerio';
import { parseWeekByCheerio, splitToWeeks } from './parser';
import API from './api';
import CCacheMan from './cacheman';

require('dotenv').config();

const api = new API({
    login: process.env.LOGIN,
    password: process.env.PASSWORD,
});

const cm = new CCacheMan();

(async () => {
    await api.Init();

    // Find all list
    let { data } = await api.go('/WPROG/rasp/raspz.php');
    let linkToFullList = getHrefToFullList(data);

    let { data: data2 } = await api.go(linkToFullList);
    let FSLinks = getFSLinks(data2);

    // console.log(FSLinks[3]['links'][42]);

    let { data: data3 } = await api.go(FSLinks[3].links[42].link);
    loadTT(data3);
})();


const getHrefToFullList = (html) => {
    const $ = load(html);
    return '/WPROG/rasp/' + $('#tab1 > tbody > tr:nth-child(1) > td:nth-child(1) > a').attr('href');
};

const getFSLinks = (html) => {
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
};

const loadTT = async (tableHTML) => {
    const $ = load(tableHTML);

    let { days: allDays } = parseWeekByCheerio($);
    let out2 = splitToWeeks(allDays);

    await cm.update('out', allDays);
    await cm.update('out2', out2);
};
