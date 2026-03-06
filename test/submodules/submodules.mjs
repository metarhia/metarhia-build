// test1.js

const test1 = () => 'test1';

// test2.js

const test2 = () => 'test2';

// test3.js

const test3a = () => 'a';
const test3b = () => 'b';
const test3c = () => 'c';

// helper.js

const greet = () => 'ok';

// consumer.js

const run = () => greet();

export {
  test1,
  test2,
  test3a,
  test3b,
  test3c,
  greet,
  run,
};
