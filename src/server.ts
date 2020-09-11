import express from 'express';
import bodyParser from 'body-parser';
import TTMan from './ttman';

const WEB_PORT = 8083;
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

app.get('/api/list/all', async (req, res) => {
    let response = {};
    response['type'] = 'allGroups';
    response['data'] = TTMan.allGroups;

    res.json({ response });
});

app.get('/api/list/:f', async (req, res) => {
    let { f } = req.params;
    let response = {};
    response['type'] = 'fs';
    // response['data'] = await TTMan.getTTByName(g);

    res.json({ response });
});

app.get('/api/get/:g', async (req, res) => {
    let { g } = req.params;
    let { data, isCache } = await TTMan.getTTByName(g);
    let response = {};
    response['type'] = 'byName';
    response['isCache'] = isCache;
    response['data'] = data;

    res.json({ response });
});

export const server = app.listen(WEB_PORT, () => {
    console.log(`Web server started: http://127.0.0.1:${WEB_PORT}/`);
});
