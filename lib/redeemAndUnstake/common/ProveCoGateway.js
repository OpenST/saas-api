'use strict';
/*
 * This module helps in Prove Co-Gateway on Gateway contract
 *
 * @module lib/redeemAndUnstake/common/ProveCoGateway
 */

const MosaicJs = require('@openst/mosaic.js'),
  Web3Util = require('web3-utils');

const rootPrefix = '../../..',
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  chainAddressConstants = require(rootPrefix + '/lib/globalConstant/chainAddress'),
  contractConstants = require(rootPrefix + '/lib/globalConstant/contract'),
  ContractInteractLayer = require(rootPrefix + '/lib/redeemAndUnstake/ContractInteractLayer'),
  ChainAddressCache = require(rootPrefix + '/lib/cacheManagement/kitSaas/ChainAddress'),
  StateRootCommitModel = require(rootPrefix + '/app/models/mysql/StateRootCommit'),
  RedeemBase = require(rootPrefix + '/lib/redeemAndUnstake/Base');

class ProveCoGateway extends RedeemBase {
  /**
   * @constructor
   *
   * @param params
   */
  constructor(params) {
    super(params);

    const oThis = this;
    oThis.facilitator = params.facilitator;

    oThis.gatewayContract = null;
    oThis.coGatewayContract = null;
    oThis.serializedAccountProof = null;
    oThis.rlpAccount = null;
    oThis.lastSyncedBlock = null;
  }

  /**
   * Set web3 instance
   *
   * @returns {Promise<void>}
   * @private
   */
  async _setWeb3Instance() {
    const oThis = this;

    await oThis._setOriginWeb3Instance();

    await oThis._setAuxWeb3Instance();
  }

  /**
   * Fetch contract addresses involved in transaction
   *
   * @returns {Promise<void>}
   * @private
   */
  async _fetchContractAddresses() {
    const oThis = this;

    // Fetch gateway contract address
    let chainAddressCacheObj = new ChainAddressCache({ associatedAuxChainId: oThis.auxChainId }),
      chainAddressesRsp = await chainAddressCacheObj.fetch();

    oThis.gatewayContract = chainAddressesRsp.data[chainAddressConstants.originGatewayContractKind].address;
    oThis.coGatewayContract = chainAddressesRsp.data[chainAddressConstants.auxCoGatewayContractKind].address;
  }

  /**
   * Get merkle proof for CoGateway
   *
   * @return {Promise<void>}
   * @private
   */
  _getMerkleProofForCoGateway() {
    const oThis = this;

    let merkleProof = new MosaicJs.Utils.ProofGenerator(oThis.auxWeb3, oThis.originWeb3);

    return new Promise(function(onResolve, onReject) {
      merkleProof
        .getOutboxProof(oThis.coGatewayContract, [], Web3Util.toHex(oThis.lastSyncedBlock))
        .then(function(resp) {
          oThis.serializedAccountProof = resp.serializedAccountProof;
          oThis.rlpAccount = resp.encodedAccountValue;
          onResolve();
        })
        .catch(function(err) {
          logger.error(err);
          onResolve();
        });
    });
  }

  /**
   * Fetch last synced block
   *
   * @return {Promise<void>}
   * @private
   */
  async _fetchLastSyncedBlock() {
    const oThis = this;

    let stateRootCommitModel = new StateRootCommitModel();

    let resp = await stateRootCommitModel.getLastSyncedBlock({
      source_chain_id: oThis.auxChainId,
      target_chain_id: oThis.originChainId
    });

    oThis.lastSyncedBlock = resp[0].block_number;
  }

  /**
   * Build transaction data to be submitted
   *
   * @returns {Promise<void>}
   * @private
   */
  async _buildTransactionData() {
    const oThis = this;

    await oThis._fetchLastSyncedBlock();

    await oThis._getMerkleProofForCoGateway();

    let txData = await ContractInteractLayer.getProveCoGatewayOnGatewayData(
      oThis.originWeb3,
      oThis.gatewayContract,
      oThis.lastSyncedBlock.toString(),
      oThis.rlpAccount,
      oThis.serializedAccountProof
    );

    oThis.transactionData = {
      gasPrice: contractConstants.auxChainGasPrice,
      gas: contractConstants.proveCoGatewayOnOriginGas,
      value: '0x0',
      from: oThis.facilitator,
      to: oThis.gatewayContract,
      data: txData
    };
  }

  /**
   * Get chain id on which transaction would be submitted
   *
   * @returns {*}
   * @private
   */
  _getChainId() {
    const oThis = this;

    return oThis.originChainId;
  }

  /**
   * Extra data to be merged in response
   *
   * @returns {{}}
   * @private
   */
  _mergeExtraResponseData() {
    return {};
  }
}

module.exports = ProveCoGateway;