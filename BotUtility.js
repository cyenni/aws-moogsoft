// ------------------------------------------------------------
//
// A generic set of bot utility functions for use in both lambot
// and moobots.
//
// Some functions are specfic to a bot tpye - take care....
//
// ------------------------------------------------------------
// NOTE: This file should have a symbolic linked to  
// from LamUtility.js for backward compatability. 
// ------------------------------------------------------------

function BotUtility() {

    var uLogger= (typeof LamBot !== 'undefined') ? LamBot.loadModule("Logger") : MooBot.loadModule("Logger");
    var uDebug=0;
    var self={
	
	// --------------------------------------------------------
	// Generic Bot functions
	// --------------------------------------------------------

	// 
	// MoogEvent - a basic JS Object to hold event attributes.
	//
	MoogEvent: function() {

		this.signature="";
		this.source_id="";
		this.external_id="";
		this.manager="";
		this.source = "";
		this.class = "";
		this.agent="MOOG";
		this.agent_location = "";
		this.type = "";
		this.severity = 1;
		this.description = "";
		this.agent_time = 0;
		this.custom_info = {};
	},

	//
	// Return the current epoch date in seconds. 
	//

	epochDate: function () {
		
		var epochDate = Math.round(Date.now() / 1000) ;
		return(epochDate);
	},

	fromEpochDate : function(epoch) {
		if ( !/^\d+$/.test(epoch) ) {
			return 0;
		}
		var d = new Date(0); 
		d.setUTCSeconds(epoch);
		return d;
	},

	// A blank global custom info model for all events.

	createBaseCustomInfo : function() {
	
		var baseCustomInfo = {
			mooghandling : {
				isEnriched : false,
				archiveOnly : false,
				toolFlags : {},
			},
			services : [],
			location : {},
			eventDetails : {},
			ticketing : {
				ticketNumber : null,
				ticketStatus : null
			}
		};
		return baseCustomInfo;
	},

	// 
	// Check the date for validity - existence and meaningfulness. 
	//

	checkDate: function(date,offset) {
	
		// Check for the following:
		// 1. Is an integer.
		// 2. Is not 0
		// 3. is not negative
		// 4. is not null
		// 5. is not in the future by more than an allowable offset.
		// 6. is not in the past by an allowable offset. 
		//
		
		if ( !date ) {
			uLogger.info("checkDate: Falsey value (0, null, '')");
			return false;
		}
		if ( typeof date !== "number") {
			uLogger.info("checkDate: Not a number");
			return false;
		}
		if ( date < 0 ) {
			uLogger.info("checkDate: Negative date");
			return false;
		}
		if ( !offset || (typeof offset !== 'number') ) {
			offset = 900;
		}
		if ( (Math.floor(Date.now() / 1000) - offset ) >  date  ) {
			uLogger.info("checkDate: date is stale");
			return false;
		}
		if ( (Math.floor(Date.now() / 1000) + offset ) <  date  ) {
			uLogger.info("checkDate: date is in the future");
			return false;
		}
		return true;
	
	},

	//
	// Lookup a Moog severity from common words used to 
	// indicate severity. 
	//

	basicSeverityLookup : function(severity) {

		// A text based lookup for severity.
		// Add terms as needed: 

		var default_severity = 1;

		if ( !severity ) {
			return default_severity;
		}

		var severityMap = {

			// CRITICAL

			"critical" : 5,
			"fatal"    : 5,
			"emergency" : 5,
			"down"     : 5,

			// MAJOR

			"major"		: 4,
			"important"	: 4,
			"severe"	: 4,

			// MINOR

			"minor"		: 3,

			// WARNING
			
			"warning"	: 2,
			"warn"		: 2,

			// INDETERMINATE

			"unknown"	: 1,
			"intermediate"	: 1,
			"indeterminate"	: 1,
			"informational" : 1,
			"info" : 1,

			// CLEAR
		
			"clear"		: 0,
			"ok"		: 0,
			"okay"		: 0,
			"up"		: 0,
			"normal"	: 0
		};

		return typeof severityMap[severity.toLowerCase()] !== 'undefined' ? severityMap[severity.toLowerCase()] : default_severity; 
		
	},

	// 
	// Translate a Moog numeric severity to a word. 
	// 

	translateMoogSeverity : function(severity) {

		// Lookup for our static severity values.
		var severityMap={ 0  : "Clear", 1  : "Indeterminate", 2  : "Warning", 3  : "Minor", 4  : "Major", 5  : "Critical" };
		return(severityMap[parseInt(severity)] ? severityMap[parseInt(severity)] : "Unknown" );
	},

	//
	// Translate a Moog numeric status into a human readable one
	//

	translateMoogStatus : function(state) {

		// Lookup for our static state values.
		var stateMap={
			1  : "Opened",
			2  : "Unassigned",
			3  : "Assigned",
			4  : "Acknowledged",
			5  : "Uncknowledged",
			6  : "Active",
			7  : "Dormant",
			8  : "Resolved",
			9  : "Closed",
			10 : "SLA EXceeded"
		};
		return(stateMap[parseInt(state)] ? stateMap[parseInt(state)] : "Unknown" );
	},
	
	// --------------------------------------------------------
	// LAM Specific functions
	// --------------------------------------------------------

	// 
	// Get and parse overflow
	//

	getOverflow: function(event) {
		var overflow={};
	    try { overflow = JSON.parse(event.value("overflow")) ; }
		catch (e) {
			uLogger.warning("getOverflow: Overflow Parse Error: Failed to parse overflow data : " + e);
		}
		return overflow;
    },

	// 
	// Get and parse reponse data for modifyResponse()
	//
	
	getResponseData: function(inBoundEventData) {
		
		var response = inBoundEventData.value("responseData");
		if ( response ) {
			try {
				response = JSON.parse(response);
			}
			catch(e) {
				uLogger.warning("getResponeData: Unable to JSON parse the response: " + e);
				return false;
			}
			return response;
		}
		else {
			uLogger.warning("getResponseData: Unable to find the response: " + e);
		}
		return false;
	},
	
	//
	// Check overflow for a list of expected mandatory attributes
	//

	checkOverflow: function(overflow,attributeList) {

		// How many attrbutes do we have to have defined
		// to return true ?

		var numAttribs=attributeList.length;
		var numFound=0;

		for ( var atIdx = 0 ; atIdx < numAttribs ; atIdx++ ) {

			if ( typeof overflow[attributeList[atIdx]] !== 'undefined' ) {
				numFound++;
			}
		}
		return ( numFound === numAttribs ) ? true : false;
	},

	// 
	// Print overflow data 
	//

	printOverflow: function(overflow) {
		uLogger.info("============= Overflow Data ==============");
		for ( var ovKey in overflow ) {
			if ( typeof ovKey !== 'function' ) {
				uLogger.info("OverFlow: " + ovKey + ":" + overflow[ovKey]);
			}
		}
		uLogger.info("===============================================");
	},

	// -------------------------------------------------
	// Generic functions
	// -------------------------------------------------

	// Return the object type (string, number, array, object etc. ) 

	getObjectType: function(o) {
		// Get the object prototype, grap the type in a regex, and convert to lowercae. 
		return Object.prototype.toString.call(o).match(/^\[object\s(.*)\]/)[1].toLowerCase();
	},

	// Object existence in another object
	// isObjectDefined(a , "b.c.d")

	isObjectDefined: function(sourceObj,targetObj) {

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
				return false;
			}
		}
		return true;

	},
	
	// See if an object exists and return it's value. 

	getObjectValue: function(sourceObj,targetObj) {

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
				return undefined;
			}
		}
		return objToCheck;
	},
	

	getObjectValuesAsList : function(o) {

		// Return the list of vales in an object - equivalent for Object.values. 
		var vals = [];
		if ( this.getObjectType(o) !== "object" ) {
			return vals;
		}
		for ( var k in o ) {	
			if ( typeof k !== 'function' ) {
				vals.push(o[k]);
			}
		}
		return vals;
	},
				
	// Clone the path in one object to 
	// another and populate the value. 
	// will copy the object if it's the last in 
	// the path. 

	cloneObjPath: function(source,startKey,target) {

		if ( !source || !startKey || !target ) {
			return;
		}

		if ( this.getObjectType(source) !== "object" || this.getObjectType(target) !== "object") {
			return;
		}
	
		// We have a source object, the key we want to clone from 
		// and where we want to clone it to.
	
		var pathItem=startKey.split(".");
		var sourceItem=source;
		
		// Iterate through the path, 
		// if the target doesn't exist, create it (if the source is an object)
		
		var pathCount=1;

		for ( var pathIdx=0 ; pathIdx < pathItem.length ; pathIdx++ ) {
			var key=pathItem[pathIdx];
	
			if ( !this.isObjectDefined(sourceItem,key) ) {
				return;
			}
			// Add the path item on.
	
			sourceItem=sourceItem[key];
	
			if ( this.isObjectDefined(target,key) ) {
				target=target[key];
			}
			else {
				// Do we need to create the object - if the item is an object
				// yes, if not no.

				if ( this.getObjectType(sourceItem) === "object" ) {
					target[key]={};
					// If this is the last item, copy the object.
					if ( pathCount === pathItem.length ) {
						target[key] = sourceItem;
					}
					target=target[key];
				}
				else {
					// Copy the contents. 
					target[key] = sourceItem;
				}
			}
			pathCount++;
		}
		return;
	},

	// Check to see if an object is empty or not. 

	isEmpty: function(obj) {

		if ( this.getObjectType(obj) !== "object" ) {
			return true;
		}
		// Check for an empty object - true if empty, false if not.
		for(var key in obj) {
			if (obj.hasOwnProperty(key)) {
				return false;
			}
		}
		return true;
	},

	setDebug: function(state) {

		if ( state === 'on' ) {
			uLogger.info("DEBUG botUtility debug enabled");
			uDebug=1;
		}
		else {
			uLogger.info("DEBUG botUtility debug disabled");
			uDebug=0;
		}
	},

	debug: function(msg) {
		
		if (uDebug === 1)  {
	
			uLogger.warning("DEBUG: " + msg);
		}
	},

	// Remove one string from another.

	cleanMsg: function(str,msg) {
		var spaceRe=/\s+/g;
		msg=msg.replace(str,"");
		msg=msg.replace(spaceRe," ");
		return(msg);
	},


	// Get an regex from a string

	getString: function(re,text) {
		var regex=new RegExp(re,"gi");
		var reMatch=regex.exec(text);
		if ( reMatch !== null && reMatch.length > 1 ) {
			return reMatch;
		}
		else {
			return [];
		}
	},
	
	// Turn camelcase into normal case

	camel2normal : function(text) {
		return text.replace(/\B([A-Z])/g," $&");
	},

	// Capitalise the first letter of a string o

	capitaliseFirstLetter: function(str) {
		return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
	},

	// Check for nulls, 0, : - etc etc. 

	checkNull: function(thing) {
		var justZeros="^(0(:|\\.|-|_|\\\\|/)*)+$";
		var justZerosReg=new RegExp(justZeros);
		if ( justZerosReg.test(thing) ) {
			return 0;
		}
		else {
			return(thing);
		}
	},
	
	// Print an object (not CEvent Objects)

	printObj: function(o,tag) {
		tag = typeof tag !== 'undefined' ? tag.toString().toUpperCase() : "";
		uLogger.warning("\n" + tag + " : \n" + JSON.stringify(o,null,4));
	},

	// Use PringObj....
	printMe: function (m,i) {
		var indent;
		var indentString="";
		if (arguments.length === 2 ) {
			indent=arguments[1];
		}
		else {
			indent=-1;
		}
		indent++;
		for ( var tabc = 0 ; tabc <= indent ; tabc++ ) {
			indentString += "-";
		}
		indentString +="> ";
		if ( typeof m === 'string' || typeof m  === 'number' || typeof m === 'boolean') {
			uLogger.warning("|" + indentString + m );
		}
		if ( typeof m === 'object' ) {
			for ( var attr in m ) {
				var atType=typeof m[attr];
				switch(atType) {
					case 'string':  uLogger.warning("| " + indentString + attr + " : " + m[attr]); break;
					case 'number':  uLogger.warning("| " + indentString + attr + " : " + m[attr]); break;
					case 'object':  uLogger.warning("|" + indentString + " Obj: "+ attr) ;
									indent++;
									this.printMe(m[attr],indent);
									break;
					default: break;
				}
			}
		}
	},

	// Return a substring broken on the last whitespace before the limit. 

	maxChars : function(text, max) {

		if ( !text || !max ) {
			return false;
		}

		// If we are less than the limit - return
			
		if (text.length <= max ) {
			return text;
		}
		var limit= max - 1;
			
		var matched=false;
		var splitReg=/\s/g;
		var lastIndex=0;
		var result;
		var newText="";
			
		// Go through the string breaking on a regex, until we hit the
		// one before the limit.
	
		while ( ( result=splitReg.exec(text) ) !== null ) {
	
			if ( result.index <= limit ) {
				matched=true;
				newText+=text.substring(lastIndex,result.index);
				lastIndex=result.index;
			}
		}
		if( !matched ) {
			// No whitespace boundary found before limit - use a subtring
			newText=text.substr(0,limit);
		}
		return newText;
	},
	enumLookup: function(enumName,lookup,default_value) {

		// Lookup a key in an enumeration.
		if ( !enumName || typeof lookup === "undefined" ) {
			uLogger.info("Enumeration lookup failed for " + lookup);
			return  ( default_value !== 'undefined' && default_value !== "moog_default" ? default_value : null );
		}

		var value = null;
		if ( typeof enumName[lookup] !== 'undefined' ) {
			value = enumName[lookup];
		}
		else if ( typeof default_value !== 'undefined' && typeof enumName[default_value] !== "undefined" ) {
			value =  enumName[default_value];
		}
		else {
			value = ( default_value !== 'undefined' ? default_value : null );
		}
		return value;
	},
	decodeBits : function(enumName,value) {

		// See if the value looks like a Hex number (2 digits) 0x(2digits) 
		// Multibytes should come across as xx:xx or xx_xx

		// If we are not a recognisable hex character it may be 
		// a bits value < 128 so converted to the equivalent primatable ascii 
		// code if so get the character code and convert as needed. 

		var isSingleHexRe = /^(?:0x)?([0-9a-f]{1,2})$/i;
		var isMultiHexRe = /^(?:[0-9a-f]{1,2}[:_\s]){1,}(?:[0-9a-f]{1,2})$/i;
		var bitValues = [];

		if ( value.toString().length > 1 ) {
			if ( isSingleHexRe.test(value) ) {
				var hexRe = isSingleHexRe.exec(value);
				bitValues=this.getBitsArray(parseInt(hexRe[1],16));
			}
			else if ( isMultiHexRe.test(value) ) {

				// Split into as many octets as we have.

				var hexValueArray = value.split(/[:_\s]/);
				if ( hexValueArray.length === 0 ) {
					uLogger.warning("BITS Decode: Unable to determine octet values");
					return [];
				}
				// For each value create an array, and concatenate preserving order
				
				for ( var hexIdx=0; hexIdx < hexValueArray.length ; hexIdx++ ) {
					var valBits = this.getBitsArray(parseInt(hexValueArray[hexIdx],16));
					bitValues = bitValues.concat(valBits);
				}
			}
			else {
				uLogger.info("BIT Decode: Unrecognised BITS value, should be single alpha, or single of multibyte hex (xx:xx or xx_xx or xx xx");
				return [];
			}
		}
		else {
			// A single character - assume an ascii character with a code < 127
			bitValues=this.getBitsArray(value.charCodeAt(0));

		}

		// We should not have an array of true/false values representing the bits on and off
		// for the value.
		
		// Iterate throguh this array, and grab the value for "on" bits from the enumeration.

		var enabledEnumValues = [];
		for ( var bIdx = 0 ; bIdx < bitValues.length ; bIdx++ ) {
			if ( bitValues[bIdx] && enumName[bIdx] ) {
				enabledEnumValues.push(enumName[bIdx]);
			}
		}
		return enabledEnumValues;
	},

	getBitsArray : function(a) {
		var bitBoard = [];
		for ( var i = 0; i <=7;i++) { bitBoard[i] = false ;}
			bitBoard.forEach(function(element,index,array) {
			bitBoard[index] = (a>>7) & 1 === 1 ? true : false;
			a = a<<1;
		});
		return bitBoard;
	},

	isArray: function(o) {
		return Object.prototype.toString.call(o) === '[object Array]';
	},

	// IP Address conversion address to int, int to address and 
	// ipv4 validator. 

	ipAddressToInt : function(ipAddress) {

		if ( !this.validateIpv4(ipAddress) ) {
			return false;
		}

		var ipMatchRe=/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
		var octets=ipAddress.match(ipMatchRe);

		if ( octets && octets.length >= 5 ) {
			// Return a 32 bit number representing the ip address
			// shift the octets leftwise by the required amount.
			return  (octets[1]<<24) + (octets[2]<<16) + (octets[3]<<8) + (octets[4]<<0);
		}
		else {
			return false;
		}
	},

	intToIpAddress : function(ipInt) {
		var val=[ ((ipInt<<0)>>>24),((ipInt<<8)>>>24),((ipInt<<16)>>>24),((ipInt<<24)>>>24)].join(".");
		return this.validateIpv4(val) ? val : false;
	},

	validateIpv4 : function(ipAddress) {
		return (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/.test(ipAddress) ? 
				true : 
				false
		);
	},

	getHostDetails : function(host) {
		
		// Return a host and domain part of a non-ip based hostname
		// if the host is an IP return that as the host with a null domain. 
		// Makes the asumption that a non-ip host.domain split is defined by the first . 

		if ( this.validateIpv4(host) ) {
			return( {"host" : host, "domain" : null });
		}
		var fqdnparts = host.split(/\./);
		return ( { "host" : fqdnparts.shift(), "domain" : fqdnparts.join(".") });
	},
			

	addObjectFromMap : function(fieldMap,sourceObj,destObj) {

		if ( !Array.isArray(fieldMap) ||
			this.getObjectType(sourceObj) !== "object" ||
			this.getObjectType(destObj) !== "object" ) {
			uLogger.warning("Expected a fieldmap, source and destination objects");
			return false;
		}
		for ( var fIdx = 0 ; fIdx < fieldMap.length ; fIdx++ ) {

			var fieldData=fieldMap[fIdx];
			var fromField=fieldData.from || null;
			var toField=fieldData.to || null;
			
			// If the source does not exist, then skip unless a default value is provided. 

			if ( !this.isObjectDefined(sourceObj,fromField) && typeof fieldData.default === 'undefined' ) {
				uLogger.info("addObjectFromMap: source object " + fromField + " does not exist, skipping");
				continue;
			}

			var defaultValue = fieldData.default || null;
			var testValue=this.getObjectValue(sourceObj,fromField);
			var value = typeof testValue !== 'undefined' ? testValue : defaultValue;

			
			// If there is a default use that over a falsey value 

			if ( !value && typeof fieldData.default !== 'undefined' ) {
				value = defaultValue;
			}

			uLogger.info("Copying " + fromField + " to " + toField);
			this.addObject(destObj,toField,value,true);
		}
	},

	addObject: function(obj, path, value, merge) {

		merge = typeof merge !== 'undefined' && merge ? true : false;

		if (this.getObjectType(obj) !== "object") {
			uLogger.warning("addObject: first parameters is not an object, type:  " + this.getObjectType(obj) + " Path:" + path);
			return false;
		}

		var keys = path.split('.');
		var lastItem=keys.length - 1;
		var lastItemName = keys.pop();

		// Ensure the path to the target exists. 

		for (var i = 0; i < lastItem; i++) {
			var objToCheck = keys[i];
			if ( typeof obj[objToCheck] === 'undefined' ) {
				obj[objToCheck] = {};
			}
			obj=obj[objToCheck];
		}
		
		// We will now have an object depth created up to the last item. 
	
		var targetType=this.getObjectType(obj[lastItemName]);
		var valType=this.getObjectType(value);
	
		if (  targetType === 'undefined' ) {
			// Target doesn't exist already. Assign and return. 
			obj[lastItemName]=value;
			return;
		}
	
		// Object already exists, are we merging ? 
		if ( !merge ) {
			// Overwrite
			obj[lastItemName]=value;
			return;
		}
			
		// Object exists - now merge. 
			
		if ( targetType === "array" && valType === "array" ) {
			// target and value are arrays - concat.
			obj[lastItemName]=obj[lastItemName].concat(value);
			return;
		}
		else if ( targetType === "array" && valType !== "array" ) {
			// target is an array, value is not, push it on.
			obj[lastItemName].push(value);
			return;
		}
		else {
			// Not a merge of an array - simple key replacement
			obj[lastItemName]=value;
			return;
		}

	},
	
	
	//
	// Trap lam specific functions.
	//

	// Extract an index from a named varbind and return the value

	getVarbindIndexAndValue : function(trapData,vbName ) {
		// Iterate through the trapData looking for a property
		// with a pattern of vbName.(index)
	
		var indexPat=vbName + "\\.(.*)";
		var indexRe=new RegExp(indexPat,"gi");
		
		// if it exists without an index, return a value and a null index.
		// trapData should have all lowercase varbind names.

		if ( typeof trapData[vbName.toLowerCase()] !== 'undefined' ) {
				return { "vbName" : vbName ,  index : null , value : trapData[vbName.toLowerCase()] };
		}

		// If it doesn't exist as an existing varbind - see if it exists with an index. 

		for ( var prop in trapData ) {
			if ( typeof prop !== 'function' ) {
				var checkIndex=indexRe.exec(prop);
				if ( checkIndex && checkIndex.length === 2 ) {
					return { "vbName" : vbName ,  index : checkIndex[1] , value : trapData[checkIndex[0]] };
				}
			}
		}
		return { "vbName" : vbName ,  "index" : null , "value" : null };
	},

	// Get multiple values for the same stem object (e.g. where the same varbind is sent twice
	// with differing indexes / values.

	getMultipleVarbindIndexAndValue : function(trapData,vbName ) {

		// Iterate through the trapData looking for a property
		// with a pattern of vbName.(index)
	
		var indexPat=vbName + "\\.(.*)";
		var indexRe=new RegExp(indexPat,"i");
		var indexList = [];
		var valueList = [];
		
		// If it doesn't exist as an existing varbind - see if it exists with an index. 

		for ( var prop in trapData ) {
			if ( typeof prop !== 'function' ) {
				var checkIndex=indexRe.exec(prop);
				if ( checkIndex && checkIndex.length === 2 ) {
					indexList.push(checkIndex[1]);
					valueList.push(trapData[checkIndex[0]]);
				}
			}
		}
		// return if the index and value lists match.
		if ( indexList.length > 0 ) {
			return { "vbName" : vbName ,  "index" : indexList , "value" : valueList };
		}
		else {
			return { "vbName" : vbName ,  "index" : [] , "value" : [] };
		}
	},

	// Return a varbind with a specified index. 

	getVarbindWithIndex : function(trapData,vbName,index) {
		var vb=typeof index !== 'undefined' ? vbName.toLowerCase() + "." + index : vbName; 
		return trapData[vb] ? trapData[vb] : null;
	},

	// Extract an index from a named varbind.

	getVarbindIndex: function(trapData, vbName) {

		// Iterate through the trapData looking for a property
		// with a pattern of vbName.(index)
		
		var indexPat=vbName + "\\.(.*)";
		var indexRe=new RegExp(indexPat,"gi");

		for ( var prop in trapData ) {
			if ( typeof prop !== 'function' ) {

				var checkIndex=indexRe.exec(prop);
				if ( checkIndex && checkIndex.length === 2 ) {
					return checkIndex[1];
				}
			}
		}
		return false;
	},

	stripQuotes : function(s) {
		// Strip leading and trailing quotes
		// if empty return the empty string 

		return s.replace(/(^\"|\"$)/g,"");
	},

	stripIndexZero : function(trapData)  {

		// This will strip all .0 indexes 
		// and add variables with the stripped name
		// the original name will still be present.  

		var hasZeroPattern=/^([^\.][A-Za-z0-9]+)(?:\.0)$/i;
		for ( var key in trapData ) {
			if ( typeof key !== 'function') {
				var hasZero=hasZeroPattern.exec(key);
				if ( hasZero && hasZero.length === 2) {
					trapData[hasZero[1]]=trapData[key];
				}
			}
		}
	},

	extractSnmpAdminValue: function(index) {

		// We only want an ASN1 index - digits and .

		// Return the char translated value, the remaining index (for further extraction)
		// and the octets that made the value (in case it's not an Ascii string
		// allows further processing.
		
		var results={ value: null, remainingIndex : null ,  valueIndex : null };

		if ( /[a-z]/i.test(index) ){
			return results;
		}

		// We want to split the entire index into octets.
		
		var octets=index.split(".");
		
		// The first octet will give use the number of octets for the first "word"
		var firstLength=octets.shift();
		
		if ( firstLength > octets.length ) {
			// String goes beyond avaialble data
			return results;
		}

		// Pull off the octets and translate them. We'll only allow printable chars.
		
		var convertedString="";
		var indexOctets=[];

		for ( var oIdx = 1 ; oIdx <= firstLength ; oIdx++ ) {
			var char=octets.shift();
			indexOctets.push(char);
			convertedString +=  ( char >= 32 && char <=255 ) ? String.fromCharCode(char) : "_";
		}

		results.value=convertedString;
		results.remainingIndex=octets.join(".");
		results.valueIndex=indexOctets.join(".");
		return results;
		
	},

	convertInetAddress : function(type,address) {

		// Deal with  IPv4 others return as is. 
		// unknown(0),
		// ipv4(1),
		// ipv6(2),
		// ipv4z(3),
		// ipv6z(4),
		// dns(16)
	
		switch(parseInt(type)) {
	
			case 1 : 
				// IP V4 look for a dotted notation valid IP (return as is) 
				// or a hex notation (: separated) and do a hex->dec conversion. 
	
				if( /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/.test(address)  ) {
					return address;
				}
	
				// Test to see if it's a hex/underscore version - convert and check it's a valid IP before returning. 
	
				var isHex=/([0-9a-f]{1,2})[_:]([0-9a-f]{1,2})[_:]([0-9a-f]{1,2})[_:]([0-9a-f]{1,2})/i.exec(address);
			
				if ( isHex && isHex.length === 5 ) {
					// Looks to be a hex format address 
	
					var ip=[];
					ip.push(parseInt(isHex[1],16));
					ip.push(parseInt(isHex[2],16));
					ip.push(parseInt(isHex[3],16));
					ip.push(parseInt(isHex[4],16));
	
					var ipAddr=ip.join(".");
					if( /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/.test(ipAddr)  ) {
						return ipAddr;
					}
					else {
						return address;
					}
				}
				break;
			default : return address; 
		}
	},

	convertTCDateAndTime : function(dateAndtime) {

		// Convert SNMPv2-TC DataAndTime value to
		// a human readable string DD/MM/YYYY HH:MM:SS.ss UTC +-HH:MM
		// Offset may not be included.
		
		var dateBits=dateAndtime.split(/[:_]/);
		
		// Expecting 8 or 11 octets
		
		if ( dateBits.length !== 8 && dateBits.length !== 11 ) {
			return dateAndtime;
		}
		
		// Convert the hex octets to decimal.
		
		var year=parseInt(dateBits[0]+dateBits[1],16);
		var month=parseInt(dateBits[2],16);
		month = month < 10 ? "0"+ month : month;
		var day=parseInt(dateBits[3],16);
		
		var hour=parseInt(dateBits[4],16);
		hour = hour < 10 ? "0"+ hour : hour;
		
		var minutes=parseInt(dateBits[5],16);
		minutes = minutes < 10 ? "0"+ minutes : minutes;
		
		var seconds=parseInt(dateBits[6],16);
		seconds = seconds < 10 ? "0"+ seconds : seconds;
		
		var tenth_seconds=parseInt(dateBits[7],16);
		tenth_seconds = tenth_seconds < 10 ? "0"+ tenth_seconds : tenth_seconds;
		
		if ( dateBits.length === 8 ) {
			return ( day +"/"+ month +"/"+ year +" " + hour +":" + minutes +":" + seconds + "." + tenth_seconds + " (local to source)");
		}
		else {
		// convert the hex to a + or -
			var offset=String.fromCharCode(parseInt(dateBits[8],16));
			var offsetHour=parseInt(dateBits[9],16);
			offsetHour = offsetHour < 10 ? "0"+ offsetHour : offsetHour;
			var offsetMinutes=parseInt(dateBits[10],16);
			offsetMinutes = offsetMinutes < 10 ? "0"+ offsetMinutes : offsetMinutes;
			return ( day +"/"+ month +"/"+ year +" " + hour +":" + minutes +":" + seconds + "." + tenth_seconds + " UTC"+ offset + offsetHour + ":" + offsetMinutes);
		}
		return (dateAndtime);
	},

	convertIndexTCDateAndTime: function(dateAndtime) {

		// Used for index embedded date and times. 
		// presenta as decimal - need to convert to hex add 
		// bits 1+2 (year) and then convert back. 
		
		// Convert SNMPv2-TC DataAndTime value to
		// a human readable string DD/MM/YYYY HH:MM:SS.ss UTC +-HH:MM
		// Offset may not be included.
		// Allow : or . separated list (e.g. from a value or an index).
				
		var dateBits=dateAndtime.split(/\./);

		// Expecting 8 or 11 octets

		if ( dateBits.length !== 8 && dateBits.length !== 11 ) {
			return dateAndtime;
		}

		// Convert all the bits to hex 
		for ( var dbIdx=0 ; dbIdx < dateBits.length ; dbIdx++ ) {
			dateBits[dbIdx]=parseInt(dateBits[dbIdx]).toString(16);
		}

		var year=parseInt(dateBits[0]+dateBits[1],16);
		var month=parseInt(dateBits[2],16);
		var day=parseInt(dateBits[3],16);
			
		var hour=parseInt(dateBits[4],16);
		hour = hour < 10 ? "0"+ hour : hour;
			
		var minutes=parseInt(dateBits[5],16);
		minutes = minutes < 10 ? "0"+ minutes : minutes;
		
		var seconds=parseInt(dateBits[6],16);
		seconds = seconds < 10 ? "0"+ seconds : seconds;
			
		var tenth_seconds=parseInt(dateBits[7],16);
		tenth_seconds = tenth_seconds < 10 ? "0"+ tenth_seconds : tenth_seconds;
		
		if ( dateBits.length === 8 ) {
			return ( day +"/"+ month +"/"+ year +" " + hour +":" + minutes +":" + seconds + "." + tenth_seconds + "(local to source)");
		}
		else {
			// convert the hex to a + or -
			var offset=String.fromCharCode(parseInt(dateBits[8],16));
			var offsetHour=parseInt(dateBits[9],16);
			offsetHour = offsetHour < 10 ? "0"+ offsetHour : offsetHour;
			var offsetMinutes=parseInt(dateBits[10],16);
			offsetMinutes = offsetMinutes < 10 ? "0"+ offsetMinutes : offsetMinutes;
			return ( day +"/"+ month +"/"+ year +" " + hour +":" + minutes +":" + seconds + "." + tenth_seconds + " UTC"+ offset + offsetHour + ":" + offsetMinutes);
		}
		return (dateAndtime);
	},
			
	// Convert a hex string to Ascii - a varbind may contain line feeds which are outside the printable range 
	// so will be treated as hex data - convert these to ascii, replaceing not printables with a space. 

	convertHex2Ascii : function(hexString) {
		if ( /^(?:[0-9a-f]{1,2}[:_]){1,}(?:[0-9a-f]{1,2})$/i.test(hexString) ) {
			var char;
			var convertedString="";
			var octets=hexString.split(/[:_]/);
			for ( var oIdx = 0 ; oIdx < octets.length ; oIdx++ ) {
				char=parseInt(octets[oIdx],16);
				convertedString +=  ( char >= 32  && char <=255 ) ? String.fromCharCode(char) : " ";
			}
			return convertedString;
		}
		else {
			return hexString;
		}
	},
	
	convertAscii2Hex : function(asciiString) {

		// Convert an ascii octet string to a hex octet string (e.g. octet to WWN).
		if ( /^(?:[0-9]{1,}[:_\.]){1,}(?:[0-9])$/.test(asciiString) ) {
			var hexVal;
			var convertedString = "";
			var octets = asciiString.split(/[:_\.]/);
			for ( var oIdx = 0 ; oIdx < octets.length ; oIdx++ ) {
				hexVal= parseInt(octets[oIdx]) < 16  ? "0" + parseInt(octets[oIdx]).toString(16) : parseInt(octets[oIdx]).toString(16) ;
				convertedString += convertedString ? ":" + hexVal : hexVal;
			}
			return convertedString;
		}
		else {
			return asciiString;
		}
	},

	createSignatureFromVarbinds : function(trapData,trapSigComponents) {

		// Create a signature from a list of varbinds. 
		var sig="";

		for (var sigIdx = 0 ; sigIdx< trapSigComponents.length ; sigIdx++ ) {
			
			// Get each value for the components, may be indexed so 
			// use getVarbindIndexAndValue. 

			var compName=trapSigComponents[sigIdx];
			var vbData = this.getVarbindIndexAndValue(trapData,compName);
			sig += vbData.value !== null ? "::" + vbData.value : "";

		}
		return sig;
	},

	createStringFromAttributes : function(sourceObj,sigComponents,sep) {

		if ( typeof sep === 'undefined' ) {
			sep = "::";
		}

		// Create a string from a list of attributes in an object.
		var sig=[];
		for (var sigIdx = 0 ; sigIdx< sigComponents.length ; sigIdx++ ) {
			var compName=sigComponents[sigIdx];
			var attrValue = this.getObjectValue(sourceObj,compName);
			if ( typeof attrValue !== 'undefined' ) {
				sig.push(attrValue);
			}
		}
		return sig.join(sep);
	},

	// Used to convert a int to a binary representation - 

	intTo32BitBin : function(num) {
		var bin="";
		var length=32;
		while(length--) {
			bin += (num >> length) & 1;
		}
		return bin;
	},

	// UUID Generator

	generateUUID : function(){
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = (d + Math.random()*16)%16 | 0;
			d = Math.floor(d/16);
			return ( c === 'x' ? r : (r&0x3|0x8)).toString(16);
		});
		return uuid;
	},

	isGUID : function(guid) {
		var guidRe=/^\{{0,1}([0-9a-f]{8}(?:\-[0-9a-f]{4}){3}\-[0-9a-f]{12})\}{0,1}$/i.exec(guid);
		if ( guidRe && guidRe.length === 2) {
			return guidRe[1];
		}
		return false;
	},

	// Hash a string - useful for very long signatures.

	getHashCode : function(text)
	{
		var hash = 0;

		if (text.length === 0)
		{
			return hash;
		}
		for (var i = 0; i < text.length; i++)
		{
			var char = text.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;

			// Convert to 32bit integer.
			hash = hash & hash;
		}
		return hash;
	},
	
	setCustomInfo : function(event,custom_info) {
		// Null overflow
		event.set("custom_info",custom_info);
		if ( event.contains("overflow") ) {
			event.set("overflow","");
		}
	},
	old_setCustomInfo : function(event,custom_info) {

		// MOOG-3091 Workaround - requires a JSON.parse in the AlertBuilder.
		// After this is fixed simply
		// event.set("custom_info",custom_info);

		try {
			event.set("custom_info",JSON.stringify(custom_info));
		}
		catch(error) {
			uLogger.warning("Failed to set custom_info for this event, nullifying custom_info and sending event " + error);
			event.set("custom_info","");
		}
		// Null overflow
		if ( event.contains("overflow") ) {
			event.set("overflow","");
		}
	},

	removeNonAscii : function(message) {
		if ( !/^[\040-\377]*$/.test(message) ) {
			uLogger.debug("Removing non-ascii characters from the message");
			return message.replace(/[^\040-\377]/g,"");
		}
		else {
			return message;
		}
	},

	arrayDifference : function(source, toRemove) {
		// Remove array toRemove values from array source

		return source.filter(function(value){
			return toRemove.indexOf(value) == -1;
		});
	},

	arrayFilter : function(list,filter_list,type) {
                
		// Inclusive by default - only things matching the filters will be included in the return. 
		var filterType = type && ( type.toLowerCase() === "include" || type.toLowerCase() === "exclude" ) ? type : "exclude";
		
		if ( !Array.isArray(list) || !Array.isArray(filter_list) ) {
			uLogger.debug("Utility: arrayFilter: expected a 'list' array and a 'filter_list' array");
			return list;
		}
		var returnList = [];

		// Itrate throguh list checking each item agsinst each filter.
		
		itemList:
		for ( var liIdx = 0 ; liIdx < list.length; liIdx++ ) {
			var item = list[liIdx];

			filterList:
			for ( var fiIdx = 0; fiIdx < filter_list.length; fiIdx++) {
				var filter = filter_list[fiIdx];
				if ( this.getObjectType(filter) !== "regexp" ) {
					uLogger.debug("Utility: arrayFilter: Filters are expected to be regular expressions: '" + filter + "' is not");
					continue filterList;
				}
				if ( filterType === "exclude" &&  filter.test(item) ) {
					uLogger.debug("Utility: arrayFilter: Filtered '" + item + "' using " + filterType + " filter '" + filter);
					continue itemList;
				}   
				if ( filterType === "include" && !filter.test(item) ) {
					uLogger.debug("Utility: arrayFilter: Filtered '" + item + "' using " + filterType + " filter '" + filter);
					continue itemList;
				}   
			}
			// If we got here, the item was not filtered.
			returnList.push(item);
		}
		return returnList;
	},

	printCEvent : function(event,tag) { 

		// tries it's best to print out the many incantations of CEvent objects.
		var eventType = event.type().description().toUpperCase();
		try {
			tag = tag ? tag.toUpperCase() : eventType;
			var payload = eventType === "EVENT" ? JSON.parse(event.payload().elementsAsJSON()) : JSON.parse(event.payload().elementsAsJSON().toString());
			var custom_info;
			if ( eventType === "EVENT" && typeof payload.custom_info === "string" ) {
				payload.custom_info = JSON.parse(payload.custom_info);
			}
			uLogger.warning("\n" + tag + "\n" + JSON.stringify(payload,null,4));
		}
		catch(e) {
			uLogger.warning("Utility: Failed to print CEvent object " + e);
		}
	},

	// Time based onstant setting. 
	
	setCacheValue : function(constants,key,value,lifespan) {

		var default_lifespan = -1;
		var default_value = null;

		if ( typeof constants.getClass !== "function" || constants.getClass().toString() !== "class com.moogsoft.moobot.CConstModule" ) {
			uLogger.warning("Utility: setCacheValue: Expected constants module to be passed as the first paramter, returning null");
			uLogger.warning("setCacheValue(constants,key,value,[expiry in seconds])");
			return false;
		}

		if ( !key ) { 
			uLogger.warning("Utility: setCacheValue: Expected a key to be passed");
			uLogger.warning("setCacheValue(constants,key,value,[expiry in seconds])");
			return false;
		}
		if ( typeof value === 'undefined'  ) {
			uLogger.warning("Utility: setCacheValue: No value specified, ignoring");
			return false;
		}
		if ( typeof lifespan === 'undefined'  ) {
			uLogger.info("Utility: setCacheValue: setting non-expiring constant");
			lifespan = -1;
		}

		lifespan = parseInt(lifespan,10);

		if ( isNaN(lifespan) )  {
			uLogger.info("Utility: setCacheValue: invalid lifespan, using default: " + default_lifespan); 
			lifespan = default_lifespan;
		}

		// Work out the bestBefore date
		
		var bestBefore = lifespan !== -1 ? Math.round(Date.now() / 1000) + lifespan : -1 ;
		var jsonValue = { "bestBefore" : bestBefore , "value" : value };

		// For hazelcast safety we will always JSON stringifiy the value (and parse on the get)

		var cacheValue;
		try {
			cacheValue = JSON.stringify(jsonValue);
		}
		catch(e) {
			uLogger.warning("Utility: setCacheValue: Could not convert value to a string - ignoring, erorr: " + e);
			return false;
		}

		// Remove if it is already there.
		if ( constants.get(key) ) {
			constants.remove(key);
		}

		constants.put(key,cacheValue);

		if ( constants.get(key) ) {
			uLogger.debug("Utility: setCacheValue: cached data for key " + key);
		}
		else {
			uLogger.warning("Utility: setCacheValue: Failed to cache data for key " + key);
			return false;
		}
		return true;
	},

	getCacheValue : function(constants,key) {

		if ( typeof constants.getClass !== "function" || constants.getClass().toString() !== "class com.moogsoft.moobot.CConstModule" ) {
			uLogger.warning("Utility: getCacheValue: Expected constants module to be passed as the first paramter, returning null");
			uLogger.warning("getCacheValue(constants,key)");
			return false;
		}

		if ( !key ) { 
			uLogger.warning("Utility: getCacheValue: Expected constants and key, returning null");
			uLogger.warning("getCacheValue(constants,key)");
			return null;
		}

		if ( !constants.contains(key) ) {
			uLogger.debug("Utility: getCacheValue: Key: " + key + " not found, returning null");
			return null;
		}

		var cacheValue = constants.get(key);

		if ( cacheValue === null ) {
			uLogger.debug("Utility: getCacheValue: Value for key: " + key + " not found, returning null");
			return null;
		}

		var returnValue;
		try {
			cacheValue = JSON.parse(cacheValue);
		}
		catch(e) {
			uLogger.warning("Utility: getCacheValue: Failed to parse a value for key: " + key + ", returning null");
			return null;
		}

		// If we have a bestBefore, then check it, if it's -1 then it's not expiring. 

		if ( this.getObjectType(cacheValue) === "object" ) {

			if ( typeof cacheValue.value === 'undefined' ) {
				uLogger.debug("Utility: getCacheValue: Value for key: " + key + " missing, returning null");
				return null;
			}
			returnValue = cacheValue.value;

			if ( cacheValue.bestBefore ) {
				if ( cacheValue.bestBefore !== -1 && ( cacheValue.bestBefore < Math.round(Date.now() / 1000)) ) {
					uLogger.debug("Utility: getCacheValue: Value for key: " + key + " expired, returning null");
					constants.remove(key);
					returnValue = null;
				}
			}
		}
		else {
			returnValue = cacheValue;
		}
		return returnValue;
	},

	// Event to alert delta - returns true if there is 
	// any delta in the fields, or cannot determine the delta 
	// It does not return which field any delta is in.
	// Expects the event and moogdb function.
	// Note: custom_info will be a "light delta" based on JSON.stringify. 

	checkEventDelta : function(moogdb,event,eventFields,drift) {
		
		// Check we are dealing with the right thing

		if ( typeof moogdb.getClass !== "function" || moogdb.getClass().toString() !== "class com.moogsoft.moobot.CMoogDbModuleV2" )  {
			uLogger.warning("checkEventDelta: moogdb passed is not recognised as a moogdbV2 modules : checkEventDelta(moogdb,evemt,[ eventFields ])");
			return true;
		}
			
		var eventType = event.type().description().toUpperCase();

		if ( eventType !== "EVENT" ) {
			uLogger.warning("checkEventDelta: event as not an ELamEvent : checkEventDelta(moogdb,evemt,[ eventFields ])");
			return true;
		}

		if ( !eventFields || !Array.isArray(eventFields) ) {
			uLogger.debug("checkEventDelta: eventFields not an array : checkEventDelta(moogdb,evemt,[ eventFields ])");
			return true;
		}
			
		// Grab the existing alert
		var existingAlert = moogdb.getAlert(event.value("signature"));

		if( !existingAlert ) {
			uLogger.debug("checkEventDelta: No existing alert - no delta");
			return true;
		}

		var eventPayload;
		var alertPayload;

		try {
			eventPayload = JSON.parse(event.payload().elementsAsJSON()) ; 
			alertPayload = JSON.parse(existingAlert.payload().elementsAsJSON().toString());
			// Cater for event custom_info being a string or an object. 
			if ( typeof eventPayload.custom_info === "string" ) {
				eventPayload.custom_info = JSON.parse(eventPayload.custom_info);
			}
		}
		catch(e) {
			uLogger.warning("checEventDelta: Unable to parse event or alert, error: " + e);
			return true;
		}

		// We now should have two native JS object to compare against. 
		// If we stringify them we can also do custom_info.....

		for ( var fIdx = 0 ; fIdx < eventFields.length ; fIdx++ ) {

			var field = eventFields[fIdx];
			var fieldsEqual = false;

			if ( typeof eventPayload[field] === 'undefined' || typeof alertPayload[field] === 'undefined' ) {
				return true; 
			}
			if ( field === "custom_info" ) {
				if ( this.getObjectType(eventPayload.custom_info) === "object" && this.getObjectType(alertPayload.custom_info) === "object" ) {
					try { 
						if ( JSON.stringify(this.sortObject(eventPayload.custom_info)) !== JSON.stringify(this.sortObject(alertPayload.custom_info)) ) {
							return true;
						}
					}
					catch(e) {
						uLogger.warning("checkEventDelta: Unable to parse custom_info for comparison " + e);
						return true;
					}
				}
				else {
					uLogger.info("checEventDelta: Unable to parse custom_info for comparison - expected two objects");
					return true;
				}
			}
			else {
				if ( this.getObjectValue(eventPayload,field) !== this.getObjectValue(alertPayload,field) ) {
					return true;
				}
			}
		}

		// If drift is defined check the agent_time of the event against the last_event_time for the alert
		// if these are within the drift (and all other checked fields are equal) then return false
		// other wise retun true to let the event through.

		if ( typeof drift !== 'undefined' && /^\d+$/.test(drift) ) {
				
			var eventTime = eventPayload.agent_time ? eventPayload.agent_time : "eventTime";
			var alertTime = alertPayload.last_event_time ? alertPayload.last_event_time : "agentTime";
			var driftMsg = "checkEventDelta: Drfit check - eventTime: " + eventTime + " alertTime: " +  alertTime + " drift: " + drift;

			if ( (alertTime + drift ) >= eventTime ) {
				driftMsg += " within drift - assuming a duplicate";
				uLogger.debug(driftMsg);
				return false;
			}
			else {
				driftMsg += " outside  drift - assuming valid";
				uLogger.debug(driftMsg);
				// Alert has all matching fields, but is outside the drift time.
				return true;
			}
		}

		// Return false - i.e. all fields were equal, and no drift check. 

		return false;
	},

	sortObject : function(obj) {
		var objKeys = Object.keys(obj).sort();
		var result = {};
		for ( var objIdx = 0 ; objIdx < objKeys.length ; objIdx++) {
			var key = objKeys[objIdx];
			if ( typeof obj[key] === "object" && obj[key] !== null ) {
				result[key] = this.sortObject(obj[key]);
			}
			else {
				result[key] = obj[key];
			}
		}
		return result;
	},

	isPopulatedList : function(a) {
		return typeof a !== 'undefined' && Array.isArray(a) && a.length > 0 ? true : false;
	},

	//
	// Array functions. 
	//

	arraySortAlpha : function(a) {
		if ( !Array.isArray(a) ) {
			return a;
		}
		return a.sort(function(c,d) { 
			return c.toLowerCase().localeCompare(d.toLowerCase()); 
		});
	},

	arraySortNum : function(a) {
		if ( !Array.isArray(a) ) {
			return a;
		}
		// Discard non-numerics.
		var b = a.filter(function(e) {
					return typeof e === 'number';
		});
		if ( b.length === 0 ) {
			return null;
		}
		return (b.sort(function(a,b) {
			return a - b;
		}));         
	},

	arrayMin : function(a) {
		if ( !Array.isArray(a) ) {
			return a;
		}
		if ( a.length === 0 ) {
			return null;
		}
		// Discard non-numerics.
		var b = a.filter(function(e) {
			return typeof e === 'number';
		});
		if ( b.length === 0 ) {
			return null;
		}
		return (b.sort(function(a,b) {
			return a - b;
		})[0]);         
	},

	arrayMax : function(a) {
		if ( !Array.isArray(a) ) {
			return a;
		}
		if ( a.length === 0 ) {
			return null;
		}
		// Discard non-numerics.
		var b = a.filter(function(e) {
					return typeof e === 'number';
		});
		if ( b.length === 0 ) {
			return null;
		}
		return (b.sort(function(a,b) {
					return a - b;
		}).reverse()[0]); 
	},

	arrayAve : function(a) {
		if ( !Array.isArray(a) ) {
			return a;
		}
		if ( a.length === 0 ) {
			return null;
		}
		// Discard non-numerics.
		var b = a.filter(function(e) {
			return typeof e === 'number';
		});
		if ( b.length === 0 ) {
			return null;
		}
		var t = b.reduce(function(c,d) {
					return c + d;
				});
		return Math.round( t / b.length);
	},

	arraySum : function(a) {
		if ( !Array.isArray(a) ) {
			return a;
		}
		if ( a.length === 0 ) {
			return null;
		}
		// Discard non-numerics.
		var b = a.filter(function(e) {
					return typeof e === 'number';
		});
		if ( b.length === 0 ) {
			return null;
		}
		var t = b.reduce(function(c,d) {
					return c + d;
				});
		return t;
	},

    uniqArray: function(a) {
		if ( !Array.isArray(a) || a.length === 0 ) { return a ; }
		var uArray=[];
		for (var aIdx=0; aIdx< a.length ; aIdx++ ) {
			if ( uArray.indexOf(a[aIdx]) === -1 ) {
				uArray.push(a[aIdx]);
			}
		}
		return uArray;
	},

	lowerArray : function(a) {
		if ( !Array.isArray(a) || a.length === 0 ) { return a ; }
		a = a.map(function(e) {
				return  typeof e === "string" ? a.toLowerCase() : a;
			});
		return a;
	},

	// Check an event and repair if possible. 

	checkEvent : {
	
		// Limits

		checkDate : this.checkDate,
		maxChars : this.maxChars,
		epochDate : this.epochData,

		maxLength : 3000,
		maxCILength : 10000,
		defaultValue : "Unknown",
		defaultSeverity : 1,

		setMaxLength : function(len) {
			this.maxLength = typeof l === 'number' && len > 0 ? len : this.maxLength;
		},
		setMaxCILength : function(len) {
			this.maxCILength =  typeof l === 'number' && len > 0 ? len : this.maxCILength;
		},
		setDefaultValue : function(val) {
			this.defaultValue = val ? val : this.defaultValue;
		},
		setDefaultSeverity : function(val) {
			this.defaultSeverity = val ? val : this.defaultSeverity;
		},
		checkLength : function(val,maxLength) {
			if ( val && typeof val === "string" ) {
				if ( val.length > maxLength ) {
					return false;
				}
			}
			if ( val && typeof val === "object" ) {
				// Stringify and check. 
				var stringVal;
				try {
					stringVal = JSON.stringify(val);
				}
				catch(e) {
					uLogger.warning("checkEvent::validateEvent: Failed to stringify a length check value: " + e);
					return false;
				}
				if ( stringVal.length > maxLength ) {
					return false;
				}
			}
			return true;
		},
		validateEvent : function(event,bo) { 

			var defaultValue = this.defaultValue;
			var payload = {};
			var nullCheck = [ 
				"source",
				"source_id",
				"external_id",
				"description",
				"manager",
				"class",
				"signature",
				"agent",
				"agent_location",
				"type",
				"severity",
				"agent_time"
			];

			// We only have two fields that must be integers 
			var intCheck = [ 
				"severity",
				"agent_time"
			];

			// Do a null and definition check 

			nullCheck.forEach(function(field) {
				if ( event.value(field)  === null ) {
					uLogger.warning("checkEvent::validateEvent: null check: " + field + " is not defined or is null, using " + defaultValue );
					event.set(field,defaultValue);
				}
				else {
					uLogger.debug("checkEvent::validateEvent: null check: " + field + ":  passed ");
				}
			});

			// We only have two fields that must be integers 
			// agent_time, severity 

			var severity = event.value("severity");
			if ( typeof severity !== 'number' ) {
				// Try a parseInt...
				severity = parseInt(severity,10);
			}
			if ( isNaN(severity) || severity < 0 || severity > 5 ) {
				uLogger.warning("checkEvent::validateEvent: severity check: severity is not valid, using default: " + this.defaultSeverity );
				event.set("severity",this.defaultSeverity);
			}

			// Agent time 

			var agentTimeValid = bo.checkDate(event.value("agent_time"),900);
			if ( !agentTimeValid ) {
				uLogger.warning("checkEvent::validateEvent: agent_time check failed - setting to 'now'");
				event.set("agent_time",bo.epochDate());
			}

			// Do length checks. 

			if ( !this.checkLength(event.value("description"),this.maxLength) ) {
				uLogger.warning("checkEvent::validateEvent: description too long ( >" + this.maxLength + ") - truncating");
				event.set("description", "[Truncated]: " + bo.maxChars(event.value("description",maxLength)) + "...");
			}
			if ( !this.checkLength(event.value("custom_info"),this.maxCILength) ) {
				uLogger.warning("checkEvent::validateEvent: custom_info too long ( >" + this.maxCILength + ") - truncating to base");
				var newCI = bo.createBaseCustomInfo();
				newCI.mooghandling.truncated = true;
				event.set("custom_info", JSON.stringify(newCI));
			}

			// Empty overflow if it's not already an empty string. 

			if ( event.value("overflow") ) {
				event.set("overflow","");
			}
		}

	},
	
	updateCustomInfoValue : function(src,dst,fields) {

		// Update one or more custom info valuse from one
		// object to another. 

		// fields is a list of custom_info fields.
		// botUtil.updateCustomInfoValue(event,alert,[ "eventDetails.isRootCause" ]);

		if ( !this.isPopulatedList(fields) ) {
			uLogger.warning("updatCustomInfoValue: Expected a list of fields [...] to change");
			return false;
		}

		// Get the type and extract custom_info. 

		var srcType = src.type().description().toUpperCase() || null;
		var dstType = dst.type().description().toUpperCase() || null;

		if ( !srcType || !dstType ) {
			uLogger.warning("updatCustomInfoValue: Unable to determine the type of the soruce or destination");
			return false;
		}

		var srcCustomInfo = srcType === "EVENT" ? this.getEventCustomInfo(src) : src.getCustomInfo();
		var dstCustomInfo = dstType === "EVENT" ? this.getEventCustomInfo(dst) : dst.getCustomInfo();

		if ( !srcCustomInfo ) {
			srcCustomInfo = {};
		}
		if ( !dstCustomInfo ) {
			dstCustomInfo = {};
		}
		
		var didUpdate = false;

		for ( var fIdx = 0; fIdx < fields.length; fIdx++ ) {

			var fieldName = fields[fIdx].replace(/^custom_info\./,"");
			uLogger.debug("updatCustomInfoValue: Attemptig to update " + fieldName);
				
			// Is this defined in the src ? 

			if ( !this.isObjectDefined(srcCustomInfo,fieldName) ) {
				uLogger.info("updatCustomInfoValue: src value not found, skipping");
				continue;
			}

			var srcValue = this.getObjectValue(srcCustomInfo,fieldName);
			var dstValue;

			// Always just replace objects. 
			// Only update if they are different (values or types) 

			if ( !this.isObjectDefined(dstCustomInfo,fieldName) || typeof srcValue === "object" ) {
				this.addObject(dstCustomInfo,fieldName,srcValue,false);
				uLogger.debug("updatCustomInfoValue: Replaced object " + fieldName + " with : " + JSON.stringify(srcValue));
				didUpdate = true;
			}
			else {
				dstValue = this.getObjectValue(dstCustomInfo,fieldName);
				if ( (typeof srcValue !== typeof dstValue) || (srcValue !== dstValue) ) {
					uLogger.debug("updatCustomInfoValue: Replaced value " + fieldName +  " with : " + srcValue);
					this.addObject(dstCustomInfo,fieldName,srcValue,false);
					didUpdate = true;
				}
			}
		}

		if ( didUpdate ) {
			dst.setCustomInfo(dstCustomInfo);
		}
		return didUpdate;
	},

	getEventCustomInfo : function(event) {

		// Extract custom_info from an EVENT only (e.g. from a LAM) 
		// cope with either a string or an object. 

		var event_custom_info = {};
		var eventType = event.type().description().toUpperCase();

		if ( eventType !== "EVENT" ) {
			uLogger.warning("getEventCustomInfo: Attempt to extract event custom_info from a CEvent that is not an ELAMEVENT");
			return event_custom_info;
		}

		try {
			var payload = JSON.parse(event.payload().elementsAsJSON());
			if ( typeof payload.custom_info === "string" ) {
				event_custom_info = JSON.parse(payload.custom_info);
			}
			else if ( typeof payload.custom_info === "object" && payload.custom_info !== null ) {
				event_custom_info = payload.custom_info;
			}
			else {
				event_custom_info = {};
			}
		}
		catch(e) {
			uLogger.warning("getEventCustomInfo: Failed to extract custom_info " + e);
		}
		return event_custom_info;
	},

	generateIngestEvent : function(event,description) {

		var payload;
		var eventType = event.type().description().toUpperCase();
		if ( eventType !== "EVENT" ) {
			uLogger.warning("generateIngestEvent: Attempt to send an ingest error from a non-lam source");
			return false;
		}

		// Stringify the current event as it stands to add as custom_info to this event. 

		var myUUID = this.generateUUID();
		uLogger.warning("ERROR: Event was discarded due to an ingestion error, " + description + " an alert with a source_id of " + myUUID + " details the event");
		this.printCEvent(event,"INGESTION ERROR Event contents for event ID" + myUUID);

		try {
			payload = JSON.parse(event.payload().elementsAsJSON());
		}
		catch(e) {
			uLogger.warning("Utility: Failed to stringify event object " + e);
		}
	
		this.setCustomInfo(event,payload);

		// Set the standard fields.

		event.set("overflow","");
		event.set("signature","IngestError" + "::" + myUUID);
		event.set("source",event.value("agent"));
		event.set("source_id",myUUID);
		event.set("external_id",myUUID);
		event.set("description",description + ", please check custom_info and the lam log for the original event details (search for " + myUUID + " in the logfile");
		event.set("class","Moogsoft");
		event.set("type","IngestError");
		event.set("agent",event.value("agent"));
		event.set("agent_location","LAM");
		event.set("agent_time",this.epochDate());
		event.set("severity",5);
		event.set("manager","Moogsoft");

		return;
	},

	checkCustomInfoPath : function(obj,path) {
		// SAFE-10 JIRA
		var keys = path.split('.');
		var lastItem=keys.length - 1;
		var lastItemName = keys.pop();
		var pathAdded = false;

		// Ensure the path to the target exists.

		for (var i = 0; i < lastItem; i++) {
			var objToCheck = keys[i];
			if ( typeof obj[objToCheck] === 'undefined' ) {
				obj[objToCheck] = {};
				pathAdded = true;
			}
			obj=obj[objToCheck];
		}
		return pathAdded;
	},

	checkAndAddCustomInfoValue: function(cevent,path,value) {

		// Remove leading custom_info. 
		path = path.replace(/^custom_info\./,"");
		var ceventType = cevent.type().description().toUpperCase() || null;
		var ci = ceventType === "EVENT" ? this.getEventCustomInfo(cevent) : cevent.getCustomInfo();
		if ( !ci ) {
			ci = {};
		}
		var pathAdded;
		if ( ceventType !== "EVENT" ) {
			pathAdded = this.checkCustomInfoPath(ci,path);
			if ( pathAdded ) {
				cevent.setCustomInfo(ci);
			}
			var addedOk = cevent.setCustomInfoValue(path,value);
			return addedOk;
		}
		else {
			// Lam events need a little different approach. 
			// We only want to add the last key
			var keys = path.split('.');
			var lastItem=keys.length - 1;
			var lastItemName = keys.pop();
			var obj = ci;

			// Ensure the path to the target exists.

			for (var i = 0; i < lastItem; i++) {
				var objToCheck = keys[i];
				if ( typeof obj[objToCheck] === 'undefined' ) {
					obj[objToCheck] = {};
				}
				obj=obj[objToCheck];
			}
			obj[lastItemName] = value;
			cevent.set("custom_info",ci);
		}
	},

	getCustomInfoValue : function(cevent,path) {
			
		// Get a single custom_info key with all the intermediate checking. 

		path = path.replace(/^custom_info\./g,"");
		var ceventType = cevent.type().description().toUpperCase() || null;
		var custom_info = ceventType === "EVENT" ? this.getEventCustomInfo(cevent) : cevent.getCustomInfo();
		if ( !custom_info ) {
			custom_info = {};
		}
		return this.getObjectValue(custom_info,path);
	},

	checkConfig : function(config,requiredConfigItems) {

		// Check the config items exist in the "remedy" key.
		if ( !config || !Array.isArray(requiredConfigItems) || this.getObjectType(config) !== 'object'  ) {
			uLogger.warning("configCheck: Expected a list of required config items and a 'config' object");
			return false;
		}
		for (  var itIdx = 0 ; itIdx < requiredConfigItems.length; itIdx++ ) {
			var item = requiredConfigItems[itIdx];
			if ( !this.getObjectValue(config,item) )  {
				uLogger.warning("configCheck: Required config item " + item + " not found in the config object, cannot continue");
				return false;
			}
		}
		return true;
	},

	getCEventDetails : function(cevent) {

		// Return a normalised type and id for a CEvent object. 

		var eventType = cevent.type().description().toLowerCase();

		var eventTypes = {
			"alert" :  { type: "alert" , id: cevent.value("alert_id") , action: "create" },
			"alertupdate" : { type: "alert" , id: cevent.value("alert_id") , action: "update" },
			"alertclose" : { type: "alert" , id: cevent.value("alert_id") , action: "close" },
			"sig" : { type: "situation" , id: cevent.value("sig_id") , action: "create" },
			"sigupdate" : { type: "situation" , id: cevent.value("sig_id") , action: "update" },
			"sigclose" : { type: "situation" , id: cevent.value("sig_id") , action: "close" },
			"newthreadentry" : { type: "thread" , id: cevent.value("sig_id") , action: "create" },
			"event" : { type: "lam" , id: null , action: null }
		};

		return typeof eventTypes[eventType] ? eventTypes[eventType] : { type : null , id: null, action: null };
	},

	getCEventValue : function(cevent,mappedValue) {

		// Return a value from the cevent object, or null.

		var value = null;
		if ( /^custom_info\./i.test(mappedValue) ) {
			value = this.getCustomInfoValue(cevent,mappedValue);
			if ( typeof value === 'undefined' ) {
				value = null;
			}
		}
		else {
			value = cevent.value(mappedValue);
		}
		return value;
	},

	copyFromAlertToEvent : function(event,fields) {

		// Copy fields from an existing alert to an event.

		var eventType = this.getCEventDetails(event);
		if ( eventType.type !== "lam" ) {
			uLogger.debug("copyFromAlertToEvent: Expected a lam event as the first parameter");
			return false;
		}
		if ( !this.isPopulatedList(fields) ) {
			uLogger.debug("copyFromAlertToEvent: Expected a list of feidls to update");
			return false;
		}

		// Grab the existing alert
		var existingAlert = moogdb.getAlert(event.value("signature"));

		if( !existingAlert ) {
			uLogger.debug("copyFromAlertToEvent: No existing alert - no delta");
			return true;
		}

		for ( var fIdx = 0; fIdx < fields.length ; fIdx++ ) {

			var alertValue;
			if ( /^custom_info\./.test(fields[fIdx]) ) {
				alertValue = this.getCustomInfoValue(existingAlert,fields[fIdx]);
				if ( alertValue !== null ) {	 
					uLogger.debug("copyFromAlertToEvent: updating " + fields[fIdx] + " with the corresponding value " + JSON.stringify(alertValue) + " from the alert");
					this.checkAndAddCustomInfoValue(event,fields[fIdx],alertValue);
				}
			}
			else {
				alertValue = existingAlert.value(fields[fIdx]);
				if ( alertValue !== null ) {	 
					uLogger.debug("copyFromAlertToEvent: updating " + fields[fIdx] + " with the corresponding value " + JSON.stringify(alertValue) + " from the alert");
					event.set(fields[fIdx],alertValue);
				}
			}
		}
	},
		
	updateCEvent : function(moogdb,cevent) {
		
		// Update an cevent with the correct method. 
		var cType = this.getCEventDetails(cevent);
		if ( cType.type === "alert" ) {
			moogdb.updateAlert(cevent);
		}
		if ( cType.type === "situation" ) {
			moogdb.updateSituation(cevent);
		}
	},

	checkSubscriber : function(correlationInfo,serviceName) {

		// Check to see if a specfic serviceName is interested in this situation. 

		var linkedItems = [];

		if ( !correlationInfo || !serviceName  ) {
			return linkedItems;
		}
		if ( typeof correlationInfo[serviceName] !== 'undefined' ) {
			
			// Service is linked to correlation info.
			// Send back the list of keys. 
			linkedItems = Object.keys(correlationInfo[serviceName]); 
			return linkedItems;
		}
		return linkedItems;
	} 
		
    };
    var F=function() {};
    F.prototype=self;
    return( new F() );
}


function LamUtility() {
	return( new BotUtility() );
}
