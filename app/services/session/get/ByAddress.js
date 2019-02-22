'use strict';

/**
 *  Fetch session details of specific session address.
 *
 * @module app/services/session/get/ByAddress
 */
const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  CommonValidators = require(rootPrefix + '/lib/validators/Common'),
  SessionGetBase = require(rootPrefix + '/app/services/session/get/Base'),
  resultType = require(rootPrefix + '/lib/globalConstant/resultType');

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

/**
 * Class to get session details of specific session address
 *
 * @class SessionGetByAddress
 */
class SessionGetByAddress extends SessionGetBase {
  /**
   * @param params
   * @param {Integer} params.client_id
   * @param {String} params.user_id
   * @param {String} params.address - Session address.
   * @param {Integer} [params.token_id]
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.address = params.address;
  }

  /**
   * Validate Specific params
   *
   * @returns {Promise<never>}
   * @private
   */
  async _validateParams() {
    // nothing to validate
    const oThis = this;
    oThis.address = oThis.address.toLowerCase();
  }

  /**
   * Set addresses
   *
   * @private
   */
  async _setAddresses() {
    //DO nothing as already came in params
  }

  /**
   * Fetch sessions from cache.
   *
   * @returns {Promise<*>}
   * @private
   */
  async _fetchSessionFromCache() {
    const oThis = this;

    let response = await oThis._getUserSessionsDataFromCache([oThis.address]);

    if (!CommonValidators.validateObject(response.data[oThis.address.toLowerCase()])) {
      return Promise.reject(
        responseHelper.paramValidationError({
          internal_error_identifier: 'a_s_s_l_ba_1',
          api_error_identifier: 'resource_not_found',
          params_error_identifiers: ['session_not_found'],
          debug_options: {}
        })
      );
    }

    let returnData = {
      [resultType.session]: response.data[oThis.address.toLowerCase()]
    };

    return returnData;
  }

  /**
   * Fetch session nonce
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchSessionNonce(responseData) {
    const oThis = this;

    let sessionData = responseData.session,
      currentTimestamp = Math.floor(new Date() / 1000),
      approxExpirationTimestamp = sessionData.expirationTimestamp || 0;

    // Compare approx expirtaion time with current time and avoid fetching nonce from contract.
    // If session is expired then avoid fetching from contract.
    if (Number(approxExpirationTimestamp) > currentTimestamp) {
      await oThis._fetchSessionTokenHolderNonce(sessionData.address);
    }
    responseData.session.nonce = oThis.sessionNonce[sessionData.address];

    return responseData;
  }
}

InstanceComposer.registerAsShadowableClass(SessionGetByAddress, coreConstants.icNameSpace, 'SessionGetByAddress');

module.exports = {};
