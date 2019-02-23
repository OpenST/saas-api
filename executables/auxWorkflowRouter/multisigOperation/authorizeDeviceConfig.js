'use strict';

const rootPrefix = '../../..',
  workflowStepConstants = require(rootPrefix + '/lib/globalConstant/workflowStep');

const steps = {
  [workflowStepConstants.initiateRecoveryInit]: {
    kind: workflowStepConstants.initiateRecoveryInit,
    onFailure: workflowStepConstants.rollbackAuthorizeDeviceTransaction,
    onSuccess: [workflowStepConstants.authorizeDevicePerformTransaction]
  },
  [workflowStepConstants.authorizeDevicePerformTransaction]: {
    kind: workflowStepConstants.authorizeDevicePerformTransaction,
    onFailure: workflowStepConstants.rollbackAuthorizeDeviceTransaction,
    onSuccess: [workflowStepConstants.authorizeDeviceVerifyTransaction]
  },
  [workflowStepConstants.authorizeDeviceVerifyTransaction]: {
    kind: workflowStepConstants.authorizeDeviceVerifyTransaction,
    readDataFrom: [workflowStepConstants.authorizeDevicePerformTransaction],
    onFailure: workflowStepConstants.rollbackAuthorizeDeviceTransaction,
    onSuccess: [workflowStepConstants.markSuccess]
  },
  [workflowStepConstants.rollbackAuthorizeDeviceTransaction]: {
    kind: workflowStepConstants.rollbackAuthorizeDeviceTransaction,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: [workflowStepConstants.markFailure] //NOTE: This is intentional. In order to mark the workflow failed.
  },
  [workflowStepConstants.markSuccess]: {
    kind: workflowStepConstants.markSuccess,
    onFailure: workflowStepConstants.markFailure,
    onSuccess: []
  },
  [workflowStepConstants.markFailure]: {
    kind: workflowStepConstants.markFailure,
    onSuccess: []
  }
};

module.exports = steps;
