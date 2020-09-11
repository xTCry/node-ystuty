import chTableParser from 'cheerio-tableparser';

export enum EWeekParity {
    CUSTOM = 0,
    ODD = 1,
    EVEN = 2,
}

export enum ELessonType {
    Lecture = 1,
    Practical = 2,
    Labaratory = 3,
}

export enum EWeek {
    Monday = 0,
    Tuesday,
    Wednesday,
    Thursday,
    Friday,
    Saturday,
    Sunday = 6,
}

/**
 * Mixed Days with lessons from one all weeks
 */
export interface IMDay {
    info: IWeekDay;
    lessons: ILesson[];
}

/**
 * Filtered Days with lessons from one week
 */
export interface IDay {
    info: IWeekDay;
    lessons: ILesson[];
}

export interface IWeekDay {
    name: string;
    type?: EWeek;
    date?: Date;
    dateStr?: string;
    weekNumber?: number;
    parity?: EWeekParity;
}

export interface ILesson {
    number: number;
    time: string;
    timeTitle: string;

    parity: EWeekParity;
    range: number[];
    lessonName: string;
    type?: ELessonType;
    isStar: boolean;
    isDouble: boolean;
    isDivision: boolean;
    auditoryName?: string;
    teacherName?: string;
    subInfo?: {
        range: any;
        auditoryName: string;
    };
}

export const parseRange = (str) => {
    return JSON.parse(
        '[' +
            str.replace(/(\d+)-(\d+)/g, (range, start, end) =>
                Array(end - start + 1)
                    .fill(+start)
                    .map((x, i) => x + i)
            ) +
            ']'
    );
};

export const findOptimalRegExp = (arr: RegExp[], str: string) => {
    let counter = {};

    for (const id in arr) {
        const el = arr[id];
        if (!Object.prototype.hasOwnProperty.call(arr, id)) {
            continue;
        }

        let c = el.test(str) && str.match(el);
        counter[id] = !c ? 0 : c.filter(Boolean).length;
    }

    let find = Object.keys(counter).reduce((a, b) => (counter[a] > counter[b] ? a : b));

    return arr[find].test(str) ? parseInt(find) : undefined;
};

export const parseWeekDayString = (str: string) => {
    let regWeekFirst = /(?:(ч|н)\/н )?(?:([,\-0-9]+)н )?(.+)/i;

    // Извращение
    let regWeekVariants = [
        /([ёА-я \-:.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3}))? ?(4ч)? ?(лаб\.|лек\.|пр\.з\.?)?(\*)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,
        /([ёА-я \-:.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3}))? ?(лаб\.|лек\.|пр\.з\.?)?(\*)? ?(4ч)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,

        /([ёА-я \-:.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3}))? ?(4ч)? ?(лаб\.|лек\.|пр\.з\.?)(\*)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,
        /([ёА-я \-:.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3}))? ?(лаб\.|лек\.|пр\.з\.?)(\*)? ?(4ч)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,

        /([ёА-я \-:.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3})) ?(4ч)? ?(лаб\.|лек\.|пр\.з\.?)?(\*)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,
        /([ёА-я \-:.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3})) ?(лаб\.|лек\.|пр\.з\.?)?(\*)? ?(4ч)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,

        // /([ёА-я \-:.()]+)(\*)?(()) ?(4ч)? ?(лаб\.|пр\.з\.)? ?(по п\/г)? ?([а-я]-[0-9]{0,3})? ?([ёА-я \-.])(.+)?/i,
    ];

    if (!regWeekFirst.test(str)) {
        return null;
    }

    let [, _parity, _range, all] = str.match(regWeekFirst);

    let regWeekSecondIndex = findOptimalRegExp(regWeekVariants, all);
    let regWeekSecond = regWeekVariants[regWeekSecondIndex];

    let isSkipSecond = !all || regWeekSecondIndex === undefined;

    let [
        ,
        _lessonName,
        _sub,
        _sub_week_range,
        _sub_audit,
        _OR_1_double,
        _OR_1_type,
        _OR_1_z,
        _delim,
        _audit,
        _people,
        _other,
    ] = isSkipSecond ? [] : all.match(regWeekSecond);

    let _double = [0, 2, 4].includes(regWeekSecondIndex) ? _OR_1_double : _OR_1_z;
    let _type = [0, 2, 4].includes(regWeekSecondIndex) ? _OR_1_type : _OR_1_double;
    let _z = [0, 2, 4].includes(regWeekSecondIndex) ? _OR_1_z : _OR_1_type;

    const parity: EWeekParity =
        _parity === 'н' ? EWeekParity.ODD : _parity === 'ч' ? EWeekParity.EVEN : EWeekParity.CUSTOM;
    const range = _range ? parseRange(_range) : [];
    const lessonName = _lessonName ? _lessonName.trim() : null;
    const isStar = !!_z;
    const isDouble = !!_double;
    const type: ELessonType =
        _type === 'пр.з'
            ? ELessonType.Practical
            : _type === 'лек.'
            ? ELessonType.Lecture
            : _type === 'лаб.'
            ? ELessonType.Labaratory
            : null;
    const isDivision = !!_delim;
    const auditoryName = _audit ? _audit.trim() : null;
    const teacherName = _people ? _people.trim() : null;
    const subInfo = _sub
        ? {
              range: parseRange(_sub_week_range),
              auditoryName: _sub_audit ? _sub_audit.trim() : null,
          }
        : null;

    return { parity, range, lessonName, type, isStar, isDouble, isDivision, auditoryName, teacherName, subInfo };
};

export const parseWeekDay = ({ times, names }: { times: any[]; names: any[] }) => {
    const regTime = /([0-9])\. ([0-9:]{4,5})-(?:([0-9:]{4,5})?([.]{3}4ч)?)/i;

    let weekDayName = names.shift();
    times.shift();
    let day: IMDay = {
        info: {
            name: weekDayName,
            type: getWeekDayTypeByName(weekDayName),
        },
        lessons: [],
    };

    let lastGoodDay = null;
    for (const i in names) {
        let name = names[i];
        if (!name) {
            continue;
        }
        name = name.replace('\n', '').replace(/ +(?= )/g, '');

        let weekParse = parseWeekDayString(name);

        // console.log(weekParse, name);

        let timeTitle = times[i] || lastGoodDay;
        let resTime = timeTitle.match(regTime);
        let number = resTime ? parseInt(resTime[1]) : 0;
        let time = resTime ? `${resTime[2]}-${resTime[3] || resTime[4]}` : '...';

        if (weekParse) {
            day.lessons.push({
                number,
                time,
                timeTitle,
                ...weekParse,
            });
        }

        if (times[i] && times[i].length) {
            lastGoodDay = times[i];
        }
    }
    return day;
};

export const parseWeekByCheerio = ($: CheerioStatic) => {
    let days: IMDay[] = [];

    chTableParser($);
    let tables = $('table.sortm').toArray();
    for (let table of tables) {
        // @ts-ignore
        let [times, names] = $(table).parsetable(false, false, true);
        let day = parseWeekDay({ times, names });

        days.push(day);
    }
    return { days };
};

export const getMaxWeekNumber = (allDays: IMDay[]) =>
    allDays.reduce((lastMax, day) => Math.max(lastMax, ...day.lessons.map((l) => Math.max(...l.range))), 0);

export const getMinWeekNumber = (allDays: IMDay[]) =>
    allDays.reduce((lastMin, day) => Math.min(lastMin, ...day.lessons.map((l) => Math.min(...l.range))), 99);

export const splitLessonsDayByWeekNumber = (allDays: IMDay[], weekNumber: number) => {
    let clone = JSON.parse(JSON.stringify(allDays)) as IDay[];
    return clone.filter((day) => {
        let lessons = day.lessons.filter(
            (l) =>
                l.range.includes(weekNumber) &&
                (l.parity === EWeekParity.CUSTOM || (weekNumber % 2 !== 0 && l.parity === EWeekParity.ODD))
        );
        if (!lessons.length) {
            return false;
        }
        day.lessons = lessons;
        day.info = {
            ...day.info,
            date: new Date(),
            parity: (weekNumber % 2 === 0 ? EWeekParity.EVEN : EWeekParity.ODD),
            weekNumber,
        };

        return true;
    });
};

const getDateByWeek = (week: number, day: number = 0, year = new Date().getFullYear()) =>
    new Date(year, 0, 2 + day + (week - 1) * 7 - new Date(year, 0, 1).getDay());

const getWeekDayTypeByName = (str: string) => {
    str = str.toLocaleLowerCase();
    return str.startsWith('пон')
        ? EWeek.Monday
        : str.startsWith('втор')
        ? EWeek.Tuesday
        : str.startsWith('сред')
        ? EWeek.Wednesday
        : str.startsWith('чет')
        ? EWeek.Thursday
        : str.startsWith('пят')
        ? EWeek.Friday
        : str.startsWith('суб')
        ? EWeek.Saturday
        : EWeek.Sunday;
};

const setDaysDate = (allDays: IDay[], weekNumber: number, offsetWeek: number = 0) =>
    allDays.forEach(({ info }) => {
        info.date = getDateByWeek(weekNumber + offsetWeek, info.type);
        info.dateStr = `${info.date.getDate().toString().padStart(2, '0')}.${(info.date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}.${info.date.getFullYear()}`;
    });

const getWeekNumber = (date) => {
    let now = new Date(date);
    let onejan = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
};

export const splitToWeeks = (allDays: IMDay[]) => {
    let weeks = [];
    let minWeek = getMinWeekNumber(allDays);
    let maxWeek = getMaxWeekNumber(allDays);
    let offsetWeek = getWeekNumber('2020.09.01') - 1;

    for (let i = minWeek; i < maxWeek + 1; ++i) {
        let days = splitLessonsDayByWeekNumber(allDays, i);
        setDaysDate(days, i, offsetWeek);

        weeks.push({
            number: i,
            days,
        });
    }

    return weeks;
};
