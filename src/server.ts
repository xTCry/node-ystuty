import express from 'express';
import bodyParser from 'body-parser';
import TTMan from './ttman';

const WEB_PORT = process.env.PORT || 8085;
export const app = express();

app.disable('x-powered-by');
app.use(bodyParser.json());


app.get('/', async (req, res) => {
    let message = 'hi';
    res.send(message);
});

app.get('/api/', async (req, res) => {
    let message = 'hi';

    res.json({ message });
});

app.get('/api/list/all', async (req, res, next) => {
    try {
        let response: any = {};
        response['type'] = 'allGroups';
        response['data'] = TTMan.allGroups;

        res.json({ response });
    } catch (error) {
        next(error);
    }
});

app.get('/api/list/:f', async (req, res, next) => {
    try {
        let { f } = req.params;
        let response: any = {};
        response['type'] = 'fs';
        // response['data'] = await TTMan.getTTByName(f);

        res.json({ response });
    } catch (error) {
        next(error);
    }
});

app.get('/api/get/:g', async (req, res, next) => {
    try {
        let { s } = req.query;
        let { g } = req.params;
        let dataTT = await TTMan.getTTByName(g);
        if (!dataTT) {
            throw new Error('Wrong name');
        }

        let { data, isCache } = dataTT;
        let response: any = {};
        response['type'] = 'byName';
        response['isCache'] = isCache;
        response['data'] = data;

        if (!s) {
            res.json({ response });
        } else {
            res.send(JSON.stringify(response, null, 2));
        }
    } catch (error) {
        next(error);
    }
});

app.use((error: any, req: any, res: any, next: Function) => {
    if (res.headersSent) {
        return next(error);
    }

    console.error(error);
    
    res.status(500);
    res.json({ error: error.message });
});

export const server = app.listen(WEB_PORT, () => {
    console.log(`Web server started: http://127.0.0.1:${WEB_PORT}/`);
});
