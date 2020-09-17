import chTableParser from 'cheerio-tableparser';

export enum EWeekParity {
    CUSTOM = 0,
    ODD = 1,
    EVEN = 2,
}

export enum ELessonType {
    None = 0,
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

export interface IWeek {
    number: number;
    days: IDay[];
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
    lessonName?: string;
    types?: ELessonType[];
    isStar: boolean;
    duration: number;
    isDivision: boolean;
    auditoryName?: string;
    teacherName?: string;
    subInfo?: {
        range?: any;
        auditoryName?: string;
    };
}

export const parseRange = (str: string) => {
    return JSON.parse(
        `[${str.replace(/(\d+)-(\d+)/g, (range, start: number, end: number) =>
            Array(end - start + 1)
            .fill(+start)
            .map((x, i) => x + i)
            .toString()
        )}]`
    );
};

export const findOptimalRegExp = (arr: RegExp[], str: string) => {
    let counter: any = {};

    for (const id in arr) {
        const el = arr[id];
        if (!Object.prototype.hasOwnProperty.call(arr, id)) {
            continue;
        }

        let c = el.test(str) && str.match(el);
        counter[id] = !c ? 0 : c.filter(Boolean).length;
    }

    let find = parseInt(Object.keys(counter).reduce((a, b) => (counter[a] > counter[b] ? a : b)));

    return arr[find].test(str) ? find : undefined;
};

const weekRegExpTemplate = ({ subInfo = false, dts = 1, typeQM = true }: { subInfo?: boolean; dts?: 1 | 2; typeQM?: boolean;  } = {}) => {
    const MBeSpace = (str: string) => `(?: ?${str})`;

    const Delim = `(по п\\/г)`;
    const Auditory = `(актовый зал|[а-я]{0,2}-[0-9]{0,3}[а-я]{0,2})`;

    const SubInfo = `(на ([,\\-0-9]+)н ${Auditory})`;
    const SubInfoSkip = '(()())';

    const Duration = `([0-9]+)ч`;
    const Star = `(\\*)?`;

    // const Types = `(?:(лаб\\.|лек\\.|пр\.з\\.?))${typeQM ? '?' : ''}`;
    // const Types = `((?:[а-я]{2,3}.[а-я\\.]{0,3})(?:, ?(?:[а-я]{2,3}.[а-я\\.]{0,3}))?)${typeQM ? '?' : ''}`;
    const SupType = `(?:лекция|лек\\.|лаб\\.|пр\\.з\\.?)`;
    const Types = `(${SupType}(?:, ${SupType})?(?:, ${SupType})?)${typeQM ? '?' : ''}`;

    /* Duration & Type & Star */
    const DTS = dts === 1 ? `${MBeSpace(Duration)}?${MBeSpace(Types)}${Star}` : /*  dts === 2 ?  */ `${Types}${Star}${MBeSpace(Duration)}?`;

    const TeacherName = `([ёА-я \\-.]+)`;
    const Other = `(.+)`;

    return new RegExp(
        `${MBeSpace(subInfo ? SubInfo : SubInfoSkip)} ?${DTS}` +
            `${MBeSpace(Delim)}?${MBeSpace(Auditory)}?${MBeSpace(TeacherName)}?${Other}?`,
        'i'
    );
};

export const parseWeekDayString = (str: string) => {
    let regWeekFirst = /(?:(ч|н)\/н )?(?:([,\-0-9]+)н )?(.+)/i;

    // Извращение
    let regWeekVariants = [
        weekRegExpTemplate({ subInfo: false, dts: 1, typeQM: true }),
        weekRegExpTemplate({ subInfo: false, dts: 2, typeQM: true }),

        weekRegExpTemplate({ subInfo: false, dts: 1, typeQM: false }),
        weekRegExpTemplate({ subInfo: false, dts: 2, typeQM: false }),

        weekRegExpTemplate({ subInfo: true, dts: 1, typeQM: true }),
        weekRegExpTemplate({ subInfo: true, dts: 2, typeQM: true }),

        weekRegExpTemplate({ subInfo: true, dts: 1, typeQM: false }),
        weekRegExpTemplate({ subInfo: true, dts: 2, typeQM: false }),

        // Например, Библиотека
        /(()())()()?(?:())?()?\(([A-zёА-я \-:,.]+)\) ?(в [0-9\\.]+)?(.+)?/i,

        /*
        /([A-zёА-я \-:,.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3}))? ?(?:([0-9]+)ч)? ?(лаб\.|лек\.|пр\.з\.?)?(\*)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,
        /([A-zёА-я \-:,.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3}))? ?(лаб\.|лек\.|пр\.з\.?)?(\*)? ?(?:([0-9]+)ч)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,

        /([A-zёА-я \-:,.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3}))? ?(?:([0-9]+)ч)? ?(лаб\.|лек\.|пр\.з\.?)(\*)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,
        /([A-zёА-я \-:,.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3}))? ?(лаб\.|лек\.|пр\.з\.?)(\*)? ?(?:([0-9]+)ч)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,

        /([A-zёА-я \-:,.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3})) ?(?:([0-9]+)ч)? ?(лаб\.|лек\.|пр\.з\.?)?(\*)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,
        /([A-zёА-я \-:,.()]+) ?(на ([,\-0-9]+)н ([а-я]{0,2}-[0-9]{0,3})) ?(лаб\.|лек\.|пр\.з\.?)?(\*)? ?(?:([0-9]+)ч)? ?(по п\/г)? ?(актовый зал|[а-я]{0,2}-[0-9]{0,3})? ?([ёА-я \-.]+)?(.+)?/i,
        */

        // /([ёА-я \-:.()]+)(\*)?(()) ?(4ч)? ?(лаб\.|пр\.з\.)? ?(по п\/г)? ?([а-я]-[0-9]{0,3})? ?([ёА-я \-.])(.+)?/i,
    ];

    if (!regWeekFirst.test(str)) {
        return undefined;
    }

    let [, _parity, _range, nextPayloadString] = str.match(regWeekFirst)!;

    let regWeekSecondIndex = findOptimalRegExp(regWeekVariants, nextPayloadString);
    let isSkipSecond = !nextPayloadString || regWeekSecondIndex === undefined;

    
    let _lessonName = undefined;
    let [
        _FullString,
        // _lessonName,
        _sub,
        _sub_week_range,
        _sub_audit,
        _OR_1_duration,
        _OR_1_types,
        _OR_1_z,
        _delim,
        _audit,
        _people,
        _other,
    ] = isSkipSecond ? [] : nextPayloadString.match(regWeekVariants[regWeekSecondIndex!])!;

    if (!isSkipSecond) {
        let posSub = nextPayloadString.indexOf(_FullString);
        
        const LessonNameRegExp = '([A-zёА-я \\-:,.()]+)';
        _lessonName = nextPayloadString.substr(0, posSub).match(LessonNameRegExp)![0];
    }

    let _duration = regWeekSecondIndex! % 2 === 0 ? _OR_1_duration : _OR_1_z;
    let _types = regWeekSecondIndex! % 2 === 0 ? _OR_1_types : _OR_1_duration;
    let _z = regWeekSecondIndex! % 2 === 0 ? _OR_1_z : _OR_1_types;

    const parity: EWeekParity =
        _parity === 'н' ? EWeekParity.ODD : _parity === 'ч' ? EWeekParity.EVEN : EWeekParity.CUSTOM;
    const range = _range ? parseRange(_range) : [];
    const lessonName = _lessonName ? _lessonName.trim() : undefined;
    const isStar = !!_z;
    const duration = parseInt(_duration) || 2;

    const types: ELessonType[] | undefined = _types
        ? _types
              .split(',')
              .map((e) => e.trim().toLowerCase())
              .map((type) =>
                  type.includes('пр.з')
                      ? ELessonType.Practical
                      : type.includes('лек')
                      ? ELessonType.Lecture
                      : type.includes('лаб')
                      ? ELessonType.Labaratory
                      : ELessonType.None
              )
              .filter(Boolean)
        : undefined;

    const isDivision = !!_delim;
    const auditoryName = _audit ? _audit.trim() : undefined;
    const teacherName = _people ? _people.trim() : undefined;
    const subInfo = _sub
        ? {
              range: parseRange(_sub_week_range),
              auditoryName: _sub_audit ? _sub_audit.trim() : undefined,
          }
        : undefined;

    return { parity, range, lessonName, types, isStar, duration, isDivision, auditoryName, teacherName, subInfo };
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

    let lastGoodDay = undefined;
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
    new Date(year, 0, 2 + day + (week - 1) * 7 - new Date(year, 0, 1).getDay(), 3);

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

const getWeekNumber = (date: string | number | Date) => {
    let now = new Date(date);
    let onejan = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
};

export const splitToWeeks = (allDays: IMDay[]): IWeek[] => {
    let weeks: IWeek[] = [];
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
