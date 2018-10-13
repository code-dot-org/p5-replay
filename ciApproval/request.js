const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const STACK_NAME = process.env.STACK_NAME;

const https = require('https');
const url = require('url');
const requestOptions = url.parse(SLACK_WEBHOOK_URL);
requestOptions.method = 'POST';
requestOptions.headers = {
  'Content-Type': 'application/json'
};

const AWS = require('aws-sdk');
const codePipeline = new AWS.CodePipeline();
const cloudFormation = new AWS.CloudFormation();

/**
 * Lambda function for creating a CI-approval Slack Message Button in response to
 * a CodePipeline Manual Approval Notification SNS message.
 *
 * AWS APIs invoked:
 * - codepipeline:GetPipelineState
 * - codepipeline:GetPipelineExecution
 * - cloudformation:DescribeStacks
 *
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CodePipeline.html#getPipelineState-property
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CodePipeline.html#getPipelineExecution-property
 * @see https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFormation.html#describeStacks-property
 * @see https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-json-format.html
 */
module.exports.requestApproval = async function (event, context, callback) {
  console.log(`Request received: ${JSON.stringify(event)}`);
  let req = https.request(requestOptions, function (res) {
    if (res.statusCode === 200) {
      callback(null, 'posted to slack');
    } else {
      callback('status code: ' + res.statusCode);
    }
  });

  req.on('error', function (e) {
    console.log('problem with request: ' + e.message);
    callback(e.message);
  });

  const data = JSON.parse(event.Records[0].Sns.Message);
  const token = data.approval.token;
  const pipelineName = data.approval.pipelineName;
  const stage = data.approval.stageName;
  const action = data.approval.actionName;

  // Lookup the commit URL and ID from the pipeline execution state.
  const state = await codePipeline.getPipelineState({name: pipelineName}).promise();
  const stageState = state.stageStates.find((state) => state.stageName === stage);
  const executionId = stageState.latestExecution.pipelineExecutionId;
  const execution = await codePipeline.getPipelineExecution({
    pipelineName: pipelineName,
    pipelineExecutionId: executionId
  }).promise();
  const artifact = execution.pipelineExecution.artifactRevisions[0];

  const revisionUrl = artifact.revisionUrl;
  const revisionId = artifact.revisionId.substring(0, 7);

  // Lookup the previous and current stage URLs from the CloudFormation stack outputs.
  const stack = await cloudFormation.describeStacks({StackName: STACK_NAME}).promise();
  const currentUrl = stack.Stacks[0].Outputs.find((o) => o.OutputKey === 'ApiUrl').OutputValue;

  const emoji = {
    true: ':rocket:',
    false: ':exclamation:'
  };

  const slackMessage = {
    text: `Build <${revisionUrl}|${STACK_NAME}@${revisionId}> awaiting approval to <${currentUrl}|${stage}>.`,
    attachments: [
      {
        fallback: "Unable to approve from fallback",
        callback_id: "ci_approval",
        color: "#3AA3E3",
        attachment_type: "default",
        actions: [
          {
            name: action,
            text: `${emoji[true]} Approve`,
            style: "primary",
            type: "button",
            value: JSON.stringify({
              approve: true,
              approvalText: emoji[true],
              codePipelineToken: token,
              codePipelineName: pipelineName,
              stage: stage,
              action: action
            }),
            confirm: {
              title: "Are you sure?",
              text: `Approve to ${stage} ${emoji[true]}`,
              ok_text: `Yes`,
              dismiss_text: "No"
            }
          },
          {
            name: action,
            text: `${emoji[false]} Reject`,
            type: "button",
            value: JSON.stringify({
              approve: false,
              approvalText: emoji[false],
              codePipelineToken: token,
              codePipelineName: pipelineName,
              stage: stage,
              action: action
            })
          }
        ]
      }
    ]
  };
  req.write(JSON.stringify(slackMessage));
  req.end();
};
