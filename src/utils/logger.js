'use strict';

const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
};

const formatMessage = (color, prefix, message) =>
  `${color}${prefix}${COLORS.RESET} ${message}`;

const error = (message) => {
  console.error(formatMessage(COLORS.RED, 'Error:', message));
};

const warn = (message) => {
  console.warn(formatMessage(COLORS.YELLOW, 'Warning:', message));
};

const info = (message) => {
  console.info(formatMessage(COLORS.BLUE, 'Info:', message));
};

const success = (message) => {
  console.log(formatMessage(COLORS.GREEN, 'Success:', message));
};

module.exports = {
  error,
  warn,
  info,
  success,
};
