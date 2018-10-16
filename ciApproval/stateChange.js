// Send Auto Scaling notifications to production channel.
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

const https = require('https');
const url = require('url');
const slack_req_opts = url.parse(SLACK_WEBHOOK_URL);
slack_req_opts.method = 'POST';
slack_req_opts.headers = {
  'Content-Type': 'application/json'
};

/**
 * Lambda function for forwarding a CloudWatch Event SNS message to Slack.
 */
exports.handler = function (event, context, callback) {
  var req = https.request(slack_req_opts, function (res) {
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

  var message;
  var detail = event.detail;
  var type = event['detail-type'];
  switch (event.source) {
    case "aws.codepipeline":
      message = codePipeline(detail, type);
      break;
    default:
      message = {};
      break;
  }
  req.write(JSON.stringify(message));
  req.end();
};

/**
 * Formats a Slack-message JSON object from a CodePipeline SNS-detail object.
 * @see https://docs.aws.amazon.com/codepipeline/latest/userguide/detect-state-changes-cloudwatch-events.html#create-cloudwatch-notifications
 * @param detail JSON object with event details. Example:
   {
      "pipeline": "myPipeline",
      "version": "1",
      "execution-id": 'execution_Id',
      "stage": "Prod",
      "state": "STARTED",
      "type": {
        "owner": "AWS",
        "category": "Deploy",
        "provider": "CodeDeploy",
        "version": 1
      }
    }
 * @param type detail-type string.
 */
function codePipeline(detail, type) {
  const stateColors = {
    STARTED: 'warning',
    SUCCEEDED: 'good',
    FAILED: 'danger',
    CANCELED: 'danger'
  };

  return {
    attachments: [{
      title: `[${detail.pipeline}] ${detail.stage} ${detail.state.toLowerCase()}`,
      color: stateColors[detail.state],
    }]
  };
}
