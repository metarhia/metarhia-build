import { sample } from './metautil.js';
import { Metacom } from './metacom.js';

// random.js

const randomNumber = () => {
  const a = [1, 2, 3];
  return sample(a);
};

const randomString = () => {
  const a = ['uno', 'due', 'tre'];
  return sample(a);
};

// hello.js

class Hello {
  constructor() {
    this.id = randomNumber();
    this.connection = new Metacom();
  }
}

export {
  randomNumber,
  randomString,
  Hello,
};
