import chTableParser from 'cheerio-tableparser';

/**
 * Тип четности недели для пары
 */
export enum EWeekParity {
    CUSTOM = 0,
    ODD = 1,
    EVEN = 2,
}

/**
 * Флаг типа пары
 */
export enum ELessonFlags {
    None = 0,
    Lecture = 1 << 1,
    Practical = 1 << 2,
    Labaratory = 1 << 3,
}

/**
 * Тип/номер дня недели
 */
export enum EWeekNumber {
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
    type?: EWeekNumber;
    date?: Date;
    dateStr?: string;
    weekNumber?: number;
    parity?: EWeekParity;
}

export interface ILesson {
    /**
     * Порядковый номер пары на дню
     */
    number: number;
    /**
     * Временной интервал пары
     */
    time: string;
    /**
     * Оригинальная строка с порядковым номером пары на дню со интервалом времени
     */
    originalTimeTitle: string;
    /**
     * Тип четности пары
     */
    parity: EWeekParity;
    /**
     * Диапазон номеров недель с парой
     */
    range: number[];
    /**
     * Название предмета пары
     */
    lessonName?: string;
    /**
     * Флаг типа пары
     */
    type: ELessonFlags;
    /**
     * Есть ли перед типом пары звездочка
     */
    isStar: boolean;
    /**
     * Длительность пары
     */
    duration: number;
    /**
     * Есть ли разделение по подгруппам
     */
    isDivision: boolean;
    /**
     * Буква корпуса, номер аудитори
     */
    auditoryName?: string;
    /**
     * ФИО преподователя
     */
    teacherName?: string;
    /**
     * Дополнительная инфа
     */
    subInfo?: {
        /**
         * Диапазон номеров недель с парой
         */
        range?: any;
        /**
         * Буква корпуса, номер аудитори
         */
        auditoryName?: string;
    };
    /**
     * Оригинальная строка из расписания
     */
    original: string;
}

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
        `(?<${str}AUDITORY>спортивн..? зал.?|актов..? зал.?|[а-я]{0,2}-[0-9]{0,3}[а-я]{0,2}),?`;

    const SubInfo = `(?<SUBINFO>на (?<SUBINFO_RANGE>[,\\-0-9]+)н ${Auditory('SUBINFO_')})`;
    const SubInfoSkip = '(?<SUBINFO>(?<SUBINFO_RANGE>)(?<SUBINFO_AUDITORY>))';

    const Duration = `(?<DURATION>[0-9]+)ч`;
    const Star = `(?<STAR>\\*)?`;

    const SupType = `(?:лекция|лек\\.|лаб\\.|пр\\.з\\.?)`;
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
        _lessonName = nextPayloadString.substr(0, posSub).match(RegExpLessonName)![0];
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
            (l) => l.range.includes(weekNumber) && (l.parity === EWeekParity.CUSTOM || weekNumber % 2 !== l.parity - 1)
        );
        if (!lessons.length) {
            return false;
        }

        lessons = lessons.map((l) => {
            if (l.subInfo && l.subInfo.range.includes(weekNumber)) {
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
    let now = new Date(date);
    let onejan = new Date(now.getFullYear(), 0, 1);
    return Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
};

export const splitToWeeks = (allDays: IMDay[]): IWeek[] => {
    let now = new Date();
    let weeks: IWeek[] = [];
    let minWeek = getMinWeekNumber(allDays);
    let maxWeek = getMaxWeekNumber(allDays);
    let offsetWeek = getWeekNumber(`${now.getFullYear()}.${now.getMonth() > 7 ? 9 : 2}.03`) - 1;

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
