'use strict';

const { Metacom } = require('metacom');
const { randomNumber } = require('./random.js');

class Hello {
  constructor() {
    this.id = randomNumber();
    this.connection = new Metacom();
  }
}

module.exports = { Hello };
