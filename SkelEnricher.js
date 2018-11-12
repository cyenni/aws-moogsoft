/************************************************************
 *                                                          *
 *  Contents of file Copyright (c) Moogsoft Inc 2018        *
 *                                                          *
 *    Unapproved changes to the code are unsupported.       *
 *    Submit any changes to Moogsoft for review.            *
 *                                                          *
 ************************************************************/

function xxxxEnricher(botModules) {

    var xxLogger= (typeof LamBot !== 'undefined') ? LamBot.loadModule("Logger") : MooBot.loadModule("Logger");
    var MOOBOT_NAME = "xxxEnricher::";

    // Initialise the module, check for passed modules.

    var requiredModules = [ "botUtil" , "moogdb" , "rest" , "custConfig" ,"constants" ];

    requiredModules.forEach(function(moduleName) {
        if ( !botModules[moduleName] || typeof botModules[moduleName] !== "object" ) {
            xxLogger.fatal(MOOBOT_NAME + " requires " + moduleName + " module to be passed to it in an object ");
        }
    });
	
	// -------------------------------------------------------------------------------------------------------------------
	// Check the cust config for required items. 
	// -------------------------------------------------------------------------------------------------------------------

	var requiredConfigItems = []; 
    var self={

		// -------------------------------------------------------------------------------------------------------------------
		// Standard enricher functions
		// -------------------------------------------------------------------------------------------------------------------

		getName : function() {
			return "zzzz";
		},

		getRetries : function() {
			// Return a number of retries for a failed enrichment
			return 1;
		},

		useCache : function()  {
			//	Determine if caching is used or not
			// return true for caching, false for not.
			return true;
		},

		enrichAlert : function(alert) {
	
			var NAME = MOOBOT_NAME + "enrichAlert: ";
		
			// ---------------------------------------
			// Core enrichment function 
			// ---------------------------------------

			var alert_id = alert.value("alert_id");
	
			NAME = NAME + " Alert #" + alert_id + " : ";

			var cmdbKeyValue = "";
			var useCache = this.useCache();
			

			// Use cached data if it exists. 

			if ( useCache ) {
				var cachedData = botModules.botUtil.getCacheValue(botModules.constants,cmdbKeyValue);
				if ( cachedData ) {
					xxLogger.debug(NAME + "Using existing cached data for " + cmdbKeyValue);
					return cachedData;
				}
			}

			var enrichmentData = {};
			
			// Cache the data for future use if required. 

			if ( useCache ) {
				botModules.botUtil.setCacheValue(botModules.constants,cmdbKeyValue,enrichmentData,lifespan);
			}
			return enrichmentData;
		},

		checkConfig : function() {

			var NAME = MOOBOT_NAME + "sendSituation: ";

			if ( !requiredConfigItems ) {
				xxLogger.fatal(NAME + "Cannot find a requiredConfigItems list in this module");
			}
			return botModules.botUtil.checkConfig(botModules.custConfig,requiredConfigItems);
		}
 	};

	// -------------------------------------------------------------------------------------------------------------------

   	var F=function() {};
   	F.prototype=self;
   	return( new F() );
}

