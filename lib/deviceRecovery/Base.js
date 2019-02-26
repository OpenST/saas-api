/**
 * Base class for device recovery.
 *
 * @module lib/deviceRecovery/Base
 */

const OpenStJs = require('@openstfoundation/openst.js'),
  OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer,
  RecoveryHelper = OpenStJs.Helpers.Recovery;

const rootPrefix = '../..',
  web3Provider = require(rootPrefix + '/lib/providers/web3'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  CheckTxStatus = require(rootPrefix + '/lib/transactions/CheckTxStatus'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  tokenAddressConstants = require(rootPrefix + '/lib/globalConstant/tokenAddress'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  SubmitTransaction = require(rootPrefix + '/lib/transactions/SignSubmitTrxOnChain'),
  RecoveryOperationModel = require(rootPrefix + '/app/models/mysql/RecoveryOperation'),
  TokenAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/TokenAddress'),
  recoveryOperationConstants = require(rootPrefix + '/lib/globalConstant/recoveryOperation');

// Following require(s) for registering into instance composer
require(rootPrefix + '/app/models/ddb/sharded/Device');
/**
 * Base class for device recovery.
 *
 * @class Base
 */
class Base {
  /**
   * Constructor for base class of device recovery.
   *
   * // For performing transaction.
   * @param {Object} params
   * @param {String} [params.recoveryAddress]
   * @param {Object} [params.pendingTransactionExtraData]
   * @param {String/Number} [params.auxChainId]
   * @param {String/Number} [params.tokenId]
   *
   * // For verifying transaction.
   * @param {String} [params.userId]
   * @param {String/Number} [params.deviceShardNumber]
   * @param {String/Number} [params.initiateRecoveryOperationId]
   * @param {String} [params.transactionHash]
   * @param {String/Number} [params.chainId]
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    // For performing transaction.
    oThis.userId = params.userId;
    oThis.recoveryAddress = params.recoveryAddress;
    oThis.deviceShardNumber = params.deviceShardNumber;
    oThis.pendingTransactionExtraData = params.pendingTransactionExtraData;
    oThis.auxchainId = params.auxChainId;
    oThis.tokenId = params.tokenId;

    // For verifying transaction.
    oThis.initiateRecoveryOperationId = params.initiateRecoveryOperationId;
    oThis.transactionHash = params.transactionHash;
    oThis.chainId = params.chainId;

    oThis.fromAddress = null;
  }

  /**
   * Fetch from address.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchFromAddress() {
    const oThis = this;

    const tokenAddressesObj = new TokenAddressCache({ tokenId: oThis.tokenId }),
      addressesResp = await tokenAddressesObj.fetch();

    oThis.fromAddress = addressesResp.data[tokenAddressConstants.recoveryControllerAddressKind];
  }

  /**
   * Get web3instance to interact with chain
   *
   * @return {Object}
   */
  async _web3Instance() {
    const oThis = this;

    let providers = oThis.ic().configStrategy.auxGeth.readWrite.wsProviders;

    oThis.web3Instance = web3Provider.getInstance(providers[0]).web3WsProvider;
  }

  /**
   * This method checks whether the recovery for a user is already ongoing or not.
   * This method returns "true" if recovery for a user is ongoing otherwise it returns "false".
   *
   * @return {Promise<Boolean>}
   *
   * @private
   */
  async _isRecoveryAlreadyOngoing() {
    const oThis = this;

    await oThis._web3Instance();

    const recoveryHelperObj = new RecoveryHelper(oThis.web3Instance, oThis.recoveryAddress),
      recoveryInfo = await recoveryHelperObj.activeRecoveryInfo();

    // The below condition checks if the recovery for a user is already in progress or not. If the parameters
    // being checked are all null addresses, that means that recovery for a user is not in progress.
    return (
      recoveryInfo.prevOwner !== contractConstants.nullAddress &&
      recoveryInfo.oldOwner !== contractConstants.nullAddress &&
      recoveryInfo.newOwner !== contractConstants.nullAddress
    );
  }

  /**
   * Submit transaction on geth.
   *
   * @param {Object} txOptions
   *
   * @return {Promise<*|result>}
   *
   * @private
   */
  async _submitTransaction(txOptions) {
    const oThis = this;

    const submitTxRsp = await new SubmitTransaction({
      chainId: oThis.auxchainId,
      web3Instance: oThis.web3Instance,
      txOptions: txOptions,
      options: oThis.pendingTransactionExtraData
    }).perform();

    if (submitTxRsp.isSuccess()) {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskPending,
        transactionHash: submitTxRsp.data.transactionHash,
        taskResponseData: {
          from: oThis.fromAddress,
          transactionHash: submitTxRsp.data.transactionHash
        }
      });
    } else {
      return responseHelper.successWithData({
        taskStatus: workflowStepConstants.taskFailed,
        taskResponseData: JSON.stringify(submitTxRsp)
      });
    }
  }

  /**
   * Change Device statuses.
   *
   * @param {Object} statusMap
   *
   * @returns {Promise<void>}
   *
   * @private
   */
  async _changeDeviceStatuses(statusMap) {
    const oThis = this,
      ic = new InstanceComposer(oThis.configStrategy),
      DeviceModel = ic.getShadowedClassFor(coreConstants.icNameSpace, 'DeviceModel');

    const promises = [];

    let ddbQueryFailed = false;

    for (let address in statusMap) {
      const initialStatus = statusMap[address].initial,
        finalStatus = statusMap[address].final,
        deviceModelObj = new DeviceModel({ shardNumber: oThis.deviceShardNumber });

      promises.push(
        new Promise(function(onResolve, onReject) {
          deviceModelObj
            .updateStatusFromInitialToFinal(oThis.userId, address, initialStatus, finalStatus)
            .then(function(resp) {
              if (resp.isFailure()) {
                ddbQueryFailed = true;
              }
              onResolve();
            })
            .catch(function(error) {
              logger.error(error);
              ddbQueryFailed = true;
              onResolve();
            });
        })
      );
    }

    await Promise.all(promises);

    // If ddb query is failed. Then reject initiate recovery request.
    if (ddbQueryFailed) {
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 'l_dr_b_1',
          api_error_identifier: 'action_not_performed_contact_support',
          debug_options: {}
        })
      );
    }
  }

  /**
   * Check transaction status.
   *
   * @return {Promise<Boolean>}
   *
   * @private
   */
  async _checkTransactionStatus() {
    const oThis = this,
      checkTxStatus = new CheckTxStatus({ chainId: oThis.chainId, transactionHash: oThis.transactionHash }),
      response = await checkTxStatus.perform();

    return response.isSuccess();
  }

  /**
   * Update recovery operation status as successStatus or failureStatus.
   *
   * @param {Boolean} transactionVerified
   * @param {String} successStatus
   * @param {String} failureStatus
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateRecoveryOperationStatus(transactionVerified, successStatus, failureStatus) {
    const oThis = this,
      status = transactionVerified
        ? recoveryOperationConstants.invertedStatuses[successStatus]
        : recoveryOperationConstants.invertedStatuses[failureStatus];

    return new RecoveryOperationModel()
      .update({ status: status })
      .where({ id: oThis.recoveryOperationId })
      .fire();
  }

  /**
   * Update initiate recovery operation status as successStatus or failureStatus.
   *
   * @param {Boolean} transactionVerified
   * @param {String} successStatus
   * @param {String} failureStatus
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _updateInitiateRecoveryOperationStatus(transactionVerified, successStatus, failureStatus) {
    const oThis = this,
      status = transactionVerified
        ? recoveryOperationConstants.invertedStatuses[successStatus]
        : recoveryOperationConstants.invertedStatuses[failureStatus];

    return new RecoveryOperationModel()
      .update({ status: status })
      .where({ id: oThis.initiateRecoveryOperationId })
      .fire();
  }
}

module.exports = Base;