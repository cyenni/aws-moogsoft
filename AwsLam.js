/************************************************************
 *              Copyright (c) Moogsoft Inc 2017             *
 *                                                          *
 *----------------------------------------------------------*
 *                                                          *
 * The contents of this configuration file may be copied,   *
 * amended and used to create derivative works.             *
 *                                                          *
 ************************************************************/

// Prevent JS Hint marking these functions as unused.
/*exported onLoad, presend, constants, logger */

//-----------------------------------------------------------------
// Modules:
//
// There are currently two modules
// Logger:
//
// Provide stdout logging functionality. Has 3 methods:
//
//  info("string",...)
//   Log an info message, takes vararg arguments, after first string
//  warning("string",...)
//   Log a warning message, takes vararg arguments, after first string
//  fatal("string",...)
//   Log an fatal message, takes vararg arguments, after first string
//   Execution will cease and core is dumped after this
//
// Constants:
//
// Provides a shared, synchronised scratch pad shared by all LamBots
//
// Supports:
//
//  put(key,val), where key and val can be any legal JS variable
//  returns null, or existing value stored at key
//  contains(key), returns true if there is a value stored at key
//  remove(key), removes any variable stored at key, returns
//  stored variable if not empty, or null if no value stored.
//  get(key), retrieve the value stored at key, null if none stored.
//-----------------------------------------------------------------
//
// Load necessary modules
//
var logger = LamBot.loadModule('Logger');
var constants = LamBot.loadModule("Constants");

var commonUtils=new CommonUtils();

//---------------------------------------------
// This function is called when the LamBot is
// first initailised in the LAM, allowing the
// construction/ of any structures necessary
// for the running of the filter function
//---------------------------------------------
function onLoad()
{}

// Severity mappings from AWS CloudWatch into Moogsoft AIOps severity values
var sevLookup =
{
    "ALARM": 4,
    "INSUFFICIENT_DATA": 2,
    "OK": 0
};

//
// Ok, should I send?
//
function presend(event)
{
    // Process the overflow data.
    var overflowData=commonUtils.getOverflow(event); 

    var payload = overflowData.payload;

    if (overflowData.eventType === "CloudWatch" && payload)
    {
        /**
         * Supported fields from AWS - MetricAlarm:
         * See: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricAlarm.html
         *
         * actionsEnabled : Boolean
         * alarmActions : List<String>
         * alarmArn : String
         * alarmConfigurationUpdatedTimestamp : Date
         * alarmDescription : String
         * alarmName : String
         * comparisonOperator : String
         * datapointsToAlarm : Integer
         * dimensions : List<Dimension> (Dimension is mapping of name -> value)
         * evaluateLowSampleCountPercentile : String
         * evaluationPeriods : Integer
         * extendedStatistic : String
         * insufficientDataActions : List<String>
         * metricName : String
         * namespace : String
         * oKActions : List<String>
         * period : Integer
         * stateReason : String
         * stateReasonData : String
         * stateUpdatedTimestamp : Date
         * stateValue : String
         * statistic : String
         * threshold : Double
         * treatMissingData : String
         * unit : String
         */

        /**
         * Supported fields from AWS - Instance:
         * https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_Instance.html
         *
         * This is optional if the Alarm's dimension is an InstanceId
         * Check overflowData.instanceDetails
         */

        var agentTime = Math.round(payload.stateUpdatedTimestamp / 1000);

        // Standard event fields are populated by values within the AWS CloudWatch event
        event.set("severity", sevLookup[payload.stateValue]);
        event.set("type", payload.namespace + '-' + payload.alarmName);
        event.set("signature", payload.alarmArn);
        event.set("external_id", payload.alarmArn);
        event.set("description", payload.alarmDescription + '-' + payload.stateReason);
        event.set("agent_time", agentTime);

        if (overflowData.instanceDetails && overflowData.instanceDetails !== null)
        {
            event.set("source_id", overflowData.instanceDetails.instanceId);

            var source = payload.alarmArn;
            if (overflowData.instanceDetails.publicDnsName)
            {
                source = overflowData.instanceDetails.publicDnsName;
            }
            else if (overflowData.instanceDetails.publicIpAddress)
            {
                source = overflowData.instanceDetails.publicIpAddress;
            }
            else if (overflowData.instanceDetails.privateDnsName)
            {
                source = overflowData.instanceDetails.privateDnsName;
            }
            else if (overflowData.instanceDetails.privateIpAddress)
            {
                source = overflowData.instanceDetails.privateIpAddress;
            }

            event.set("agent_location", overflowData.region + '-' + source);
            event.set("source", source);
  
//
// Format the tags into a useful format
//
            var tags = {};

            if ( overflowData.instanceDetails.tags &&
                 Array.isArray(overflowData.instanceDetails.tags) ) {

                   overflowData.instanceDetails.tags.forEach(function(t) {

                     if ( typeof t.key !== 'undefined' && typeof t.value !== 'undefined' ) {
                       if ( !tags[t.ley] ) {
                         tags[t.key] = [];
                       }
                       tags[t.key].push(t.value);
                     }
                   });
                 }
        }
        else
        {
            event.set("source", payload.alarmArn);
            event.set("agent_location", overflowData.region + '-' + payload.alarmArn);
        }

        overflowData.tags = tags;

        // Clean up whatever got used
        delete payload.stateUpdatedTimestamp;
        delete payload.namespace;
        delete payload.alarmName;
        delete payload.alarmArn;
        delete payload.alarmDescription;
        delete payload.stateReason;
        //overflowData.metricAlarm = payload;

        delete overflowData.payload;
        delete overflowData.instanceDetails;
    }
    else if (overflowData.eventType === "CloudWatchLog" && payload)
    {

        /**
         * Supported fields from AWS - FilteredLogEvent:
         * See: https://docs.aws.amazon.com/AmazonCloudWatchLogs/latest/APIReference/API_FilteredLogEvent.html
         *
         * eventId : String
         * ingestionTime : Long
         * logStreamName : String
         * message : String
         * timestamp : Long
         */

        var agentTime = Math.round(payload.timestamp / 1000);

        event.set("severity", 1);
        event.set("type", payload.logStreamName);
        event.set("signature", overflowData.logGroupName + '::' + payload.logStreamName);
        event.set("external_id", payload.eventId);
        event.set("description", payload.message);
        event.set("agent_time", agentTime);
        event.set("source_id", payload.logStreamName);
        event.set("source", payload.logStreamName);
        event.set("agent_location", overflowData.region + '-' + payload.logStreamName);


        // Clean up whatever got used
        delete payload.timestamp;
        delete payload.logStreamName;
        delete payload.eventId;
        delete payload.message;
        // we don't delete logGroupName because it can be used
        // for filtering.

        overflowData.logEvent = payload;
        delete overflowData.payload;
    }

    delete overflowData.eventType;
    
    event.setCustomInfoValue("eventDetails",overflowData);
    return true;

}
