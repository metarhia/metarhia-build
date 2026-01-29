'use strict';

const { executeLibMode } = require('./lib-mode');
const { executeIIFEMode } = require('./iife-mode');
const { executeAppMode } = require('./app-mode');

module.exports = {
  modeExecutors: {
    lib: executeLibMode,
    iife: executeIIFEMode,
    app: executeAppMode,
  },
};
