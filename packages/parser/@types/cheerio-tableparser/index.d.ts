/// <reference types="node" />

declare module 'cheerio-tableparser' {
    /**
     * Most popular cheerio plugin in the world! Port of jquery.tableparser plugin to cheerio.
     */
    const cheerioTableparse: ($: cheerio.Root) => void;
    export = cheerioTableparse;
}

declare namespace cheerio {
    interface Cheerio {
        /**
         * Parsing HTML table could be difficult when its structure contains colspan or rowspan.
         * Cheerio-tableparser parse HTML tables, group them by columns, with colspan and rowspan respected.
         * @param dupCols if true empty cells will be copy of left filled column. If false empty cell. Default: `false`.
         * @param dupRows if true empty cells will be copy of upper filled row. If false empty cell. Default: `false`.
         * @param textMode - if true result will be text same as cell $("td").text().trim(). If false result will be HTML same as cell `$("td").html()`. Default: `false`.
         */
        parsetable(dupCols?: boolean, dupRows?: boolean, textMode?: boolean): string[][];
    }
}