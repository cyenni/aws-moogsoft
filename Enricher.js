/************************************************************
* Copyright (c) Moogsoft Inc 2015 *
* *
*----------------------------------------------------------*
* *
* The contents of this configuration file may be copied, *
* amended and used to create derivative works. *
* *
************************************************************/
 
//load the required modules
var proc =MooBot.loadModule('Process');
var events =MooBot.loadModule('Events');
var moogdb =MooBot.loadModule('MoogDb.V2');
var logger =MooBot.loadModule('Logger');
var constants =MooBot.loadModule('Constants');
var externalDb = MooBot.loadModule('ExternalDb');
 
 
//Register for new and updated alerts - to ensure we catch any alert forwarded to us
//that we might be interested in
//Event handlers for Alert and AlertUpdate are needed as the AlertBuilder may
//forward an Alert or modify it (e.g. change custom_info) and then forward.
events.onEvent("enrichAlert",constants.eventType("Alert")).listen();
events.onEvent("enrichAlert",constants.eventType("AlertUpdate")).listen();
logger.info("ENRICHER Starting");
var MOOBOT_NAME="Enricher";
var DEBUG = true;
 
//Register the function newEvent() as the callback for new events
function enrichAlert(alert) {
    var functionName = "Enricher.newEvent(event): ";
 
    var alertId = alert.value("alert_id");
    logger.warning(functionName + "STARTING ENRICHER Processing Alert Id: " + alertId);
    setCMDBData(alert);
    logger.info(functionName + "FINISHED ENRICHER Processing New Alert Id: " + alertId);
    alert.forward("MaintenanceWindowManager");
}
/**
*
* @param {object} alert - A CEvent object referencing the alert
* @borrows {function}
*/
function setCMDBData( alert) {
    var functionName = "setCMDBData ";
    var recordFound = false;
    var madeConnection = false;
    var cmdbDatasource = "mycmdb";
    var myClass = "";
 
    logger.info(functionName + "START of CMDB Lookup");
 
    var cmdbConnection = externalDb.connect(cmdbDatasource);
 
    if (!cmdbConnection) {
        logger.warning("Could Not Connect To Database cmdb");
        return false;
    } else {
        madeConnection = true;
        logger.info(functionName + "Connection made to cmdb");
        var customInfo = alert.getCustomInfo();
        customInfo.mooghandling.isEnriched = true;
        var computer = alert.value("source");
 
        if (computer){
            var cmdbQuery = "select * from cmdb where name = '" + computer + "'";
            logger.warning(functionName + "Query: " + cmdbQuery);
 
            var cmdbResults = {};
 
            cmdbResults = cmdbConnection.query(cmdbQuery);
            if (cmdbResults === null ) {
                logger.warning(functionName + "Results were null. No record found");
                return false;
            }
            var cmdbRow;
            if ( cmdbResults.hasNext() ) {
                cmdbRow = cmdbResults.first();
                recordFound = true;
                try {
                    customInfo.cmdb = {};
                    myClass = cmdbRow.value('class');
                    customInfo.cmdb.Class = cmdbRow.value('class');
                    customInfo.cmdb.Assigned = cmdbRow.value('assigned');
                    customInfo.cmdb.InstallDate = cmdbRow.value('install_date');
                    customInfo.cmdb.AssetTag = cmdbRow.value('asset_tag');
                    customInfo.cmdb.Category = cmdbRow.value('model_category');
                    customInfo.cmdb.SupportGroup = cmdbRow.value('support_group');
                    customInfo.cmdb.InstallStatus = cmdbRow.value('install_status');
                } catch (e) {}
                if (customInfo.cmdb){
                    logger.warning(functionName + "AssetTag for " + computer + " Is: " + customInfo.cmdb.AssetTag);
                    if(myClass !== "")
                    {
                    alert.set("class", myClass);
                    logger.warning(functionName + "YENNI DEBUG myClass = " + myClass);
                    logger.warning(functionName + "YENNI DEBUG alert class = " + alert.value("class"));
                    }
                    alert.setCustomInfo(customInfo);
                    moogdb.updateAlert(alert);
                    logger.warning(functionName + "YENNI DEBUG  UPDATED ALERT");
                }
                return true;
            }
        }
    }
}
function uniqArray(a) {
    if ( !isArray(a) ) { return a ; }
    var uArray=[];
    for (var aIdx=0; aIdx< a.length ; aIdx++ ) {
        if ( uArray.indexOf(a[aIdx]) === -1 ) {
            uArray.push(a[aIdx]);
        }
    }
    return uArray;
}
 
function isEmpty(obj) {
    var functionName = "isEmpty";
    // Check for an empty object - true if empty, false if not.
    for(var key in obj) {
        if (obj.hasOwnProperty(key)) {
            return false;
        }
    }
    return true;
}
