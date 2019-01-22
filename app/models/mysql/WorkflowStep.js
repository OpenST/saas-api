'use strict';
/**
 * This is model for workflow_setup table.
 *
 * @module app/models/mysql/WorkflowStep
 */
const rootPrefix = '../../..',
  util = require(rootPrefix + '/lib/util'),
  ModelBase = require(rootPrefix + '/app/models/mysql/Base'),
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

//NOTE: This is a shared table with KIT. Any changes here must be synced with model in KIT-API.

// Declare variables.
const dbName = 'kit_saas_' + coreConstants.subEnvironment + '_' + coreConstants.environment,
  statuses = {
    '1': workflowStepConstants.queuedStatus,
    '2': workflowStepConstants.pendingStatus,
    '3': workflowStepConstants.processedStatus,
    '4': workflowStepConstants.failedStatus,
    '5': workflowStepConstants.timeoutStatus,
    '6': workflowStepConstants.retriedStatus
  },
  invertedStatuses = util.invert(statuses),
  kinds = {
    '1': workflowStepConstants.economySetupInit,
    '2': workflowStepConstants.generateTokenAddresses,
    '3': workflowStepConstants.deployOriginTokenOrganization,
    '4': workflowStepConstants.saveOriginTokenOrganization,
    '5': workflowStepConstants.deployOriginBrandedToken,
    '6': workflowStepConstants.saveOriginBrandedToken,
    '7': workflowStepConstants.deployAuxTokenOrganization,
    '8': workflowStepConstants.saveAuxTokenOrganization,
    '9': workflowStepConstants.deployUtilityBrandedToken,
    '10': workflowStepConstants.saveUtilityBrandedToken,
    '11': workflowStepConstants.deployTokenGateway,
    '12': workflowStepConstants.saveTokenGateway,
    '13': workflowStepConstants.updateTokenInOstView,
    '14': workflowStepConstants.deployTokenCoGateway,
    '15': workflowStepConstants.saveTokenCoGateway,
    '16': workflowStepConstants.activateTokenGateway,
    '17': workflowStepConstants.verifyActivateTokenGateway,
    '18': workflowStepConstants.setGatewayInBt,
    '19': workflowStepConstants.verifySetGatewayInBt,
    '20': workflowStepConstants.setCoGatewayInUbt,
    '21': workflowStepConstants.verifySetCoGatewayInUbt,
    '22': workflowStepConstants.deployGatewayComposer,
    '23': workflowStepConstants.verifyDeployGatewayComposer,
    '24': workflowStepConstants.setInternalActorForOwnerInUBT,
    '25': workflowStepConstants.verifySetInternalActorForOwnerInUBT,
    '26': workflowStepConstants.verifyEconomySetup,

    '30': workflowStepConstants.commitStateRootInit,
    '31': workflowStepConstants.commitStateRoot,
    '32': workflowStepConstants.updateCommittedStateRootInfo,

    '60': workflowStepConstants.stPrimeStakeAndMintInit,
    '61': workflowStepConstants.stPrimeApprove,
    '62': workflowStepConstants.simpleTokenStake,
    '63': workflowStepConstants.fetchStakeIntentMessageHash,
    '64': workflowStepConstants.proveGatewayOnCoGateway,
    '65': workflowStepConstants.confirmStakeIntent,
    '66': workflowStepConstants.progressStake,
    '67': workflowStepConstants.progressMint,

    '70': workflowStepConstants.btStakeAndMintInit,
    '71': workflowStepConstants.btRequestStakeHandle,
    '72': workflowStepConstants.fetchStakeRequestHash,
    '73': workflowStepConstants.btApproveTxHandle,
    '74': workflowStepConstants.checkApproveTxStatus,
    '75': workflowStepConstants.checkAllowance,

    '80': workflowStepConstants.checkApproveStatus,
    '81': workflowStepConstants.checkStakeStatus,
    '82': workflowStepConstants.checkProveGatewayStatus,
    '83': workflowStepConstants.checkConfirmStakeStatus,
    '84': workflowStepConstants.checkProgressStakeStatus,
    '85': workflowStepConstants.checkProgressMintStatus,
    '86': workflowStepConstants.checkRequestStakeTxStatus,

    '101': workflowStepConstants.markSuccess,
    '102': workflowStepConstants.markFailure,

    '110': workflowStepConstants.testInit,
    '111': workflowStepConstants.s1,
    '112': workflowStepConstants.s2,
    '113': workflowStepConstants.s33,
    '114': workflowStepConstants.s4,
    '115': workflowStepConstants.s5,
    '116': workflowStepConstants.s6,
    '117': workflowStepConstants.s7
  },
  invertedKinds = util.invert(kinds);

/**
 * Class for workflow step model
 *
 * @class
 */
class WorkflowStep extends ModelBase {
  /**
   * Constructor for workflow step model
   *
   * @constructor
   */
  constructor() {
    super({ dbName: dbName });

    const oThis = this;

    oThis.tableName = 'workflow_steps';
  }

  get statuses() {
    return statuses;
  }

  get invertedStatuses() {
    return invertedStatuses;
  }

  get kinds() {
    return kinds;
  }

  get invertedKinds() {
    return invertedKinds;
  }

  /**
   * This function will mark the step as success
   *
   * @param {Number/String} id
   * @param {Object} updateData
   *
   * @returns Promise<>
   */
  async updateRecord(id, updateData) {
    const oThis = this;

    return oThis
      .update(updateData)
      .where({ id: id })
      .fire();
  }

  /**
   * This function will mark the step as success
   *
   * @param id
   */
  async markAsSuccess(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowStepConstants.processedStatus] })
      .where({ id: id })
      .fire();
  }
  /**
   * This function will mark the step as queued
   *
   * @param id
   */
  markAsQueued(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowStepConstants.queuedStatus] })
      .where({ id: id })
      .fire();
  }

  markAsFailed(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowStepConstants.failedStatus] })
      .where({ id: id })
      .fire();
  }

  markAsPending(id) {
    const oThis = this;

    return oThis
      .update({ status: invertedStatuses[workflowStepConstants.pendingStatus] })
      .where({ id: id })
      .fire();
  }
}

module.exports = WorkflowStep;
