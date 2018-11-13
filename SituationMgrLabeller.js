/************************************************************
 *              Copyright (c) Moogsoft Inc 2015             *
 *                                                          *
 *----------------------------------------------------------*
 *                                                          *
 * The contents of this configuration file may be copied,   *
 * amended and used to create derivative works.             *
 *                                                          *
 ************************************************************/

//
// load the required modules
//
var proc = MooBot.loadModule('Process');
var events = MooBot.loadModule('Events');
var logger = MooBot.loadModule('Logger');
var constants = MooBot.loadModule('Constants');
var moogdb = MooBot.loadModule('MoogDb.V2');

MooBot.loadModule("SituationUtility.js");
MooBot.loadModule("BotUtility.js");

var botUtil = new BotUtility();

// Modules to pass to other modules

var botModules = { 
	"moogdb" : moogdb, 
	"botUtil" : botUtil, 
	"constants" : constants 
};

// Instantiate the situation utility 

var MOOBOT_NAME = "SituationManagerLabeller::";
var sigUtil = new SituationUtility(botModules);

// Overwrite a situaiton description on updates to the situation. 
// Can be set to true using the 
// $UPDATE(false) verb in the description .
// Note: A manually added desription will be preserved regardless

// -------------------------------------------------------
// Register the event handlers and redirect to the same
// labelSituation function
// -------------------------------------------------------

events.onEvent("newSitn", constants.eventType("Sig")).listen();
events.onEvent("updateSitn", constants.eventType("SigUpdate")).listen();
events.onEvent("closeSitn", constants.eventType("SigClose")).listen();

// Define some commonDetails - all situations will have this appended to the template
// primary use case is for adding the same custom_info to all situsitons, but this can 
// also contain the usual $<TRANSFORTMER>(field) syntax.
sigUtil.setCommonDetails("$MAP[$UNIQ(source,hostList) $UNIQ(type,custom_info.alert.details.type) $$UNIQ(custom_info.services,affectedApplications) $UNIQ(source,affectedHosts) ] $$SERVICES(custom_info.enrichment.services)" );

// Call the labeller passing the situation and the type to allow for different
// behaviour on new and update.

function newSitn(situation)
{
	sigUtil.init();
	labelSituation(situation,"new");
	return true;
}

function updateSitn(situation)
{
	sigUtil.init();
	labelSituation(situation,"update");
	return true;
}

function closeSitn(situation)
{
	return true;
}

function labelSituation(situation,type) {

	var NAME = MOOBOT_NAME + "labelSituation: ";

	// Generate the label. 

	sigUtil.generateLabel(situation);

	// Update the situation, preserving a manual description. 

	moogdb.updateSituation(situation, "LEAVE_MANUAL_DESCRIPTION");
	
	// Re-acquire and forward

	situation = moogdb.getSituation(situation.value("sig_id"));
	situation.forward(this);
	
	return true;

}


// ------------------------------------------------------------------------------------------

// -------------------------------------------
// Add controls as needed. 
// -------------------------------------------
// Generally done before generateLabel() 
//
// custom_info.situationClass - will have been set by the
// $CLASS(<name>) macro.
//
//		var sigType = sigUtil.getSituationClass(situation);
//
//		if ( sigType === "ClassBasedCookBook" && type === "update" ) {
//			sigUtil.setOverwrite(false);
//		}
//
// Add logic here based on the situation using situation.evaluateFilter()
//
// 		var isHostSig = situation.evaluateFilter("description matches 'Host Based:');
//		if ( isHostSig ) {
//			sigUtil.setAertLimit(1);
//		}
//
// -------------------------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------------------------
// Add custom transformers
// -------------------------------------------------------------------------------------------------------------------
// 
// If an alert has a boolean in custom_info.flags.isCritical 
// 
// sigUtil.transformers.critical = function(a) {
//									var isCrit = a.some(function(e) { return e; });
//									return isCrit ? "CRITICAL" : "" ;
//								};
//
// Then use: $CRITIAL(custom_info.flags.isCritical) is the desciption (as the first token) and the sitution would
// have CRITICAL prefixed if any of the alerts had the isCriticsl flag set. 
//
// -------------------------------------------------------------------------------------------------------------------

// -------------------------------------------------------------------------------------------------------------------
// Additional Fields
// ------------------
// Add additional logic here to populate other fields. 
// sigUtil.situtionAlerts will exist if generateLabel has run.o
//
// 		var alertDetails = sigUtil.getAlertDetails(sig_id,[ "custom_info.enrichment.location.city" ],situationAlerts);
// 		if ( alertDetails && botUtil.isPopulatedList(alertDetails["custom_info.enrichment.location.city"])  ) {
//				custom_info.location = botUtils.uniqArray(alertDetails["custom_info.enrichment.location.city"]);
// 		}
//
//		situation.setCustomInfo(custom_info);
//
//
// -------------------------------------------------------------------------------------------------------------------
	
