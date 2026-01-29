'use strict';

const fs = require('fs');
const { test1 } = require('./test1');
const test2 = () => test1() + fs.readFileSync('test2.js', 'utf8');

module.exports = test2;
