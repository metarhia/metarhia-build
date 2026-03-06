'use strict';

const { getB } = require('./b.js');

const getA = () => getB() + 'a';

module.exports = { getA };
