'use strict';

/**
 * Load all required contract abi files and export them.<br><br>
 *
 * @module config/core_abis
 */

const fs = require('fs'),
  path = require('path');

const rootPrefix = '..',
  nameToAbiMap = {};

function parseFile(filePath, options) {
  filePath = path.join(__dirname, '/' + filePath);
  const fileContent = fs.readFileSync(filePath, options || 'utf8');
  return JSON.parse(fileContent);
}

/**
 * Constructor for openST core contract abis
 *
 * @constructor
 */

class CoreAbis {
  constructor() {}

  /**
   * Value Chain Contract: simple token EIP20 contract ABI.<br><br>
   *
   * @constant {object}
   *
   */
  static get simpleToken() {
    if (nameToAbiMap['simpleToken']) return nameToAbiMap['simpleToken'];
    nameToAbiMap['simpleToken'] = parseFile(rootPrefix + '/contracts/abi/SimpleToken.abi', 'utf8');
    return nameToAbiMap['simpleToken'];
  }
}

module.exports = CoreAbis;
