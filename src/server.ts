import express from 'express';
import bodyParser from 'body-parser';
import TTMan from './ttman';

const WEB_PORT = process.env.PORT || 18463;
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
        let response = {};
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
        let response = {};
        response['type'] = 'fs';
        // response['data'] = await TTMan.getTTByName(g);

        res.json({ response });
    } catch (error) {
        next(error);
    }
});

app.get('/api/get/:g', async (req, res, next) => {
    try {
        let { g } = req.params;
        let dataTT = await TTMan.getTTByName(g);
        if (!dataTT) {
            throw ('Wrong name');
        }
        let { data, isCache } = dataTT;
        let response = {};
        response['type'] = 'byName';
        response['isCache'] = isCache;
        response['data'] = data;

        res.json({ response });
    } catch (error) {
        next(error);
    }
});

app.use((err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }

    res.status(500);
    res.json({ error: err });
});

export const server = app.listen(WEB_PORT, () => {
    console.log(`Web server started: http://127.0.0.1:${WEB_PORT}/`);
});
