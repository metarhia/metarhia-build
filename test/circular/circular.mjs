// a.js

const getA = () => getB() + 'a';

// b.js

const getB = () => getA() + 'b';

export {
  getA,
  getB,
};
