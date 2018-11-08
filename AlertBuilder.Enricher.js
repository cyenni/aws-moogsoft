/************************************************************
* Copyright (c) Moogsoft Inc 2015 *
* *
*----------------------------------------------------------*
* *
* The contents of this configuration file may be copied, *
* amended and used to create derivative works. *
* *
************************************************************/
//
// Ok - we need the event responder
//
var events = MooBot.loadModule('Events');
var moogdb = MooBot.loadModule('MoogDb.V2');
var logger = MooBot.loadModule('Logger');
var constants = MooBot.loadModule('Constants');
 
 
//---------------------------------------------
//This function is called by the registered
//callback for eventType "Event"
//---------------------------------------------
 
function newEvent(event) {
var functionName = "AlertBuilderEnricher::newEvent ";
// Add the Event to the Alert
var alert = moogdb.createAlert(event,false);
if (alert)
{
// detirmine if this is a new alert or an update to an existing one
var alertAction = alert.payload().getAction() === "Alert Created" ? "create" : "update";
if (alertAction === "create") {
// This is an Alert Create
logger.info( functionName + "New alert created");
// Forward the alert directly to the Enricher Moolet
alert.forward("Enricher");
 
 
} else if (alertAction === "update") {
// This is an update to an existing alert - make sure it has been enriched
logger.info( functionName + "Alert Update");
 
 
// If for some reason it has not been enriched, send it to Enricher
if ( alert.evaluateFilter("custom_info.mooghandling.isEnriched == false") ) {
logger.debug("Alert id " + alert.value("alert_id") + " is an un-enriched update, passing to the Enricher");
alert.forward("Enricher");
}
// If it has been enriched, send it on for further processing
else {
alert.forward(this);
}
} else {
logger.warning( functionName + "Somehow this is niether a new or updated alert");
}
} else {
logger.warning(functionName + "Alert not created successfully");
}
}
/*
* End of function newEvent
*/
 
 
 
// Register the newEvent function to listen for new events.
events.onEvent("newEvent", constants.eventType("Event")).listen();
