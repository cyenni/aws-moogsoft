
// Utiity functions for retrieving data from alerts in situations. 

function SituationUtility(botModules) {

    var sigLogger= (typeof LamBot !== 'undefined') ? LamBot.loadModule("Logger") : MooBot.loadModule("Logger");
	var MOOBOT_NAME = "SituationUtility::";

    // Initialise the module, check for passed modules.

    var requiredModules = [ "botUtil" , "moogdb" ];

    requiredModules.forEach(function(moduleName) {
        if ( !botModules[moduleName] || typeof botModules[moduleName] !== "object" ) {
            sigLogger.fatal(MOOBOT_NAME + " requires " + moduleName + " module to be passed to it in an object ");
        }
    });

	// Defaults 
	// commonDetails is et in the moobot and allows the same set of data to be app;ied
	// across all situations. e.g. the same custom_info $MAP[] or other standard. 
	// this will be appended to the description passed to the generateLabel and 
	

	var default_alertLimit = 200;
	var default_separator = " , ";
	var no_data_value = null;
	var commonDetails = null;

	var self={

	overwriteOnUpdate : true,
	situationAlerts : {},
	alertLimit : default_alertLimit,
	listSeparator : default_separator,
	no_data_value : no_data_value,
	commonDetails : commonDetails,

	init : function() {

		// Reset globals for this run.
		// commonDetails will not be set per run - this is global across all runs. 

		this.overwriteOnUpdate = true;
		this.situationAlerts = {};
		this.alertLimit = default_alertLimit;
		this.listSeparator = default_separator;
		this.no_data_value = no_data_value;
	},

	setAlertLimit : function(limit) {
		var NAME = MOOBOT_NAME + "setAlertLimit: ";

		limit = parseInt(limit,10);
		if ( typeof limit === 'number' && limit >= 0 ) {
			this.alertLimit = limit;
			sigLogger.debug(NAME + "Alert fetch limit set to " + limit);
		}
		else {
			sigLogger.warning(NAME + "Invalid limit supplied: " + limit);
		}
	},

	setCommonDetails : function(details) {
		var NAME = MOOBOT_NAME + "setCommonDetails: ";
		if ( details ) {
			sigLogger.debug(NAME + "Adding '" + details + "' to each template during processing");
			this.commonDetails = details;
		}
	},

	setOverwrite : function(o) {
		this.overwriteOnUpdate = o ? true : false;
	},

	setListSeparator : function(sep) {
		this.listSeparator = sep;
	},

	setSituationClass : function(name,sig) {

		// Add a sigType to custom_info.
		var sigCI = sig.getCustomInfo();
		if ( !sigCI ) {
			sigCI = this.createBlankSigCustomInfo();
			sig.setCustomInfo(sigCI);
		}
		sig.setCustomInfoValue("situationClass",name);
	},

	createBlankSigCustomInfo : function() {
		var custom_info = {
			situationClass : null,
			mooghandling : {
				situationTemplate : null
			},
			ticketing : {
				ticketNumber : null,
				ticketStatus : null
			}
		};
		return custom_info;
	},

	getSituationTemplate : function(sig) {
		var sigCI = sig.getCustomInfo();
		return sigCI && sigCI.mooghandling && sigCI.mooghandling.situationTemplate ? sigCI.mooghandling.situationTemplate : null;
	},

	setSituationTemplate : function(template,sig) {
		var sigCI = sig.getCustomInfo();
		if ( !sigCI ) {
			sigCI = this.createBlankSigCustomInfo();
			sig.setCustomInfo(sigCI);
		}
		sig.setCustomInfoValue("mooghandling.situationTemplate",template);
	},

	getSituationClass : function(sig) {
		var sigCI = sig.getCustomInfo();
		return sigCI && sigCI.situationClass ? sigCI.situationClass : null;
	},

	getCustomInfoValue : function(sourceObj,targetObj) {
		if (!sourceObj || !targetObj ) {
			return false;
        }
		var targetObjKeys=targetObj.split(".");
		var objToCheck=sourceObj;
	
		// Iterate, check existence
	
		for ( var kIdx = 0; kIdx < targetObjKeys.length; kIdx++ ) {
	
			// Keep adding keys on, until we reach
			// the end or find an undefined.
			objToCheck=objToCheck[targetObjKeys[kIdx]];
	
			if ( typeof objToCheck === 'undefined' ) {
				return null;
			}
		}
		// If we got here return the end result. 
		return objToCheck;
	},

	getAlertDetails : function(sig_id,columns,alerts) {

		// This will iterate through the alerts in the sig, 
		// and get the column names, returning an indistinct list.
		// use botUtil.uniqArray on the results if needed.
		// key names will be the columns names, custom_info keys
		// will be returned as dotted notation keys
		// e.g. trying to get custom_info.cmdb.location
		// will return an object  with a key "custom_info.cmdb.location"
		
		var NAME = MOOBOT_NAME + "::getAlertDetails: ";
		var returnData={};
		var getUniqueOnly=false; 

		if ( !Array.isArray(columns) ) {
			sigLogger.warning(NAME + "expected an array of column names");
			return returnData; 
		}

		// If no alerts were passed, or it's empty, see if the global 
		// object is populated, if not getAlerts()

		if ( !alerts || botModules.botUtil.isEmpty(alerts) ) { 
			if ( botModules.botUtil.isEmpty(this.situationAlerts) ) {
				// No alerts passed, get them globally. 
				this.situationAlerts = this.getAlerts(sig_id,this.alertLimit);
			}
			alerts = this.situationAlerts;
		}

		var alertIds={ alert_ids : [] };
		for ( var al in alerts ) {
			if ( typeof al !== 'function' ) {
				alertIds.alert_ids.push(alerts[al].value("alert_id"));
			}
		}

		if ( alertIds && alertIds.alert_ids.length > 0 ) {

			// We want to iterate through the alerts getting each one
			// and pulling out the values. 

			for (var alIdx = 0  ; alIdx < alertIds.alert_ids.length ; alIdx++ ) {

				var alert = alerts[alertIds.alert_ids[alIdx]] ? alerts[alertIds.alert_ids[alIdx]] : null;
				if ( alert ) {

					// Now iterate through the columns for this alert, adding the values 
					// to the returnData for this columns 
	
					for ( var colIdx = 0 ; colIdx < columns.length ; colIdx++ ) {

						var customInfoObj;
						var customInfo=false;
	
						var colName=columns[colIdx];
	
						// If this is a customInfo field treat it differently. 
	
						var customRe=/^custom_info\.(.*)$/i.exec(colName);
						if ( customRe && customRe.length > 1 ) {
							customInfoObj=customRe[1];
							customInfo=true;
						}

						// Create a key for this column if it doesn't exist. 
						if ( !returnData[colName] ) {
							returnData[colName] = [];
						}
				
						if ( !customInfo ) {
							// Get the value we are looking for. 
							// as long as it's not null we will use it. 
	
							var alertValue=alert.value(colName);
							if ( alertValue !== null ) {
								returnData[colName].push(alertValue);
							}
						}
						else {
							// Get the custom info and extract the value we want. 
							var alertCustomInfo=alert.getCustomInfo();
							if ( alertCustomInfo ) {
								var alertCustomInfoValue=this.getCustomInfoValue(alertCustomInfo,customInfoObj);
								if ( alertCustomInfoValue !== null ) {
									returnData[colName].push(alertCustomInfoValue);
								}
							}
						}
					}
				}
			}
			return returnData;
		}
		else {
			sigLogger.info("No alerts found for this sitaution (" + sig_id + ")");
			return returnData;
		}
	},

	getAlerts : function(sig_id,limit) {

		var NAME = MOOBOT_NAME + "getAlerts: ";

		// Get the alerts for this sig, 
		// Apply a limiter if needed.

		var alerts={};
		var alertIds=botModules.moogdb.getSituationAlertIds(sig_id,false);	
		var numAlerts=alertIds && Array.isArray(alertIds.alert_ids) ? alertIds.alert_ids.length : 0;

		limit = typeof limit !== 'undefined' && /\d+/.test(limit) && limit < numAlerts ? limit : numAlerts;
		sigLogger.debug(NAME + "Sig: " + sig_id + " fetching alerts, fetch limit " + limit + "/" + numAlerts);

		for (var alIdx = 0 ; alIdx < limit ; alIdx++ ) {
			var alert=botModules.moogdb.getAlert(alertIds.alert_ids[alIdx]);
			var alert_id = parseInt(alert.value("alert_id"));
			alerts[alert_id] = alert;
		}
		return alerts;
	},
	
	getArrayData : function(situation,situationAlerts,fieldName) {

		// Get a unique list of all arrays for a field containing an array
		// Get the top member by citations, and the members with a citation count. 
		// getAlertDetails will return an array of arrays - concst them all, and then make them uniq. 
		// Also count the citations for each appcode, and return the uniq applist and the citation object. 
	
		var sig_id = situation.value("sig_id");
		var tmpArray=[];
		var arrayDetails = this.getAlertDetails(sig_id,[fieldName],situationAlerts);

		if ( arrayDetails[fieldName] && Array.isArray(arrayDetails[fieldName]) ) {
			for ( var acIdx = 0 ; acIdx < arrayDetails[fieldName].length ; acIdx++ ) {
				if ( Array.isArray(arrayDetails[fieldName][acIdx]) ) {
					tmpArray=tmpArray.concat(arrayDetails[fieldName][acIdx]);
				}
			}
		}

		var arrayData = this.getArrayCitations(tmpArray);
	
		return arrayData;
	},
	
	getRawArrayData : function(situation,situationAlerts,fieldName) {

		// Get a list for all arrays, do not pass through citations 
	
		var sig_id = situation.value("sig_id");
		var tmpArray=[];
		var arrayDetails = this.getAlertDetails(sig_id,[fieldName],situationAlerts);

		if ( arrayDetails[fieldName] && Array.isArray(arrayDetails[fieldName]) ) {
			for ( var acIdx = 0 ; acIdx < arrayDetails[fieldName].length ; acIdx++ ) {
				if ( Array.isArray(arrayDetails[fieldName][acIdx]) ) {
					tmpArray=tmpArray.concat(arrayDetails[fieldName][acIdx]);
				}
			}
		}
		return tmpArray;
	},

	getArrayCitations : function(tmpArray) {

        // Get the members, citations, topMembmer etc. for an array
   
        var arrayData= { members : [] , citations: [] , topMember : null, membersByCitation: [] };

        if( !Array.isArray(tmpArray) || tmpArray.length <= 0 ) {
            return arrayData;
        }

		// Filter any blank entries to catch empty strings

		tmpArray = tmpArray.filter(function(element) {
						return element;
					});

        if( tmpArray.length === 0 ) {
            return arrayData;
        }

        // Case insensitive sort.
   
        tmpArray.sort(function(a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
   
        // Reduce over the array - comparing prev to curr - add to citations if equal
        // start with a null string and ignore case.
		tmpArray.reduce(function(prev,curr,index,array) {
			if ( prev.toLowerCase() !== curr.toLowerCase() ) {
				arrayData.members.push(curr);
				arrayData.citations.push(1);
			}
			else {
				arrayData.citations[arrayData.citations.length -1]++;
			}
		return curr; },"");
   
		// Build an array of objects (source:citations) to allow an easier reverse bubble sort. 
		
		var memberByCitationMap=arrayData.members.map(function(element,index) {
				return( { "name" : element, "citations" : arrayData.citations[index] } );
		});

        // Get a reverse "bubble" sorted lists, most common to least
        // Set the topMember to be the most common

        memberByCitationMap = memberByCitationMap.sort(function(a,b) { return ( b.citations - a.citations ); });
        arrayData.topMember = memberByCitationMap[0].name;

        // We've got a sorted list, turn this into an array of elements "name (citation)" 
        
        arrayData.membersByCitation  = memberByCitationMap.map(function(element) {
                return element.name + " (" + element.citations + ")";
        });
        return arrayData;
	},
	
	updateSigServices : function(situation,serviceList) {

		var NAME = MOOBOT_NAME + "::updateSigServices: ";

		// Add the services in the serviceList array to the situation.
		// Items in Services in serviceList can be either a list of strings, 
		// or a list of objects (or mixed).
		// If the item is a string them the description will bet set to the default description. 
		// If the item is an object, then it should contain:
		// { name: <string>, description: <description> }

		if ( !situation || !Array.isArray(serviceList) ) {
			sigLogger(NAME + "Expected a situation and an array of service data");
			return [];
		}

		var sig_id = situation.value("sig_id");
		var situationServices=botModules.moogdb.getSituationServices(sig_id);
		var currentServices=situationServices.services;
	
		for ( var svIdx = 0; svIdx < serviceList.length ; svIdx++ ) {
			var service = serviceList[svIdx];
		
			var serviceName = service;
			var serviceDescr = "Automatically added service";

			if ( typeof service === "object" ) {
				if ( service.name ) {
					serviceName = service.name;
					if ( service.description ) {
						serviceDescr = service.description;
					}
				}
				else {
					sigLogger.info(NAME + "A service element was an object, but did not have a 'name' attribute, skipping");
					continue;
				}
			}

			// Add the service to the db

			botModules.moogdb.addService(serviceName,serviceDescr);
			currentServices.push(serviceName);
		}
	
		// Set the situation services. 
	
		currentServices = botModules.botUtil.uniqArray(currentServices);
		if ( currentServices.length > 0 ) {
			botModules.moogdb.setSituationServices(sig_id,currentServices);
		}

		// Return the list 

		return currentServices;
	},

	updateSigProcesses : function(situation,processList) {

		var NAME = MOOBOT_NAME + "::updateSigProcesses: ";

		// Add the processes in the processList array to the situation.
		// Items in processList can be either a list of strings, 
		// or a list of objects (or mixed).
		// If the item is a string them the description will bet set to the default description. 
		// If the item is an object, then it should contain:
		// { name: <string>, description: <description> }

		if ( !situation || !Array.isArray(processList) ) {
			sigLogger(NAME + "Expected a situation and an array of service data");
			return [];
		}

		if ( !situation || !Array.isArray(processList) ) {
			sigLogger(NAME + "Expected a situation and an array of process data");
			return [];
		}

		var sig_id = situation.value("sig_id");
		var situationProcesses=botModules.moogdb.getSituationProcesses(sig_id);
		var currentProcesses=situationProcesses.processes;
	
		for ( var prIdx = 0; prIdx < processList.length ; prIdx++ ) {
			var process = processList[prIdx];
		
			var processName = process;
			var processDescr = "Automatically added process";

			if ( typeof process === "object" ) {
				if ( process.name ) {
					processName = process.name;
					if ( process.description ) {
						processDescr = process.description;
					}
				}
				else {
					sigLogger.info(NAME + "A process element was an object, but did not have a 'name' attribute, skipping");
					continue;
				}
			}

			// Add the service to the db
			botModules.moogdb.addProcess(processName,processDescr);
			currentProcesses.push(processName);

		}
	
		// Set the situation services. 
	
		currentProcesses = botModules.botUtil.uniqArray(currentProcesses);
		if ( currentProcesses.length > 0 ) {
			botModules.moogdb.setSituationProcesses(sig_id,currentProcesses);
		}

		// Return the list 

		return currentProcesses;
	},

	getSigMaintStatus : function(sig_id,situationAlerts,maintFieldName) {

		// Use getAlertDetails to get the maint status for all the alerts. 
		// By default this field is custom_info.maintenance_status
		// but can be configured as any name.

	
		var maintField = maintFieldName !== 'undefined' ? "custom_info." + maintFieldName : "custom_info.maintenance_status" ;
		var filteredMaintStatus = [];
		
		var alertMaintDetails = this.getAlertDetails(sig_id,[ maintField ],situationAlerts);
		if ( Array.isArray(alertMaintDetails[maintField] ) && alertMaintDetails[maintField].length > 0 ) {
			var maintStatusList = botModules.botUtil.uniqArray(alertMaintDetails[maintField]);
				
			// If the maint mode has been modified with logic to set default values 
			// then remove these.

			var filteredValues = [ "false" ];
			filteredMaintStatus = botModules.botUtil.arrayDifference(maintStatusList,filteredValues);

		}
		return (filteredMaintStatus.length > 0);
	},

	transformers : {

			//
			// These are expecting arrays of values (for the defaults).
			//
			
			// The total number of elements. 

			"count" : function(a,s) { 
							if ( !Array.isArray(a) ) { return a; }
							return a.length;
					  },
			"ucount" : function(a) {
							if ( !Array.isArray(a) ) { return a; }
							return botModules.botUtil.uniqArray(a).length;
						},
			"min" : function(a) {
						return botModules.botUtil.arrayMin(a);
					},
			"max" : function(a) {
						return botModules.botUtil.arrayMax(a);
					},
			"unique" : function(a) {
						return botModules.botUtil.uniqArray(a);
					},
			"uniq" : function(a) {
						return botModules.botUtil.uniqArray(a);
					},
			"ave" : function(a) {
						return botModules.botUtil.arrayAve(a);
					},
			"sum" : function(a) {
						return botModules.botUtil.arraySum(a);
					},
			"alpha" : function(a) {
						return botModules.botUtil.arraySortAlpha(a);
					},
			"ualpha" : function(a) {
						a = botModules.botUtil.uniqArray(a);
						return botModules.botUtil.arraySortAlpha(a);
					},
			"num" : function(a) {
						return botModules.botUtil.arraySortNum(a);
					},
			"unum" : function(a) {
						a = botModules.botUtil.uniqArray(a);
						return botModules.botUtil.arraySortNum(a);
					},
            "critical" : function(a) {
                            var hasCritical = a.some(function(e) {
                                return (e === 5);
                            });
                            return hasCritical ? "CRITICAL: " : "";
                    },
			"top" : function(a,s,sigUtil) {
						var ad = sigUtil.getArrayCitations(a);
						return (ad && ad.topMember) ? ad.topMember : "";
					},
			"cited" : function(a,s,sigUtil) {
							var ad = sigUtil.getArrayCitations(a);
							if ( ad && ad.membersByCitation ) {
								return ad.membersByCitation;
							}
					},
			"intersect" : function(a,s,sigUtil) {
							var intersect = [];
							var ad = sigUtil.getArrayCitations(a);
							if ( ad && ad.members.length > 0 ) {
								ad.citations.forEach(function(e,i) {
										if ( e > 1 ) {
											intersect.push(ad.members[i]);
										}
								});
							}
							return intersect;
					},
			"iservices" : function(a,s,sigUtil) {
							var intersect = [];
							var ad = sigUtil.getArrayCitations(a);
							if ( ad && ad.members.length > 0 ) {
								ad.citations.forEach(function(e,i) {
										if ( e > 1 ) {
											intersect.push(ad.members[i]);
										}
								});
							}
							sigUtil.updateSigServices(s,intersect);
							return "";
					},
			"services" : function(a,s,sigUtil) {
							if ( Array.isArray(a) ) {
								sigUtil.updateSigServices(s,botModules.botUtil.uniqArray(a));
							}
							return "";
					},
			"processes" : function(a,s,sigUtil) {
							if ( Array.isArray(a) ) {
								sigUtil.updateSigProcesses(s,botModules.botUtil.uniqArray(a));
							}
							return "";
					},
			"tolist" : function(a,s,sigUtil) {
							if ( Array.isArray(a) ) {
								a = botModules.botUtil.uniqArray(a);
								return a.join(sigUtil.listSeparator);
							}
					},
			"boolean" : function(a,s,sigUtil) {
                            var bool = a.some(function(e) {
                                return e;
                            });
                            return bool;
                    },
			"noaction" : function(a) {
							return a;
					},
		
						

	},

	verbs : {

			// 
			// Controls for the situation 
			//

			"fetch" : function(l,s,sigUtil) {
						sigUtil.setAlertLimit(l);
					},
			"class" : function(l,s,sigUtil) {	
						sigUtil.setSituationClass(l,s);
					}

	},
					
	generateLabel : function(situation) {

		// Geenrate a label based on the templated description and the 
		// alert contents. 

		// Tokens will follow the pattern $[transformer](field[,limit])
		// where transformer is the mapped name of a function from 
		// this module 

		var NAME = MOOBOT_NAME + "generateLabel: ";

		var sig_id = situation.value("sig_id");
		var sigDescription = situation.value("description");
		var originalDescription = sigDescription;
		var templateDescription = sigDescription;
		var unknownTransformerLimit = 5; 

		sigLogger.debug(NAME + "Starting labelling for situation " + sig_id + " " + sigDescription);

		if ( !sigDescription ) {
			sigLogger.info(NAME + "Description not found for sig_id:" + sig_id);
			return;
		}

		// Remove any linefeeds that may have been added for readability in the config. 

		sigDescription = sigDescription.replace(/(\r?\n|\n)/g,"");
		originalDescription = originalDescription.replace(/(\r?\n|\n)/g,"");
		templateDescription = templateDescription.replace(/(\r?\n|\n)/g,"");
		
		// Get a list of tokens in the string : $[A-Z](...[,\d])

		var tokens = [];
		var mappedTokens = [];
		var alertFields = [];
		var arrayFields = [];

		// These regexes have "forced" subgroups - i.e. they will always return the same 
		// subgroup number if optional data is not present 
		// e.g. $(source) will return the same subgroups as $UNIQ(source,3)

		var mapRe = /(\$MAP\s*\[(.*?)\])/g;
		var tokenRe = /(\${1,2}((?:[A-Z]*)?)\(([\w\.\-\s]+)(?:,\s*)?((?:\d+)?)(?:\s*)?\))/g;
		var mapDataRe = /(\${1,2}((?:[A-Z]*)?)\(([\w\.-\s]+)(?:,\s*)?((?:[\w\.-\s]+)?)(?:\s*)(?:,\s*)?((?:\d+)?)\))/g;
		var reResults;
		var mapResults;

		// A new situation may have a templated descritpion - if so use this.
		// An update may also have one - edge case for single recipe matching recipe superseding
		// An update will have the expanded description - so hunt for the template in mooghandling 
		// We only really want to see if there is at least one verb present. 
		// or if there is commonDetails with token / map data. 

		if ( tokenRe.test(templateDescription) || mapRe.test(templateDescription) ) {
			sigLogger.info(NAME + "Updating stored template " + sigDescription);
			this.setSituationTemplate(sigDescription,situation);
		}
		else { 
			var template = this.getSituationTemplate(situation);
			if ( template ) {
				// Use the template for all future operations. 
				sigLogger.info(NAME + "Using stored template " + template);
				templateDescription = template;
				sigDescription = template;
			}
			else {
				// No tokens, no template
				// commonDetails may contain tokens. 

				if ( this.commonDetails ) {
					if ( !tokenRe.test(this.commonDetails) && !mapRe.test(this.commonDetails) )   {
						sigLogger.info(NAME + "No tokens (description or commonDetails), no template - using passed description + commonDetails");
						situation.set("description",sigDescription + this.commonDetails);
						return;
					}
				}
				else { 
					sigLogger.info(NAME + "No tokens, no template - using passed description");
					return;
				}
			}
		}

		// If common details is populated, add this to the template. 

		if ( this.commonDetails ) {
			templateDescription = templateDescription + " " + this.commonDetails;
			sigDescription  = sigDescription + " " + this.commonDetails;
			sigLogger.debug(NAME + "Template incorporated commonDetails: working template is :" + templateDescription);
		}

		mapRe.lastIndex = 0;
		tokenRe.lastIndex = 0;
		var isArrayOfArrays;

		// Extract any $MAP[] - add it's fields to the arrayFields and alertFields to get the data
		// store the source and destination in the mappedFields [] for later use. 

		var mapData;
		var mapStrings = [];

		while ( ( mapData = mapRe.exec(templateDescription) ) !== null ) {
			
			// Avoid a zero width match. 
			if ( mapData.index === mapRe.lastIndex) {
				mapRe.lastIndex++;
			}

			if ( mapData && mapData.length === 3 ) {

				mapStrings.push(mapData[1]);
				var mapDataDescription = mapData[2];

				sigLogger.debug(NAME + "Found custom_info map data " + mapDataDescription);
	
				while ( ( mapResults = mapDataRe.exec(mapDataDescription) ) !== null ) {
	
					var mapToken = { "verb" : null, "source" : null, "dest" : null, "limit" : null  };
				
					// Avoid a zero width match. 
					if (mapResults.index === mapDataRe.lastIndex) {
						mapDataRe.lastIndex++;
					}
		
					if ( mapResults && mapResults.length === 6 ) {
	
						isArrayOfArrays = /^\${2}/.test(mapResults[1]);
						mapToken.verb = mapResults[2] ? mapResults[2].toLowerCase() : "noaction";
						mapToken.source = mapResults[3];
						mapToken.dest = mapResults[4];
						mapToken.limit = mapResults[5] !== "" && /\d+/.test(mapResults[5]) ? mapResults[5] : 0 ;
		
						if ( isArrayOfArrays ) {
							arrayFields.push(mapToken.source);
						}
						else { 
							alertFields.push(mapToken.source);
						}
						mappedTokens.push(mapToken);
					}

				}
			}
		}

		// Remove map data from the template and sigDescription 
		// only possible after we've iterated the entire string

		mapStrings.forEach(function(mapString) { 
			templateDescription = templateDescription.replace(mapString,"");
			sigDescription = sigDescription.replace(mapString,"");
		});

		//
		// Extract the regular tokens  
		//

		while ( ( reResults = tokenRe.exec(templateDescription) ) !== null ) {
			
			var token = { "toReplace" : null, "verb" : null, "field" : null, "limit" : null  };

			// Avoid a zero width match. 
			if (reResults.index === tokenRe.lastIndex) {
				tokenRe.lastIndex++;
			}

			if ( reResults && reResults.length === 5 ) {

				isArrayOfArrays = /^\${2}/.test(reResults[1]);
				token.toReplace = reResults[1];
				token.verb = reResults[2] ? reResults[2].toLowerCase() : "noaction";
				token.param = reResults[3];
				token.limit = reResults[4] !== "" && /\d+/.test(reResults[4]) ? reResults[4] : 0 ;

				// If this is a verb, perform the action now, passing the param. 
				// verbs are always $VERB(PARAM);
				// Remove the verb construct from the desrciption. 
				// if it's not a verb, it's assumed to be a transformer. 

				sigLogger.debug(NAME + "Token: Found verb:" + token.verb + " with param: " + token.param);

				if ( this.verbs[token.verb] && typeof this.verbs[token.verb] === 'function' ) {
						this.verbs[token.verb](token.param,situation,this);
						sigDescription = sigDescription.replace(token.toReplace,"");
				}
				else {
						if ( isArrayOfArrays ) {
							arrayFields.push(token.param);
						}
						else { 
							alertFields.push(token.param);
						}
						tokens.push(token);
				}
			}
		}

		alertFields = botModules.botUtil.uniqArray(alertFields);
		arrayFields = botModules.botUtil.uniqArray(arrayFields);

		sigLogger.debug(NAME + "Fetching ArrayFields: " + JSON.stringify(arrayFields));
		sigLogger.debug(NAME + "Fetching AlertFields: " + JSON.stringify(alertFields));

		//
		// Retrieve Alert Data
		//
		// We have a list of tokens and the fields we want. 
		// Get the alert data we wanted from the alert fields. 

		var alertData = this.getAlertDetails(sig_id,alertFields,this.situationAlerts);

		// Get the array data we wanted from the array fields - use getRawArrayData() and get the members 
		// This is NOT uniqued as part of the process. 
		// Any function using this data will need to unique if necesary (as with any other)

		for ( var arIdx = 0; arIdx < arrayFields.length; arIdx++ ) {
			var arrayData = this.getRawArrayData(situation,this.situationAlerts,arrayFields[arIdx]);
			if ( arrayData && botModules.botUtil.isPopulatedList(arrayData) ) { 
				alertData[arrayFields[arIdx]] = arrayData.slice(0);
			}
			else {
				alertData[arrayFields[arIdx]] = [];
			}
		}

		// 
		// Replace Tokens
		//

		var replaceWith;
		var replaceType;
		var action;
		var limit;

		// Description tokens

		for ( var tIdx  = 0; tIdx < tokens.length; tIdx++ ) {

			var thisToken = tokens[tIdx];

			action = thisToken.verb;
			limit = thisToken.limit;
			var toReplace = thisToken.toReplace;
			var field = thisToken.param;

			// Do we have data ? 
			// We are always expecting an array - check...

			if ( Array.isArray(alertData[field]) )  {

				if ( alertData[field].length === 0 ) {
					logger.info(NAME + field + " returned an empty array");
				}

				// Transform if needed, if a transformer was not found
				// use all data log and truncate. 

				if ( action !== null && this.transformers[action] && typeof this.transformers[action] === 'function' ) {
					sigLogger.debug(NAME + "Executing action " + action + " on data from field " + field);
					replaceWith = this.transformers[action](alertData[field],situation,this);
				}
				else {
					sigLogger.info(NAME + "Action " + action + " not found, truncating data");
					replaceWith = alertData[field];
					limit = unknownTransformerLimit;
				}

				// Make this a string if it's an object. 

				replaceType = botModules.botUtil.getObjectType(replaceWith);

				if ( replaceType === "object" ) {
					replaceWith = JSON.stringify(replaceWith);
				}

				if ( replaceType === "array" ) {
					if ( limit && replaceWith.length > limit) {
						replaceWith = replaceWith.slice(0,limit);
						replaceWith.push("...");
					}
					replaceWith = replaceWith.length === 1 ? replaceWith[0] : JSON.stringify(replaceWith);
				}
			}
			else {
				sigLogger.info(NAME + "Alert field " + field + " returned no data");
				replaceWith = this.no_data_value;
			}
			sigLogger.debug(NAME + "Replacing " + toReplace + " with " + replaceWith);
			sigDescription = sigDescription.replace(toReplace,replaceWith);

		}

		// Populate any mapped token fields to custom_info.

		for ( var mtIdx  = 0; mtIdx < mappedTokens.length; mtIdx++ ) {

			var thisMapToken = mappedTokens[mtIdx];

			action = thisMapToken.verb;
			limit = thisMapToken.limit;
			var sourceField = thisMapToken.source;
			var destField = thisMapToken.dest;
	
			if ( !destField ) {
				sigLogger.debug(NAME + "Destination field not found, skipping");
				continue;
			}

			// Do we have data ? 
			// We are always expecting an array - check...

			if ( Array.isArray(alertData[sourceField]) )  {

				if ( alertData[sourceField].length === 0 ) {
					logger.info(NAME + sourceField + " returned an empty array");
				}

				// Transform if needed, if a transformer was not found
				// use all data log and truncate. 

				if ( action !== null && this.transformers[action] && typeof this.transformers[action] === 'function' ) {
					sigLogger.debug(NAME + "Executing map action " + action + " on data from field " + sourceField);
					replaceWith = this.transformers[action](alertData[sourceField],situation,this);
				}
				else {
					sigLogger.info(NAME + "Action " + action + " not found, truncating data");
					replaceWith = alertData[sourceField];
					limit = unknownTransformerLimit;
				}

				// Make this a string if it's an object. 

				replaceType = botModules.botUtil.getObjectType(replaceWith);

				if ( replaceType === "object" ) {
					replaceWith = JSON.stringify(replaceWith);
				}

				if ( replaceType === "array" ) {

					if ( limit && replaceWith.length > limit) {
						replaceWith = replaceWith.slice(0,limit);
						replaceWith.push("...");
					}
				}
			}
			else {
				sigLogger.info(NAME + "Alert field " + sourceField + " returned no data");
				replaceWith = this.no_data_value;
			}

			// Strip off the custom_info prefix if present. 
			// Use setCustomInfoValue to add to custom_info - always an overwrite. 

			destField = destField.replace(/^custom_info\./g,"");
			sigLogger.debug(NAME + "Adding " + sourceField + " to custom_info." + destField);

			// If the destination field is a multi-level object then we need to check for 
			// and add intermediate objects  before using setCustomInfoValue;

			var addedOk = botUtil.checkAndAddCustomInfoValue(situation,destField,replaceWith);

			if ( addedOk ) {
				sigLogger.debug(NAME + "Added " + sourceField + " to custom_info." + destField);
			}
			else {
				sigLogger.warning(NAME + "Failed to add " + sourceField + " to custom_info." + destField);
			}

		}

		// We should now have a expanded description with the alert data. 

		if ( sigDescription !== originalDescription ) {

			// Remove multiple whitepsces
			sigDescripton = sigDescription.replace(/\s/g," ");

			sigLogger.info(NAME + "Sig: " + sig_id + " : replaced \n " + originalDescription + " with:\n" + sigDescription);
			if ( this.overwriteOnUpdate ) {
				situation.set("description",sigDescription);
			}
			else {
				sigLogger.info(NAME + "Sig: " + sig_id + " : overwrite blocked");
			}
		}
		else {
			sigLogger.debug(NAME + "Sig: " + sig_id + " : description unchanged \noriginal: " + originalDescription + " \nnew:\n" + sigDescription);
			sigLogger.info(NAME + "Sig: " + sig_id + " : description unchanged");
		}
		
	}

	};
	var F=function() {};
	F.prototype=self;
	return( new F() );
}
	
