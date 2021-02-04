import chTableParser from 'cheerio-tableparser';
import { ELessonFlags, EWeekNumber, EWeekParity, IDay, IMDay, IWeek } from '@ystuty/types';

interface IRegExpStr {
    DELIM?: string;
    SUBINFO?: string;
    SUBINFO_RANGE?: string;
    SUBINFO_AUDITORY?: string;
    DURATION?: string;
    AUDITORY?: string;
    STAR?: string;
    TYPES?: string;
    TEACHERNAME?: string;
    OTHER?: string;
}

export const parseRange = (str: string) => {
    return JSON.parse(
        `[${str.replace(/(\d+)-(\d+)/g, (range, start: number, end: number) =>
            Array(end - start + 1)
                .fill(+start)
                .map((x, i) => x + i)
                .toString()
        )}]`
    ) as number[];
};

export const findOptimalRegExp = (arr: RegExp[], str: string) => {
    let counter: any = {};

    for (const id in arr) {
        const el = arr[id];
        if (!Object.prototype.hasOwnProperty.call(arr, id)) {
            continue;
        }

        let c = el.test(str) && str.match(el);
        if (c && c.groups && Object.keys(c.groups!).length) {
            counter[id] = Object.values(c.groups!).filter(Boolean).length;
        } else {
            counter[id] = !c ? 0 : c.filter(Boolean).length;
        }
    }

    let find = parseInt(Object.keys(counter).reduce((prev, b) => (counter[prev] > counter[b] ? prev : b)));

    return arr[find].test(str) ? find : undefined;
};

/**
 * Генератор всевозможных вариантов регулярок для парсинга строки расписания
 */
const weekRegExpTemplate = ({
    subInfo = false,
    dts = 0,
    typeQM = true,
}: { subInfo?: boolean; dts?: 0 | 1 | 2 | 3; typeQM?: boolean } = {}) => {
    const MaybeSpace = (str: string) => `(?: ?${str})`;

    const Delim = `(?<DELIM>по п\\/г)`;
    const Auditory = (str: string = '') =>
        `(?<${str}AUDITORY>спортивн..? зал.?|[а-я]{0,2} библ(иотека)?.? (\\(м\.зал\\))?|актов..? зал.?|[а-я]{0,2}-[0-9]{0,3}[а-я]{0,2}),?`;

    const SubInfo = `(?<SUBINFO>на (?<SUBINFO_RANGE>[,\\-0-9]+)н ${Auditory('SUBINFO_')})`;
    const SubInfoSkip = '(?<SUBINFO>(?<SUBINFO_RANGE>)(?<SUBINFO_AUDITORY>))';

    const Duration = `(?<DURATION>[0-9]+)ч`;
    const Star = `(?<STAR>\\*)?`;

    const SupType = `(?:лекция|лек\\.|лаб\\.|пр\\.з\\.?|кп\\.?)`;
    const Types = `(?<TYPES>${SupType}(?:, ${SupType})?(?:, ${SupType})?)${typeQM ? '?' : ''}`;

    /* Duration & Type & Star */
    const DTS =
        dts % 2 === 0
            ? `${MaybeSpace(Duration)}?${MaybeSpace(Types)}${Star}`
            : /*  dts === 2 ?  */ `${Types}${Star}${MaybeSpace(Duration)}?`;

    const TeacherName = `(?<TEACHERNAME>[ёА-я \\-.]{5,})`;
    const Other = `(?<OTHER>.+)?`;

    return new RegExp(
        dts % 3 === 0
            ? `${MaybeSpace(subInfo ? SubInfo : SubInfoSkip)} ?${DTS}` +
              `${MaybeSpace(Delim)}?${MaybeSpace(Auditory())}?${MaybeSpace(TeacherName)}?${Other}`
            : `${MaybeSpace(subInfo ? SubInfo : SubInfoSkip)}${MaybeSpace(Auditory())}? ?${DTS}` +
              `${MaybeSpace(Delim)}?${MaybeSpace(TeacherName)}?${Other}`,
        'i'
    );
};

export const parseWeekDayString = (str: string) => {
    const RegExpWeekFirst = /(?:(ч|н)\/н )?(?:([,\-0-9]+)н )?(.+)/i;
    const RegExpLessonName = '([A-zёА-я \\-:,.()]+)';

    // Можно сделать функция для генерации, но пока что будет это Извращение
    const regWeekVariants = [
        weekRegExpTemplate({ subInfo: false, dts: 0, typeQM: true }),
        weekRegExpTemplate({ subInfo: false, dts: 1, typeQM: true }),
        weekRegExpTemplate({ subInfo: false, dts: 2, typeQM: true }),
        weekRegExpTemplate({ subInfo: false, dts: 3, typeQM: true }),

        weekRegExpTemplate({ subInfo: false, dts: 0, typeQM: false }),
        weekRegExpTemplate({ subInfo: false, dts: 1, typeQM: false }),
        weekRegExpTemplate({ subInfo: false, dts: 2, typeQM: false }),
        weekRegExpTemplate({ subInfo: false, dts: 3, typeQM: false }),

        weekRegExpTemplate({ subInfo: true, dts: 0, typeQM: true }),
        weekRegExpTemplate({ subInfo: true, dts: 1, typeQM: true }),
        weekRegExpTemplate({ subInfo: true, dts: 2, typeQM: true }),
        weekRegExpTemplate({ subInfo: true, dts: 3, typeQM: true }),

        weekRegExpTemplate({ subInfo: true, dts: 0, typeQM: false }),
        weekRegExpTemplate({ subInfo: true, dts: 1, typeQM: false }),
        weekRegExpTemplate({ subInfo: true, dts: 2, typeQM: false }),
        weekRegExpTemplate({ subInfo: true, dts: 3, typeQM: false }),

        // Например, Библиотека
        /\((?<AUDITORY>[A-zёА-я \-:,.]+)\) ?(?<OTHER>в [0-9\\.:]+)?(.+)?/i,
    ];

    if (!RegExpWeekFirst.test(str)) {
        return undefined;
    }

    const [, _parity, _range, nextPayloadString] = str.match(RegExpWeekFirst)!;

    const regWeekSecondIndex = findOptimalRegExp(regWeekVariants, nextPayloadString);
    const isSkipSecond = !nextPayloadString || regWeekSecondIndex === undefined;

    let _lessonName = undefined;
    /* let [_FullString, _sub, _sub_week_range, _sub_audit, _OR_1_duration, _OR_1_types, _OR_1_z, _delim, _audit, _people, _other,] =
        isSkipSecond ? [] : nextPayloadString.match(regWeekVariants[regWeekSecondIndex!])!; */

    const matchResult = isSkipSecond
        ? { groups: {}, 0: undefined }
        : nextPayloadString.match(regWeekVariants[regWeekSecondIndex!])!;

    const { 0: _FullString } = matchResult;
    const {
        SUBINFO: _sub = undefined,
        SUBINFO_RANGE: _sub_week_range = '',
        SUBINFO_AUDITORY: _sub_audit = '',
        DURATION: _duration /* _OR_1_duration */ = '',
        TYPES: _types /* _OR_1_types */ = '',
        STAR: _star /* _OR_1_star */ = '',
        DELIM: _delim = '',
        AUDITORY: _audit = '',
        TEACHERNAME: _people = '',
        OTHER: _other = '',
    } = isSkipSecond ? {} : (matchResult.groups as IRegExpStr);

    if (!isSkipSecond && _FullString) {
        let posSub = nextPayloadString.indexOf(_FullString);
        _lessonName = !posSub ? 'FF' : nextPayloadString.substr(0, posSub).match(RegExpLessonName)![0];
    }

    // let _duration = regWeekSecondIndex! % 2 === 0 ? _OR_1_duration : _OR_1_star;
    // let _types = regWeekSecondIndex! % 2 === 0 ? _OR_1_types : _OR_1_duration;
    // let _star = regWeekSecondIndex! % 2 === 0 ? _OR_1_star : _OR_1_types;

    const parity: EWeekParity =
        _parity === 'н' ? EWeekParity.ODD : _parity === 'ч' ? EWeekParity.EVEN : EWeekParity.CUSTOM;
    const range = _range
        ? parseRange(_range).filter((weekNumber) => parity === EWeekParity.CUSTOM || weekNumber % 2 !== parity - 1)
        : [];
    const lessonName = _lessonName ? _lessonName.trim() : undefined;
    const isStar = !!_star;
    const duration = parseInt(_duration) || 2;

    const type: ELessonFlags = _types
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .reduce(
            (prev, type) =>
                (prev |= type.includes('пр.з')
                    ? ELessonFlags.Practical
                    : type.includes('лек')
                    ? ELessonFlags.Lecture
                    : type.includes('лаб')
                    ? ELessonFlags.Labaratory
                    : type.includes('кп')
                    ? ELessonFlags.CourseProject
                    : ELessonFlags.None),
            ELessonFlags.None
        );

    const isDivision = !!_delim;
    const auditoryName = _audit ? _audit.trim() : undefined;
    const teacherName = _people ? _people.trim() : undefined;
    const subInfo = _sub
        ? {
              range: parseRange(_sub_week_range),
              auditoryName: _sub_audit ? _sub_audit.trim() : undefined,
          }
        : undefined;

    return {
        parity,
        range,
        lessonName,
        type,
        isStar,
        duration,
        isDivision,
        auditoryName,
        teacherName,
        subInfo,
        original: nextPayloadString,
    };
};

export const parseWeekDay = ({ times, names }: { times: any[]; names: any[] }) => {
    const RegExpTime = /([0-9])\. ([0-9:]{4,5})-(?:([0-9:]{4,5})?([.]{3}[0-9]{1,3}ч)?)/i;

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
        let resTime = timeTitle.match(RegExpTime);
        let number = resTime ? parseInt(resTime[1]) : 0;
        let dateTime = new Date(0);

        let endTime = '';
        if (weekParse) {
            let ds = resTime[2].split(':');
            dateTime.setHours(ds[0], ds[1]);
            dateTime.setMinutes(dateTime.getMinutes() + 90 /* (weekParse.duration === 4 ? 180 + 10 : 90) */);
            endTime = `${dateTime.getHours().toString().padStart(2, '0')}:${dateTime
                .getMinutes()
                .toString()
                .padStart(2, '0')}`;
        }

        let time = resTime ? `${resTime[2]}-${resTime[3] || endTime || resTime[4]}` : '...';

        // Смещаем номер пары из-за большого перерыва
        if (number > 2 || number > 7) {
            --number;
        }

        if (weekParse) {
            day.lessons.push({
                number,
                time,
                originalTimeTitle: timeTitle,
                ...weekParse,
            });
        }

        if (times[i] && times[i].length) {
            lastGoodDay = times[i];
        }
    }
    return day;
};

export const parseWeekByCheerio = ($: cheerio.Root) => {
    let days: IMDay[] = [];

    chTableParser($);
    let tables = $('table.sortm').toArray();
    for (let table of tables) {
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
            (l) => l.range.includes(weekNumber) && (l.parity === EWeekParity.CUSTOM || weekNumber % 2 !== l.parity - 1)
        );
        if (!lessons.length) {
            return false;
        }

        lessons = lessons.map((l) => {
            if (l?.subInfo?.range?.includes(weekNumber)) {
                l.auditoryName = l.subInfo.auditoryName;
            }
            return l;
        });

        day.lessons = lessons;
        day.info = {
            ...day.info,
            date: new Date(),
            parity: weekNumber % 2 === 0 ? EWeekParity.EVEN : EWeekParity.ODD,
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
        ? EWeekNumber.Monday
        : str.startsWith('втор')
        ? EWeekNumber.Tuesday
        : str.startsWith('сред')
        ? EWeekNumber.Wednesday
        : str.startsWith('чет')
        ? EWeekNumber.Thursday
        : str.startsWith('пят')
        ? EWeekNumber.Friday
        : str.startsWith('суб')
        ? EWeekNumber.Saturday
        : EWeekNumber.Sunday;
};

const setDaysDate = (allDays: IDay[], weekNumber: number, offsetWeek: number = 0) =>
    allDays.forEach(({ info }) => {
        info.date = getDateByWeek(weekNumber + offsetWeek, info.type);
        info.dateStr = `${info.date.getDate().toString().padStart(2, '0')}.${(info.date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}.${info.date.getFullYear()}`;
    });

const getWeekNumber = (date: string | number | Date) => {
    const now = new Date(date);
    const onejan = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
};

const dateSkipWeek = (skipWeeks: number, _date: Date = new Date()) => {
    const date = new Date(_date);
    date.setHours(0);
    const firstWeekday = date.getDay() || 7;
    // const monthWeek = Math.floor((date.getDate() + firstWeekday - 2) / 7) + 1;

    if (skipWeeks > 0) {
        if (firstWeekday > 0) {
            date.setHours(-24 * (firstWeekday - 1));
        }
        date.setHours(24 * 7 * skipWeeks);
    }
    // else if (monthWeek == 1 && firstWeekday > 4) {
    //     date.setHours(24 * (8 - firstWeekday));
    // }

    return date;
};


const getStartDateOfSemester = (d = new Date) => {
    const date = new Date(d)
    const semDate = new Date(date.getFullYear(), (date.getMonth() > 7 ? 9 : 2) - 1, 1);
    const firstWeekday = semDate.getDay() || 7;
    if (firstWeekday > 5) {
        semDate.setHours(24 * (8 - firstWeekday));
    }

    return dateSkipWeek(
        semDate.getMonth() > 7 ? 0 : 1,
        semDate
    );
};

export const splitToWeeks = (allDays: IMDay[]): IWeek[] => {
    const minWeek = getMinWeekNumber(allDays);
    const maxWeek = getMaxWeekNumber(allDays);
    const offsetWeek = getWeekNumber(getStartDateOfSemester()) - 1;
    let weeks: IWeek[] = [];

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
