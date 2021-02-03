import Fs from 'fs-extra';
import md5 from 'md5';

export type CacheData = {
    time: number;
    ttl: number;
    data: any;
    source: string;
};

export class CCacheMan {
    path: string = './temp';
    cache: { [key: string]: CacheData } = {};

    constructor(path?: string) {
        if (path) {
            this.path = path;
        }
        Fs.ensureDir(this.path).then();
    }

    private async parseFilePath(path: string | string[]) {
        if (Array.isArray(path)) {
            if (path.length !== 2) {
                console.error('[cacheman] wrong file! [dir, file]');
                return undefined;
            }
            await Fs.ensureDir(`${this.path}/${path[0]}`);
            return [path[0], path[1]];
        }
        return ['', path];
    }

    public async create(file: string | string[], data: any) {
        return this.update(file, data);
    }

    public async delete(file: string | string[]) {
        let arFile = await this.parseFilePath(file);
        if (!arFile) {
            return;
        }
        let [apath, afile] = arFile;

        let path = this.getPath(apath, afile);
        let name = this.genName(afile);
        try {
            delete this.cache[name];
            await Fs.unlink(path);
        } catch (err) {}
    }

    public async update(file: string | string[], data: any, ttl: number = 36e4) {
        // console.log('\n\n-----', file, data);

        let arFile = await this.parseFilePath(file);
        if (!arFile) {
            return;
        }
        let [apath, afile] = arFile;

        let path = this.getPath(apath, afile);
        let name = this.genName(afile);

        this.cache[name] = {
            time: this.time,
            ttl,
            data,
            source: afile,
        };

        await Fs.writeFile(path, JSON.stringify(this.cache[name], null, 2));
    }

    public async read(file: string | string[]) {
        let arFile = await this.parseFilePath(file);
        if (!arFile) {
            return null;
        }

        let _data = await this._read(file);
        if (_data === null) {
            return null;
        }

        try {
            let { data, time } = _data;
            return data;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public async _read(file: string | string[], forceFile: boolean = false): Promise<CacheData | null> {
        let arFile = await this.parseFilePath(file);
        if (!arFile) {
            return null;
        }
        let [apath, afile] = arFile;

        let name = this.genName(afile);
        if (!forceFile && this.cache[name]) {
            return this.cache[name];
        }

        let path = this.getPath(apath, afile);
        if (!Fs.existsSync(path)) {
            return null;
        }

        let str = await Fs.readFile(path, 'utf8');
        try {
            return JSON.parse(str);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    public isset(file: string | string[], forceFile: boolean = false) {
        let apath = '';
        if (Array.isArray(file)) {
            if (file.length !== 2) {
                console.error('[cacheman] wrong file! [dir, file]');
                return null;
            }
            [apath, file] = file;
        }

        let path = this.getPath(apath, file);
        let name = this.genName(file);
        if (!forceFile && this.cache[name]) {
            return true;
        }
        return Fs.existsSync(path);
    }

    /**
     * Is cache file timeout
     */
    public async isTimeout(file: string | string[]) {
        let arFile = await this.parseFilePath(file);
        if (!arFile) {
            return null;
        }

        let _data = await this._read(file);
        if (_data === null) {
            return null;
        }
        let { time, ttl } = _data;

        return this.time - (time || 0) > ttl;
    }

    public getPath(path: string, file: string) {
        return `${[this.path, path, this.genName(file)].join('/')}.json`;
    }

    public genName(str: string) {
        return `${str.replace(/[^0-9А-яA-z-_]/gi, '').slice(0, 25)}.${md5(str.toLowerCase()).slice(-8)}`;
    }

    public get time() {
        return (Date.now() / 1e3) | 0;
    }
}

const cm = new CCacheMan();
export default cm;