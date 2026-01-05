import {
  TEST_PCKG_VAR,
  TEST_PCKG_VAR_1,
  TEST_PCKG_VAR_2,
  TEST_PCKG_VAR_3,
  TEST_PCKG_VAR_4,
} from 'test-package';

const test4a = () => TEST_PCKG_VAR_1;
const test4b = () => {
  test4a();
  return TEST_PCKG_VAR_2;
};
const test4c = () => {
  test4b();
  return TEST_PCKG_VAR_3;
};
const test4d = () => {
  test4c();
  return TEST_PCKG_VAR_4;
};

const test4 = () => {
  test4d();
  return TEST_PCKG_VAR;
};

export { test4 };
