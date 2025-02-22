import {test} from '../../util/test.js';
import '../../../src/util/global_worker_pool.js';
import Worker from '../../../src/source/worker.js';
import window from '../../../src/util/window.js';

const _self = {
    addEventListener() {}
};

test('load tile', (t) => {
    t.test('calls callback on error', (t) => {
        window.useFakeXMLHttpRequest();
        const worker = new Worker(_self);
        worker.setProjection(0, {name: 'mercator'});
        worker.loadTile(0, {
            type: 'vector',
            source: 'source',
            uid: 0,
            tileID: {overscaledZ: 0, wrap: 0, canonical: {x: 0, y: 0, z: 0, w: 0}},
            request: {url: '/error'}// Sinon fake server gives 404 responses by default
        }, (err) => {
            t.ok(err);
            window.restore();
            t.end();
        });
        window.server.respond();
    });

    t.end();
});

test('isolates different instances\' data', (t) => {
    const worker = new Worker(_self);

    worker.setLayers(0, {layers: [
        {id: 'one', type: 'circle'}
    ], options: new Map()}, () => {});

    worker.setLayers(1, {layers: [
        {id: 'one', type: 'circle'},
        {id: 'two', type: 'circle'},
    ], options: new Map()}, () => {});

    t.notEqual(worker.layerIndexes[0], worker.layerIndexes[1]);
    t.end();
});

test('worker source messages dispatched to the correct map instance', (t) => {
    const worker = new Worker(_self);

    worker.actor.send = function (type, data, callback, mapId) {
        t.equal(type, 'main thread task');
        t.equal(mapId, 999);
        t.end();
    };

    _self.registerWorkerSource('test', function(actor) {
        this.loadTile = function() {
            // we expect the map id to get appended in the call to the "real"
            // actor.send()
            actor.send('main thread task', {}, () => {}, null);
        };
    });

    worker.loadTile(999, {type: 'test'});
});
