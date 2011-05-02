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
// @name		  Ouroboros
// @description   script enabling stats and extra stuff making work with Google Scholar better
// @include	   http://scholar.google.*/*
// ==/UserScript==

// CONSTANTS

//var serviceURL = "http://scholar.google.com";
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
*/

var xmlhttp = new XMLHttpRequest();//xmlhttp holds the ajax object

/*
if (typeof GM_deleteValue == 'undefined') {

	GM_addStyle = function(css) {
		var style = document.createElement('style');
		style.textContent = css;
		document.getElementsByTagName('head')[0].appendChild(style);
	}

	GM_deleteValue = function(name) {
		localStorage.removeItem(name);
	}

	GM_getValue = function(name, defaultValue) {
		var value = localStorage.getItem(name);
		if (!value)
			return defaultValue;
		var type = value[0];
		value = value.substring(1);
		switch (type) {
			case 'b':
				return value == 'true';
			case 'n':
				return Number(value);
			default:
				return value;
		}
	}

	GM_log = function(message) {
		console.log(message);
	}

	GM_openInTab = function(url) {
		return window.open(url, "_blank");
	}

	 GM_registerMenuCommand = function(name, funk) {
	//todo
	}

	GM_setValue = function(name, value) {
		value = (typeof value)[0] + value;
		localStorage.setItem(name, value);
	}
}
else {
	GM_xmlhttpRequest = function(details) {
		var xmlhttp = new XMLHttpRequest();
		xmlhttp.onreadystatechange = function() {
			var responseState = {
				responseXML:(xmlhttp.readyState==4 ? xmlhttp.responseXML : ''),
				responseText:(xmlhttp.readyState==4 ? xmlhttp.responseText : ''),
				readyState:xmlhttp.readyState,
				responseHeaders:(xmlhttp.readyState==4 ? xmlhttp.getAllResponseHeaders() : ''),
				status:(xmlhttp.readyState==4 ? xmlhttp.status : 0),
				statusText:(xmlhttp.readyState==4 ? xmlhttp.statusText : '')
			}
			if (details["onreadystatechange"]) {
				details["onreadystatechange"](responseState);
			}
			if (xmlhttp.readyState==4) {
				if (details["onload"] && xmlhttp.status>=200 && xmlhttp.status<300) {
					details["onload"](responseState);
				}
				if (details["onerror"] && (xmlhttp.status<200 || xmlhttp.status>=300)) {
					details["onerror"](responseState);
				}
			}
		}
		try {
		  //cannot do cross domain
		  xmlhttp.open(details.method, details.url);
		} catch(e) {
		  if( details["onerror"] ) {
			//simulate a real error
			details["onerror"]({responseXML:'',responseText:'',readyState:4,responseHeaders:'',status:403,statusText:'Forbidden'});
		  }
		  return;
		}
		if (details.headers) {
			for (var prop in details.headers) {
				xmlhttp.setRequestHeader(prop, details.headers[prop]);
			}
		}
		xmlhttp.send((typeof(details.data)!='undefined')?details.data:null);
	}
}
	*/

// use this method for asynchronous communication
var sorryRe = /.*?\/sorry\/.*?/;
var userAgents = [
"1st ZipCommander (Net) - http://www.zipcommander.com/",
"Ace Explorer",
"ActiveWorlds/3.xx (xxx)",
"Advanced Browser (http://www.avantbrowser.com)",
"Amiga-AWeb/3.4.167SE",
"AmigaVoyager/3.4.4 (MorphOS/PPC native)",
"Amoi 8512/R21.0 NF-Browser/3.3",
"ANTFresco/x.xx",
"AUDIOVOX-SMT5600",
"Avant Browser (http://www.avantbrowser.com)",
"AWeb",
"BackStreet Browser 3.x",
"Biyubi/x.x (Sistema Fenix; G11; Familia Toledo; es-mx)",
"BlackBerry7520/4.0.0 Profile/MIDP-2.0 Configuration/CLDC-1.1 UP.Browser/5.0.3.3 UP.Link/5.1.2.12 (Google WAP Proxy/1.0)",
"CDR/1.7.1 Simulator/0.7(+http://timewe.net) Profile/MIDP-1.0 Configuration/CLDC-1.0",
"CERN-LineMode/2.15",
"Commerce Browser Center",
"Cooliris/1.5 CFNetwork/459 Darwin/10.0.0d3",
"Cricket-A100/1.0 UP.Browser/6.3.0.7 (GUI) MMP/2.0",
"Cuam Ver0.050bx",
"Cyberdog/2.0 (Macintosh; 68k)",
"Dillo/0.8.5-i18n-misc",
"Dillo/0.x.x",
"DISCo Pump x.x",
"DocZilla/1.0 (Windows; U; WinNT4.0; en-US; rv:1.0.0) Gecko/20020804",
"DonutP; Windows98SE",
"eCatch/3.0",
"ELinks (0.x.x; Linux 2.4.20 i586; 132x60)",
"ELinks/0.x.x (textmode; NetBSD 1.6.2 sparc; 132x43)",
"Express WebPictures (www.express-soft.com)",
"GenesisBrowser (HTTP 1.1; 0.9; XP SP2; .NET CLR 2.0.50727)",
"GreenBrowser",
"Haier-T10C/1.0 iPanel/2.0 WAP2.0 (compatible; UP.Browser/6.2.2.4; UPG1; UP/4.0; Embedded)",
"HotJava/1.0.1/JRE1.1.x",
"httpunit/1.5",
"httpunit/1.x",
"IBrowse/2.2 (AmigaOS 3.5)",
"IBrowse/2.2 (Windows 3.1)",
"iCab/2.5.2 (Macintosh; I; PPC)",
"ICE Browser/5.05 (Java 1.4.0; Windows 2000 5.0 x86)",
"K-Meleon/0.6 (Windows; U; Windows NT 5.1; en-US; rv:0.9.5) Gecko/20011011",
"Kazehakase/0.x.x.[x]",
"Klondike/1.50 (WSP Win32) (Google WAP Proxy/1.0)",
"LG-LX260 POLARIS-LX260/2.0 MMP/2.0 Profile/MIDP-2.0 Configuration/CLDC-1.1",
"LG/U8138/v1.0",
"Lincoln State Web Browser",
"Links (0.9x; Linux 2.4.7-10 i686)",
"Links (0.9xpre12; Linux 2.2.14-5.0 i686; 80x24)",
"Links (2.xpre7; Linux 2.4.18 i586; x)",
"Lotus-Notes/4.5 ( Windows-NT )",
"Lunascape",
"Lynx/2-4-2 (Bobcat/0.5 [DOS] Jp Beta04)",
"Lynx/2.6 libwww-FM/2.14",
"Lynx/2.8 (;http://seebot.org)",
"Lynx/2.8.3dev.9 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/0.9.6",
"Lynx/2.8.4rel.1 libwww-FM/2.14 SSL-MM/1.4.1 OpenSSL/0.9.6c (human-guided@lerly.net)",
"MoonBrowser (version 0.41 Beta4)",
"Motorola-V3m Obigo",
"Mozilla/1.10 [en] (Compatible; RISC OS 3.70; Oregano 1.10)",
"Mozilla/1.22 (compatible; MSIE 5.01; PalmOS 3.0) EudoraWeb 2",
"Mozilla/3.0 (compatible; AvantGo 3.2)",
"Mozilla/3.0 (compatible; NetPositive/2.2)",
"Mozilla/3.0 (Planetweb/2.100 JS SSL US; Dreamcast US)",
"Mozilla/3.01 (compatible; AmigaVoyager/2.95; AmigaOS/MC680x0)",
"Mozilla/3.04 (compatible; ANTFresco/2.13; RISC OS 4.02)",
"Mozilla/3.04 (compatible; NCBrowser/2.35; ANTFresco/2.17; RISC OS-NC 5.13 Laz1UK1309)",
"Mozilla/3.04 (compatible;QNX Voyager 2.03B ;Photon)",
"Mozilla/4.0 (compatible; ibisBrowser)",
"Mozilla/4.0 (compatible; Lotus-Notes/5.0; Windows-NT)",
"Mozilla/4.0 (compatible; MSIE 4.01; Windows CE; MSN Companion 2.0; 800x600; Compaq)",
"Mozilla/4.0 (compatible; MSIE 4.01; Windows NT Windows CE)",
"Mozilla/4.0 (compatible; MSIE 5.01; Windows NT 5.0; NetCaptor 6.5.0RC1)",
"Mozilla/4.0 (compatible; MSIE 5.5; Windows 98; Crazy Browser 1.x.x)",
"Mozilla/4.0 (compatible; MSIE 5.5; Windows 98; SAFEXPLORER TL)",
"Mozilla/4.0 (compatible; MSIE 5.5; Windows 98; SYMPA; Katiesoft 7; SimulBrowse 3.0)",
"Mozilla/4.0 (compatible; MSIE 6.0; Windows 98; Win 9x 4.90; http://www.Abolimba.de)",
"Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.0; .NET CLR 1.1.4322; Lunascape 2.1.3)",
"Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; Deepnet Explorer)",
"Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; iRider 2.21.1108; FDM)",
"Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; KKman3.0)",
"Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; Maxthon)",
"Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; Embedded Web Browser from: http://bsalsa.com/; MSIECrawler)",
"Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1; DX-Browser 5.0.0.0)",
"Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0; Orange 8.0; GTB6.3; Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1) ; Embedded Web Browser from: http://bsalsa.com/; SLCC1; .NET CLR 2.0.50727; .NET CLR 3.5.30729; .NET CLR 3.0.30618; OfficeLiveConnector.1.3; OfficeLivePatch.1.3)",
"Mozilla/4.0 (compatible; SiteKiosk 4.0; MSIE 5.0; Windows 98; SiteCoach 1.0)",
"Mozilla/4.5 (compatible; HTTrack 3.0x; Windows 98)",
"Mozilla/4.5 (compatible; iCab 2.5.3; Macintosh; I; PPC)",
"Mozilla/4.5 (compatible; OmniWeb/4.0.5; Mac_PowerPC)",
"Mozilla/4.5 (compatible; OmniWeb/4.1-beta-1; Mac_PowerPC)",
"Mozilla/4.61 [en] (X11; U; ) - BrowseX (2.0.0 Windows)",
"Mozilla/4.7 (compatible; OffByOne; Windows 98) Webster Pro V3.2",
"Mozilla/5.0 (Macintosh; U; PPC Mac OS X Mach-O; en-US; rv:1.0.1) Gecko/20021219 Chimera/0.6",
"Mozilla/5.0 (Macintosh; U; PPC Mac OS X Mach-O; en-US; rv:1.0.1) Gecko/20030306 Camino/0.7",
"Mozilla/5.0 (Macintosh; U; PPC Mac OS X; en-US) AppleWebKit/xx (KHTML like Gecko) OmniWeb/v5xx.xx",
"Mozilla/5.0 (Macintosh; U; PPC Mac OS X; en-us) AppleWebKit/xxx.x (KHTML like Gecko) Safari/12x.x",
"Mozilla/5.0 (Windows; U; Win98; en-US; rv:x.xx) Gecko/20030423 Firebird Browser/0.6",
"Mozilla/5.0 (Windows; U; Win9x; en; Stable) Gecko/20020911 Beonex/0.8.1-stable",
"Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US) AppleWebKit/525.19 (KHTML, like Gecko) Chrome/0.2.153.1 Safari/525.19",
"Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.0.5) Gecko/20060731 Firefox/1.5.0.5 Flock/0.7.4.1",
"Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.1) Gecko/2008092215 Firefox/3.0.1 Orca/1.1 beta 3",
"Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:x.x.x) Gecko/20041107 Firefox/x.x",
"Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:x.xx) Gecko/20030504 Mozilla Firebird/0.6",
"Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:x.xxx) Gecko/20041027 Mnenhy/0.6.0.104",
"Mozilla/5.0 (X11; Linux i686; U;rv: 1.7.13) Gecko/20070322 Kazehakase/0.4.4.1",
"Mozilla/5.0 (X11; U; Linux i686; de-AT; rv:1.8.0.2) Gecko/20060309 SeaMonkey/1.0",
"Mozilla/5.0 (X11; U; Linux i686; en-GB; rv:1.7.6) Gecko/20050405 Epiphany/1.6.1 (Ubuntu) (Ubuntu package 1.0.2)",
"Mozilla/5.0 (X11; U; Linux i686; en-US; Nautilus/1.0Final) Gecko/20020408",
"Mozilla/5.0 (X11; U; Linux i686; en-US; rv:0.9.3) Gecko/20010801",
"Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.2b) Gecko/20021007 Phoenix/0.3",
"Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.6) Gecko/20040413 Epiphany/1.2.1",
"Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.1) Gecko/20061129 BonEcho/2.0",
"Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.8.1.1) Gecko/20061205 Iceweasel/2.0.0.1 (Debian-2.0.0.1+dfsg-2)",
"Mozilla/5.0 Galeon/1.0.2 (X11; Linux i686; U;) Gecko/20011224",
"multiBlocker browser",
"NETCOMplete/x.xx",
"Opera/9.0 (Windows NT 5.1; U; en)",
"Opera/9.60 (Windows NT 5.1; U; de) Presto/2.1.1",
"Orca Browser (http://www.orcabrowser.com)",
"portalmmm/2.0 S500i(c20;TB)",
"Science Traveller International 1X/1.0",
"SoftBank/1.0/812SH/SHJ001 Browser/NetFront/3.3 Profile/MIDP-2.0 Configuration/CLDC-1.1",
"SWB/V1.4 (HP)",
"Sylera/1.2.x",
"T-Online Browser",
"UCWEB5.1",
"UP.Browser/3.01-IG01 UP.Link/3.2.3.4",
"UPG1 UP/4.0 (compatible; Blazer 1.0)",
"w3m/0.x.xx",
"WannaBe (Macintosh; PPC)",
"WapOnWindows 1.0",
"WeBoX/0.xx",
"Website Explorer/0.9.x.x",
"webster-internet.de pad browser",
"WinWAP/3.x (3.x.x.xx; Win32) (Google WAP Proxy/1.0)"
];
function doRequest(params, callback) {
	params = "http://" + serviceURL + normalizeLink(params);
	var userAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
	GM_log("Requesting: " + params + "\nwith user agent: " + userAgent);
	GM_xmlhttpRequest({
		method: "POST",
		url: params,
		headers: {
			"User-Agent": userAgent,
			"Accept": "text/xml",
			"Content-Type": "application/x-www-form-urlencoded"
		},
		onload: function(response) {
			GM_log([
				response.status,
				response.statusText,
				response.readyState,
				response.responseHeaders,
				//response.responseText,
				response.finalUrl,
				response.responseXML
			].join("\n"));
			updateRequestCount(1);
			// Inject responseXML into existing Object if not present
			if (!response.responseXML) {
				response.responseXML = new DOMParser().parseFromString(response.responseText, "text/xml");
			}
			if(response.status == 200) {
				callback(response.responseText);
			}
			else if(sorryRe.exec(response.finalUrl)) {
				var sorryDiv = document.createElement("div");
				sorryDiv.setAttribute("id", "sorryDiv");
				sorryDiv.innerHTML = response.responseText;
				sorryDiv.setAttribute("style", "display: block; position: fixed; top: 10px; z-index: 99;");
				document.appendChild(sorryDiv);
			}
		}
	});
	/*
	if (xmlhttp) {
		xmlhttp.open("POST", serviceURL + params, true);
		xmlhttp.onreadystatechange = function () {
			if (xmlhttp.readyState == 4) {
				updateRequestCount(1);
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
/**
 * An alternative (perhaps preferable) way to request STRUCTURED data that can be returned in the JSON format. Would be nice if it was possible to get the Bibtex this way.
 * Done via JS injection while also providing with a cross-origin resource sharing workaround (http://en.wikipedia.org/wiki/JSONP)
 */
var head = document.getElementsByTagName("head")[0];
var scriptInjection = document.createElement("script");
function requestViaJSONP(params, callback) {
	params = "http://" + serviceURL + normalizeLink(params) + "&jsonp=" + callback;
	GM_log('request via injection from: ' + params);
	scriptInjection.type = 'text/javascript';
	scriptInjection.src = params;
	head.appendChild(scriptInjection);
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
var resultsOnPageRe = /(.*?)&num=[0-9]*?(.*?)/;
function fetchReferenceCounters(bibtexLink, citedLink, totalCited, whenDone) {
	GM_log("Fetching ref counts for: " + bibtexLink + ", " + citedLink + ", " + totalCited);
	//the first request will respond with a bibtex block containing the authors
	doRequest(bibtexLink, function (bibtexContext) {
		//GM_log('' + bibtexContext);
		//response contains a bibtex syntax extract. need to retrieve authors from there and then query up the citations.
		var authors = extractAuthorsFromBibtexContext(bibtexContext);
		if(authors) {
			var selfRefQuery = "";
			var heteroRefQuery = "";
			for(var i = 0; i < authors.length; i++) {
				selfRefQuery += (i > 0? " OR " : "") + "author:\"" + authors[i] + "\"";
				heteroRefQuery += " -author:\"" + authors[i] + "\"";
			}
			//make sure it doesn't request for a huge page of 100 results, out of it, we just need one stupid number on the top
			citedLink = citedLink.replace(resultsOnPageRe, "$1&num=10$2");
			GM_log('Check out the num amount (should be inependent from the number of results from the preferences): ' + citedLink)
			//create links for self-hetero-referencing citations
			var heteroRefLink = citedLink + "&" + SEARCH_IN_CITED_PARAM_KEY + "=" + SEARCH_IN_CITED_PARAM_VALUE + "&xtype=hetero&q=" + encodeURI(heteroRefQuery);
			var selfRefLink = citedLink + "&" + SEARCH_IN_CITED_PARAM_KEY + "=" + SEARCH_IN_CITED_PARAM_VALUE + "&xtype=self&q=" + encodeURI(selfRefQuery);
			//citedLinksArray.push(heteroRefLink);
			doRequest(heteroRefLink, function (heteroCitedContext) {
				var heteroReferences = extractResultCountFromPage(heteroCitedContext);
				//total cited will be 'null' when the call comes from enhanceCitedPage
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
function addReferenceCountsToResults(content) {
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
		var bibtexLink = "/scholar.bib?q=info:" + bibtexInfoParam + ":" + serviceURL + "/&output=citation&hl=el&as_sdt=0&sciodt=0&ct=citation&cd=0";
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
var addressRe = /http:\/\/(.*?)\//;
var serviceURL = addressRe.exec(window.top.location.href)[1];
var searchingInCited = getParam(queryString, SHOW_CITED_PARAM_KEY) != null;
// if the page loaded is cited results, then show stats and filters right on the page, plus paint results to distinguish hetero and self references
if(searchingInCited) {
	enhanceCitedPage("/scholar?" + queryString);
}
// if the page loaded is search results (not cited results), then just add counters with links to each row
else {
	addReferenceCountsToResults(document.body.innerHTML);
}