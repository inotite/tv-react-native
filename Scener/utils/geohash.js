/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Geohash encoding/decoding and associated functions   (c) Chris Veness 2014-2016 / MIT Licence  */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

/**
 * Geohash encode, decode, bounds, neighbours.
 *
 * @namespace
 */
let Geohash = {};

/* (Geohash-specific) Base32 map */
Geohash.base32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encodes latitude/longitude to geohash, either to specified precision or to automatically
 * evaluated precision.
 *
 * @param   {number} lat - Latitude in degrees.
 * @param   {number} lon - Longitude in degrees.
 * @param   {number} [precision] - Number of characters in resulting geohash.
 * @returns {string} Geohash of supplied latitude/longitude.
 * @throws  Invalid geohash.
 *
 * @example
 *     let geohash = Geohash.encode(52.205, 0.119, 7); // geohash: 'u120fxw'
 */
Geohash.encode = function(lat, lon, precision) {
    // infer precision?
    if (typeof precision == 'undefined') {
        // refine geohash until it matches precision of supplied lat/lon
        for (let p=1; p<=12; p++) {
            let hash = Geohash.encode(lat, lon, p);
            let posn = Geohash.decode(hash);
            if (posn.lat==lat && posn.lon==lon) return hash;
        }
        precision = 12; // set to maximum
    }

    lat = Number(lat);
    lon = Number(lon);
    precision = Number(precision);

    if (isNaN(lat) || isNaN(lon) || isNaN(precision)) throw new Error('Invalid geohash');

    let idx = 0; // index into base32 map
    let bit = 0; // each char holds 5 bits
    let evenBit = true;
    let geohash = '';

    let latMin =  -90, latMax =  90;
    let lonMin = -180, lonMax = 180;

    while (geohash.length < precision) {
        if (evenBit) {
            // bisect E-W longitude
            let lonMid = (lonMin + lonMax) / 2;
            if (lon >= lonMid) {
                idx = idx*2 + 1;
                lonMin = lonMid;
            } else {
                idx = idx*2;
                lonMax = lonMid;
            }
        } else {
            // bisect N-S latitude
            let latMid = (latMin + latMax) / 2;
            if (lat >= latMid) {
                idx = idx*2 + 1;
                latMin = latMid;
            } else {
                idx = idx*2;
                latMax = latMid;
            }
        }
        evenBit = !evenBit;

        if (++bit == 5) {
            // 5 bits gives us a character: append it and start over
            geohash += Geohash.base32.charAt(idx);
            bit = 0;
            idx = 0;
        }
    }

    return geohash;
};


/**
 * Decode geohash to latitude/longitude (location is approximate centre of geohash cell,
 *     to reasonable precision).
 *
 * @param   {string} geohash - Geohash string to be converted to latitude/longitude.
 * @returns {{lat:number, lon:number}} (Center of) geohashed location.
 * @throws  Invalid geohash.
 *
 * @example
 *     let latlon = Geohash.decode('u120fxw'); // latlon: { lat: 52.205, lon: 0.1188 }
 */
Geohash.decode = function(geohash) {

    let bounds = Geohash.bounds(geohash); // <-- the hard work
    // now just determine the centre of the cell...

    let latMin = bounds.sw.lat, lonMin = bounds.sw.lon;
    let latMax = bounds.ne.lat, lonMax = bounds.ne.lon;

    // cell centre
    let lat = (latMin + latMax)/2;
    let lon = (lonMin + lonMax)/2;

    // round to close to centre without excessive precision: ⌊2-log10(Δ°)⌋ decimal places
    lat = lat.toFixed(Math.floor(2-Math.log(latMax-latMin)/Math.LN10));
    lon = lon.toFixed(Math.floor(2-Math.log(lonMax-lonMin)/Math.LN10));

    return { lat: Number(lat), lon: Number(lon) };
};


/**
 * Returns SW/NE latitude/longitude bounds of specified geohash.
 *
 * @param   {string} geohash - Cell that bounds are required of.
 * @returns {{sw: {lat: number, lon: number}, ne: {lat: number, lon: number}}}
 * @throws  Invalid geohash.
 */
Geohash.bounds = function(geohash) {
    if (geohash.length === 0) throw new Error('Invalid geohash');

    geohash = geohash.toLowerCase();

    let evenBit = true;
    let latMin =  -90, latMax =  90;
    let lonMin = -180, lonMax = 180;

    for (let i=0; i<geohash.length; i++) {
        let chr = geohash.charAt(i);
        let idx = Geohash.base32.indexOf(chr);
        if (idx == -1) throw new Error('Invalid geohash');

        for (let n=4; n>=0; n--) {
            let bitN = idx >> n & 1;
            if (evenBit) {
                // longitude
                let lonMid = (lonMin+lonMax) / 2;
                if (bitN == 1) {
                    lonMin = lonMid;
                } else {
                    lonMax = lonMid;
                }
            } else {
                // latitude
                let latMid = (latMin+latMax) / 2;
                if (bitN == 1) {
                    latMin = latMid;
                } else {
                    latMax = latMid;
                }
            }
            evenBit = !evenBit;
        }
    }

    let bounds = {
        sw: { lat: latMin, lon: lonMin },
        ne: { lat: latMax, lon: lonMax },
    };

    return bounds;
};


/**
 * Determines adjacent cell in given direction.
 *
 * @param   geohash - Cell to which adjacent cell is required.
 * @param   direction - Direction from geohash (N/S/E/W).
 * @returns {string} Geocode of adjacent cell.
 * @throws  Invalid geohash.
 */
Geohash.adjacent = function(geohash, direction) {
    // based on github.com/davetroy/geohash-js

    geohash = geohash.toLowerCase();
    direction = direction.toLowerCase();

    if (geohash.length === 0) throw new Error('Invalid geohash');
    if ('nsew'.indexOf(direction) == -1) throw new Error('Invalid direction');

    let neighbour = {
        n: [ 'p0r21436x8zb9dcf5h7kjnmqesgutwvy', 'bc01fg45238967deuvhjyznpkmstqrwx' ],
        s: [ '14365h7k9dcfesgujnmqp0r2twvyx8zb', '238967debc01fg45kmstqrwxuvhjyznp' ],
        e: [ 'bc01fg45238967deuvhjyznpkmstqrwx', 'p0r21436x8zb9dcf5h7kjnmqesgutwvy' ],
        w: [ '238967debc01fg45kmstqrwxuvhjyznp', '14365h7k9dcfesgujnmqp0r2twvyx8zb' ],
    };
    let border = {
        n: [ 'prxz',     'bcfguvyz' ],
        s: [ '028b',     '0145hjnp' ],
        e: [ 'bcfguvyz', 'prxz'     ],
        w: [ '0145hjnp', '028b'     ],
    };

    let lastCh = geohash.slice(-1);    // last character of hash
    let parent = geohash.slice(0, -1); // hash without last character

    let type = geohash.length % 2;

    // check for edge-cases which don't share common prefix
    if (border[direction][type].indexOf(lastCh) != -1 && parent !== '') {
        parent = Geohash.adjacent(parent, direction);
    }

    // append letter for direction to parent
    return parent + Geohash.base32.charAt(neighbour[direction][type].indexOf(lastCh));
};


/**
 * Returns all 8 adjacent cells to specified geohash.
 *
 * @param   {string} geohash - Geohash neighbours are required of.
 * @returns {{n,ne,e,se,s,sw,w,nw: string}}
 * @throws  Invalid geohash.
 */
Geohash.neighbours = function(geohash) {
    return {
        'n':  Geohash.adjacent(geohash, 'n'),
        'ne': Geohash.adjacent(Geohash.adjacent(geohash, 'n'), 'e'),
        'e':  Geohash.adjacent(geohash, 'e'),
        'se': Geohash.adjacent(Geohash.adjacent(geohash, 's'), 'e'),
        's':  Geohash.adjacent(geohash, 's'),
        'sw': Geohash.adjacent(Geohash.adjacent(geohash, 's'), 'w'),
        'w':  Geohash.adjacent(geohash, 'w'),
        'nw': Geohash.adjacent(Geohash.adjacent(geohash, 'n'), 'w'),
    };
};

export const geohash = Geohash;
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
//if (typeof module != 'undefined' && module.exports) module.exports = Geohash; // CommonJS, node.js
