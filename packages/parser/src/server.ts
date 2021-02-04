import express, { Router } from 'express';
import bodyParser from 'body-parser';
import TTMan from './ttman';

const WEB_PORT = process.env.PORT || 8085;
export const app = express();

app.disable('x-powered-by');
app.use(bodyParser.json());

const router = Router();

app.get('/', async (_req, res) => {
    let message = 'hi';
    res.send(message);
});

app.get('/api', async (_req, res) => {
    res.json({ message: 'use /api/v1/' });
});

app.use('/api/v1', router);

router.get('/list/facultets', async (_req, res, next) => {
    try {
        let response: any = {};
        response['type'] = 'allFacultets';
        response['data'] = TTMan.allFacultets;

        res.json({ response });
    } catch (error) {
        next(error);
    }
});

router.get('/list/groups', async (_req, res, next) => {
    try {
        let response: any = {};
        response['type'] = 'allGroups';
        response['data'] = TTMan.allGroups_2;

        res.json({ response });
    } catch (error) {
        next(error);
    }
});

router.get('/list/:f', async (req, res, next) => {
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

router.get('/get/:g', async (req, res, next) => {
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

router.use((_req, _res, next) => {
    next(Error('API Method not found'));
});

app.use((error: any, _req: any, res: any, next: Function) => {
    if (res.headersSent) {
        return next(error);
    }

    // console.error(error);

    res.status(500);
    res.json({ error: error.message });
});

export const server = app.listen(WEB_PORT, () => {
    console.log(`Web server started: http://127.0.0.1:${WEB_PORT}/`);
});
