import Fs from 'fs-extra';
import md5 from 'md5';

export default class CCacheMan {
    path: string = './temp/';
    constructor() {}

    public async create(file: string, data: any) {
        return this.update(file, data);
    }

    public async update(file: string, data: any) {
        let path = this.getPath(file);

        let wrd = {
            time: this.time,
            data,
        };
        await Fs.writeFile(path, JSON.stringify(wrd, null, 2));
    }

    public async read(file: string) {
        let path = this.getPath(file);
        if (!Fs.existsSync(path)) {
            return null;
        }

        let str = await Fs.readFile(path, 'utf8');
        try {
            let { data, time } = JSON.parse(str);
            return data;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public getPath(file: string) {
        return `${this.path}${this.genName(file)}.data`;
    }

    public genName(str: string) {
        return md5(str.toLowerCase());
    }

    public get time() {
        return (Date.now() / 1e3) | 0;
    }
}
