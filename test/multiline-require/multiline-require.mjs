// data.js

const getA = () => 'a';
const getB = () => 'b';

// app.js

const run = () => getA() + getB();

export {
  getA,
  getB,
  run,
};
