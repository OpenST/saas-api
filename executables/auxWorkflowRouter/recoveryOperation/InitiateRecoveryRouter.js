/**
 * Initiate recovery router.
 *
 * @module executables/auxWorkflowRouter/recoveryOperation/InitiateRecoveryRouter
 */

const OSTBase = require('@openstfoundation/openst-base'),
  InstanceComposer = OSTBase.InstanceComposer;

const rootPrefix = '../../..',
  coreConstants = require(rootPrefix + '/config/coreConstants'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  chainConfigProvider = require(rootPrefix + '/lib/providers/chainConfig'),
  workflowConstants = require(rootPrefix + '/lib/globalConstant/workflow'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  AuxWorkflowRouterBase = require(rootPrefix + '/executables/auxWorkflowRouter/Base'),
  initiateRecoveryConfig = require(rootPrefix +
    '/executables/auxWorkflowRouter/recoveryOperation/intiateRecoveryConfig');

/**
 * Class for initiate recovery router.
 *
 * @class InitiateRecoveryRouter
 */
class InitiateRecoveryRouter extends AuxWorkflowRouterBase {
  /**
   * Constructor for initiate recovery router.
   *
   * @constructor
   */
  constructor(params) {
    params['workflowKind'] = workflowConstants.initiateRecoveryKind; // Assign workflowKind.

    super(params);
  }

  /**
   * Fetch current step config for every router.
   *
   * @private
   */
  _fetchCurrentStepConfig() {
    const oThis = this;

    oThis.currentStepConfig = initiateRecoveryConfig[oThis.stepKind];
  }

  /**
   * Perform step.
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _performStep() {
    const oThis = this;

    const configStrategy = await oThis.getConfigStrategy(),
      ic = new InstanceComposer(configStrategy);

    switch (oThis.stepKind) {
      case workflowStepConstants.initiateRecoveryInit:
        logger.step('**********', workflowStepConstants.initiateRecoveryInit);

        return oThis.insertInitStep();

      // Perform transaction to initiate recovery.
      case workflowStepConstants.initiateRecoveryPerformTransaction:
        logger.step('**********', workflowStepConstants.initiateRecoveryPerformTransaction);

        require(rootPrefix + '/lib/deviceRecovery/initiateRecovery/PerformTransaction');

        oThis.requestParams.pendingTransactionExtraData = oThis._currentStepPayloadForPendingTrx();
        oThis.requestParams.workflowId = oThis.workflowId;

        const PerformInitiateRecoveryTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'PerformInitiateRecoveryTransaction'
          ),
          performInitiateRecoveryTransactionObj = new PerformInitiateRecoveryTransaction(oThis.requestParams);

        return performInitiateRecoveryTransactionObj.perform();

      // Verify initiate recovery transaction.
      case workflowStepConstants.initiateRecoveryVerifyTransaction:
        logger.step('**********', workflowStepConstants.initiateRecoveryVerifyTransaction);

        require(rootPrefix + '/lib/deviceRecovery/initiateRecovery/VerifyTransaction');

        const VerifyInitiateRecoveryTransaction = ic.getShadowedClassFor(
            coreConstants.icNameSpace,
            'VerifyInitiateRecoveryTransaction'
          ),
          verifyInitiateRecoveryTransactionObj = new VerifyInitiateRecoveryTransaction(oThis.requestParams);

        return verifyInitiateRecoveryTransactionObj.perform();

      case workflowStepConstants.markSuccess:
        logger.step('*** Mark Initiate Recovery As Success.');

        return await oThis.handleSuccess();

      case workflowStepConstants.markFailure:
        logger.step('*** Mark Initiate Recovery As Failed');

        return await oThis.handleFailure();

      default:
        return Promise.reject(
          responseHelper.error({
            internal_error_identifier: 'e_awr_ro_irr_1',
            api_error_identifier: 'something_went_wrong',
            debug_options: { workflowId: oThis.workflowId }
          })
        );
    }
  }

  /**
   * Get next step configs.
   *
   * @param nextStep
   *
   * @return {*}
   */
  getNextStepConfigs(nextStep) {
    return initiateRecoveryConfig[nextStep];
  }

  /**
   * Get config strategy.
   *
   * @return {Promise<*>}
   */
  async getConfigStrategy() {
    const oThis = this;

    const rsp = await chainConfigProvider.getFor([oThis.chainId]);

    return rsp[oThis.chainId];
  }
}

module.exports = InitiateRecoveryRouter;
