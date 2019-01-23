'use strict';
/**
 * This service starts the deployment of token
 *
 * @module app/services/token/Deployment
 */
const rootPrefix = '../../..',
  TokenModel = require(rootPrefix + '/app/models/mysql/Token'),
  responseHelper = require(rootPrefix + '/lib/formatter/response'),
  logger = require(rootPrefix + '/lib/logger/customConsoleLogger'),
  tokenConstants = require(rootPrefix + '/lib/globalConstant/token'),
  WorkflowModel = require(rootPrefix + '/app/models/mysql/Workflow'),
  TokenCache = require(rootPrefix + '/lib/sharedCacheManagement/Token'),
  ConfigGroupsModel = require(rootPrefix + '/app/models/mysql/ConfigGroup'),
  configGroupConstants = require(rootPrefix + '/lib/globalConstant/configGroups'),
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep'),
  ConfigStrategyHelper = require(rootPrefix + '/helpers/configStrategy/ByChainId'),
  workflowTopicConstant = require(rootPrefix + '/lib/globalConstant/workflowTopic'),
  configStrategyConstants = require(rootPrefix + '/lib/globalConstant/configStrategy'),
  ClientConfigGroupModel = require(rootPrefix + '/app/models/mysql/ClientConfigGroup'),
  EconomySetupRouter = require(rootPrefix + '/executables/workflowRouter/EconomySetupRouter'),
  ClientConfigGroupCache = require(rootPrefix + '/lib/sharedCacheManagement/ClientConfigGroup');

/**
 * Class for token deployment
 *
 * @class
 */
class Deployment {
  /**
   * Constructor for token deployment
   *
   * @constructor
   */
  constructor(params) {
    const oThis = this;

    oThis.tokenId = params.token_id;
    oThis.clientId = params.client_id;
  }

  /**
   * perform
   * @return {Promise<>}
   */
  perform() {
    const oThis = this;

    return oThis.asyncPerform().catch(function(error) {
      if (responseHelper.isCustomResult(error)) {
        return error;
      } else {
        logger.error('app/services/token/deployment::perform::catch');
        logger.error(error);
        return responseHelper.error({
          internal_error_identifier: 's_t_d_1',
          api_error_identifier: 'unhandled_catch_response',
          debug_options: {}
        });
      }
    });
  }

  /**
   * asyncPerform
   *
   * @return {Promise<any>}
   */
  async asyncPerform() {
    const oThis = this;

    return await oThis.startTokenDeployment();
  }

  /**
   * Fetch config group for the client. If config group is not assigned for the client, assign one.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _insertAndFetchConfigGroup() {
    const oThis = this;

    // Fetch client config group.
    let clientConfigStrategyCacheObj = new ClientConfigGroupCache({ clientId: oThis.clientId }),
      fetchCacheRsp = await clientConfigStrategyCacheObj.fetch();

    // Config group is not associated for the given client.
    if (fetchCacheRsp.isFailure()) {
      // Assign config group for the client.
      oThis.chainId = await oThis._assignConfigGroupsToClient();
    }
    // Config group is already associated for the given client.
    else {
      oThis.chainId = fetchCacheRsp.data[oThis.clientId].chainId;
    }
  }

  /**
   * Assign config group to the clientId.
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _assignConfigGroupsToClient() {
    const oThis = this;

    // Fetch all config groups which are available for allocation.
    let configGroups = new ConfigGroupsModel(),
      configGroupsResponse = await configGroups
        .select('*')
        .where({
          is_available_for_allocation: new ConfigGroupsModel().invertedIsAvailableForAllocation[
            configGroupConstants.availableForAllocation
          ]
        })
        .fire();

    // Select config group on round robin basis.
    let configGroupRow = oThis.clientId % configGroupsResponse.length;

    // Fetch config group.
    let configGroup = configGroupsResponse[configGroupRow],
      chainId = configGroup.chain_id,
      groupId = configGroup.group_id;

    // Insert entry in client config groups table.
    await new ClientConfigGroupModel().insertRecord({
      clientId: oThis.clientId,
      chainId: chainId,
      groupId: groupId
    });

    logger.step('Entry created in client config groups table.');

    return chainId;
  }

  /**
   * Fetch latest workflow details for the client.
   *
   * @param {String/Number} clientId
   *
   * @return {Promise<*>}
   *
   * @private
   */
  async _fetchWorkflowDetails(clientId) {
    return await new WorkflowModel()
      .select('*')
      .where({
        client_id: clientId
      })
      .order_by('created_at DESC')
      .limit(1)
      .fire();
  }

  /**
   * Fetch token details
   *
   * @param {String/Number} clientId
   *
   * @return {Promise<void>}
   *
   * @private
   */
  async _fetchTokenDetails(clientId) {
    let cacheResponse = await new TokenCache({ clientId: clientId }).fetch();

    if (cacheResponse.isFailure()) {
      logger.error('Could not fetched token details.');
      return Promise.reject(
        responseHelper.error({
          internal_error_identifier: 's_t_d_7',
          api_error_identifier: 'something_went_wrong',
          debug_options: {
            clientId: clientId
          }
        })
      );
    }
    logger.debug('cacheResponse-------', cacheResponse);
    return cacheResponse.data;
  }

  /***
   *
   * object of config strategy klass
   *
   * @return {object}
   *
   * @Sets oThis.originChainId
   */
  async _fetchOriginChainId() {
    const oThis = this;
    let csHelper = new ConfigStrategyHelper(0),
      csResponse = await csHelper.getForKind(configStrategyConstants.constants),
      configConstants = csResponse.data[configStrategyConstants.constants];

    oThis.originChainId = configConstants.originChainId;
  }

  /**
   * Start token deployment
   *
   * @return {Promise<*|result>}
   */
  async startTokenDeployment() {
    const oThis = this;

    // Update status of token deployment as deploymentStarted in tokens table.
    let tokenModelResp = await new TokenModel()
      .update({
        status: new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]
      })
      .where({
        id: oThis.tokenId,
        status: new TokenModel().invertedStatuses[tokenConstants.notDeployed]
      })
      .fire();

    // Clear token cache.
    await new TokenCache({ clientId: oThis.clientId }).clear();

    // If row was updated successfully.
    if (+tokenModelResp.affectedRows === 1) {
      // Implicit string to int conversion.

      await oThis._fetchOriginChainId();

      // Fetch config group for the client.
      await oThis._insertAndFetchConfigGroup();

      let economySetupRouterParams = {
        stepKind: workflowStepConstants.economySetupInit,
        taskStatus: workflowStepConstants.taskReadyToStart,
        clientId: oThis.clientId,
        chainId: oThis.chainId,
        topic: workflowTopicConstant.economySetup,
        requestParams: {
          tokenId: oThis.tokenId,
          auxChainId: oThis.chainId,
          originChainId: oThis.originChainId,
          clientId: oThis.clientId
        }
      };

      let economySetupRouterObj = new EconomySetupRouter(economySetupRouterParams);

      return await economySetupRouterObj.perform();
    }
    // Status of token deployment is not as expected.
    else {
      // Fetch token details.
      let tokenDetails = await oThis._fetchTokenDetails(oThis.clientId);

      // If token does not exist in the table.
      if (Object.keys(tokenDetails) < 1) {
        logger.error('Token does not exist.');

        return responseHelper.error({
          internal_error_identifier: 's_t_d_3',
          api_error_identifier: 'invalid_branded_token',
          debug_options: {}
        });
      }
      // Token exists in the table.
      else {
        logger.debug('tokenDetails-------', tokenDetails);

        switch (tokenDetails.status.toString()) {
          case new TokenModel().invertedStatuses[tokenConstants.deploymentStarted]:
            // Fetch latest workflow details for the client.
            let workflowDetails = await oThis._fetchWorkflowDetails(oThis.clientId);

            console.log('---------workflowDetails--', workflowDetails);
            // Workflow for the client has not been initiated yet.
            if (workflowDetails.length !== 1) {
              logger.error('Workflow for the client has not been initiated yet.');

              return responseHelper.error({
                internal_error_identifier: 's_t_d_2',
                api_error_identifier: 'token_not_setup',
                debug_options: {}
              });
            }

            workflowDetails = workflowDetails[0];

            return responseHelper.successWithData({ workflow_id: workflowDetails.id });

          case new TokenModel().invertedStatuses[tokenConstants.deploymentCompleted]:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_4',
              api_error_identifier: 'token_already_deployed',
              debug_options: { tokenStatus: tokenDetails.status }
            });

          case new TokenModel().invertedStatuses[tokenConstants.deploymentFailed]:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_5',
              api_error_identifier: 'token_deployment_failed',
              debug_options: { tokenStatus: tokenDetails.status }
            });

          default:
            return responseHelper.error({
              internal_error_identifier: 's_t_d_6',
              api_error_identifier: 'something_went_wrong',
              debug_options: { tokenStatus: tokenDetails.status }
            });
        }
      }
    }
  }
}

module.exports = Deployment;
