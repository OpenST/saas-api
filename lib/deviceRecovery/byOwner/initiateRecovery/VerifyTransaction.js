/**
 * This class file verifies if the perform transaction was done successfully.
 *
 * @module lib/deviceRecovery/byOwner/initiateRecovery/VerifyTransaction
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  deviceConstants = require(rootPrefix + '/lib/globalConstant/device'),
  DeviceRecoveryBase = require(rootPrefix + '/lib/deviceRecovery/Base'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

/**
 * Class to verify initiate recovery transaction.
 *
 * @class VerifyTransaction
 */
class VerifyTransaction extends DeviceRecoveryBase {
  /**
   * Constructor to verify initiate recovery transaction.
   *
   * @param {Object} params
   * @param {String} params.userId
   * @param {String} params.oldDeviceAddress
   * @param {String} params.newDeviceAddress
   * @param {String/Number} params.deviceShardNumber
   * @param {String/Number} params.recoveryOperationId
   * @param {String/Number} params.initiateRecoveryOperationId
   * @param {String} params.transactionHash
   * @param {String/Number} params.chainId
   *
   * @constructor
   */
  constructor(params) {
    super(params);

    const oThis = this;

    oThis.oldDeviceAddress = params.oldDeviceAddress;
    oThis.newDeviceAddress = params.newDeviceAddress;
    oThis.recoveryOperationId = params.recoveryOperationId;
  }

  /**
   * Perform
   *
   * @returns {Promise<any>}
   */
  async perform() {
    const oThis = this;

    const transactionVerified = await oThis._checkTransactionStatus();

    await oThis._updateRecoveryOperationStatus(
      transactionVerified,
      recoveryOperationConstants.waitingForAdminActionStatus,
      recoveryOperationConstants.failedStatus
    );

    if (transactionVerified) {
      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskDone
        })
      );
    } else {
      await oThis._updateDeviceStatuses();

      return Promise.resolve(
        responseHelper.successWithData({
          taskStatus: workflowStepConstants.taskFailed
        })
      );
    }
  }

  /**
   * Update device statuses.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateDeviceStatuses() {
    const oThis = this;

    // Change old device status from revokingStatus to authorizedStatus.
    // Change new device status from recoveringStatus to registeredStatus.
    const statusMap = {
      [oThis.oldDeviceAddress]: {
        initial: deviceConstants.revokingStatus,
        final: deviceConstants.authorizedStatus
      },
      [oThis.newDeviceAddress]: {
        initial: deviceConstants.recoveringStatus,
        final: deviceConstants.registeredStatus
      }
    };

    await oThis._changeDeviceStatuses(statusMap);
  }
}

InstanceComposer.registerAsShadowableClass(
  VerifyTransaction,
  coreConstants.icNameSpace,
  'VerifyInitiateRecoveryTransaction'
);

module.exports = {};