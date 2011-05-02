// Copyright (c) 2011, Elijah Saounkine
// Released under the MIT license
//
// --------------------------------------------------------------------
//
// This is a Greasemonkey user script.
//
// --------------------------------------------------------------------
//
// ==UserScript==
// @name          Ouroboros
// @description   script enabling stats and extra stuff making work with Google Scholar better
// @include       http://scholar.google.*/*
// ==/UserScript==

// CONSTANTS

var serviceURL = "http://scholar.google.com";
var SHOW_CITED_PARAM_KEY = "cites"; // when this param exists, it means that request was made to show citing documents
var SEARCH_IN_CITED_PARAM_KEY = "scipsc", // this param when equal to SEARCH_IN_CITED_PARAM_VALUE means that SEARCH was conducted in cited results
	SEARCH_IN_CITED_PARAM_VALUE = "1";
var BIBTEX_URL = "/scholar.bib?";

var placeholder = "<img src='http://db.uop.gr:8080/huyoogle/img/spinner.gif' style='width:13px; height:13px;' title='Loading self referencing citations...'/>";
var bibtexLinkParamKey = "bibLink"; //this param is inserted into the cited link
var statsPlaceholder = "stats";
var rowPlaceholder = "row";
var exclusiveSearchTypeKey = "xtype";//this param tells the 'search in cited' page that search was performed exclusively in self/hetero references
var heteroColor = "1D9BF5";
var heteroColor2 = "B8DBF5";
var selfColor = "F51D41";
var selfColor2 = "F5B8BE";

var groupRe = /<span class="gs_fl">(.*?)<\/span>/g;//g makes it "global" (i.e. not just the first match, like replaceAll in java)
var citesRe = /[^"]*cites=[^"]*/;
var citesArgsRe = /<a href="(.*?\?cites=(.+?)&.*?)".*?>.*?([0-9]+).*?<\/a>/;
var bibtexRe = /[^"]*q=info\:(.*?)\:[^"]*/;
var resultCountRe = /(<font size=\"?-1\"?>.*?<b>[0-9]*<\/b> - <b>[0-9]*<\/b>.*?<b>([0-9\.,]*)<\/b>)/;
var totalCitesRe = /(<a href=")([^"]*\?cites=(.+?)&.*?)(".*?\/a>)(.*?\?q=info:)(.*?)(:.*?)/g;//this is used to put placeholders on the whole page
var authorsRe = /author={(.*?)},/;

// FUNCTIONS

// utils
function getParam(queryString, parameterName) {
	// add "=" to the parameter name (i.e. parameterName=value)
	var parameterName = parameterName + "=";
	if(queryString.length > 0) {
		// find the beginning of the string
		begin = queryString.indexOf(parameterName);
		// if the parameter name is not found, skip it, otherwise return the value
		if(begin != -1) {
			// add the length (integer) to the beginning
			begin += parameterName.length;
			// multiple parameters are separated by the "&" sign
			end = queryString.indexOf("&", begin);
			if(end == -1) {
				end = queryString.length
			}
			// return the string
			return unescape(queryString.substring(begin, end));
		}
	}
	// return null if no parameter was found
	return null;
}
/*
function getXMLObject() {
	var xmlHttp = false;
	try {
		xmlHttp = new ActiveXObject("Msxml2.XMLHTTP");// For Old Microsoft Browsers
	}
	catch (e) {
		try {
			xmlHttp = new ActiveXObject("Microsoft.XMLHTTP");// For Microsoft IE 6.0+
		}
		catch (e2) {
			xmlHttp = false;// No Browser accepts the XMLHTTP Object then false
		}
	}
	if (!xmlHttp && typeof XMLHttpRequest != 'undefined') {
		xmlHttp = new XMLHttpRequest();//For Mozilla, Opera Browsers
	}
	return xmlHttp;// Mandatory Statement returning the ajax object created
}

var xmlhttp = new getXMLObject();//xmlhttp holds the ajax object
*/
// use this method for asynchronous communication
function doRequest(params, callback) {
	params = serviceURL + normalizeLink(params);
	GM_log("Requesting: " + params);
	GM_xmlhttpRequest({
		method: "GET",
		url: params,
		headers: {
			//"User-Agent": "Mozilla/5.0",
			"Accept": "text/xml",
			"Content-Type": "application/x-www-form-urlencoded"
		},
		onload: function(response) {
			updateRequestCount(1);
			// Inject responseXML into existing Object if not present
			if (!response.responseXML) {
				response.responseXML = new DOMParser().parseFromString(response.responseText, "text/xml");
			}
			GM_log([
				response.status,
				response.statusText,
				response.readyState,
				response.responseHeaders,
				response.responseText,
				response.finalUrl,
				response.responseXML
			].join("\n"));
			callback(response.responseText);
		}
	});
	/*
	if (xmlhttp) {
		params = normalizeLink(params);
		//var URL = "http://127.0.0.1:7101/UoP-Ouroboros-context-root/servlet/ReferenceCounter?" + params;
		GM_log("Requesting: " + serviceURL + params);
		xmlhttp.open("POST", serviceURL + params, true);
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4) {
				
				if (xmlhttp.status == 200) {
					callback(xmlhttp.responseText);
				}
				else {
					GM_log("Error retrieving information (status = " + xmlhttp.status + ")");
				}
			}
		};
		//xmlhttp.setRequestHeader('Origin', 'http://scholar.google.com'); 
		xmlhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		xmlhttp.send(null);
	}
	*/
}

function doArraysIntersect(first, second) {
	for(var i = 0; i < first.length; i++) {
		for(var j = 0; j < second.length; j++) {
			if(first[i] == second[j]) {
				return true;
			}
		}
	}
	return false;
}

function normalizeLink(link) {
	return link.replace(/\&amp;/g, "&");
}

function extractBibtexLinkFromText(text) {
	var bibtexMatch = bibtexRe.exec(text);
	if(bibtexMatch == null) {
		alert("Enable BibTeX import link in Bibliography Manager in Scholar Preferences");
		return null;
	}
	return bibtexMatch;
}

function extractResultCountFromPage(content, addText) {
	var results = 0;
	var match;
	if(match = resultCountRe.exec(content)) {
		results = match[2];
		results = results.replace(/[\.,]/, "");
	}
	return results;
}

function clusterLinkToCitedLink(clusterLink, bibtexInfoParam) {
	return clusterLink.replace("cluster", "cites") + "&" + bibtexLinkParamKey + "=" + bibtexInfoParam;// + "&" + SEARCH_IN_CITED_PARAM_KEY + "=" + SEARCH_IN_CITED_PARAM_VALUE;
}

function relatedLinkToBibtexLink(relatedLink) {
	relatedLink = relatedLink.replace(/:scholar\.google\.com\//, ":scholar.google.com/&output=citation");
	relatedLink = relatedLink.replace(/q=related/, "q=info");
	relatedLink = relatedLink.replace(/.*?\/scholar\?/, BIBTEX_URL);
	return relatedLink;
}

function updateRequestCount(addToCount) {
	//update the global request counter
	totalRequestCounter += addToCount * 1;
	GM_setValue("totalRequestsCounter", totalRequestCounter);
	//update the local request counter
	var requestCount = document.getElementById('requestCount');
	requestCount.innerHTML = parseInt(requestCount.innerHTML) + addToCount * 1;
	var executionTime = document.getElementById('executionTime');
	executionTime.innerHTML = (new Date().getTime() - startTime);
}

/*
 * This script assumes that the period before resetting the lock on an IP/session for too much requests is 8 hours.
 */
var oneHour = 1000 * 60 * 60;
var amountOfRequestsPerPeriod = 200;
var periodHours = 8;
function getTotalRequestCounter() {
	var lastRequestDate = GM_getValue("totalRequestsDate", startTime) * 1;
	//update the time of last request
	GM_setValue("totalRequestsDate", "" + startTime);
	//calculate the difference from previous request
	if(Math.ceil((startTime - lastRequestDate) / oneHour) >= periodHours) {
		//if the difference is more than 8 hours, then discard the counter to zero
		GM_setValue("totalRequestsCounter", 0);
	}
	return GM_getValue("totalRequestsCounter", 0);
}

function extractAuthorsFromBibtexContext(bibtexContext) {
	var match;
	if(match = authorsRe.exec(bibtexContext)) {
		//normalize the authors
		authors = match[1].replace(/[\.,]/g, "").split(" and ");
		return authors;
	}
	else {
		return null;
	}
}

function sign() {
	document.body.innerHTML = document.body.innerHTML.replace(/(©\d{4} Google)/, "<font style='color:red;'>$1 + Ouroboros script<br/>Processed in <span id='executionTime'>" + (new Date().getTime() - startTime) + "</span> msec by making just <span id='requestCount'>1</span> requests<br/>Total requests by the script: " + totalRequestCounter + " / " + amountOfRequestsPerPeriod + " in " + periodHours + " hours</font>");//
}

// FLOW FUNCTIONS

// function that actually fetches the citation count and shows it in the placeholder.
// params: bibtex link (i.e. http%3A%2F%2Fscholar.google.com%2F%2Fscholar.bib%3Fq%3Dinfo%3AYtSImgx2GVsJ%3Ascholar.google.com%2F%26output%3Dcitation%26amp%3Bhl%3Del%26amp%3Boe%3DGreek%26amp%3Bas_sdt%3D0%2C5), cited link (i.e. %2Fscholar%3Fcites%3D6564407728373552226%26amp%3Bas_sdt%3D2005%26amp%3Bsciodt%3D0%2C5%26amp%3Bhl%3Del%26amp%3Boe%3DGreek), placeholder element id (should be added, it doesn't exist by default)
function fetchReferenceCounters(bibtexLink, citedLink, totalCited, whenDone) {
	GM_log("Fetching ref counts for: " + bibtexLink + ", " + citedLink + ", " + totalCited);
	//the first request will respond with a bibtex block containing the authors
	doRequest(bibtexLink, function (bibtexContext) {
		//response contains a bibtex syntax extract. need to retrieve authors from there and then query up the citations.
		var authors = extractAuthorsFromBibtexContext(bibtexContext);
		if(authors) {
			var selfRefQuery = "";
			var heteroRefQuery = "";
			for(var i = 0; i < authors.length; i++) {
				selfRefQuery += (i > 0? " OR " : "") + "author:\"" + authors[i] + "\"";
				heteroRefQuery += " -author:\"" + authors[i] + "\"";
			}
			//create links for self-hetero-referencing citations
			var heteroRefLink = citedLink + "&" + SEARCH_IN_CITED_PARAM_KEY + "=" + SEARCH_IN_CITED_PARAM_VALUE + "&xtype=hetero&q=" + encodeURI(heteroRefQuery);
			var selfRefLink = citedLink + "&" + SEARCH_IN_CITED_PARAM_KEY + "=" + SEARCH_IN_CITED_PARAM_VALUE + "&xtype=self&q=" + encodeURI(selfRefQuery);
			//citedLinksArray.push(heteroRefLink);
			doRequest(heteroRefLink, function (heteroCitedContext) {
				var heteroReferences = extractResultCountFromPage(heteroCitedContext);
				//total cited will be given 'null' when the call comes from enhanceCitedPage
				if(totalCited != null) {
					var selfReferences = (totalCited * 1) - heteroReferences;
					GM_log("total references: " + totalCited + "\nself referencing quotes: " + selfReferences + "\nhetero referencing quotes: " + heteroReferences);
					whenDone(heteroReferences, heteroRefLink, selfReferences, selfRefLink, authors);
				} 
				else {
					doRequest(selfRefLink, function(selfCitedContext) {
						selfReferences = extractResultCountFromPage(selfCitedContext);
						totalCited = heteroReferences * 1 + selfReferences * 1;
						GM_log("total references: " + totalCited + "\nself referencing quotes: " + selfReferences + "\nhetero referencing quotes: " + heteroReferences);
						whenDone(heteroReferences, heteroRefLink, selfReferences, selfRefLink, authors);
					});
				}
			});
		}
		else {
			whenDone(null, null, null, null, null);
		}
	});
}

function traverseMatches() {
	if(matchArray.length > 0) {
		var item = matchArray.shift();
		var citedArgs = citesArgsRe.exec(item);
		if(citedArgs != null) {
			var citedLink = citedArgs[1];
			var bibtexLink = extractBibtexLinkFromText(item)[0];
			fetchReferenceCounters(bibtexLink, citedLink, citedArgs[3], function(heteroReferences, heteroRefLink, selfReferences, selfRefLink, authors) {
				document.getElementById(statsPlaceholder + citedArgs[2]).innerHTML = 
					"<font style='font-weight:bold; color:red;'>(" + 
					(heteroReferences != null? 
						"<a href='" + heteroRefLink + "'>hetero " + heteroReferences + "</a> / <a href='" + selfRefLink + "'>self " + selfReferences + "</a>" 
						: "No match!"
					)+ 
					")</font>";
				//document.getElementById(rowPlaceholder + citedArgs[2]).style.backgroundColor = "#999999";
				traverseMatches();
			});
		}
		else {
			traverseMatches();
		}
	}
}

// parse the page to locate all cited-related links (bibtext and cited are the ones needed), query up self/hetero citations and show the stats
var matchArray;
function addSelfReferencingCountsToAllResults(content) {
	//show spinner to indicate busy
	document.body.innerHTML = content.replace(totalCitesRe, "$1$2&" + bibtexLinkParamKey + "=$6$4 <span id='" + statsPlaceholder + "$3'>" + placeholder + "</span>$5$6$7");
	matchArray = new Array();
	var match;
	while(match = groupRe.exec(content)) {
		matchArray.push(match[1]);
	}
	traverseMatches();
}

function onStatsFetched(allRefString, heteroReferences, heteroRefLink, selfReferences, selfRefLink, exclusiveSearchType, selfAuthors, startAt) {
	//add stats and a self/hetero filter to the page
	document.getElementById('refFilter').innerHTML = "<select onchange='self.location.href = this.options[this.selectedIndex].value;'>" +
		"<option value='" + allRefString + "' " + (exclusiveSearchType == null? "selected" : "") + ">All citations</option>" +
		"<option value='" + heteroRefLink + "' style='background-color:#" + heteroColor + "' " + (exclusiveSearchType == "hetero"? "selected" : "") + ">Hetero</option>" +
		"<option value='" + selfRefLink + "' style='background-color:#" + selfColor + "' " + (exclusiveSearchType == "self"? "selected" : "") + ">Self</option>" +
	"</select>";
	document.getElementById('refStats').innerHTML = "<font style='font-weight:bold; color:black;'>(<span style='color:#" + heteroColor + "'>hetero " + heteroReferences + "</span> / <span style='color:#" + selfColor + "'>self " + selfReferences + "</span>)</font>";
	//mark rows to distinguish hetero and self referencing citations
	GM_log("original publication authors: " + selfAuthors);
	if(exclusiveSearchType == null) {
		markRows(startAt? startAt : 0, selfAuthors);
	}
}

function markRows(rowIndex, selfAuthors) {
	GM_log("marking row #" + rowIndex);
	var nextRow = document.getElementById("mr" + rowIndex);
	if(nextRow) {
		var bibtexLink = extractBibtexLinkFromText(nextRow.innerHTML)[0];
		if(bibtexLink) {
			doRequest(bibtexLink, function(bibtexContext) {
				var authors = extractAuthorsFromBibtexContext(bibtexContext);
				if(authors) {
					GM_log("citing publication authors: " + authors);
					nextRow.style.backgroundColor = (doArraysIntersect(authors, selfAuthors)? selfColor2 : heteroColor2);
				}
				markRows(rowIndex+1, selfAuthors);
			});
		}
		else {
			markRows(rowIndex+1, selfAuthors);
		}
	}
}

var resultRowRe = /<div class="?gs_r"?>/mig;

function enhanceCitedPage(queryString) {
	var startAt = getParam(queryString, "start") * 1;
	//create placeholders for reference stats, filters, row markup
	var rows = document.body.innerHTML.split(resultRowRe);
	document.body.innerHTML = rows[0];
	for(var i = 1; i < rows.length; i++) {
		document.body.innerHTML += "<div class=\"gs_r\" id='mr" + (startAt + i-1) + "'>" + rows[i];
	}
	document.body.innerHTML = document.body.innerHTML.replace(resultCountRe, "$1 <span id='refStats'>" + placeholder + "</span>");
	document.body.innerHTML = document.body.innerHTML.replace(/(<a.*?\/scholar_alerts.*?SPRITE_scholar_envelope)/, "<span id='refFilter'>" + placeholder + "</span>&nbsp;&nbsp;$1");
	var exclusiveSearchType = getParam(queryString, exclusiveSearchTypeKey);
	GM_log("showing only " + exclusiveSearchType);
	if(exclusiveSearchType != null) {
		var floatingShit = document.createElement("div");
		floatingShit.setAttribute("style", "position:fixed; top:0px; left:40%; display:block;");
		floatingShit.innerHTML = "<span style='font-weight:bold; color:red;'>" + ("showing only " + exclusiveSearchType + " references").toUpperCase() + "</span>";
		document.body.appendChild(floatingShit);
		//mark rows straight away
		var nextRow;
		var rowIndex = 0;
		while(nextRow = document.getElementById("mr" + rowIndex++)) {
			nextRow.style.backgroundColor = (exclusiveSearchType == "self"? selfColor2 : heteroColor2);
		}
	}
	//enrich result counter on the page and add filters
	var bibtexInfoParam = getParam(queryString, bibtexLinkParamKey);
	var clusterLinkRe = new RegExp("\"([^\"]*cluster=" + getParam(queryString, "cites") + ".*?)\"");
	var clusterLink = clusterLinkRe.exec(document.body.innerHTML)[1];
	if(bibtexInfoParam != null) {
		var bibtexLink = "/scholar.bib?q=info:" + bibtexInfoParam + ":scholar.google.com/&output=citation";
		fetchReferenceCounters(bibtexLink, clusterLinkToCitedLink(clusterLink, bibtexInfoParam), null, function (heteroReferences, heteroRefLink, selfReferences, selfRefLink, authors) {
			onStatsFetched(clusterLinkToCitedLink(clusterLink, bibtexInfoParam), heteroReferences, heteroRefLink, selfReferences, selfRefLink, exclusiveSearchType, authors, startAt);
		});
	}
	else {
		//find out the bibtex link for this article
		doRequest(clusterLink, function(clusterContext) {
			var bibtexInfo = extractBibtexLinkFromText(clusterContext);
			//the authors of the article under investigation are fetched by the fetchReferenceCounters function
			//report self/hetero references
			fetchReferenceCounters(bibtexInfo[0], clusterLinkToCitedLink(clusterLink, bibtexInfo[1]), null, function (heteroReferences, heteroRefLink, selfReferences, selfRefLink, authors) {
				onStatsFetched(clusterLinkToCitedLink(clusterLink, bibtexInfo[1]), heteroReferences, heteroRefLink, selfReferences, selfRefLink, exclusiveSearchType, authors, startAt);
			});
		});
	}
}

// THE FLOW
var startTime = new Date().getTime();
var totalRequestCounter = getTotalRequestCounter();
sign();
//get query string params
var queryString = window.top.location.search.substring(1);
var searchingInCited = getParam(queryString, SHOW_CITED_PARAM_KEY) != null;
// if the page loaded is cited results, then show stats and filters right on the page, plus paint results to distinguish hetero and self references
if(searchingInCited) {
	enhanceCitedPage("/scholar?" + queryString);
}
// if the page loaded is search results (not cited results), then just add counters with links to each row
else {
	addSelfReferencingCountsToAllResults(document.body.innerHTML);
}