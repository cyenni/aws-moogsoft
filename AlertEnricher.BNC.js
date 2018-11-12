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
// Ok - we need the event responder
//
var events      =MooBot.loadModule('Events');
var moogdb      =MooBot.loadModule('MoogDb.V2');
var logger      =MooBot.loadModule('Logger');
var constants   =MooBot.loadModule('Constants');
var rest		=MooBot.loadModule('REST.V2');
var externalDb  =MooBot.loadModule("ExternalDb");
var proc		=MooBot.loadModule("Process");
var config		=MooBot.loadModule("Config");

// ---------------------------------------------------------------
// Load and initialise the BotUtility, config and enricher modules. 
// ---------------------------------------------------------------

MooBot.loadModule("BotUtility.js");
MooBot.loadModule("Utility.BNC.js");
MooBot.loadModule("RemedyEnricher.js");
MooBot.loadModule("BranchEnricher.BNC.js");

var botUtil = new BotUtility();

var custConfig = config.getConfig("Config.BNC.conf");
try {
    custConfig = JSON.parse(JSON.stringify(custConfig));
}
catch(e) {
    logger.fatal("Unable to parse config file");
}

// Modules to pass to other modules

var botModules = {
	"moogdb" : moogdb,
	"botUtil" : botUtil,
	"constants" : constants,
	"config" : config,
	"custConfig" : custConfig,
	"rest" : rest,
	"externalDb" : externalDb
};

var custUtil = new Utility(botModules);
var remedy = new RemedyEnricher(botModules);
var branch = new BranchEnricher(botModules);

// ---------------------------------------------------------------
// Event handlers for Alert and AlertUpdate are needed 
// ---------------------------------------------------------------

events.onEvent("enrichAlert",constants.eventType("Alert")).listen();
events.onEvent("enrichAlert",constants.eventType("AlertUpdate")).listen();

// ---------------------------------------------------------------
// Global variables. 
// ---------------------------------------------------------------

var MOOBOT_NAME="Enricher";
var enrichers = [ remedy , branch ];

// Enricher functions. 

function onLoad() {

	var NAME = MOOBOT_NAME + "onLoad: ";

	// ---------------------------------------------------------------
	// Check we have enough configuration to continue.
	// ---------------------------------------------------------------

	if ( !custConfig ) {
		logger.fatal(NAME + "Confiugration checks failed, insifficent config, cannot continue");
		return false;
	}
	
	// Iterate through our enrichers and check required config. 

    var expectedFunctions = [ "getRetries","enrichAlert" ,"getName" , "checkConfig" ];

	for ( eIdx = 0; eIdx < enrichers.length; eIdx++ ) {

		var enricher = enrichers[eIdx];

		for ( fIdx = 0; fIdx < expectedFunctions.length; fIdx++ ) {

        	if ( !enricher[expectedFunctions[fIdx]] || typeof enricher[expectedFunctions[fIdx]] !== 'function' ) {
            	logger.fatal(NAME + "Enrichment module does not contain the expected function: " + f);
            	return false;
        	}
        	return true;

    	}

		var configOk = enricher.checkConfig();

		if ( !configOk ) {
			logger.fatal(NAME + enricher.getName() + " confiugration checks failed, cannot continue");
			return false;
		}
	}
	return true;
}

function enrichAlert(alert) {

	var NAME = MOOBOT_NAME + "::enrichAlert: ";

	logger.debug(NAME + "Enrichment starting for alert " + alert.value("alert_id"));

	// If we don't have any custom_info, or we are missing mooghandling - recreate. 

	var custom_info = alert.getCustomInfo();
	if ( !custom_info || !custom_info.mooghandling ) {
		custom_info = botUtil.createBaseCustomInfo();
		custom_info.mooghandling.isEnriched = false;
		alert.setCustomInfo(custom_info);
	}

	// ----------------------------------------------------------------
	// Enrichment processes.
	// Each enrichAlert() function will be called.
	// filter as needed in the module itself.
	// 
	// enrichAlert should return an object is enrichment was succesful.
	// enrichAlert should return null or false if unsuccessful
	// enrichAlert should reurn "rety" if a retry is required. 
	// ----------------------------------------------------------------

	enrichers.forEach(function(enricher) {

		var numRetries = enricher.getRetries() || 1;
		var enricherName = enricher.getName();
		var retryCount = 0;

		while ( retryCount < numRetries ) {
			
			retryCount++;

			var enricherData = enricher.enrichAlert(alert);

			if ( !enricherData ) {
				logger.warning(NAME + enricherName + " enrichment failed");
				retryCount = numRetries;
			}
			else if ( botUtil.getObjectType(enricherData) === "object"  ) {
				alert.setCustomInfoValue("enrichment." + enricherName,enricherData);
				retryCount = numRetries;
			}
			else {
				logger.warning(NAME + enricherName + " enrichment failed on attempt " + retryCount + "/" + numRetries);
			}
		}

	});

	// --------------------------------------------------
	// Set the enrichment flag and update the alert.
	// Forward the alert to the next moolet
	// The flag should be set and the alert forwarded
	// regardless of the success of the enrichment process 
	// --------------------------------------------------
	
	alert.setCustomInfoValue("mooghandling.isEnriched",true);
	moogdb.updateAlert(alert); 
	alert.forward(this);

	logger.debug(NAME + "Enrichment ending for alert " + alert.value("alert_id"));

	return true;
}
