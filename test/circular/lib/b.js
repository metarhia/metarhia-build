'use strict';

const { getA } = require('./a.js');

const getB = () => getA() + 'b';

module.exports = { getB };
