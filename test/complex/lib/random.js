'use strict';

const { sample } = require('metautil');

const randomNumber = () => {
  const a = [1, 2, 3];
  return sample(a);
};

const randomString = () => {
  const a = ['uno', 'due', 'tre'];
  return sample(a);
};

module.exports = { randomNumber, randomString };
