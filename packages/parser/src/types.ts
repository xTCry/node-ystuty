/**
 * Данные об институте
 */
export interface IInstituteData {
    /**
     * Название института
     */
    name: string;
    /**
     * Массив групп
     */
    groups: IGroupData[];
}

/**
 * Данные о группе
 */
export interface IGroupData {
    /**
     * Название группы
     */
    name: string;
    /**
     * Ссылка на расписание группы
     */
    link: string;
    /**
     * Ссылка на расписание лекционной недели группы
     */
    linkLecture?: string;
}

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
    CourseProject = 1 << 4,
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
     * Занятия в потоке
     */
    isStream: boolean;
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
        range?: number[];
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
