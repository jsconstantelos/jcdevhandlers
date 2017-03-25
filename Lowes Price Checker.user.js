// ==UserScript==
// @name        Lowes Price Checker
// @namespace   LPC
// @id          Lowes Price Checker
// @description Adds a button to check inventory and prices at a set of Lowes stores.
// @include     http://www.lowes.com/pd*
// @include     https://www.lowes.com/pd*
// @include     http://m.lowes.com/pd*
// @include     https://m.lowes.com/pd*
// @include     http://www.lowes.com/ProductDisplay*
// @include     https://www.lowes.com/ProductDisplay*
// @resource     jqcss https://code.jquery.com/ui/1.11.4/themes/ui-lightness/jquery-ui.css
// @require      http://code.jquery.com/jquery-2.2.3.min.js
// @require      https://code.jquery.com/ui/1.11.4/jquery-ui.min.js
// @screenshot   https://i949.photobucket.com/albums/ad337/pcazzola/lpc_1.png http://i949.photobucket.com/albums/ad337/pcazzola/lpc_icon.png
// @noframes
// @grant       unsafeWindow
// @grant       GM_addStyle
// @grant       GM_getResourceText
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_registerMenuCommand
// @noframes
// @version     3.1.6
// @run-at document-end
// @contributionURL https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=FDW4NZ6PRMDMJ&lc=US&item_name=Lowes%20Price%20Checker&item_number=LPC&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted
// @contributionAmount $5.00
// ==/UserScript==

// Copyright Phllip Cazzola 2015, 2016
// Lowes Price Checker is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
// See http://creativecommons.org/licenses/by-nc-sa/4.0/ for license details.
//
//  Contributions by Wesley Hampton
//
//  The developer has no associated with Lowe's Company, Inc or the Lowe's home improvements stores.
//  The word "Lowes" in the title is used for identification and does not imply endorsement by Lowes Company, Inc.
//
//   2.2 Update for Lowes website change
//   3.0 Updated to work on non-mobile site.  Added store picking functionality
//   3.1 Fixes for Lowes website change

// get our own version of jquery.   The first line should be enough, but Android tampermonkey needed something more explicit....
var jq_2 = this.$ = this.jQuery = jQuery.noConflict(true);

// create a jquery variable and pass it into main
//var jq_2 = jQuery.noConflict(true);

// conditional debugging
const DEBUG = false;

function my_debug(txt) {
    if (DEBUG && console) {
        console.log(txt);
    }
}

// starting ....
my_debug('Lowes price checker script start');

// not used.  Was used for making separate calls for price and quantity
var resHolder = {};

// list of store locations and zip codes
var storeData = {};


// list of store to search
var searchStore = {};

//options, default values
defOptions = {};
defOptions.sortSel = "any";
defOptions.hideEmpty = false;
defOptions.speed = 10;

// sorted list for the results
var sortedRes = new Array();

// the 50 states + DC
var states = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
    'DC'];

// "main"
(function ($) {

    // product ID
    var prodId;
    // product name
    var prodName;

    // create a variable to hold the store table.
    var tableNodes = null;
    
    // this tab is big and not always used.  Delay creation until it is activated
    var createdStoreSel=false;


    var baseURL = unsafeWindow.location.href;
 
    try {
      var re = new RegExp('.*lowes.com\/');
      var pMatch = re.exec(baseURL);
      if (pMatch && pMatch.length >= 1) baseURL = pMatch[0];
    } catch (e) {
      my_debug(e);
    }

    // fill in the stores
    buildStoreList();

    // retrieve any saved values
    searchStore = JSON.parse(GM_getValue('searchStore', JSON.stringify(searchStore)));

    if (!searchStore) {
        //JSON.parse() there is an error in the input string
        my_debug('Error! JSON.parse failed - The stored value for "searchStore" is likely to be corrupted.');
        searchStore = {};
    }
    options = JSON.parse(GM_getValue('options', JSON.stringify(defOptions)));

    if (!options) {
        //JSON.parse() there is an error in the input string
        my_debug('Error! JSON.parse failed - The stored value for "options" is likely to be corrupted.');
        options = defOptions;
    }

    // apply the default jQuery theme
    var newCSS = GM_getResourceText('jqcss');
    // put in our unique class ID so this doesn't change the styles for the main page
    newCSS = newCSS.replace(/^\.ui-/gm, ".icDiag .ui-" );
    GM_addStyle(newCSS);

    //--- creates CSS styles so the popup looks OK...
    GM_addStyle(
        '.icDiag.ui-dialog {border: 1px solid #0068ab !important; box-shadow: 2px 2px 5px rgba(0,0,0,0.65);} \
        .icDiag .ui-widget input, .icDiag .ui-widget select, .icDiag .ui-widget textarea, .icDiag .ui-widget button { opacity: 100; position: relative; } \
         .icDiag.ui-dialog.ui-widget .ui-dialog-titlebar { \
              display: block; font-size:1.0em; text-align: center; \
              background:  #15B6E5; color: white; border-width: 0px 0px 1px 0px; border-color: none none #ccc none ; } \
         .icDiag.ui-dialog.ui-widget .ui-dialog-titlebar { padding: 0px; border-radius: 8px 8px 0px 0px; height: 2em;} \
         .icDiag.ui-dialog .ui-dialog-title { padding: 0em; float: none;}  \
         .icDiag.ui-dialog .ui-dialog-buttonpane .ui-dialog-buttonset button {display: inline-block;} \
         .icDiag.ui-dialog.ui-widget.ui-widget .ui-dialog-buttonpane .ui-dialog-buttonset button { \
    text-align: center; background: transparent; color: #0471af; display: inline-block; \
    font-size: 1em; margin: 0;  width: 50%; border-radius: 0; \
        border-right: 1px solid #ccc; border-left: none; border-bottom: none; border-top:none}\
        #mySSTable {width: 100%;} \
        #myTable {width: 100%; min-width: 400px;} \
        #icDialog {padding: 0.25em; overflow-y: scroll; background: white;} \
        #icDialog .ui-widget .ui-widget { font-size: 1em; } \
        #icDialog .ui-corner-all, .ui-corner-bottom, .ui-corner-right, .ui-corner-br { border-bottom-right-radius: 4px; } \
        #icDialog .ui-corner-all, .ui-corner-bottom, .ui-corner-left, .ui-corner-bl {border-bottom-left-radius: 4px; } \
        #icDialog .ui-corner-all, .ui-corner-top, .ui-corner-right, .ui-corner-tr { border-top-right-radius: 4px; } \
        #icDialog .ui-corner-all, .ui-corner-top, .ui-corner-left, .ui-corner-tl { border-top-left-radius: 4px; } \
        #icDialog .ui-widget-content { background: white; color: #333333; } \
        #icDialog .ui-tabs { position: relative;  padding: .2em; } \
        #icDialog .ui-widget {font-family: "Helvetica Neue",Helvetica,Arial,sans-serif !important;} \
        .icDiag.ui-dialog .ui-widget .ui-dialog-titlebar { padding: 0px; } \
        .icDiag.ui-dialog .ui-widget .ui-dialog-titlebar { display: block; font-size: 1.0em; text-align: center; background: #15B6E5; color: white; border-width: 0px 0px 1px 0px; border-color: none none #ccc none; } \
        .icDiag.ui-dialog.ui-widget .ui-dialog-titlebar { cursor: move;} \
        .icDiag.ui-dialog .ui-dialog-titlebar { padding: .4em 1em; position: relative;} \
        #icDialog .ui-draggable-handle { -ms-touch-action: none; touch-action: none; } \
        #icDialog .ui-helper-clearfix { min-height: 0; } \
        #icDialog div.ui-dialog-buttonpane { padding: 0;} \
        .icDiag.ui-dialog.ui-widget.ui-widget .ui-dialog-buttonpane .ui-dialog-buttonset { float: none; clear: both; margin: 0; border-top: 1px solid #ccc; text-align: center; } \
        .icDiag.ui-dialog.ui-widget.ui-widget .ui-dialog-buttonpane .ui-dialog-buttonset button:last-child { border-right: 0 none; } \
        #icDialog .ui-state-default, .ui-widget-content .ui-state-default, .ui-widget-header .ui-state-default { border: 1px solid #cccccc; font-weight: bold; color: #1c94c4; height: auto; background: white; } \
        #icDialog table th, table td { border-bottom: 1px solid #ddd; padding: 8px; text-align: center; vertical-align: top; width: auto;} \
        #icDialog table tr:nth-child(2n) { background-color: #f2f2f2; } \
        #icDialog thead, tr { border-top: 1px solid #d7dee9; height: 2em; } \
        #icDialog table th { font-family: "HelveticaNeueW01-75Bold",Helvetica,Arial,sans-serif;  } \
        #icDialog .ui-tabs .ui-tabs-panel { display: block; height: auto; overflow: visible; border-width: 0; padding: 1em 1.4em; background: none; } \
        .icDiag.ui-dialog.ui-widget .ui-widget-content a { color: #0471af; } \
        .pc-tab tr th { background: #15B6E5; color: white; } \
        .icDiag .ui-tabs .ui-tabs-nav { margin: 0; padding: .2em .2em 0; } \
        .icDiag .ui-tabs .ui-tabs-panel {display: block; border-width: 0; padding: 1em 1.4em; background: none; } \
        .icDiag .ui-tabs .ui-tabs-nav .ui-tabs-anchor { float: left; text-decoration: none; } \
        .icDiag .ui-tabs .ui-tabs-nav li { list-style: none; float: left; position: relative; top: 0; margin: 0px .2em 0 0; border-bottom-width: 0; padding: 0; white-space: nowrap; } \
        #icDialog .ui-dialog.ui-widget .ui-widget-content a { color: #0471af; } \
        #icDialog .ui-tabs .ui-tabs-nav .ui-tabs-anchor { float: left; padding: .5em 1em; text-decoration: none; } \
        #icDialog .ui-state-default, .ui-widget-content .ui-state-default, .ui-widget-header .ui-state-default { border: 1px solid #cccccc;  margin-bottom: -5px; padding-bottom: 4px;  background: #f6f6f6 url("images/ui-bg_glass_100_f6f6f6_1x400.png") 50% 50% repeat-x; font-weight: bold; color: #1c94c4; } \
        #icDialog .ui-state-active, .ui-widget-content .ui-state-active, .ui-widget-header .ui-state-active { border: 1px solid #fbd850;  border-bottom: 0; border-bottom-width: 0; background: #ffffff url("images/ui-bg_glass_65_ffffff_1x400.png") 50% 50% repeat-x; font-weight: bold; color: #eb8f00; } \
        #icDialog .ui-state-active a, .ui-state-active a:link, .ui-state-active a:visited { color: #eb8f00; text-decoration: none; } \
        .icDiag .ui-tabs .ui-tabs-nav li.ui-tabs-active {} \
        .icDiag .ui-widget-header { border: 1px solid #e78f08; color: #ffffff; font-weight: bold; } \
        .icDiag .ui-dialog-content { position: relative; border: 0; padding: .5em 1em;   background: white; overflow: auto; } \
        #checkPrice .btn.btn-green, .btn.btn-shop { color: #fff; background: #44bb41; border: 0; padding: 12px 15px; cursor: pointer; margin-left: 50px; } \
        #getStDiv .btn.btn-green, .btn.btn-shop { color: #fff; background: #44bb41; border: 0; padding: 12px 15px; cursor: pointer; } \
        .icDiag .ui-dialog-titlebar-close { display: none; } \
        #icDialog.ui-dialog .ui-dialog-titlebar-close {  display: none !important; } \
        #icDialog .ui-widget-content { color: #333333; } \
         .pc-tab th, .pc-tab td { text-align: center;}                     \
         .pc-tab td { text-align: center; border: 1px solid #ccc;}         \
         table.pc-tab {border-collapse: separate;}                         \
         #myTableFooter h3 {text-align: center;}                           \
         #myTableHeader h3 {text-align: center; max-width: 500px;}                           \
         #mySSTableHeader div {padding-bottom: 0.5em;}                     \
         .pc-tab tr th:first-child {border-top-left-radius: 15px;}         \
         .pc-tab tr th:last-child {border-top-right-radius: 15px;}         \
         .pc-tab tr:last-child td:first-child {border-bottom-left-radius: 15px;}  \
         .pc-tab tr:last-child td:last-child  {border-bottom-right-radius: 15px;} \
         .pc-tab tr th {background:  #15B6E5; color: white;}                      \
         #NS_DIV p {text-align: center; } \
         #tabs-options {border: 1px solid #ddd !important;  min-height: 300px;  min-width: 500px;}   \
         #tabs-storesel {border: 1px solid #ddd !important;  min-height: 300px;  min-width: 500px;}  \
         #tabs-price-check {border: 1px solid #ddd !important; min-height: 300px; min-width: 500px;}\
         #icDialog .ui-tabs-nav {background: white;}                \
         #tab_ul { border: none;}' );

    // Wait for the window to load.  Then fix the "See price in cart"
    window.addEventListener('load', function () {
        // look for the div w/ "See price in cart".  If it is there, show the price
        try {    
            var realPrice = unsafeWindow.Lowes.ProductDetail.product.ProductInfo.lowesPrice;
            $('p.view-in-cart').append('<a>$' + realPrice + '</a>');
        } catch (err) {
            my_debug(err.message);
        }
        getProductId();
    }, false);

    // add a button to the web page above the product image to bring up the price checker popup
    $('#mainContent').prepend('<div id="checkPrice"><button id="checkPriceBtn" class="btn btn-green">Check Prices</button></div>');

    $('#detailCont').prepend('<div id="checkPrice"><button id="checkPriceBtn" class="btn btn-green">Check Prices</button></div>');
    // add an action with the price check button is pressed  -> open dialog
    $('#checkPriceBtn').click(function () {
        // scrape the product description from the web page to put on the popup
        try {
            getProductName();
            $('#myTableHeader h3').html(prodName);
        } catch (err) {
            my_debug(err.message);
        }
        showPopup();
    });

    // create the dialog box to display the results
    $('body').append('<div id="icDialog" title="Price Check"/>');

    // create the tabbed panes for options/checker
    $('#icDialog').html(
     '<div style="display: inline-block;">      \
        <ul id="tab_ul" style="display: inline-block; width: 90%;">           \
           <li><a href="#tabs-price-check">Prices</a></li>     \
           <li><a href="#tabs-storesel">Stores</a></li>      \
           <li><a href="#tabs-options">Options</a></li>      \
           <li><a href="#tabs-info">Info</a></li>      \
       </ul>          \
       <div id="tabs-price-check"></div>   \
       <div id="tabs-storesel">  Store Selection tab    </div>  \
       <div id="tabs-options">  Options tab    </div>  \
       <div id="tabs-info">  Info tab    </div>  \
     </div>');

    // generate the tabbed panes
    $('#icDialog').tabs({heightStyle: 'content',
                         beforeActivate: function (event, ui) {
                               if (ui.newPanel.is("#tabs-storesel")){
                                   // store selector tab activated
                                   if (!createdStoreSel) {
                                       createdStoreSel = true;
                                       buildStoreTable();
                                   }
                               
                               }}
                         });
    $("#icDialog").tabs().css({'min-height': '400px', 'overflow': 'auto' });
    $('#icDialog').tabs('option', 'active', 3);

    // generate dialog/set properties
    $('#icDialog').dialog({
        title: 'Price Checker',
        draggable: true,
        height: 'auto',
        maxHeight: 600,
        minHeight: 400,
        width: '600px',
        minWidth: 600,
        maxWidth: 800,
        resizable: true,
        autoOpen: false,
        buttons: {
            'Search': goAction,
            'Close': function () {
                // detach the large table to improve performance
                tableNodes = $('#mySSTable').detach();
                $("#myTable").hide();
                var tab2 = $("#myTable").detach();
                $('body').append(tab2);
                $(this).dialog('close');
            }
        }
    });

    // add a class to the dialog box elements to apply CSS properties without affecting other parts of the web page
    $('#icDialog').parent().addClass('icDiag');
    $('#icDialog').parent().css('z-index', 1000);
    $('#icDialog').parent().css('position', 'absolute');
    // create a table to put the results in
    $('#tabs-price-check').html(
         '<div id="myTableHeader" data-role="header"><h3 class="pd-title"> </h3></div> \
          <div id="tabHolder2"><table data-role="table" data-mode="columntoggle" class="ui-responsive ui-shadow pc-tab" id="myTable">    \
            <thead>       \
              <tr><th>Store</th><th data-priority="1">Quantity</th><th data-priority="2">Price</th><th data-priority="3">Shipping</th></tr>  \
            </thead>               \
            <tbody id="myTabBody"></tbody>  \
          </table></div>                    \
        <div id="myTableFooter" data-role="footer"><h3> </h3></div>');

    // build the store selection tab.  List of stores with check boxes
    $('#tabs-storesel').html(
         '<div id="mySSTableHeader" data-role="header"></div>   \
            <div id="tabHolder"><table data-role="table" style="min-width: 400px;" data-mode="columntoggle" class="ui-responsive ui-shadow pc-tab" id="mySSTable"> \
              <thead> \
                <tr><th style="width: 20%;">Use</th><th style="width: 30%;" data-priority="1">Store Number</th><th style="width: 50%;" data-priority="2">Location</th></tr>\
             </thead>\
             <tbody id="mySSTabBody"></tbody>\
           </table></div> \
               <div id="mySSTableFooter" data-role="footer" style="display: inline; font-size: 0.5em;"> \
              </div>');

    $('#tabs-info').html("<div id='NS_DIV' style='min-width: 400px; max-width: 600px;'> \
           <p><b> Lowes Price Checker </b></p> \
           <p> If this tool has saved you money, consider donating to the developer via PayPal. </p> \
           <div id='donate'><input style='display: block; margin-left: auto; margin-right:auto;' type='image' id='donateBtn' src='https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif' alt='Donate'></input></div> \
           <hr/><div id='storeSearcher'><p> Find all Lowe's stores in the USA.</p> \
           <p> This generates a list of all stores that can be pasted into the script.</p> \
           <p> -- Warning this action takes a few minutes. --</p> \
           <div id='getStDiv' style='margin-left: 40%;' ><button type='button' id='getStores' class='btn btn-green'>Find Stores</button></div></div></DIV>");
    $('#getStores').click(function () { findStores(); });

    $('#donateBtn').click(function () {
         var win = window.open("https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=FDW4NZ6PRMDMJ&lc=US&item_name=Lowes%20Price%20Checker&item_number=LPC&currency_code=USD&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted", '_blank');
         win.focus();
         });

     // create some controls for the store list table
    $('#mySSTableHeader').html(
          "<div style='margin-bottom: 0.5em; text-align: center;'><button type='button' id='allBtn' style='margin-left: 20px;'>Add all</button>   \
          <button type='button' id='clrBtn' style='margin-left: 20px;'>Remove all</button></div>" +
          "<div style='clear:left;'>State: <select id='stateSel' style='width: 100px;'></select></div>" +
          "<div style='clear: left;'>Distance: <select id='distSel' style='text-align: center; width: 4em;'></select>  miles " +
           "of zip: <input type='text' id='zzipInput' maxLength=5 style='width: 3em; text-align: center;'/> </div>");

    // fill in the state drop down box
    var sel = $('#stateSel');
    sel.append($('<option>', {value: '',text: '--'}));

    // add options for all 50 states +D.C.
    for (var sn = 0; sn < 51; sn++) {
        sel.append($('<option>', {value: states[sn],text: states[sn]}));
    }

    // add options for miles
    var sel2 = $('#distSel');
    sel2.append($('<option>', {value: 'any',text: "any"}));
    sel2.append($('<option>', {value: 5,text: "5"}));
    sel2.append($('<option>', {value: 10,text: "10"}));
    sel2.append($('<option>', {value: 20,text: "20"}));
    sel2.append($('<option>', {value: 50,text: "50"}));
    sel2.append($('<option>', {value: 100,text: "100"}));
    sel2.append($('<option>', {value: 200,text: "200"}));

    // action for "clear ", uncheck all visible checkboxes
    $('#clrBtn').click(function () { $('#mySSTabBody input:checkbox:visible').prop('checked', false);});
    // action for "select all", check all visible checkboxes
    $('#allBtn').click(function () { $('#mySSTabBody input:checkbox:visible').prop('checked', true);});

    // filter by state
    $('#stateSel').change(function () {
        $('#distSel').val('any');
        var str = '';
        var storeName, rowName, regStr;
        // get the state string
        $('#stateSel option:selected').each(function () {str += $(this).val();});
        // interate over the stores to hide or display each row
        for (var storeId in storeData) {
            if (storeData.hasOwnProperty(storeId)) {
                rowName = 'row__' + storeId;
                if (str == '' || storeData[storeId].State == str) {
                    $('#' + rowName).css('display', 'table-row');
                } else {
                    $('#' + rowName).css('display', 'none');
                }
            }
        }
    });

    // filter by distance when zip input focus is lost
    $("#zzipInput").focusout(function() {
       $('#stateSel').val('');
       filterByDistance();
    });

    // filter by distance when the distance selector is changed
    $('#distSel').change(function () {
        $('#stateSel').val('');
        filterByDistance();
    });
      
    
    // apply the distance filter
    function filterByDistance()
    {
       var filterDist;
       var dist, rowName, regStr, lat1, lon1, lat2, lon2;
       
       $('#distSel option:selected').each(function () { filterDist= $(this).val();});
       
       if (filterDist == "any") {
          // show everything for "any"
          $('#mySSTabBody tr[id^="row__"]').each(function () {
             $(this).css('display', 'table-row');
          });
          return;
       }

       var zip = Number($("#zzipInput").val());
       // determine the zip code entered
       if ( zip < 1 || zip > 99999) {
          // not a number
          return;
       }
       
       // put leading zeros
       var pad = "00000";
       zip = (pad+zip).slice(-pad.length);

       //request zip code data using json
       $.ajax({
          url:'http://maps.googleapis.com/maps/api/geocode/json?address=' + zip,
          type:"GET",
          dataType: 'json',
          async:'true',
          success: function (data) {
            my_debug(data);            
            if (!data.status || data.status != "OK") {
                my_debug('failed to get zip');
                return;
            }            
            if (!data.results || !data.results[0] || !data.results[0].geometry) {
                my_debug('Cannot get geometry data');
                return;
            }
            
            $('#distSel option:selected').each(function () { filterDist= $(this).val();});
      
            // get lat/lon in radians for the selected zip code
            lat1 = data.results[0].geometry.location.lat;
            lon1 = data.results[0].geometry.location.lng;           
            my_debug("Zip Lat/Lon: " + lat1 + "/" + lon1);
            lat1 = lat1 * 3.14159/180.0;
            lon1 = lon1 * 3.14159/180.0;
            
            // get the distance string
            $('#distSel option:selected').each(function () { filterDist= $(this).val();});
            
            // interate over the stores to hide or display each row
            for (var storeId in storeData)
            {
                if (storeData.hasOwnProperty(storeId))
                {
                    if (filterDist != "any")
                    {
                       // get store lat/lon and convert to radians
                       lat2 = storeData[storeId].Lat;
                       lon2 = storeData[storeId].Lon;
                       my_debug("Store Lat/Lon: " + lat2 + "/" + lon2);
                       lat2 = lat2 * 3.14159/180.0;
                       lon2 = lon2 * 3.14159/180.0;     
            
                       // determine distance in miles
                       dist = calcDist(lat1, lon1, lat2, lon2);
                       rowName = 'row__' + storeId;
            
                       // find all rows within the selected distance
                       if ( dist <= filterDist )
                       {
                          $('#' + rowName).css('display', 'table-row');
                       }
                       else
                       {
                          $('#' + rowName).css('display', 'none');
                       }
                    }
                    else
                    {
                       // show everything for "any"
                       rowName = 'row__' + storeId;
                       $('#' + rowName).css('display', 'table-row');
                    }
                }
            }
         }
      });
    }

    // build the options tab
    $('#tabs-options').html(
         '<div id="myOptDiv"></div>   \
            <div><table data-role="table" data-mode="columntoggle" style="min-width: 400px;" class="ui-responsive ui-shadow pc-tab" id="myOptTable"> \
            <thead>   \
                <tr><th>Options</th></tr>   \
             </thead>   \
            <tbody id="myOptTabBody">        \
            <tr><td><div style="text-align: left;"><input type="checkbox" id="hideInput" name="hideEmpty"  ' + (options.hideEmpty ? "checked" : "" ) + ' /> Hide empty stores</div></td></tr> \
            <tr><td><div style="text-align: left;"> Sort order:  <select id="sortSel" style="margin-left: 1em; width: 10em;"> \
                   <option value="any" text="Any">Any</option>\
                   <option value="priceup" text="Price-Low to High">Price-Low to High</option>\
                   <option value="pricedown" text="Price-High to Low">Price-High to Low</option>\
                   <option value="qup" text="Quantity-Low to Hight">Quantity-Least to Most</option>\
                   <option value="qdown" text="Quantity-High to Low">Quantity-Most to Least</option></select></div></td></tr> \
           <tr><td><div style="text-align: left;"> Requests per second:   1<input id="speedSel" type="range" min="1" max="10" step="1" value="5" style="width: 100px; vertical-align: middle;"/> 10</div></td></tr> \
           <tr><td><div style="text-align: left;"><input type="checkbox" id="showStoreSearch" name="showStore"  ' + (options.showStoreSearch ? "checked" : "" ) + ' /> Enable store searcher on info tab</div></td></tr> \
           </tbody></table></div>  \
               <div id="myOptTableFooter" data-role="footer" style="font-size: 0.5em; width: 400px;"> \
               <a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/" >\
                 <img style="padding-top: 1em;" alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-nc-sa/4.0/88x31.png"  />\
               </a><br /><span xmlns:dct="http://purl.org/dc/terms/" href="http://purl.org/dc/dcmitype/Text" property="dct:title" rel="dct:type">Lowes Price Checker</span> is licensed under a ' +
              '<a rel="license" href="http://creativecommons.org/licenses/by-nc-sa/4.0/">Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License</a></div>');

    // set the sort option and speed slider
    $("#sortSel").val(options.sortSel);
    $("#speedSel").val(options.speed || 8);
    updateStoreSearch();

    // filter by state when the pulldown is changed
    $('#sortSel').change(function () {
        options.sortSel = $("#sortSel :selected").val();
        // save off the options
        GM_setValue('options', JSON.stringify(options));
    });

    // set the message speed option when the slider is moved
    $('#speedSel').change(function () {
        options.speed = $("#speedSel").val();
        // save off the options
        GM_setValue('options', JSON.stringify(options));
    });

     // save the option to not make rows for stores with zero items
    $('#hideInput').change(function () {
        options.hideEmpty = $("#hideInput").prop('checked');
        // save off the selected stores
        GM_setValue('options', JSON.stringify(options));
    });
    
         // save the option to not make rows for stores with zero items
    $('#showStoreSearch').change(function () {
        options.showStoreSearch = $("#showStoreSearch").prop('checked');
        // save off the selected stores
        GM_setValue('options', JSON.stringify(options));
        updateStoreSearch();
    });
    
    
    function updateStoreSearch() {
      if (options.showStoreSearch) {
         $("#storeSearcher").css('display', 'block');
      } else {
         $("#storeSearcher").css('display', 'none');
      }
    }
    

    // determine the product ID
    function getProductId() {
        // scrape the product ID from the web page
        try {
            prodId = unsafeWindow.Lowes.ProductDetail.productId;
        } catch (e) {
            my_debug(e.message);
        }
        
        my_debug('Product id: ' + prodId);
    }

    // build a string with the brand + name of the product
    function getProductName()
    {
        try {
            // mobile
            prodName = unsafeWindow.Lowes.ProductDetail.product.brand + ' ' + unsafeWindow.Lowes.ProductDetail.product.description;
        } catch (e) {
            my_debug(e.mesage);
        }

        try {
            // www page
            prodName = unsafeWindow.digitalData.products[0].brandName + " " + unsafeWindow.digitalData.products[0].productName;
            prodName = prodName.replace(/\_/g, ' ');
           } catch (e) {
            my_debug(e.mesage);
        }
        my_debug('Product name: ' + prodName);
    }

    // create the store list table
    function buildStoreTable() {
        // start over
        $('#mySSTabBody').empty();
        // fill in the table
        var useStore = false;
        var loc = '';

        // sort by store ID (numerical value)
        var sorted_keys = Object.keys(storeData).sort(function(a, b){return a-b});
        for (var i = 0 ; i < sorted_keys.length; i++) {
            var storeId = sorted_keys[i];
            if (storeData.hasOwnProperty(storeId)) {
                try {
                    // get the store location
                    loc = storeData[storeId].Name + ", " + storeData[storeId].State;
                    // get the value for the checkbox
                    useStore = false;
                    if (searchStore.hasOwnProperty(storeId)) useStore = searchStore[storeId];
                    // create a row in the table
                    var storeAddr = "#" + storeId + ": " + storeData[storeId].Address + "; " + storeData[storeId].City + ", " + storeData[storeId].State + "; " + storeData[storeId].Zip;
                    var rowHTML = '<tr id=\'row__' + storeId + '\'><td><input type=\'checkbox\' name=\'store' + storeId + '\' value=\'use\' ' + (useStore ? 'checked' : '') + ' ></td><td>' + storeId + '</td><td class="lpc_addr" title="' + storeAddr +'">' + loc + '</td></tr>';
                    $(rowHTML).appendTo("#mySSTabBody");
                } catch (err) {
                    my_debug(err.message);
                }
            }
        }

    }


    // "Search" button was pressed.  Start getting prices and quantities
    function goAction() {
        // create a button to export csv values
        $("#myExportCSV").remove();
        $('#myTableFooter').append("<button type='button'  id='myExportCSV'>Export Results</button>");
        getProductId();

        $('#myExportCSV').click( function() {
            my_debug('export');

            var csvContent = 'Store, Quantity, Price, Shipping\n';
            // iterate over the table
            $("#myTabBody").children("tr").each( function() {
                $(this).children("td").each( function() {
                    csvContent += '"' + $(this).text() + '",' ;
                });
                csvContent += "\n";
            });
            my_debug(csvContent);

            var a = document.createElement('a');
            if (a.download !== undefined ) {
               a.href        = 'data:attachment/csv, ' + encodeURIComponent(csvContent);
               a.target      = '_blank';
               a.download    = 'Lowes_' + prodId +'.csv';
               document.body.appendChild(a);
               a.click();
               document.body.removeChild(a);
            } else {
              var encodedUri = encodeURI("data:text/csv;charset=utf-8," + csvContent);
              window.open(encodedUri);
            }
        });

        // display the main tab
        $('#icDialog').tabs('option', 'active', 0);
        // rebuild the list of stores to search based on the checkboxes
        $('#mySSTabBody input:checkbox').each(function () {
            var storeNum = '';
            storeNum = /\d+/.exec($(this).attr('name'));
            searchStore[storeNum] = $(this).prop('checked');
        });

        // save off the selected stores
        GM_setValue('searchStore', JSON.stringify(searchStore));

        // reset the results list
        resHolder = {};
        sortedRes = new Array();

        // clear the table
        $('#myTabBody').empty();

        var msgNum = 0;

        // determine how fast to send messages
        var speed = options.speed || 8;
        var millis = 1000 / speed;

        // loop over the stores and request the product details for each store
        for (var storeId in searchStore) {
            if (searchStore.hasOwnProperty(storeId) && searchStore[storeId] &&
                storeData.hasOwnProperty(storeId) ) {
                // build the URL of the product details page w/ store ID
                var qURL = baseURL + unsafeWindow.Lowes.ProductDetail.productPath + '/pricing/' + storeId;
                my_debug(qURL);
                // request the prodcut details.  The result is processed by the function returned by the parseQty() function
                setTimeout( function(url, sID) { return function() { $.get(url, parseQty(sID));}}(qURL,storeId), msgNum * millis);
                msgNum++;
            }
        }
    }

    // get data on stores from Lowes.com
    function findStores() {
        var msgNum = 0;

       // determine how fast to send messages
       var speed = options.speed || 8;
       var millis = 1000 / speed;

      // check for stores with IDs from 1 to 5000 using the store locator
      for (i = 1; i <= 5000; i++ ) {
           var theURL = baseURL + "IntegrationServices/resources/storeLocator/json/v2_0/stores?place=" + i + "&count=1";
           setTimeout( function(url) { return function() { $.get(url, parseStoreInfo());}}(theURL), msgNum * millis);
           msgNum++;
        }
    }

    // handle the return from the store locator call
    var newStores = {};
    function parseStoreInfo() {
       return function (respObject) {
          // if the return doesn't have a location, there is nothing to do
          try {
             var storeId = respObject.Location[0].KEY;
             var so = respObject.Location[0];
             var st = so.STATE;
             // reject Canada results
             if ( states.indexOf(st) < 0) return;
             var newStore = {};
             newStore.Name  = so.STORENAME.replace(" Lowe\'s", "");
             newStore.City = so.CITYFORMATTED;
             newStore.State = so.STATE;
             newStore.Zip = so.ZIP;
             newStore.Lat = Number(Number(so.LLAT).toFixed(5));
             newStore.Lon = Number(Number(so.LLON).toFixed(5));
             newStore.Address = so.ADDRESS;

             // store the data
             newStores[storeId] = newStore;
             // add to the display
             $("#NS_DIV").html( JSON.stringify(newStores));
         } catch (e) {
         }
      }
    }

    // Parse the data out of the response from the web call.  Fill in the table with the results

    function parseQty(storeId) {
    // return this function to parse the return from the web call
        return function (respObject) {

            var sData;        
            // the data is stored in a javascript text block
            try {
              var re = /<script([\s\S]*?)<\/script>/m;
              var pMatch = re.exec(respObject);
              if (pMatch && pMatch.length >= 2) sData = pMatch[1]; 
            } catch (e) {
               my_debug(e);
            }

            var availStatus = 99999;

            // find if shipping is available.  undefined = "?"
            var shipAvail = '';

            // get the price out of the scripts values
            var price;
            try {
               var re = new RegExp('sellingPrice="(.*?)"');
               var pMatch = re.exec(sData);
               if (pMatch && pMatch.length >= 2) price = pMatch[1];
            } catch (e) {
                my_debug(e);
            }
            
            // get the number in stock
            try {
                my_debug(sData);
               var re = /"pickup":[\s\S]*?"availabileQuantity":(\d*)/m;
               var pMatch = re.exec(sData);
               my_debug(pMatch);
               if (pMatch && pMatch.length >= 2) availStatus = pMatch[1];
            } catch (e) {
                my_debug(e);
            }
            
            // get the shipping status
            try {
               var re = new RegExp('"parcel":.*?"availabilityStatus":"(.*?)"');
               var pMatch = re.exec(sData); console.log(pMatch);
                if (pMatch && pMatch.length >= 2) shipAvail = (pMatch[1] === 'Available') ? 'Yes' : '';console.log((shipAvail === 'true'),shipAvail,pMatch);
            } catch (e) {
                my_debug(e);
            }
                
            if ( availStatus == "null" || availStatus == "undefined" || availStatus == 99999) availStatus =0;
            price = parseFloat(price).toFixed(2);
            my_debug('price: ' + price);
            my_debug('number in store: ' + availStatus);

            if (availStatus > 0 || !options.hideEmpty) {
                // Creata a new row and add the data to the table
                addResult(storeId, availStatus, price, shipAvail);
            }
        }
    }


    // create a row on the results table
    function addResult(storeId, qty, price, shipping) {

      // get the store name
      var storeName = storeData[storeId].Name + ", " + storeData[storeId].State;
      // put the store address in the title so it shows up in a tooltip
      var storeAddr = "#" + storeId + ": " + storeData[storeId].Address + "; " + storeData[storeId].City + ", " + storeData[storeId].State + "; " + storeData[storeId].Zip;

      // find where to put this result
      var value = 0.0;
      var direction = "up";
      switch( options.sortSel ) {
        case "any":
            value = 0;
            break;
        case "priceup":
            value = price;
            direction = "up";
            break;
        case "pricedown":
            value = price;
            direction = "down";
            break;
        case "qup":
            value = qty;
            direction = "up";
            break;
        case "qdown":
            value = qty;
            direction = "down";
            break;
      }

      if (isNaN(value)) value = 9999.0;
      
      // add to array and sort
      sortedRes.push(value);
      if (direction == "up") {
         sortedRes.sort(function(a, b){return a-b});
      } else {
         sortedRes.sort(function(a, b){return b-a});
      }

      // find where it landed
      var ind = sortedRes.indexOf(value);
      my_debug('qty: '+ qty);

      // insert
      var rowHTML = '<tr><td class="lpc_addr" title="' + storeAddr + '">' + storeName + '</td><td>' + qty + '</td><td>$' + price + '</td><td>' + shipping + '</td></tr>';
      if (ind == 0) {
        $(rowHTML).prependTo('#myTabBody');
      } else if (ind >= sortedRes.length) {
        // add to the end
        $(rowHTML).appendTo('#myTabBody');
      } else {
        // add to the correct position
        var rowBefore = $('#myTabBody').children('tr').get(ind-1);
        $(rowHTML).insertAfter(rowBefore);
      }
    }
    GM_registerMenuCommand("Price Check", showPopup);

    function showPopup() {
       $('#icDialog').dialog('open');
       if (tableNodes) {
          // reattach the table
          $("#tabHolder").append(tableNodes);
       }
       var tab2 = $("#myTable").detach();
       $("#tabHolder2").append(tab2);
       $("#myTable").show();
       tableNodes = null;
    }

    // Calculates point to point distance using the equirectangular projection approximation.
    // This approximation isn't very accurate, but is fast.
    //  latitudes and longitudes are in radians
    //  the result is in miles
    function calcDist(lat1, lon1, lat2, lon2) {
       const R = 3959; // earth radius in miles
       var x = (lon2-lon1) * Math.cos((lat1+lat2)/2);
       var y = (lat2-lat1);
       var d = Math.sqrt(x*x + y*y) * R;
       return d;
    }
})(jq_2) // end of "main".  Call main and pass in jQuery object

function buildStoreList() {
    // list of all the stores w/ name, state and zip code
    storeData =
    //  Paste here =====================
    {"1001":{"Name":"Victorville","City":"Victorville","State":"CA","Zip":"92392","Lat":34.46882,"Lon":-117.35076,"Address":"14333 Bear Valley Rd"},
    "1003":{"Name":"Tampa Palms","City":"Tampa","State":"FL","Zip":"33647","Lat":28.11424,"Lon":-82.37996,"Address":"6201 Commerce Palms Dr"},
    "1004":{"Name":"S. Myrtle Beach","City":"Myrtle Beach","State":"SC","Zip":"29588","Lat":33.64605,"Lon":-78.98684,"Address":"8672 Highway 17 Bypass"},
    "1006":{"Name":"Richmond","City":"Richmond","State":"KY","Zip":"40475","Lat":37.72875,"Lon":-84.28575,"Address":"814 Eastern Bypass"},
    "1008":{"Name":"Clinton Township","City":"Clinton Township","State":"MI","Zip":"48038","Lat":42.62586,"Lon":-82.9701,"Address":"15350 Hall Rd"},
    "1010":{"Name":"Du Bois","City":"Du Bois","State":"PA","Zip":"15801","Lat":41.12568,"Lon":-78.72947,"Address":"100 Commons Dr"},
    "1013":{"Name":"Mission Valley","City":"San Diego","State":"CA","Zip":"92108","Lat":32.78128,"Lon":-117.12595,"Address":"2318 Northside Dr"},
    "1014":{"Name":"North Attleboro","City":"North Attleboro","State":"MA","Zip":"02760","Lat":41.93637,"Lon":-71.34649,"Address":"1360 S. Washington St"},
    "1016":{"Name":"N.W. Macon","City":"Macon","State":"GA","Zip":"31210","Lat":32.88234,"Lon":-83.7626,"Address":"6011 Zebulon Rd"},
    "1019":{"Name":"San Bruno","City":"San Bruno","State":"CA","Zip":"94066","Lat":37.64057,"Lon":-122.42081,"Address":"1340 El Camino Real"},
    "1022":{"Name":"Watertown","City":"Watertown","State":"NY","Zip":"13601","Lat":43.97207,"Lon":-75.95788,"Address":"20828 New York State, Route 3 (arsenal Street)"},
    "1023":{"Name":"Bedford Heights","City":"Bedford Heights","State":"OH","Zip":"44146","Lat":41.42238,"Lon":-81.50709,"Address":"24500 Miles Rd"},
    "1024":{"Name":"Carson City","City":"Carson City","State":"NV","Zip":"89701","Lat":39.15088,"Lon":-119.76426,"Address":"430 Fairview Dr"},
    "1026":{"Name":"Palm Springs","City":"Palm Springs","State":"CA","Zip":"92264","Lat":33.81467,"Lon":-116.49014,"Address":"5201 East Ramon Rd"},
    "1030":{"Name":"Anaheim","City":"Anaheim","State":"CA","Zip":"92801","Lat":33.85593,"Lon":-117.91684,"Address":"1500 N. Lemon St"},
    "1031":{"Name":"Anderson","City":"Anderson","State":"IN","Zip":"46013","Lat":40.08194,"Lon":-85.65397,"Address":"3335 South Scatterfield Rd"},
    "1032":{"Name":"E. Chandler","City":"Chandler","State":"AZ","Zip":"85224","Lat":33.30754,"Lon":-111.8925,"Address":"2900 West Chandler Blvd"},
    "1033":{"Name":"Henderson","City":"Henderson","State":"NV","Zip":"89014","Lat":36.05775,"Lon":-115.03576,"Address":"440 Marks St"},
    "1034":{"Name":"Egg Harbor Township","City":"Egg Harbor Township","State":"NJ","Zip":"08234","Lat":39.43606,"Lon":-74.60952,"Address":"6048 Black Horse Pike"},
    "1035":{"Name":"Holmdel","City":"Holmdel","State":"NJ","Zip":"07733","Lat":40.41426,"Lon":-74.1664,"Address":"2194 State Route 35"},
    "1037":{"Name":"Central Richmond","City":"Richmond","State":"VA","Zip":"23220","Lat":37.55568,"Lon":-77.45672,"Address":"1640 West Broad St"},
    "1038":{"Name":"Rockingham","City":"Rockingham","State":"NC","Zip":"28379","Lat":34.92055,"Lon":-79.75096,"Address":"1300-A East Broad Ave"},
    "1040":{"Name":"Summersville","City":"Summersville","State":"WV","Zip":"26651","Lat":38.30875,"Lon":-80.8373,"Address":"5200 Webster Rd"},
    "1041":{"Name":"Upland","City":"Upland","State":"CA","Zip":"91786","Lat":34.10933,"Lon":-117.68211,"Address":"1659 W. Foothill Blvd"},
    "1042":{"Name":"W. Phoenix","City":"Phoenix","State":"AZ","Zip":"85035","Lat":33.46663,"Lon":-112.22285,"Address":"1620 North 75th Ave"},
    "1043":{"Name":"Antioch","City":"Antioch","State":"CA","Zip":"94509","Lat":38.00502,"Lon":-121.83368,"Address":"1951 Auto Center Dr"},
    "1045":{"Name":"Findlay","City":"Findlay","State":"OH","Zip":"45840","Lat":41.05726,"Lon":-83.60416,"Address":"1077 Bright Rd"},
    "1046":{"Name":"Hamilton","City":"Hamilton","State":"NJ","Zip":"08691","Lat":40.19881,"Lon":-74.63512,"Address":"1000 Marketplace Blvd"},
    "1047":{"Name":"Oaks","City":"Oaks","State":"PA","Zip":"19456","Lat":40.12927,"Lon":-75.45532,"Address":"200-B Mill Road"},
    "1048":{"Name":"Riverside","City":"Riverside","State":"CA","Zip":"92503","Lat":33.91808,"Lon":-117.45407,"Address":"9851 Magnolia Ave"},
    "1050":{"Name":"San Clemente","City":"San Clemente","State":"CA","Zip":"92673","Lat":33.45363,"Lon":-117.60912,"Address":"907 Avenida Pico"},
    "1052":{"Name":"Tomball","City":"Tomball","State":"TX","Zip":"77377","Lat":30.0916,"Lon":-95.63741,"Address":"14236 Fm 2920"},
    "1053":{"Name":"Pasadena","City":"Pasadena","State":"TX","Zip":"77505","Lat":29.64816,"Lon":-95.15914,"Address":"5400 Fairmont Pkwy"},
    "1054":{"Name":"Metairie","City":"Metairie","State":"LA","Zip":"70002","Lat":30.00239,"Lon":-90.16322,"Address":"3640 Veterans Memorial Blvd"},
    "1055":{"Name":"Fenton","City":"Fenton","State":"MO","Zip":"63026","Lat":38.5092,"Lon":-90.44604,"Address":"1 Gravois Bluffs Plaza Dr"},
    "1057":{"Name":"St. Charles","City":"Saint Charles","State":"MO","Zip":"63301","Lat":38.78852,"Lon":-90.5307,"Address":"2900 West Clay St"},
    "1058":{"Name":"Bunker Hill","City":"Houston","State":"TX","Zip":"77055","Lat":29.78617,"Lon":-95.52854,"Address":"9640 Old Katy Rd"},
    "1059":{"Name":"Frisco","City":"Frisco","State":"TX","Zip":"75034","Lat":33.10648,"Lon":-96.80277,"Address":"3360 Preston Rd"},
    "1060":{"Name":"S.W. Charlotte","City":"Charlotte","State":"NC","Zip":"28273","Lat":35.14574,"Lon":-80.93192,"Address":"8192 South Tryon St"},
    "1064":{"Name":"S.E. Columbia","City":"Columbia","State":"SC","Zip":"29209","Lat":33.96376,"Lon":-80.93909,"Address":"7420 Garners Ferry Rd"},
    "1065":{"Name":"Norfolk","City":"Norfolk","State":"VA","Zip":"23502","Lat":36.85789,"Lon":-76.21188,"Address":"1081 North Military Highway"},
    "1066":{"Name":"Lexington","City":"Lexington","State":"SC","Zip":"29072","Lat":34.00161,"Lon":-81.21401,"Address":"5412 Sunset Blvd"},
    "1067":{"Name":"Sedalia","City":"Sedalia","State":"MO","Zip":"65301","Lat":38.71115,"Lon":-93.27678,"Address":"3811 West Broadway"},
    "1068":{"Name":"Shallotte","City":"Shallotte","State":"NC","Zip":"28470","Lat":33.97498,"Lon":-78.39959,"Address":"351 Whiteville Rd"},
    "1069":{"Name":"W. Boca Raton","City":"Boca Raton","State":"FL","Zip":"33428","Lat":26.35149,"Lon":-80.20129,"Address":"21870 State Rd 7"},
    "1070":{"Name":"Hammond","City":"Hammond","State":"LA","Zip":"70401","Lat":30.50265,"Lon":-90.49658,"Address":"3007 Highway 190 West"},
    "1071":{"Name":"Highland Heights","City":"Highland Heights","State":"KY","Zip":"41076","Lat":39.03921,"Lon":-84.44749,"Address":"2369 Alexandria Pike"},
    "1072":{"Name":"Galax","City":"Galax","State":"VA","Zip":"24333","Lat":36.69265,"Lon":-80.87457,"Address":"8417 Carrollton/Pike Rd"},
    "1073":{"Name":"Gulf Breeze","City":"Gulf Breeze","State":"FL","Zip":"32563","Lat":30.38825,"Lon":-87.06337,"Address":"1421 Tiger Park Ln"},
    "1074":{"Name":"Frenchtown Township","City":"Monroe","State":"MI","Zip":"48162","Lat":41.95436,"Lon":-83.40045,"Address":"2191 North Telegraph Rd"},
    "1075":{"Name":"S. Florence","City":"Florence","State":"SC","Zip":"29505","Lat":34.15962,"Lon":-79.75833,"Address":"1701 Freedom Blvd"},
    "1076":{"Name":"Conyers","City":"Conyers","State":"GA","Zip":"30013","Lat":33.63952,"Lon":-84.01904,"Address":"1901 Georgia Highway 138 S.E."},
    "1077":{"Name":"Jefferson City","City":"Jefferson City","State":"MO","Zip":"65109","Lat":38.58029,"Lon":-92.24435,"Address":"3441 Missouri Blvd"},
    "1078":{"Name":"N. Kansas City","City":"Kansas City","State":"MO","Zip":"64154","Lat":39.25096,"Lon":-94.65229,"Address":"8601 N. Boardwalk Ave"},
    "1079":{"Name":"Winter Haven","City":"Winter Haven","State":"FL","Zip":"33880","Lat":28.01242,"Lon":-81.72954,"Address":"700 3rd St S.W. / 490 Citi Centre"},
    "1080":{"Name":"Riverdale","City":"Riverdale","State":"UT","Zip":"84405","Lat":41.18861,"Lon":-111.98679,"Address":"4155 South Riverdale Rd"},
    "1081":{"Name":"Lakewood","City":"Lakewood","State":"WA","Zip":"98499","Lat":47.1675,"Lon":-122.50447,"Address":"5115 100th St S.W. Lake"},
    "1082":{"Name":"Yuma","City":"Yuma","State":"AZ","Zip":"85364","Lat":32.66806,"Lon":-114.62144,"Address":"115 West 32nd St"},
    "1083":{"Name":"Rolla","City":"Rolla","State":"MO","Zip":"65401","Lat":37.96684,"Lon":-91.76233,"Address":"2300 North Bishop Ave"},
    "1084":{"Name":"Shawnee","City":"Shawnee","State":"KS","Zip":"66217","Lat":39.01153,"Lon":-94.77518,"Address":"16300 West 65th St"},
    "1085":{"Name":"Harvey","City":"Harvey","State":"LA","Zip":"70058","Lat":29.89667,"Lon":-90.05935,"Address":"1351 Manhattan Blvd"},
    "1086":{"Name":"Modesto","City":"Modesto","State":"CA","Zip":"95356","Lat":37.70251,"Lon":-121.06475,"Address":"3801 Pelandale Ave"},
    "1087":{"Name":"Folsom","City":"Folsom","State":"CA","Zip":"95630","Lat":38.67233,"Lon":-121.15752,"Address":"800 East Bidwell St"},
    "1088":{"Name":"N.W. San Antonio","City":"San Antonio","State":"TX","Zip":"78250","Lat":29.54717,"Lon":-98.66599,"Address":"11333 Bandera Rd"},
    "1089":{"Name":"Auburn","City":"Auburn","State":"WA","Zip":"98002","Lat":47.31939,"Lon":-122.22736,"Address":"1232 A Sreet Northeast"},
    "1090":{"Name":"Gilbert","City":"Gilbert","State":"AZ","Zip":"85296","Lat":33.33649,"Lon":-111.79213,"Address":"734 South Gilbert Rd"},
    "1091":{"Name":"Marion","City":"Marion","State":"OH","Zip":"43302","Lat":40.58382,"Lon":-83.07964,"Address":"1840 Marion Mt. Gilead Rd"},
    "1092":{"Name":"Richmond","City":"Richmond","State":"IN","Zip":"47374","Lat":39.83091,"Lon":-84.81929,"Address":"510 West Eaton Pike"},
    "1093":{"Name":"Muscle Shoals","City":"Muscle Shoals","State":"AL","Zip":"35661","Lat":34.72663,"Lon":-87.66605,"Address":"3415 Woodward Ave"},
    "1094":{"Name":"Danvers","City":"Danvers","State":"MA","Zip":"01923","Lat":42.55895,"Lon":-70.96801,"Address":"153 Andover St"},
    "1095":{"Name":"Knightdale","City":"Knightdale","State":"NC","Zip":"27545","Lat":35.79674,"Lon":-78.48398,"Address":"7316 Knightdale Blvd"},
    "1096":{"Name":"Hollister","City":"Hollister","State":"MO","Zip":"65672","Lat":36.6142,"Lon":-93.22879,"Address":"165 Mall Rd"},
    "1097":{"Name":"Morganton","City":"Morganton","State":"NC","Zip":"28655","Lat":35.71781,"Lon":-81.69691,"Address":"1224 Burkemont Ave"},
    "1098":{"Name":"Independence","City":"Independence","State":"MO","Zip":"64055","Lat":39.03479,"Lon":-94.35931,"Address":"19000 East Valley View Pkwy"},
    "1099":{"Name":"E. Colorado Springs","City":"Colorado Springs","State":"CO","Zip":"80922","Lat":38.87388,"Lon":-104.71794,"Address":"2945 New Center Pt"},
    "1105":{"Name":"N. Ft Wayne","City":"Fort Wayne","State":"IN","Zip":"46818","Lat":41.14076,"Lon":-85.16547,"Address":"6931 North Lima Rd"},
    "1106":{"Name":"North Bergen","City":"North Bergen","State":"NJ","Zip":"07047","Lat":40.80627,"Lon":-74.01873,"Address":"7801 Tonnelle Ave"},
    "1107":{"Name":"New Iberia","City":"New Iberia","State":"LA","Zip":"70560","Lat":29.98688,"Lon":-91.85444,"Address":"2816 Highway 14"},
    "1108":{"Name":"Tigard","City":"Tigard","State":"OR","Zip":"97223","Lat":45.42851,"Lon":-122.75329,"Address":"12615 S.W. 72nd Ave"},
    "1109":{"Name":"Stuart","City":"Stuart","State":"FL","Zip":"34997","Lat":27.1602,"Lon":-80.22533,"Address":"3620 Southeast Federal Highway"},
    "1110":{"Name":"Portage","City":"Portage","State":"MI","Zip":"49002","Lat":42.24317,"Lon":-85.59242,"Address":"5108 South Westnedge Ave"},
    "1111":{"Name":"Boynton Beach","City":"Boynton Beach","State":"FL","Zip":"33426","Lat":26.51319,"Lon":-80.07602,"Address":"1500 Corporate Dr"},
    "1112":{"Name":"S. Charlotte","City":"Charlotte","State":"NC","Zip":"28277","Lat":35.06565,"Lon":-80.77371,"Address":"5310 Ballantyne Commons Pkwy"},
    "1113":{"Name":"Sunrise","City":"Sunrise","State":"FL","Zip":"33351","Lat":26.16571,"Lon":-80.25772,"Address":"8050 West Oakland Park Blvd"},
    "1114":{"Name":"Wood Village","City":"Wood Village","State":"OR","Zip":"97060","Lat":45.52989,"Lon":-122.42545,"Address":"1000 Ne Wood Village Blvd"},
    "1115":{"Name":"Guntersville","City":"Guntersville","State":"AL","Zip":"35976","Lat":34.29986,"Lon":-86.26792,"Address":"11190 U.S. Highway 431 South"},
    "1116":{"Name":"S.W. Augusta","City":"Augusta","State":"GA","Zip":"30906","Lat":33.40766,"Lon":-82.02408,"Address":"3214 Peach Orchard Rd"},
    "1117":{"Name":"Peoria","City":"Peoria","State":"AZ","Zip":"85381","Lat":33.60852,"Lon":-112.24154,"Address":"8497 West Thunderbird Rd"},
    "1118":{"Name":"St. George","City":"Saint George","State":"UT","Zip":"84790","Lat":37.1008,"Lon":-113.55402,"Address":"415 South River Rd"},
    "1119":{"Name":"Chamblee","City":"Chamblee","State":"GA","Zip":"30341","Lat":33.88522,"Lon":-84.31734,"Address":"4950 Peachtree Industrial Blvd"},
    "1120":{"Name":"Florence","City":"Florence","State":"SC","Zip":"29501","Lat":34.18882,"Lon":-79.81908,"Address":"2301 David H. Mcleod Blvd"},
    "1121":{"Name":"Grandville","City":"Grandville","State":"MI","Zip":"49418","Lat":42.8802,"Lon":-85.77413,"Address":"4705 Canal Ave"},
    "1122":{"Name":"New Carrollton","City":"New Carrollton","State":"MD","Zip":"20784","Lat":38.95928,"Lon":-76.8742,"Address":"7710 Riverdale Rd"},
    "1123":{"Name":"Russell","City":"Ashland","State":"KY","Zip":"41101","Lat":38.5009,"Lon":-82.67951,"Address":"350 Diedrich Blvd"},
    "1124":{"Name":"S.E. Charlotte","City":"Matthews","State":"NC","Zip":"28105","Lat":35.12897,"Lon":-80.70582,"Address":"2115 Matthews Township Pkwy"},
    "1125":{"Name":"Sterling","City":"Sterling","State":"VA","Zip":"20166","Lat":39.02545,"Lon":-77.42729,"Address":"45430 Dulles Crossing Plaza"},
    "1126":{"Name":"Suffolk","City":"Suffolk","State":"VA","Zip":"23434","Lat":36.74781,"Lon":-76.58006,"Address":"1216 N. Main St"},
    "1127":{"Name":"W. Lancaster","City":"Lancaster","State":"PA","Zip":"17603","Lat":40.04138,"Lon":-76.36182,"Address":"25 Rohrerstown Rd"},
    "1128":{"Name":"S.E. Houston","City":"Houston","State":"TX","Zip":"77087","Lat":29.69755,"Lon":-95.2993,"Address":"1000 Gulfgate Center Mall"},
    "1130":{"Name":"Union Township","City":"New Castle","State":"PA","Zip":"16101","Lat":41.01658,"Lon":-80.39635,"Address":"2640 West State St"},
    "1131":{"Name":"Royal Oaks","City":"Houston","State":"TX","Zip":"77077","Lat":29.73521,"Lon":-95.5911,"Address":"2610 Kirkwood Dr"},
    "1132":{"Name":"Union City","City":"Union City","State":"CA","Zip":"94587","Lat":37.59964,"Lon":-122.06383,"Address":"32040 Union Landing Blvd."},
    "1133":{"Name":"West Valley City","City":"West Valley City","State":"UT","Zip":"84120","Lat":40.68329,"Lon":-112.02769,"Address":"4050 South 5600 West"},
    "1134":{"Name":"Yukon","City":"Yukon","State":"OK","Zip":"73099","Lat":35.4822,"Lon":-97.75822,"Address":"1605 South Garth Brooks Blvd"},
    "1135":{"Name":"Avon","City":"Avon","State":"IN","Zip":"46123","Lat":39.76092,"Lon":-86.38286,"Address":"7893 East U.S. Highway 36"},
    "1136":{"Name":"Clinton","City":"Clinton","State":"MD","Zip":"20735","Lat":38.77058,"Lon":-76.88902,"Address":"8755 Branch Ave"},
    "1137":{"Name":"N. El Paso","City":"El Paso","State":"TX","Zip":"79924","Lat":31.90063,"Lon":-106.43887,"Address":"4531 Woodrow Bean - Transmountain Rd"},
    "1138":{"Name":"S. Wilmington","City":"Wilmington","State":"NC","Zip":"28412","Lat":34.14784,"Lon":-77.89555,"Address":"5110 S. College Rd"},
    "1139":{"Name":"Macedonia","City":"Northfield","State":"OH","Zip":"44067","Lat":41.31175,"Lon":-81.52487,"Address":"8224 Golden Link Blvd"},
    "1140":{"Name":"Oviedo","City":"Oviedo","State":"FL","Zip":"32765","Lat":28.65409,"Lon":-81.24031,"Address":"1155 Vidina Pl"},
    "1141":{"Name":"Kernersville","City":"Kernersville","State":"NC","Zip":"27284","Lat":36.10671,"Lon":-80.10444,"Address":"145 Harmon Creek Rd"},
    "1142":{"Name":"S.W. Pensacola","City":"Pensacola","State":"FL","Zip":"32505","Lat":30.43395,"Lon":-87.27152,"Address":"4301 West Fairfield Dr"},
    "1143":{"Name":"Vacaville","City":"Vacaville","State":"CA","Zip":"95688","Lat":38.37237,"Lon":-121.95842,"Address":"1751 East Monte Vista Ave"},
    "1144":{"Name":"Burbank","City":"Burbank","State":"CA","Zip":"91504","Lat":34.18996,"Lon":-118.3326,"Address":"2000 Empire Ave"},
    "1145":{"Name":"E. Houston","City":"Houston","State":"TX","Zip":"77049","Lat":29.81253,"Lon":-95.16542,"Address":"6161 E. Sam Houston Pkwy N."},
    "1146":{"Name":"E. El Paso","City":"El Paso","State":"TX","Zip":"79936","Lat":31.72697,"Lon":-106.3051,"Address":"11950 Rojas Dr"},
    "1147":{"Name":"Osage Beach","City":"Osage Beach","State":"MO","Zip":"65065","Lat":38.15588,"Lon":-92.60169,"Address":"950 Highway 42"},
    "1148":{"Name":"Elk Grove","City":"Elk Grove","State":"CA","Zip":"95624","Lat":38.45391,"Lon":-121.40401,"Address":"8369 Power Inn Rd"},
    "1149":{"Name":"Lawnside","City":"Lawnside","State":"NJ","Zip":"08045","Lat":39.8636,"Lon":-75.03866,"Address":"122 West Oak Ave"},
    "1150":{"Name":"Livermore","City":"Livermore","State":"CA","Zip":"94551","Lat":37.69417,"Lon":-121.74467,"Address":"4255 First St"},
    "1151":{"Name":"Port Arthur","City":"Port Arthur","State":"TX","Zip":"77640","Lat":29.94041,"Lon":-93.99071,"Address":"8383 Memorial Blvd"},
    "1152":{"Name":"W. El Paso","City":"El Paso","State":"TX","Zip":"79912","Lat":31.86231,"Lon":-106.5728,"Address":"430 East Redd Rd"},
    "1153":{"Name":"Mcdonough","City":"Mcdonough","State":"GA","Zip":"30253","Lat":33.43175,"Lon":-84.18124,"Address":"101 Willow Ln"},
    "1155":{"Name":"N.W. Central San Antonio","City":"San Antonio","State":"TX","Zip":"78229","Lat":29.51147,"Lon":-98.55468,"Address":"7901 Callaghan Rd"},
    "1156":{"Name":"N. Chesterfield","City":"Chesterfield","State":"MI","Zip":"48051","Lat":42.67241,"Lon":-82.8295,"Address":"27990 23 Mile Rd"},
    "1157":{"Name":"Prescott","City":"Prescott","State":"AZ","Zip":"86301","Lat":34.55424,"Lon":-112.42338,"Address":"2300 East State Route 69"},
    "1158":{"Name":"Las Cruces","City":"Las Cruces","State":"NM","Zip":"88001","Lat":32.34371,"Lon":-106.77201,"Address":"3200 North Main St"},
    "1159":{"Name":"Central Omaha","City":"Omaha","State":"NE","Zip":"68114","Lat":41.25785,"Lon":-96.02986,"Address":"7525 Dodge St"},
    "1160":{"Name":"S.E. Cincinnati","City":"Cincinnati","State":"OH","Zip":"45245","Lat":39.06948,"Lon":-84.29561,"Address":"618 Mount Moriah Dr"},
    "1161":{"Name":"Waterford Lake","City":"Orlando","State":"FL","Zip":"32825","Lat":28.54507,"Lon":-81.20545,"Address":"12200 Lake Underhill Rd"},
    "1162":{"Name":"West Hills","City":"West Hills","State":"CA","Zip":"91304","Lat":34.22074,"Lon":-118.60719,"Address":"8383 Topanga Canyon Blvd"},
    "1163":{"Name":"S.E. Memphis","City":"Memphis","State":"TN","Zip":"38125","Lat":35.04759,"Lon":-89.80057,"Address":"7895 Winchester Rd"},
    "1164":{"Name":"Wytheville","City":"Wytheville","State":"VA","Zip":"24382","Lat":36.95753,"Lon":-81.10213,"Address":"185 Dominion St"},
    "1165":{"Name":"Norman","City":"Norman","State":"OK","Zip":"73069","Lat":35.22458,"Lon":-97.48162,"Address":"2555 Hemphill Dr"},
    "1166":{"Name":"Columbus","City":"Columbus","State":"MS","Zip":"39705","Lat":33.52085,"Lon":-88.4137,"Address":"2301 Woodmont Dr"},
    "1167":{"Name":"Olympia","City":"Olympia","State":"WA","Zip":"98516","Lat":47.04946,"Lon":-122.83145,"Address":"4230 Martin Way East"},
    "1168":{"Name":"Mooresville","City":"Mooresville","State":"IN","Zip":"46158","Lat":39.61555,"Lon":-86.35889,"Address":"851 Bridge St"},
    "1170":{"Name":"San Dimas","City":"San Dimas","State":"CA","Zip":"91773","Lat":34.10783,"Lon":-117.81928,"Address":"633 West Bonita Ave"},
    "1174":{"Name":"Brockton","City":"Brockton","State":"MA","Zip":"02301","Lat":42.09301,"Lon":-71.04909,"Address":"135 West Gate Dr"},
    "1175":{"Name":"Central Columbus","City":"Columbus","State":"OH","Zip":"43211","Lat":40.01118,"Lon":-82.99419,"Address":"2345 Silver Dr"},
    "1176":{"Name":"Decatur","City":"Decatur","State":"AL","Zip":"35601","Lat":34.56778,"Lon":-87.01426,"Address":"1641 Beltline Rd SW"},
    "1177":{"Name":"Colonie","City":"Latham","State":"NY","Zip":"12110","Lat":42.74459,"Lon":-73.76312,"Address":"790 Loudon Rd"},
    "1180":{"Name":"Lee's Summit","City":"Lees Summit","State":"MO","Zip":"64081","Lat":38.92968,"Lon":-94.41128,"Address":"1830 Northwest Chipman Rd"},
    "1181":{"Name":"Prattville","City":"Prattville","State":"AL","Zip":"36066","Lat":32.46226,"Lon":-86.40169,"Address":"2307 Cobbs Ford Rd"},
    "1184":{"Name":"S.W. Omaha","City":"Omaha","State":"NE","Zip":"68130","Lat":41.23202,"Lon":-96.20233,"Address":"18375 Wright St"},
    "1185":{"Name":"W. Windsor","City":"Princeton","State":"NJ","Zip":"08540","Lat":40.30893,"Lon":-74.66157,"Address":"3504 Brunswick Pike"},
    "1186":{"Name":"Hampton","City":"Hampton","State":"VA","Zip":"23666","Lat":37.03817,"Lon":-76.39718,"Address":"2002 Power Plant Pkwy"},
    "1187":{"Name":"E. Bartlett","City":"Bartlett","State":"TN","Zip":"38133","Lat":35.20613,"Lon":-89.78624,"Address":"8300 Highway 64"},
    "1188":{"Name":"Laurel","City":"Laurel","State":"MD","Zip":"20707","Lat":39.08718,"Lon":-76.86248,"Address":"14300 Baltimore Ave"},
    "1189":{"Name":"Medford","City":"Medford","State":"NY","Zip":"11763","Lat":40.8261,"Lon":-72.99746,"Address":"2796 Route 112"},
    "1190":{"Name":"Pinellas Park","City":"Pinellas Park","State":"FL","Zip":"33781","Lat":27.84148,"Lon":-82.73822,"Address":"7301 Park Blvd"},
    "1191":{"Name":"Noblesville","City":"Noblesville","State":"IN","Zip":"46060","Lat":40.03274,"Lon":-85.992,"Address":"16800 Mercantile Blvd"},
    "1192":{"Name":"Orangeburg","City":"Orangeburg","State":"NY","Zip":"10962","Lat":41.04231,"Lon":-73.94703,"Address":"206 Route 303"},
    "1193":{"Name":"East Peoria","City":"East Peoria","State":"IL","Zip":"61611","Lat":40.68116,"Lon":-89.58439,"Address":"201 Riverside Dr"},
    "1195":{"Name":"Plattsburgh","City":"Plattsburgh","State":"NY","Zip":"12901","Lat":44.69426,"Lon":-73.49385,"Address":"39 Centre Dr"},
    "1196":{"Name":"Athens","City":"Athens","State":"TN","Zip":"37303","Lat":35.44571,"Lon":-84.62723,"Address":"1751 South Congress Pkwy"},
    "1197":{"Name":"Warwick","City":"Warwick","State":"RI","Zip":"02886","Lat":41.68242,"Lon":-71.49774,"Address":"510 Quaker Ln"},
    "1198":{"Name":"Woburn","City":"Woburn","State":"MA","Zip":"01801","Lat":42.50566,"Lon":-71.12899,"Address":"15 Commerce Way"},
    "1199":{"Name":"Allen","City":"Allen","State":"TX","Zip":"75013","Lat":33.10202,"Lon":-96.68645,"Address":"1010 West Mcdermott Dr"},
    "1200":{"Name":"Robinson Township","City":"Pittsburgh","State":"PA","Zip":"15275","Lat":40.45055,"Lon":-80.17134,"Address":"400 Davis Blvd"},
    "1201":{"Name":"Chico","City":"Chico","State":"CA","Zip":"95928","Lat":39.71659,"Lon":-121.79832,"Address":"2350 Forest Ave"},
    "1202":{"Name":"Greeneville","City":"Greeneville","State":"TN","Zip":"37745","Lat":36.17997,"Lon":-82.78,"Address":"2375 East Andrew Johnson Highway"},
    "1203":{"Name":"Bloomington","City":"Bloomington","State":"IL","Zip":"61704","Lat":40.48669,"Lon":-88.94687,"Address":"2101 East Empire St"},
    "1204":{"Name":"N. Phoenix","City":"Phoenix","State":"AZ","Zip":"85053","Lat":33.60962,"Lon":-112.12137,"Address":"2929 W. Thunderbird Rd"},
    "1205":{"Name":"Southgate","City":"Southgate","State":"MI","Zip":"48195","Lat":42.18637,"Lon":-83.19283,"Address":"16410 Trenton Rd"},
    "1206":{"Name":"Worcester","City":"Worcester","State":"MA","Zip":"01605","Lat":42.29274,"Lon":-71.77266,"Address":"533 Lincoln St"},
    "1207":{"Name":"N. Roseville","City":"Roseville","State":"CA","Zip":"95678","Lat":38.78662,"Lon":-121.27971,"Address":"10201 Fairway Dr"},
    "1209":{"Name":"Sikeston","City":"Sikeston","State":"MO","Zip":"63801","Lat":36.861,"Lon":-89.58199,"Address":"1240 S. Main St"},
    "1210":{"Name":"Reidsville","City":"Reidsville","State":"NC","Zip":"27320","Lat":36.37846,"Lon":-79.66246,"Address":"5201 U.S. 29 Business"},
    "1211":{"Name":"E. Columbus","City":"Columbus","State":"OH","Zip":"43213","Lat":39.97417,"Lon":-82.90477,"Address":"3616 East Broad St"},
    "1500":{"Name":"Owasso","City":"Owasso","State":"OK","Zip":"74055","Lat":36.29472,"Lon":-95.84101,"Address":"12001 E. 96th St North"},
    "1501":{"Name":"Logan","City":"Logan","State":"UT","Zip":"84341","Lat":41.75845,"Lon":-111.82707,"Address":"313 E. 1400 North"},
    "1502":{"Name":"Binghamton","City":"Binghamton","State":"NY","Zip":"13901","Lat":42.16086,"Lon":-75.89158,"Address":"1318 Upper Front St"},
    "1503":{"Name":"Ballwin","City":"Ballwin","State":"MO","Zip":"63011","Lat":38.59138,"Lon":-90.53937,"Address":"14810 Manchester Rd"},
    "1504":{"Name":"W. San Antonio","City":"San Antonio","State":"TX","Zip":"78245","Lat":29.43884,"Lon":-98.64539,"Address":"203 Loop 410 S.W."},
    "1505":{"Name":"Cranston","City":"Cranston","State":"RI","Zip":"02920","Lat":41.79668,"Lon":-71.44422,"Address":"247 Garfield Ave"},
    "1506":{"Name":"Rockledge","City":"Rockledge","State":"FL","Zip":"32955","Lat":28.2966,"Lon":-80.74047,"Address":"3790 Fiske Blvd"},
    "1507":{"Name":"Norcross","City":"Norcross","State":"GA","Zip":"30071","Lat":33.93194,"Lon":-84.17558,"Address":"2035 Beaver Ruin Rd"},
    "1508":{"Name":"Tifton","City":"Tifton","State":"GA","Zip":"31793","Lat":31.44299,"Lon":-83.54552,"Address":"2000 Us Highway 82 West"},
    "1509":{"Name":"Lenoir","City":"Lenoir","State":"NC","Zip":"28645","Lat":35.89873,"Lon":-81.51916,"Address":"1201 Hickory Blvd S.E."},
    "1510":{"Name":"Santa Clarita","City":"Santa Clarita","State":"CA","Zip":"91350","Lat":34.42657,"Lon":-118.53994,"Address":"26415 Bouquet Canyon Rd"},
    "1511":{"Name":"Mansfield","City":"Mansfield","State":"TX","Zip":"76063","Lat":32.59377,"Lon":-97.14644,"Address":"1901 U.S. Highway 287"},
    "1512":{"Name":"Mt. Olive","City":"Flanders","State":"NJ","Zip":"07836","Lat":40.88202,"Lon":-74.70295,"Address":"20 International Dr South"},
    "1513":{"Name":"Rome","City":"Rome","State":"GA","Zip":"30165","Lat":34.27314,"Lon":-85.2345,"Address":"2338 Shorter Ave N.W."},
    "1514":{"Name":"N.E. Grand Rapids","City":"Grand Rapids","State":"MI","Zip":"49525","Lat":43.04069,"Lon":-85.61177,"Address":"4297 Plainfield Ave N.E."},
    "1515":{"Name":"The Woodlands","City":"Conroe","State":"TX","Zip":"77384","Lat":30.20949,"Lon":-95.46216,"Address":"3052 College Park Dr"},
    "1516":{"Name":"Columbus","City":"Columbus","State":"IN","Zip":"47201","Lat":39.2103,"Lon":-85.88099,"Address":"3500 10th St"},
    "1517":{"Name":"Kentwood","City":"Kentwood","State":"MI","Zip":"49512","Lat":42.91092,"Lon":-85.58516,"Address":"3330 28th St South East"},
    "1518":{"Name":"S. Louisville","City":"Louisville","State":"KY","Zip":"40229","Lat":38.10609,"Lon":-85.6719,"Address":"9800 Preston Crossing Blvd"},
    "1519":{"Name":"Ashtabula","City":"Ashtabula","State":"OH","Zip":"44004","Lat":41.8799,"Lon":-80.76516,"Address":"2416 Dillon Dr"},
    "1520":{"Name":"N.W. Omaha","City":"Omaha","State":"NE","Zip":"68116","Lat":41.28977,"Lon":-96.14264,"Address":"3333 N. 147th St"},
    "1521":{"Name":"Beaufort","City":"Beaufort","State":"SC","Zip":"29906","Lat":32.42834,"Lon":-80.71799,"Address":"207 Robert Smalls Pkwy"},
    "1522":{"Name":"Boone","City":"Boone","State":"NC","Zip":"28607","Lat":36.19929,"Lon":-81.65645,"Address":"1855 Blowing Rock Rd"},
    "1523":{"Name":"Troy","City":"Troy","State":"OH","Zip":"45373","Lat":40.05595,"Lon":-84.24584,"Address":"2000 West Main St"},
    "1524":{"Name":"Keller","City":"Keller","State":"TX","Zip":"76248","Lat":32.89746,"Lon":-97.24023,"Address":"600 N. Tarrant Pkwy"},
    "1525":{"Name":"Carmel","City":"Carmel","State":"IN","Zip":"46033","Lat":39.99891,"Lon":-86.12429,"Address":"14598 Lowes Way"},
    "1526":{"Name":"Germantown Parkway","City":"Cordova","State":"TN","Zip":"38018","Lat":35.11884,"Lon":-89.79793,"Address":"430 S. Germantown Pkwy"},
    "1527":{"Name":"Greenville","City":"Greenville","State":"MS","Zip":"38701","Lat":33.36751,"Lon":-91.03839,"Address":"1886 Dr. Martin Luther King Jr. Blvd"},
    "1528":{"Name":"Lexington","City":"Lexington","State":"VA","Zip":"24450","Lat":37.80742,"Lon":-79.40781,"Address":"1255 North Lee Highway"},
    "1529":{"Name":"Albemarle","City":"Albemarle","State":"NC","Zip":"28001","Lat":35.34557,"Lon":-80.1664,"Address":"814-14 N.C. 24-27 Bypass East"},
    "1530":{"Name":"Atascocita","City":"Humble","State":"TX","Zip":"77346","Lat":30.00005,"Lon":-95.16666,"Address":"7355 Fm 1960 Rd East"},
    "1531":{"Name":"Bessemer","City":"Bessemer","State":"AL","Zip":"35020","Lat":33.41016,"Lon":-86.96536,"Address":"1201 19th St North"},
    "1532":{"Name":"Bixby","City":"Bixby","State":"OK","Zip":"74008","Lat":36.00168,"Lon":-95.88949,"Address":"11114 South Memorial Dr"},
    "1533":{"Name":"Bluffton","City":"Bluffton","State":"SC","Zip":"29910","Lat":32.24142,"Lon":-80.82761,"Address":"35 Malphrus Rd"},
    "1534":{"Name":"Bremerton","City":"Bremerton","State":"WA","Zip":"98311","Lat":47.613,"Lon":-122.6266,"Address":"5600 State Highway 303 N.E."},
    "1535":{"Name":"Brick Township","City":"Brick","State":"NJ","Zip":"08723","Lat":40.05711,"Lon":-74.15821,"Address":"520 Route 70"},
    "1536":{"Name":"Broken Arrow","City":"Broken Arrow","State":"OK","Zip":"74012","Lat":36.06479,"Lon":-95.76738,"Address":"1900 East Hillside Dr"},
    "1537":{"Name":"C. Henderson","City":"Henderson","State":"NV","Zip":"89015","Lat":36.01421,"Lon":-114.95739,"Address":"1401 South Boulder Highway"},
    "1538":{"Name":"Chantilly","City":"Chantilly","State":"VA","Zip":"20151","Lat":38.89292,"Lon":-77.42399,"Address":"13856 Metrotech Dr"},
    "1539":{"Name":"Cheyenne","City":"Cheyenne","State":"WY","Zip":"82009","Lat":41.16618,"Lon":-104.80301,"Address":"1608 Prairie Ave"},
    "1540":{"Name":"Citrus Heights","City":"Citrus Heights","State":"CA","Zip":"95610","Lat":38.67736,"Lon":-121.27358,"Address":"7840 Greenback Ln"},
    "1541":{"Name":"Clovis","City":"Clovis","State":"CA","Zip":"93612","Lat":36.81019,"Lon":-119.69894,"Address":"875 Shaw Ave"},
    "1542":{"Name":"Deptford","City":"Deptford","State":"NJ","Zip":"08096","Lat":39.83281,"Lon":-75.10603,"Address":"1480 Clements Bridge Rd"},
    "1543":{"Name":"E. Albuquerque","City":"Albuquerque","State":"NM","Zip":"87111","Lat":35.1174,"Lon":-106.51443,"Address":"3010 Juan Tabo Blvd N.E."},
    "1544":{"Name":"E. Knoxville","City":"Knoxville","State":"TN","Zip":"37924","Lat":36.02786,"Lon":-83.87636,"Address":"3100 South Mall Rd"},
    "1545":{"Name":"E. Stockton","City":"Stockton","State":"CA","Zip":"95212","Lat":38.02255,"Lon":-121.27,"Address":"3645 East Hammer Ln"},
    "1546":{"Name":"E. Virginia Beach","City":"Virginia Beach","State":"VA","Zip":"23454","Lat":36.84051,"Lon":-76.05416,"Address":"2403 Virginia Beach Blvd"},
    "1547":{"Name":"E. Wichita","City":"Wichita","State":"KS","Zip":"67207","Lat":37.67719,"Lon":-97.19892,"Address":"11959 East Kellogg Dr"},
    "1548":{"Name":"Eatontown","City":"Eatontown","State":"NJ","Zip":"07724","Lat":40.29672,"Lon":-74.05635,"Address":"118 Highway 35"},
    "1549":{"Name":"Edmond","City":"Edmond","State":"OK","Zip":"73034","Lat":35.64975,"Lon":-97.46184,"Address":"1320 East 2nd St"},
    "1551":{"Name":"Gaylord","City":"Gaylord","State":"MI","Zip":"49735","Lat":45.02297,"Lon":-84.69501,"Address":"600 Edelweiss Village Pkwy"},
    "1552":{"Name":"Gilroy","City":"Gilroy","State":"CA","Zip":"95020","Lat":37.0059,"Lon":-121.55415,"Address":"7151 Camino Arroyo"},
    "1553":{"Name":"Goodyear","City":"Goodyear","State":"AZ","Zip":"85338","Lat":33.46189,"Lon":-112.34306,"Address":"13191 West Mcdowell Rd"},
    "1554":{"Name":"Grand Junction","City":"Grand Junction","State":"CO","Zip":"81505","Lat":39.07833,"Lon":-108.58496,"Address":"2525 Rimrock Ave"},
    "1555":{"Name":"Hawthorne","City":"Hawthorne","State":"CA","Zip":"90250","Lat":33.92237,"Lon":-118.32449,"Address":"2800 120th St"},
    "1556":{"Name":"Hemet","City":"Hemet","State":"CA","Zip":"92545","Lat":33.74278,"Lon":-117.00501,"Address":"350 South Sanderson Ave"},
    "1557":{"Name":"Hickory","City":"Hickory","State":"NC","Zip":"28602","Lat":35.70206,"Lon":-81.2835,"Address":"1550 21st Street Dr S.E."},
    "1558":{"Name":"Hillsboro","City":"Hillsboro","State":"OR","Zip":"97123","Lat":45.50358,"Lon":-122.95778,"Address":"1951 S.E. 24th Ave"},
    "1559":{"Name":"Salina","City":"Salina","State":"KS","Zip":"67401","Lat":38.78234,"Lon":-97.60987,"Address":"3035 South 9th St"},
    "1560":{"Name":"Kerrville","City":"Kerrville","State":"TX","Zip":"78028","Lat":30.06903,"Lon":-99.11834,"Address":"651 Loop 534"},
    "1561":{"Name":"Kona","City":"Kailua Kona","State":"HI","Zip":"96740","Lat":19.64588,"Lon":-155.9864,"Address":"75-5677 Hale Kapili St"},
    "1562":{"Name":"La Habra","City":"La Habra","State":"CA","Zip":"90631","Lat":33.91374,"Lon":-117.96836,"Address":"1380 South Beach Blvd"},
    "1563":{"Name":"Laredo","City":"Laredo","State":"TX","Zip":"78041","Lat":27.56141,"Lon":-99.50039,"Address":"6623 San Dario Ave"},
    "1564":{"Name":"Thomasville","City":"Thomasville","State":"GA","Zip":"31792","Lat":30.83984,"Lon":-83.94618,"Address":"13911 U.S. Highway 19 South"},
    "1565":{"Name":"Liberty","City":"Liberty","State":"MO","Zip":"64068","Lat":39.24735,"Lon":-94.45129,"Address":"1920 North Stewart Rd"},
    "1566":{"Name":"Marietta","City":"Marietta","State":"OH","Zip":"45750","Lat":39.40297,"Lon":-81.41517,"Address":"842 Pike St"},
    "1567":{"Name":"Marlboro","City":"Morganville","State":"NJ","Zip":"07751","Lat":40.35534,"Lon":-74.30835,"Address":"57 U.S. Highway 9 South"},
    "1568":{"Name":"Meridian","City":"Meridian","State":"MS","Zip":"39301","Lat":32.35427,"Lon":-88.6802,"Address":"100 15th Place South"},
    "1569":{"Name":"Merrillville","City":"Merrillville","State":"IN","Zip":"46410","Lat":41.47528,"Lon":-87.31825,"Address":"1520 East 79th Ave"},
    "1570":{"Name":"Meyerland","City":"Houston","State":"TX","Zip":"77096","Lat":29.68804,"Lon":-95.45675,"Address":"4645 Beechnut St"},
    "1571":{"Name":"Middletown","City":"Middletown","State":"DE","Zip":"19709","Lat":39.44764,"Lon":-75.7259,"Address":"500 West Main St"},
    "1572":{"Name":"Middletown Township","City":"Langhorne","State":"PA","Zip":"19047","Lat":40.17052,"Lon":-74.89521,"Address":"1400 East Lincoln Highway"},
    "1573":{"Name":"Mill Creek","City":"Mill Creek","State":"WA","Zip":"98012","Lat":47.87711,"Lon":-122.20505,"Address":"2002 132nd St S.E."},
    "1574":{"Name":"Moreno Valley","City":"Moreno Valley","State":"CA","Zip":"92553","Lat":33.94047,"Lon":-117.27613,"Address":"12400 Day St"},
    "1575":{"Name":"Mt. Holly","City":"Lumberton","State":"NJ","Zip":"08048","Lat":39.97999,"Lon":-74.80648,"Address":"1520 Route 38, Building 10"},
    "1576":{"Name":"Murrieta","City":"Murrieta","State":"CA","Zip":"92562","Lat":33.56098,"Lon":-117.20651,"Address":"24701 Madison Ave"},
    "1577":{"Name":"N. Huntsville","City":"Huntsville","State":"AL","Zip":"35810","Lat":34.77301,"Lon":-86.58786,"Address":"3505 North Memorial Pkwy N.W."},
    "1579":{"Name":"N. San Antonio","City":"San Antonio","State":"TX","Zip":"78248","Lat":29.60687,"Lon":-98.51367,"Address":"1200 North F.M. 1604 West"},
    "1580":{"Name":"Tulsa-midtown","City":"Tulsa","State":"OK","Zip":"74112","Lat":36.13946,"Lon":-95.92014,"Address":"1525 South Yale Ave"},
    "1581":{"Name":"Webster","City":"Webster","State":"NY","Zip":"14580","Lat":43.2118,"Lon":-77.47141,"Address":"900 Five Mile Line Rd"},
    "1582":{"Name":"Lake Worth","City":"Fort Worth","State":"TX","Zip":"76135","Lat":32.80776,"Lon":-97.42844,"Address":"3500 North West Centre Dr"},
    "1583":{"Name":"N.W. Staten Island","City":"Staten Island","State":"NY","Zip":"10303","Lat":40.62795,"Lon":-74.16251,"Address":"2171 Forest Ave"},
    "1584":{"Name":"Newburgh","City":"Newburgh","State":"NY","Zip":"12550","Lat":41.50348,"Lon":-74.07226,"Address":"1239 Route 300"},
    "1585":{"Name":"Norwood","City":"Cincinnati","State":"OH","Zip":"45213","Lat":39.17006,"Lon":-84.42929,"Address":"5385 Ridge Ave"},
    "1588":{"Name":"Oceanside","City":"Oceanside","State":"CA","Zip":"92057","Lat":33.23099,"Lon":-117.3091,"Address":"155 Old Grove Rd"},
    "1590":{"Name":"Phillipsburg","City":"Phillipsburg","State":"NJ","Zip":"08865","Lat":40.67757,"Lon":-75.13883,"Address":"1325 U.S. Route 22"},
    "1591":{"Name":"Pico Rivera","City":"Pico Rivera","State":"CA","Zip":"90660","Lat":33.98421,"Lon":-118.10244,"Address":"8600 Washington Blvd"},
    "1592":{"Name":"Plant City","City":"Plant City","State":"FL","Zip":"33566","Lat":27.98549,"Lon":-82.12335,"Address":"2801 James L. Redman Pkwy"},
    "1593":{"Name":"Portsmouth","City":"Portsmouth","State":"VA","Zip":"23701","Lat":36.81265,"Lon":-76.35575,"Address":"4040 Victory Blvd"},
    "1595":{"Name":"S. Columbus","City":"Columbus","State":"OH","Zip":"43207","Lat":39.88118,"Lon":-83.00358,"Address":"3899 South High St"},
    "1596":{"Name":"S. Lansing","City":"Lansing","State":"MI","Zip":"48911","Lat":42.65914,"Lon":-84.53479,"Address":"6821 South Cedar St"},
    "1597":{"Name":"S. Staten Island","City":"Staten Island","State":"NY","Zip":"10309","Lat":40.54753,"Lon":-74.22369,"Address":"2790 Arthur Kill Rd"},
    "1598":{"Name":"S.E. Orlando","City":"Orlando","State":"FL","Zip":"32822","Lat":28.50728,"Lon":-81.31251,"Address":"3500 South Semoran Blvd"},
    "1599":{"Name":"S.W. Mobile","City":"Mobile","State":"AL","Zip":"36619","Lat":30.59915,"Lon":-88.16464,"Address":"4401 Rangeline Rd"},
    "1600":{"Name":"Salem","City":"Salem","State":"OR","Zip":"97302","Lat":44.91627,"Lon":-122.99622,"Address":"1930 Turner Rd Southeast"},
    "1601":{"Name":"Schererville","City":"Schererville","State":"IN","Zip":"46375","Lat":41.51392,"Lon":-87.46935,"Address":"637 U.S. Highway 41"},
    "1602":{"Name":"Dale City","City":"Woodbridge","State":"VA","Zip":"22192","Lat":38.65326,"Lon":-77.30867,"Address":"13720 Smoketown Rd"},
    "1603":{"Name":"Snellville","City":"Snellville","State":"GA","Zip":"30078","Lat":33.88474,"Lon":-84.01192,"Address":"1615 Scenic Highway"},
    "1604":{"Name":"Southfield","City":"Southfield","State":"MI","Zip":"48034","Lat":42.49849,"Lon":-83.28274,"Address":"28650 Telegraph Rd"},
    "1605":{"Name":"Spring Hill","City":"Spring Hill","State":"FL","Zip":"34606","Lat":28.49839,"Lon":-82.59043,"Address":"4780 Commercial Way"},
    "1606":{"Name":"Streetsboro","City":"Streetsboro","State":"OH","Zip":"44241","Lat":41.23757,"Lon":-81.34981,"Address":"1210 State Route 303"},
    "1607":{"Name":"Surprise","City":"Surprise","State":"AZ","Zip":"85374","Lat":33.63602,"Lon":-112.34936,"Address":"13363 W. Grand Ave"},
    "1608":{"Name":"Toms River","City":"Toms River","State":"NJ","Zip":"08753","Lat":39.98982,"Lon":-74.17462,"Address":"1375 Hooper Ave"},
    "1609":{"Name":"Traverse City","City":"Traverse City","State":"MI","Zip":"49684","Lat":44.73045,"Lon":-85.64276,"Address":"3150 North U.S. 31 South"},
    "1610":{"Name":"Vincennes","City":"Vincennes","State":"IN","Zip":"47591","Lat":38.69196,"Lon":-87.50176,"Address":"2700 North 6th St"},
    "1611":{"Name":"Visalia","City":"Visalia","State":"CA","Zip":"93277","Lat":36.29352,"Lon":-119.31072,"Address":"4144 South Mooney Blvd"},
    "1612":{"Name":"Niskayuna","City":"Schenectady","State":"NY","Zip":"12304","Lat":42.77357,"Lon":-73.89032,"Address":"422 Balltown Rd"},
    "1613":{"Name":"W. Jordan","City":"West Jordan","State":"UT","Zip":"84084","Lat":40.61555,"Lon":-111.98097,"Address":"7456 South Plaza Center Dr"},
    "1614":{"Name":"Sylvania Township","City":"Toledo","State":"OH","Zip":"43617","Lat":41.67569,"Lon":-83.71136,"Address":"7000 Central Ave"},
    "1615":{"Name":"Warsaw","City":"Warsaw","State":"IN","Zip":"46582","Lat":41.26921,"Lon":-85.85611,"Address":"2495 Jalynn St"},
    "1616":{"Name":"Vista","City":"Vista","State":"CA","Zip":"92083","Lat":33.19551,"Lon":-117.24727,"Address":"151 Vista Village Dr"},
    "1617":{"Name":"Waycross","City":"Waycross","State":"GA","Zip":"31501","Lat":31.1959,"Lon":-82.32504,"Address":"2308 Memorial Dr"},
    "1618":{"Name":"Weymouth","City":"Weymouth","State":"MA","Zip":"02191","Lat":42.24428,"Lon":-70.93449,"Address":"729 Bridge St"},
    "1619":{"Name":"White Settlement","City":"Fort Worth","State":"TX","Zip":"76114","Lat":32.75196,"Lon":-97.43381,"Address":"600 State Highway 183"},
    "1620":{"Name":"Sunrise","City":"Las Vegas","State":"NV","Zip":"89104","Lat":36.157,"Lon":-115.11192,"Address":"2875 E. Charleston Blvd"},
    "1621":{"Name":"Mentor","City":"Mentor","State":"OH","Zip":"44060","Lat":41.68247,"Lon":-81.29403,"Address":"9600 Mentor Ave"},
    "1622":{"Name":"Danville","City":"Danville","State":"KY","Zip":"40422","Lat":37.61488,"Lon":-84.77714,"Address":"51 May Blvd"},
    "1623":{"Name":"S. Kansas City","City":"Kansas City","State":"MO","Zip":"64145","Lat":38.8876,"Lon":-94.60552,"Address":"1700 West 133rd St"},
    "1624":{"Name":"Garden City","City":"Garden City","State":"NY","Zip":"11530","Lat":40.7378,"Lon":-73.60434,"Address":"700 Dibblee Dr"},
    "1625":{"Name":"N.E. San Antonio","City":"San Antonio","State":"TX","Zip":"78233","Lat":29.54481,"Lon":-98.36613,"Address":"11718 I.H. 35 North"},
    "1626":{"Name":"Smyrna","City":"Smyrna","State":"TN","Zip":"37167","Lat":35.98769,"Lon":-86.55207,"Address":"410 Genie Ln"},
    "1627":{"Name":"N. Little Rock","City":"North Little Rock","State":"AR","Zip":"72117","Lat":34.78793,"Lon":-92.21745,"Address":"4330 East Mccain Blvd"},
    "1628":{"Name":"Pine Bluff","City":"Pine Bluff","State":"AR","Zip":"71601","Lat":34.20713,"Lon":-91.97302,"Address":"2906A East Harding Ave"},
    "1629":{"Name":"S. Tampa","City":"Tampa","State":"FL","Zip":"33611","Lat":27.90431,"Lon":-82.50491,"Address":"4210 South Dale Mabry Highway"},
    "1630":{"Name":"Lakewood","City":"Littleton","State":"CO","Zip":"80123","Lat":39.62113,"Lon":-105.08882,"Address":"5258 South Wadsworth Blvd"},
    "1631":{"Name":"Bellingham","City":"Bellingham","State":"WA","Zip":"98226","Lat":48.77049,"Lon":-122.46084,"Address":"1050 East Sunset Dr"},
    "1632":{"Name":"E. Vancouver","City":"Vancouver","State":"WA","Zip":"98662","Lat":45.67645,"Lon":-122.55429,"Address":"11413 Northeast 76th St"},
    "1633":{"Name":"S. Anchorage","City":"Anchorage","State":"AK","Zip":"99515","Lat":61.12131,"Lon":-149.86639,"Address":"10900 Old Seward Highway"},
    "1634":{"Name":"Rapid City","City":"Rapid City","State":"SD","Zip":"57701","Lat":44.10998,"Lon":-103.22006,"Address":"2550 Haines Ave"},
    "1635":{"Name":"Seneca","City":"Seneca","State":"SC","Zip":"29678","Lat":34.68957,"Lon":-82.98477,"Address":"195 Bilo Pl"},
    "1636":{"Name":"N.W. Albuquerque","City":"Albuquerque","State":"NM","Zip":"87114","Lat":35.20305,"Lon":-106.65086,"Address":"3500 NM 528 NW"},
    "1637":{"Name":"Maple Shade","City":"Maple Shade","State":"NJ","Zip":"08052","Lat":39.94094,"Lon":-74.97273,"Address":"2834 Route 73 North"},
    "1638":{"Name":"C. Tucson","City":"Tucson","State":"AZ","Zip":"85705","Lat":32.28182,"Lon":-110.97976,"Address":"4151 North Oracle Rd"},
    "1639":{"Name":"C. Las Vegas","City":"Las Vegas","State":"NV","Zip":"89102","Lat":36.15668,"Lon":-115.20398,"Address":"4625 West Charleston Blvd"},
    "1640":{"Name":"Gadsden","City":"Gadsden","State":"AL","Zip":"35903","Lat":33.99764,"Lon":-85.99666,"Address":"615 George Wallace Dr"},
    "1641":{"Name":"Clarksburg","City":"Clarksburg","State":"WV","Zip":"26301","Lat":39.2675,"Lon":-80.28485,"Address":"494 Emily Dr"},
    "1642":{"Name":"Willoughby","City":"Willoughby","State":"OH","Zip":"44094","Lat":41.6257,"Lon":-81.42812,"Address":"36300 Euclid Ave"},
    "1643":{"Name":"S.W. Toledo","City":"Toledo","State":"OH","Zip":"43615","Lat":41.61517,"Lon":-83.67104,"Address":"5501 Airport Highway"},
    "1644":{"Name":"Milledgeville","City":"Milledgeville","State":"GA","Zip":"31061","Lat":33.10154,"Lon":-83.24661,"Address":"1731 North Columbia St"},
    "1645":{"Name":"N.E. Central San Antonio","City":"San Antonio","State":"TX","Zip":"78209","Lat":29.49166,"Lon":-98.43382,"Address":"1470 Austin Highway"},
    "1646":{"Name":"Dalton","City":"Dalton","State":"GA","Zip":"30721","Lat":34.79256,"Lon":-84.96021,"Address":"1212 Cleveland Highway"},
    "1647":{"Name":"Fernandina Beach","City":"Fernandina Beach","State":"FL","Zip":"32034","Lat":30.61963,"Lon":-81.51859,"Address":"474283 East State Road 200"},
    "1648":{"Name":"Washington","City":"Washington","State":"MO","Zip":"63090","Lat":38.53708,"Lon":-91.00808,"Address":"2023 Washington Crossing"},
    "1649":{"Name":"Perrysburg","City":"Perrysburg","State":"OH","Zip":"43551","Lat":41.54311,"Lon":-83.59169,"Address":"10295 Fremont Pike"},
    "1650":{"Name":"Fargo","City":"Fargo","State":"ND","Zip":"58103","Lat":46.86424,"Lon":-96.87077,"Address":"5001 13th Ave S.W."},
    "1651":{"Name":"Acworth","City":"Kennesaw","State":"GA","Zip":"30152","Lat":34.03525,"Lon":-84.67285,"Address":"3250 Cobb Pkwy"},
    "1652":{"Name":"N. Kissimmee","City":"Kissimmee","State":"FL","Zip":"34741","Lat":28.34002,"Lon":-81.41776,"Address":"1300 Osceola Pkwy West"},
    "1653":{"Name":"Elkin","City":"Elkin","State":"NC","Zip":"28621","Lat":36.27387,"Lon":-80.84106,"Address":"492 CC Camp Rd"},
    "1654":{"Name":"W. Erie","City":"Erie","State":"PA","Zip":"16506","Lat":42.07471,"Lon":-80.18209,"Address":"2305 Asbury Rd"},
    "1655":{"Name":"Greece","City":"Rochester","State":"NY","Zip":"14626","Lat":43.21362,"Lon":-77.71242,"Address":"3150 West Rdg Rd"},
    "1656":{"Name":"Hillsborough","City":"Hillsborough","State":"NJ","Zip":"08844","Lat":40.51541,"Lon":-74.62653,"Address":"315 Route 206 Suite 600"},
    "1657":{"Name":"Sanford","City":"Sanford","State":"FL","Zip":"32773","Lat":28.7602,"Lon":-81.28836,"Address":"3780 Orlando Dr"},
    "1658":{"Name":"Woodbridge","City":"Woodbridge","State":"NJ","Zip":"07095","Lat":40.55013,"Lon":-74.29389,"Address":"51 Woodbridge Center Dr"},
    "1659":{"Name":"N. Toledo","City":"Toledo","State":"OH","Zip":"43612","Lat":41.72258,"Lon":-83.57061,"Address":"1136 West Alexis Rd"},
    "1660":{"Name":"Monroeville","City":"Monroeville","State":"PA","Zip":"15146","Lat":40.43757,"Lon":-79.76293,"Address":"4200 William Penn Highway"},
    "1661":{"Name":"Santee","City":"Santee","State":"CA","Zip":"92071","Lat":32.83987,"Lon":-116.99237,"Address":"9416 Mission Gorge Rd"},
    "1663":{"Name":"Kingston","City":"Kingston","State":"MA","Zip":"02364","Lat":41.97261,"Lon":-70.70821,"Address":"32 William C. Gould Way"},
    "1664":{"Name":"Milford-miami Township","City":"Milford","State":"OH","Zip":"45150","Lat":39.18585,"Lon":-84.25922,"Address":"5694 Romar Dr"},
    "1665":{"Name":"Bloomfield","City":"Bloomfield","State":"CT","Zip":"06002","Lat":41.81444,"Lon":-72.71549,"Address":"325 Cottage Grove Rd"},
    "1666":{"Name":"Hopkinsville","City":"Hopkinsville","State":"KY","Zip":"42240","Lat":36.82033,"Lon":-87.46991,"Address":"4580 Fort Campbell Blvd"},
    "1667":{"Name":"Quakertown","City":"Quakertown","State":"PA","Zip":"18951","Lat":40.41984,"Lon":-75.34352,"Address":"1001 South West End Blvd"},
    "1668":{"Name":"N. Alpharetta","City":"Alpharetta","State":"GA","Zip":"30004","Lat":34.09455,"Lon":-84.2816,"Address":"4925 Windward Pkwy"},
    "1669":{"Name":"Montgomeryville","City":"Lansdale","State":"PA","Zip":"19446","Lat":40.24793,"Lon":-75.24873,"Address":"630 Cowpath Rd"},
    "1670":{"Name":"Delran","City":"Delran","State":"NJ","Zip":"08075","Lat":40.01916,"Lon":-74.9419,"Address":"1331 Fairview Blvd"},
    "1671":{"Name":"S. Morgantown","City":"Morgantown","State":"WV","Zip":"26501","Lat":39.62452,"Lon":-79.99315,"Address":"9595 Mall Rd"},
    "1672":{"Name":"Merced","City":"Merced","State":"CA","Zip":"95348","Lat":37.31746,"Lon":-120.49669,"Address":"1750 West Olive Ave"},
    "1674":{"Name":"Brooklyn","City":"Brooklyn","State":"NY","Zip":"11215","Lat":40.67178,"Lon":-73.99583,"Address":"118 2nd Ave"},
    "1675":{"Name":"Dickson","City":"Dickson","State":"TN","Zip":"37055","Lat":36.05052,"Lon":-87.36236,"Address":"116 Jackson Brothers Blvd"},
    "1676":{"Name":"Howell","City":"Howell","State":"NJ","Zip":"07731","Lat":40.13007,"Lon":-74.22023,"Address":"4975 U.S. Highway 9"},
    "1677":{"Name":"Harper Woods","City":"Harper Woods","State":"MI","Zip":"48225","Lat":42.448,"Lon":-82.93149,"Address":"19340 Vernier Rd"},
    "1678":{"Name":"Wise County","City":"Wise","State":"VA","Zip":"24293","Lat":36.97366,"Lon":-82.59204,"Address":"201 Woodland Dr S.W."},
    "1679":{"Name":"N. Springfield","City":"Springfield","State":"IL","Zip":"62702","Lat":39.83739,"Lon":-89.60164,"Address":"2560 North Dirksen Pkwy"},
    "1680":{"Name":"Quincy","City":"Quincy","State":"IL","Zip":"62305","Lat":39.9324,"Lon":-91.3205,"Address":"6030 Broadway St"},
    "1681":{"Name":"Pembroke Pines","City":"Pembroke Pines","State":"FL","Zip":"33024","Lat":26.01039,"Lon":-80.25054,"Address":"130 North University Dr"},
    "1682":{"Name":"Missoula","City":"Missoula","State":"MT","Zip":"59808","Lat":46.89288,"Lon":-114.03731,"Address":"3100 North Reserve St"},
    "1683":{"Name":"Venice","City":"Venice","State":"FL","Zip":"34293","Lat":27.07074,"Lon":-82.42109,"Address":"1745 Tamiami Trail South"},
    "1684":{"Name":"Slidell","City":"Slidell","State":"LA","Zip":"70461","Lat":30.28004,"Lon":-89.74732,"Address":"39184 Natchez Dr"},
    "1685":{"Name":"Lady Lake","City":"Lady Lake","State":"FL","Zip":"32159","Lat":28.95687,"Lon":-81.95844,"Address":"13705 U.S. 441"},
    "1687":{"Name":"Latrobe","City":"Latrobe","State":"PA","Zip":"15650","Lat":40.28328,"Lon":-79.38108,"Address":"200 Colony Ln"},
    "1688":{"Name":"Coralville","City":"Coralville","State":"IA","Zip":"52241","Lat":41.69059,"Lon":-91.61088,"Address":"2701 2nd St"},
    "1689":{"Name":"Clinton","City":"Clinton","State":"NC","Zip":"28328","Lat":34.99265,"Lon":-78.33798,"Address":"911 Sunset Ave"},
    "1690":{"Name":"Bend","City":"Bend","State":"OR","Zip":"97701","Lat":44.10805,"Lon":-121.29921,"Address":"20501 Cooley Rd"},
    "1691":{"Name":"W. Jacksonville","City":"Jacksonville","State":"FL","Zip":"32205","Lat":30.31574,"Lon":-81.73381,"Address":"5155 Lenox Ave"},
    "1692":{"Name":"Lebanon","City":"Lebanon","State":"TN","Zip":"37087","Lat":36.19115,"Lon":-86.29738,"Address":"634 South Cumberland St"},
    "1693":{"Name":"Mcminnville","City":"Mcminnville","State":"OR","Zip":"97128","Lat":45.19143,"Lon":-123.21235,"Address":"1250 S.W. Booth Bend Rd"},
    "1695":{"Name":"Sioux City","City":"Sioux City","State":"IA","Zip":"51106","Lat":42.4504,"Lon":-96.33084,"Address":"5758 Sunnybrook Dr"},
    "1696":{"Name":"Wooster","City":"Wooster","State":"OH","Zip":"44691","Lat":40.84456,"Lon":-81.94807,"Address":"3788 Burbank Rd"},
    "1698":{"Name":"Covington","City":"Covington","State":"LA","Zip":"70433","Lat":30.44757,"Lon":-90.07931,"Address":"1280 North Highway 190"},
    "1699":{"Name":"N.E. Jacksonville","City":"Jacksonville","State":"FL","Zip":"32225","Lat":30.32148,"Lon":-81.46819,"Address":"12945 Atlantic Blvd"},
    "1700":{"Name":"N. Fontana","City":"Fontana","State":"CA","Zip":"92336","Lat":34.13799,"Lon":-117.43795,"Address":"16851 Sierra Lakes Pkwy"},
    "1701":{"Name":"Largo","City":"Largo","State":"FL","Zip":"33778","Lat":27.89555,"Lon":-82.79327,"Address":"11101 Ulmerton Rd"},
    "1702":{"Name":"Pharr","City":"Pharr","State":"TX","Zip":"78577","Lat":26.19118,"Lon":-98.20289,"Address":"707 South Jackson Rd"},
    "1703":{"Name":"W. Spring Valley","City":"Las Vegas","State":"NV","Zip":"89148","Lat":36.09705,"Lon":-115.29449,"Address":"5050 South Fort Apache Rd"},
    "1704":{"Name":"Union City","City":"Union City","State":"TN","Zip":"38261","Lat":36.41404,"Lon":-89.06749,"Address":"800 West Reelfoot Ave"},
    "1705":{"Name":"Conway","City":"Conway","State":"SC","Zip":"29526","Lat":33.79249,"Lon":-78.99656,"Address":"2301 Highway 501 East"},
    "1706":{"Name":"Lodi","City":"Lodi","State":"CA","Zip":"95242","Lat":38.1172,"Lon":-121.30914,"Address":"1389 S. Lower Sacramento Rd"},
    "1707":{"Name":"Marana","City":"Tucson","State":"AZ","Zip":"85741","Lat":32.33644,"Lon":-111.05165,"Address":"4075 West Ina Rd"},
    "1708":{"Name":"S. Bakersfield","City":"Bakersfield","State":"CA","Zip":"93307","Lat":35.29823,"Lon":-119.02705,"Address":"6200 Colony St"},
    "1709":{"Name":"Bay Shore","City":"Bay Shore","State":"NY","Zip":"11706","Lat":40.72713,"Lon":-73.28115,"Address":"800 Sunrise Highway"},
    "1710":{"Name":"Carlisle","City":"Carlisle","State":"PA","Zip":"17013","Lat":40.19836,"Lon":-77.17191,"Address":"850 East High St"},
    "1711":{"Name":"Naperville","City":"Naperville","State":"IL","Zip":"60564","Lat":41.74263,"Lon":-88.20464,"Address":"1440 South Route 59"},
    "1712":{"Name":"Waterloo","City":"Waterloo","State":"IA","Zip":"50701","Lat":42.45528,"Lon":-92.34961,"Address":"400 East Tower Park Dr"},
    "1713":{"Name":"Elizabeth City","City":"Elizabeth City","State":"NC","Zip":"27909","Lat":36.29094,"Lon":-76.24571,"Address":"1605 West Ehringhaus St"},
    "1714":{"Name":"S. Clearwater","City":"Clearwater","State":"FL","Zip":"33759","Lat":27.95906,"Lon":-82.72838,"Address":"2619 Gulf To Bay Blvd"},
    "1715":{"Name":"Camp Creek","City":"East Point","State":"GA","Zip":"30344","Lat":33.65643,"Lon":-84.5052,"Address":"3625 North Commerce Dr"},
    "1716":{"Name":"S. Clinton Township","City":"Clinton Township","State":"MI","Zip":"48035","Lat":42.55558,"Lon":-82.90161,"Address":"35115 South Gratiot Ave"},
    "1717":{"Name":"S. Reading","City":"Sinking Spring","State":"PA","Zip":"19608","Lat":40.31595,"Lon":-75.99688,"Address":"2625 Shillington Rd"},
    "1718":{"Name":"N.W. Greenville","City":"Greenville","State":"SC","Zip":"29609","Lat":34.89368,"Lon":-82.4069,"Address":"1900 Poinsett Highway"},
    "1719":{"Name":"W. Henderson","City":"Las Vegas","State":"NV","Zip":"89183","Lat":36.0077,"Lon":-115.11738,"Address":"9955 South Eastern Ave"},
    "1720":{"Name":"Lake Park","City":"Lake Park","State":"FL","Zip":"33403","Lat":26.80485,"Lon":-80.08526,"Address":"401 North Congress Ave"},
    "1721":{"Name":"Southaven","City":"Southaven","State":"MS","Zip":"38671","Lat":34.96516,"Lon":-89.99316,"Address":"178 Goodman Rd West"},
    "1722":{"Name":"Kinston","City":"Kinston","State":"NC","Zip":"28504","Lat":35.25936,"Lon":-77.64995,"Address":"4489 Highway 70 West"},
    "1723":{"Name":"Gloucester","City":"Gloucester","State":"VA","Zip":"23061","Lat":37.38348,"Lon":-76.53264,"Address":"6659 George Washington Memorial Highway"},
    "1724":{"Name":"Lawton","City":"Lawton","State":"OK","Zip":"73505","Lat":34.62158,"Lon":-98.44722,"Address":"4402 N.W. Cache Rd"},
    "1725":{"Name":"N.E. Austin","City":"Austin","State":"TX","Zip":"78753","Lat":30.41538,"Lon":-97.67518,"Address":"13000 N I-35 SVC Rd SB, Building 12"},
    "1726":{"Name":"Inverness","City":"Birmingham","State":"AL","Zip":"35242","Lat":33.42051,"Lon":-86.68029,"Address":"5291 Highway 280 South"},
    "1727":{"Name":"Central Austin","City":"Austin","State":"TX","Zip":"78757","Lat":30.36451,"Lon":-97.74078,"Address":"8000 Shoal Creek Blvd"},
    "1728":{"Name":"Glendale","City":"Glendale","State":"AZ","Zip":"85301","Lat":33.55153,"Lon":-112.18436,"Address":"5809 West Northern Ave"},
    "1729":{"Name":"East Caln Township","City":"Downingtown","State":"PA","Zip":"19335","Lat":40.01902,"Lon":-75.6657,"Address":"1250 Cornerstone Blvd"},
    "1730":{"Name":"S.E. Aurora","City":"Aurora","State":"CO","Zip":"80015","Lat":39.63589,"Lon":-104.79328,"Address":"4455 South Buckley Rd"},
    "1731":{"Name":"Dyersburg","City":"Dyersburg","State":"TN","Zip":"38024","Lat":36.05456,"Lon":-89.40076,"Address":"1155 Highway 51 Bypass West"},
    "1732":{"Name":"Port Charlotte","City":"Port Charlotte","State":"FL","Zip":"33948","Lat":27.00609,"Lon":-82.12835,"Address":"2000 Tamiami Trail"},
    "1733":{"Name":"Griffin","City":"Griffin","State":"GA","Zip":"30223","Lat":33.24547,"Lon":-84.29167,"Address":"1520 Highway 16 West"},
    "1734":{"Name":"C. Ventura","City":"Ventura","State":"CA","Zip":"93003","Lat":34.26605,"Lon":-119.2447,"Address":"500 South Mills Rd"},
    "1735":{"Name":"Madison","City":"Madison","State":"IN","Zip":"47250","Lat":38.78362,"Lon":-85.38033,"Address":"511 Ivy Tech Dr"},
    "1736":{"Name":"Georgetown","City":"Georgetown","State":"KY","Zip":"40324","Lat":38.22792,"Lon":-84.53268,"Address":"109 Magnolia Dr"},
    "1737":{"Name":"Leeds","City":"Leeds","State":"AL","Zip":"35094","Lat":33.56505,"Lon":-86.51813,"Address":"8900 Weaver Ave"},
    "1738":{"Name":"St. Charles","City":"Saint Charles","State":"IL","Zip":"60174","Lat":41.89846,"Lon":-88.34318,"Address":"955 South Randall Rd"},
    "1739":{"Name":"Lake In The Hills","City":"Lake In The Hills","State":"IL","Zip":"60156","Lat":42.18101,"Lon":-88.33846,"Address":"300 North Randall Rd"},
    "1740":{"Name":"Halfmoon","City":"Halfmoon","State":"NY","Zip":"12065","Lat":42.86224,"Lon":-73.7643,"Address":"476 Route 146"},
    "1741":{"Name":"Roseburg","City":"Roseburg","State":"OR","Zip":"97470","Lat":43.25063,"Lon":-123.35836,"Address":"3300 N.W. Aviation Dr"},
    "1742":{"Name":"Eastlake","City":"Chula Vista","State":"CA","Zip":"91915","Lat":32.64892,"Lon":-116.96924,"Address":"2225 Otay Lakes Rd"},
    "1743":{"Name":"Corona","City":"Corona","State":"CA","Zip":"92879","Lat":33.86838,"Lon":-117.54178,"Address":"1285 Magnolia Ave"},
    "1744":{"Name":"Fultondale","City":"Fultondale","State":"AL","Zip":"35068","Lat":33.61014,"Lon":-86.80357,"Address":"1335 Walker Chapel Rd"},
    "1745":{"Name":"Hutchinson","City":"Hutchinson","State":"KS","Zip":"67501","Lat":38.07352,"Lon":-97.89042,"Address":"1930 East 17th Ave"},
    "1746":{"Name":"Farmington","City":"Farmington","State":"MO","Zip":"63640","Lat":37.7907,"Lon":-90.42966,"Address":"625 West Karsch Blvd"},
    "1747":{"Name":"Springfield","City":"Springfield","State":"TN","Zip":"37172","Lat":36.48847,"Lon":-86.88357,"Address":"3480 Tom Austin Highway"},
    "1748":{"Name":"Lincolnwood","City":"Lincolnwood","State":"IL","Zip":"60712","Lat":42.01062,"Lon":-87.71948,"Address":"3601 West Touhy Ave"},
    "1749":{"Name":"Ardmore","City":"Ardmore","State":"OK","Zip":"73401","Lat":34.18889,"Lon":-97.16214,"Address":"2701 12th Ave N.W."},
    "1750":{"Name":"Scio Township","City":"Ann Arbor","State":"MI","Zip":"48103","Lat":42.29193,"Lon":-83.8447,"Address":"5900 Jackson Rd"},
    "1751":{"Name":"Camden","City":"Camden","State":"SC","Zip":"29020","Lat":34.24802,"Lon":-80.64196,"Address":"11 Bay Ln"},
    "1752":{"Name":"Grove","City":"Grove","State":"OK","Zip":"74344","Lat":36.57412,"Lon":-94.76661,"Address":"2131 South Main St"},
    "1753":{"Name":"Huntington Beach","City":"Huntington Beach","State":"CA","Zip":"92647","Lat":33.71673,"Lon":-117.98559,"Address":"8175 Warner Ave"},
    "1754":{"Name":"E. Tucson","City":"Tucson","State":"AZ","Zip":"85710","Lat":32.23682,"Lon":-110.83978,"Address":"7105 East Speedway Blvd"},
    "1755":{"Name":"Parker","City":"Parker","State":"CO","Zip":"80134","Lat":39.53463,"Lon":-104.77318,"Address":"10000 South Twenty Mile Rd"},
    "1756":{"Name":"S. San Jose","City":"San Jose","State":"CA","Zip":"95123","Lat":37.25314,"Lon":-121.80178,"Address":"5550 Cottle Rd"},
    "1757":{"Name":"Batesville","City":"Batesville","State":"MS","Zip":"38606","Lat":34.31139,"Lon":-89.90961,"Address":"1135 Highway 6 East"},
    "1758":{"Name":"Pembroke","City":"Pembroke","State":"MA","Zip":"02359","Lat":42.10984,"Lon":-70.7721,"Address":"108 Old Church St"},
    "1759":{"Name":"Easton","City":"Easton","State":"PA","Zip":"18045","Lat":40.65711,"Lon":-75.288,"Address":"4443 Birkland Pl"},
    "1760":{"Name":"South Boston","City":"South Boston","State":"VA","Zip":"24592","Lat":36.73637,"Lon":-78.91341,"Address":"3603 Old Halifax Rd"},
    "1761":{"Name":"Alamogordo","City":"Alamogordo","State":"NM","Zip":"88310","Lat":32.93537,"Lon":-105.96289,"Address":"4201 North Scenic Dr"},
    "1762":{"Name":"Marshall","City":"Marshall","State":"TX","Zip":"75670","Lat":32.55349,"Lon":-94.34818,"Address":"910 East End Blvd North"},
    "1763":{"Name":"Kingsville","City":"Kingsville","State":"TX","Zip":"78363","Lat":27.49321,"Lon":-97.85055,"Address":"1420 East General Cavazos Blvd"},
    "1764":{"Name":"E. Roanoke","City":"Roanoke","State":"VA","Zip":"24012","Lat":37.32398,"Lon":-79.87413,"Address":"4520 Challenger Ave"},
    "1765":{"Name":"Mt. Vernon","City":"Mount Vernon","State":"OH","Zip":"43050","Lat":40.39909,"Lon":-82.4515,"Address":"1010 Coshocton Ave"},
    "1766":{"Name":"Jacksonville","City":"Jacksonville","State":"AR","Zip":"72076","Lat":34.8873,"Lon":-92.10472,"Address":"2301 T.P. White Dr"},
    "1767":{"Name":"Shelbyville","City":"Shelbyville","State":"TN","Zip":"37160","Lat":35.50975,"Lon":-86.45399,"Address":"1734 North Main St"},
    "1768":{"Name":"Green","City":"Akron","State":"OH","Zip":"44312","Lat":40.97815,"Lon":-81.49078,"Address":"940 Interstate Pkwy"},
    "1769":{"Name":"Jasper","City":"Jasper","State":"TX","Zip":"75951","Lat":30.90578,"Lon":-94.01887,"Address":"900 West Gibson"},
    "1770":{"Name":"Campbellsville","City":"Campbellsville","State":"KY","Zip":"42718","Lat":37.34006,"Lon":-85.36336,"Address":"205 Jefra Ave"},
    "1771":{"Name":"W. Dallas","City":"Dallas","State":"TX","Zip":"75212","Lat":32.76474,"Lon":-96.90083,"Address":"1710 Chalk Hill Rd East"},
    "1772":{"Name":"Nacogdoches","City":"Nacogdoches","State":"TX","Zip":"75965","Lat":31.65315,"Lon":-94.65947,"Address":"220 North Stallings Dr"},
    "1773":{"Name":"Bluffton","City":"Bluffton","State":"IN","Zip":"46714","Lat":40.77233,"Lon":-85.16428,"Address":"2105 North Main St"},
    "1774":{"Name":"Mccomb","City":"Mccomb","State":"MS","Zip":"39648","Lat":31.25844,"Lon":-90.47734,"Address":"1802 Pikes Point Cir"},
    "1775":{"Name":"Searcy","City":"Searcy","State":"AR","Zip":"72143","Lat":35.24852,"Lon":-91.68448,"Address":"3701 East Race Ave"},
    "1776":{"Name":"York","City":"York","State":"SC","Zip":"29745","Lat":34.98381,"Lon":-81.21033,"Address":"1010 East Liberty St"},
    "1777":{"Name":"Erwin","City":"Erwin","State":"NC","Zip":"28339","Lat":35.32491,"Lon":-78.64604,"Address":"524 East Jackson Blvd"},
    "1778":{"Name":"Portage","City":"Portage","State":"IN","Zip":"46368","Lat":41.54816,"Lon":-87.17435,"Address":"6221 U.S. Highway 6"},
    "1779":{"Name":"Sterling Heights","City":"Sterling Height","State":"MI","Zip":"48310","Lat":42.56175,"Lon":-83.08705,"Address":"2000 Metropolitan Pkwy"},
    "1780":{"Name":"N.E. Dallas","City":"Dallas","State":"TX","Zip":"75238","Lat":32.86549,"Lon":-96.68413,"Address":"11333 E. Northwest Highway"},
    "1781":{"Name":"Clovis","City":"Clovis","State":"NM","Zip":"88101","Lat":34.4351,"Lon":-103.19511,"Address":"3601 North Prince St"},
    "1782":{"Name":"Crestview","City":"Crestview","State":"FL","Zip":"32536","Lat":30.72734,"Lon":-86.57422,"Address":"298 Rasberry Rd"},
    "1783":{"Name":"Douglas","City":"Douglas","State":"GA","Zip":"31533","Lat":31.48529,"Lon":-82.84533,"Address":"1340 S.E. Bowens Mill Rd"},
    "1784":{"Name":"Glenmont","City":"Glenmont","State":"NY","Zip":"12077","Lat":42.61129,"Lon":-73.79005,"Address":"271 Route 9 West"},
    "1785":{"Name":"Nampa","City":"Nampa","State":"ID","Zip":"83651","Lat":43.60399,"Lon":-116.59704,"Address":"1400 Nampa-Caldwell Blvd"},
    "1786":{"Name":"FT. Payne","City":"Fort Payne","State":"AL","Zip":"35968","Lat":34.436,"Lon":-85.75461,"Address":"1600 Glenn Blvd S.W."},
    "1787":{"Name":"Vidalia","City":"Vidalia","State":"GA","Zip":"30474","Lat":32.20328,"Lon":-82.35806,"Address":"3209 East First St"},
    "1788":{"Name":"Forest City","City":"Forest City","State":"NC","Zip":"28043","Lat":35.33884,"Lon":-81.89573,"Address":"184 Lowe's Blvd"},
    "1789":{"Name":"Paris","City":"Paris","State":"TN","Zip":"38242","Lat":36.28404,"Lon":-88.30477,"Address":"117 Memorial Dr"},
    "1790":{"Name":"Livingston","City":"Livingston","State":"TX","Zip":"77351","Lat":30.70835,"Lon":-94.95153,"Address":"120 U.S. 59 Loop South"},
    "1791":{"Name":"S.W. Tucson","City":"Tucson","State":"AZ","Zip":"85746","Lat":32.13541,"Lon":-111.00438,"Address":"1800 West Valencia Rd"},
    "1792":{"Name":"Pompano Beach","City":"Pompano Beach","State":"FL","Zip":"33062","Lat":26.25545,"Lon":-80.10167,"Address":"1851 North Federal Highway"},
    "1793":{"Name":"E. Ellijay","City":"East Ellijay","State":"GA","Zip":"30540","Lat":34.65991,"Lon":-84.48739,"Address":"380 Highland Crossing"},
    "1794":{"Name":"Valdosta","City":"Valdosta","State":"GA","Zip":"31601","Lat":30.83977,"Lon":-83.3236,"Address":"1106 North St. Augustine Rd"},
    "1795":{"Name":"Glen Carbon","City":"Glen Carbon","State":"IL","Zip":"62034","Lat":38.7788,"Lon":-89.95181,"Address":"159 Whistle Stop Dr"},
    "1796":{"Name":"Glasgow","City":"Glasgow","State":"KY","Zip":"42141","Lat":36.99966,"Lon":-85.93041,"Address":"208 Sl Rogers Wells Blvd"},
    "1797":{"Name":"Paintsville","City":"Paintsville","State":"KY","Zip":"41240","Lat":37.82581,"Lon":-82.82132,"Address":"527 North Mayo Trail"},
    "1798":{"Name":"Wake Forest","City":"Wake Forest","State":"NC","Zip":"27587","Lat":35.96807,"Lon":-78.53902,"Address":"11800 Galaxy Dr"},
    "1799":{"Name":"Athens","City":"Athens","State":"AL","Zip":"35611","Lat":34.78725,"Lon":-86.95169,"Address":"1109 U.S. Highway 72 East"},
    "1800":{"Name":"Harriman","City":"Harriman","State":"TN","Zip":"37748","Lat":35.89302,"Lon":-84.54902,"Address":"1800 Roane State Highway"},
    "1801":{"Name":"Gun Barrel City","City":"Gun Barrel City","State":"TX","Zip":"75156","Lat":32.32894,"Lon":-96.11428,"Address":"201 West Main St"},
    "1802":{"Name":"Mt. Pleasant","City":"Mount Pleasant","State":"TX","Zip":"75455","Lat":33.17296,"Lon":-94.99961,"Address":"1220 Lakewood Dr"},
    "1803":{"Name":"Culpeper","City":"Culpeper","State":"VA","Zip":"22701","Lat":38.48555,"Lon":-77.97162,"Address":"15150 Montanus Dr"},
    "1805":{"Name":"Buckhannon","City":"Buckhannon","State":"WV","Zip":"26201","Lat":39.00525,"Lon":-80.23398,"Address":"40 Clarksburg Rd"},
    "1806":{"Name":"S. Fayetteville","City":"Fayetteville","State":"AR","Zip":"72704","Lat":36.04972,"Lon":-94.20647,"Address":"3231 W. Martin Luther King Blvd"},
    "1807":{"Name":"Sandy Springs","City":"Sandy Springs","State":"GA","Zip":"30328","Lat":33.91716,"Lon":-84.37753,"Address":"5925 Roswell Rd N.E."},
    "1808":{"Name":"Morehead","City":"Morehead","State":"KY","Zip":"40351","Lat":38.19223,"Lon":-83.48251,"Address":"100 Kroger Center"},
    "1809":{"Name":"Festus","City":"Festus","State":"MO","Zip":"63028","Lat":38.21045,"Lon":-90.40783,"Address":"1111 Bradley St"},
    "1810":{"Name":"Sulphur Springs","City":"Sulphur Springs","State":"TX","Zip":"75482","Lat":33.10742,"Lon":-95.59859,"Address":"1711 South Broadway St"},
    "1811":{"Name":"Irving","City":"Irving","State":"TX","Zip":"75062","Lat":32.83357,"Lon":-96.99608,"Address":"3500 West Airport Freeway"},
    "1812":{"Name":"Greeley","City":"Greeley","State":"CO","Zip":"80634","Lat":40.39815,"Lon":-104.75491,"Address":"2400 47th Ave"},
    "1813":{"Name":"Bossier City","City":"Bossier City","State":"LA","Zip":"71111","Lat":32.54589,"Lon":-93.70671,"Address":"2360 Airline Dr"},
    "1814":{"Name":"Commerce Township","City":"Commerce Township","State":"MI","Zip":"48390","Lat":42.54275,"Lon":-83.44976,"Address":"2745 West Maple Rd"},
    "1815":{"Name":"Roanoke Rapids","City":"Roanoke Rapids","State":"NC","Zip":"27870","Lat":36.43468,"Lon":-77.63423,"Address":"1600 Julian Allsbrook Highway"},
    "1816":{"Name":"Millville","City":"Millville","State":"NJ","Zip":"08332","Lat":39.4257,"Lon":-75.0429,"Address":"113 Bluebird Ln"},
    "1817":{"Name":"Canandaigua","City":"Canandaigua","State":"NY","Zip":"14424","Lat":42.87411,"Lon":-77.23869,"Address":"4200 Recreation Dr"},
    "1818":{"Name":"Tahlequah","City":"Tahlequah","State":"OK","Zip":"74464","Lat":35.89201,"Lon":-94.97943,"Address":"161 Meadow Creek Dr"},
    "1819":{"Name":"Hazard","City":"Hazard","State":"KY","Zip":"41701","Lat":37.29623,"Lon":-83.21727,"Address":"81 Commerce Dr"},
    "1820":{"Name":"Palatka","City":"Palatka","State":"FL","Zip":"32177","Lat":29.65719,"Lon":-81.67237,"Address":"500 North State Rd 19"},
    "1821":{"Name":"Carol Stream","City":"Carol Stream","State":"IL","Zip":"60188","Lat":41.93869,"Lon":-88.1331,"Address":"400 West Army Trail"},
    "1822":{"Name":"Opelousas","City":"Opelousas","State":"LA","Zip":"70570","Lat":30.53018,"Lon":-92.06965,"Address":"1130 East Landry St"},
    "1823":{"Name":"White Lake","City":"White Lake","State":"MI","Zip":"48386","Lat":42.6593,"Lon":-83.45423,"Address":"8550 Highland Rd"},
    "1824":{"Name":"Clackamas County","City":"Milwaukie","State":"OR","Zip":"97222","Lat":45.42438,"Lon":-122.58428,"Address":"13631 S.E. Johnson Rd"},
    "1825":{"Name":"Corpus Christi","City":"Corpus Christi","State":"TX","Zip":"78412","Lat":27.70106,"Lon":-97.36177,"Address":"1530 Airline Rd"},
    "1826":{"Name":"Springdale","City":"Springdale","State":"AR","Zip":"72762","Lat":36.17378,"Lon":-94.17769,"Address":"4233 West Sunset Ave"},
    "1827":{"Name":"Brooksville","City":"Brooksville","State":"FL","Zip":"34601","Lat":28.53321,"Lon":-82.40894,"Address":"7117 Broad St"},
    "1828":{"Name":"Orland Park","City":"Orland Park","State":"IL","Zip":"60462","Lat":41.60614,"Lon":-87.85009,"Address":"15601 South Lagrange Rd"},
    "1829":{"Name":"Gurnee","City":"Gurnee","State":"IL","Zip":"60031","Lat":42.38465,"Lon":-87.99424,"Address":"7735 West Grand Ave"},
    "1830":{"Name":"Kansas City","City":"Kansas City","State":"KS","Zip":"66102","Lat":39.11774,"Lon":-94.74058,"Address":"6920 State Ave"},
    "1831":{"Name":"Westborough","City":"Westborough","State":"MA","Zip":"01581","Lat":42.28204,"Lon":-71.6417,"Address":"260-266 Turnpike Rd"},
    "1832":{"Name":"N. Dartmouth","City":"N. Dartmouth","State":"MA","Zip":"02747","Lat":41.64419,"Lon":-70.98548,"Address":"55 Faunce Corner Rd"},
    "1833":{"Name":"Coon Rapids","City":"Coon Rapids","State":"MN","Zip":"55448","Lat":45.19548,"Lon":-93.33554,"Address":"2700 Main St"},
    "1834":{"Name":"Banner Elk","City":"Banner Elk","State":"NC","Zip":"28604","Lat":36.14204,"Lon":-81.86068,"Address":"2014 Tynecastle Highway"},
    "1835":{"Name":"N. Cary","City":"Cary","State":"NC","Zip":"27513","Lat":35.79815,"Lon":-78.79334,"Address":"1920 N.W. Maynard Rd"},
    "1836":{"Name":"W. Summerlin","City":"Las Vegas","State":"NV","Zip":"89144","Lat":36.16283,"Lon":-115.33552,"Address":"851 South Pavilion Center Dr"},
    "1837":{"Name":"Upper Moreland","City":"Willow Grove","State":"PA","Zip":"19090","Lat":40.15749,"Lon":-75.14106,"Address":"4055 Welsh Rd"},
    "1838":{"Name":"Claypool Hill","City":"Pounding Mill","State":"VA","Zip":"24637","Lat":37.06034,"Lon":-81.74976,"Address":"4375 Indian Paint Rd"},
    "1839":{"Name":"Madison Heights","City":"Madison Heights","State":"VA","Zip":"24572","Lat":37.43509,"Lon":-79.12587,"Address":"150 River James Shopping Center"},
    "1841":{"Name":"N.W. Miami-dade","City":"Hialeah","State":"FL","Zip":"33015","Lat":25.93185,"Lon":-80.2953,"Address":"17460 Northwest 57th Ave"},
    "1842":{"Name":"S. Central Jacksonville","City":"Jacksonville","State":"FL","Zip":"32256","Lat":30.22236,"Lon":-81.58823,"Address":"8054 Philips Highway"},
    "1843":{"Name":"Central Bradenton","City":"Bradenton","State":"FL","Zip":"34205","Lat":27.46515,"Lon":-82.57724,"Address":"4012 14th St West"},
    "1845":{"Name":"Chicago-Brickyard","City":"Chicago","State":"IL","Zip":"60639","Lat":41.92829,"Lon":-87.78912,"Address":"2630 N. Narragansett Ave"},
    "1847":{"Name":"Canton","City":"Canton","State":"MI","Zip":"48187","Lat":42.32442,"Lon":-83.47535,"Address":"44080 Ford Rd"},
    "1848":{"Name":"N.E. Philadelphia","City":"Philadelphia","State":"PA","Zip":"19114","Lat":40.08127,"Lon":-75.02477,"Address":"9701 East Roosevelt Blvd"},
    "1849":{"Name":"S. Philadelphia","City":"Philadelphia","State":"PA","Zip":"19148","Lat":39.92002,"Lon":-75.14325,"Address":"2106 S. Christopher Columbus Blvd"},
    "1850":{"Name":"S. Scottsdale","City":"Scottsdale","State":"AZ","Zip":"85257","Lat":33.46681,"Lon":-111.91056,"Address":"7950 East Mcdowell Rd"},
    "1852":{"Name":"Pacoima","City":"Pacoima","State":"CA","Zip":"91331","Lat":34.27336,"Lon":-118.4248,"Address":"13500 Paxton St"},
    "1853":{"Name":"Inverness","City":"Inverness","State":"FL","Zip":"34453","Lat":28.85727,"Lon":-82.39572,"Address":"2301 East Gulf To Lake Highway"},
    "1854":{"Name":"Zephyrhills","City":"Zephyrhills","State":"FL","Zip":"33541","Lat":28.27264,"Lon":-82.19027,"Address":"7921 Gall Blvd"},
    "1855":{"Name":"E. Ocala","City":"Ocala","State":"FL","Zip":"34470","Lat":29.20497,"Lon":-82.0727,"Address":"4600 East Silver Springs Blvd"},
    "1856":{"Name":"Hinesville","City":"Hinesville","State":"GA","Zip":"31313","Lat":31.82847,"Lon":-81.59948,"Address":"735 West Oglethorpe Highway"},
    "1857":{"Name":"Raynham","City":"Raynham","State":"MA","Zip":"02767","Lat":41.90686,"Lon":-71.03457,"Address":"850 Route 44"},
    "1858":{"Name":"Leominster","City":"Leominster","State":"MA","Zip":"01453","Lat":42.49629,"Lon":-71.72739,"Address":"198 New Lancaster Rd"},
    "1859":{"Name":"Allen Park","City":"Allen Park","State":"MI","Zip":"48101","Lat":42.28008,"Lon":-83.21343,"Address":"23111 Outer Dr"},
    "1860":{"Name":"Niles","City":"Niles","State":"MI","Zip":"49120","Lat":41.79221,"Lon":-86.24871,"Address":"2055 South 11th St"},
    "1861":{"Name":"Cape May","City":"Rio Grande","State":"NJ","Zip":"08242","Lat":39.01887,"Lon":-74.87431,"Address":"3171 Route 9 South"},
    "1862":{"Name":"E. Brunswick","City":"East Brunswick","State":"NJ","Zip":"08816","Lat":40.45139,"Lon":-74.4008,"Address":"339 State Highway Route 18"},
    "1863":{"Name":"N.W. Las Vegas","City":"Las Vegas","State":"NV","Zip":"89130","Lat":36.24069,"Lon":-115.22718,"Address":"6050 West Craig Rd"},
    "1864":{"Name":"Ithaca","City":"Ithaca","State":"NY","Zip":"14850","Lat":42.4308,"Lon":-76.5136,"Address":"130 Fairgrounds Memorial Pkwy"},
    "1865":{"Name":"Rome","City":"Rome","State":"NY","Zip":"13440","Lat":43.22775,"Lon":-75.48812,"Address":"1230 Erie Blvd West"},
    "1866":{"Name":"Athens","City":"Athens","State":"OH","Zip":"45701","Lat":39.33524,"Lon":-82.05944,"Address":"983 East State St"},
    "1867":{"Name":"Bethlehem","City":"Bethlehem","State":"PA","Zip":"18018","Lat":40.6297,"Lon":-75.39824,"Address":"1235 Martin Ct"},
    "1868":{"Name":"Bloomsburg","City":"Bloomsburg","State":"PA","Zip":"17815","Lat":41.01186,"Lon":-76.4846,"Address":"50 Lunger Dr"},
    "1869":{"Name":"Millington","City":"Millington","State":"TN","Zip":"38053","Lat":35.35712,"Lon":-89.89184,"Address":"8490 Highway 51 North"},
    "1870":{"Name":"Gainesville","City":"Gainesville","State":"VA","Zip":"20155","Lat":38.7965,"Lon":-77.6035,"Address":"13000 Gateway Center Dr"},
    "1871":{"Name":"Vallejo","City":"Vallejo","State":"CA","Zip":"94591","Lat":38.13581,"Lon":-122.20624,"Address":"401 Columbus Pkwy"},
    "1872":{"Name":"Puente Hills","City":"City Of Industry","State":"CA","Zip":"91748","Lat":33.99385,"Lon":-117.91625,"Address":"17789 Castleton St"},
    "1873":{"Name":"Northridge","City":"Northridge","State":"CA","Zip":"91324","Lat":34.23665,"Lon":-118.56098,"Address":"19601 West Nordhoff St"},
    "1874":{"Name":"Longmont","City":"Longmont","State":"CO","Zip":"80501","Lat":40.15077,"Lon":-105.09869,"Address":"355 Ken Pratt Blvd"},
    "1875":{"Name":"Atlanta-Edgewood","City":"Atlanta","State":"GA","Zip":"30307","Lat":33.75934,"Lon":-84.34663,"Address":"1280 Caroline St N.E."},
    "1877":{"Name":"Jefferson Highway","City":"Jefferson","State":"LA","Zip":"70121","Lat":29.96571,"Lon":-90.13118,"Address":"121 Jefferson Highway"},
    "1878":{"Name":"Apex","City":"Apex","State":"NC","Zip":"27502","Lat":35.74466,"Lon":-78.87544,"Address":"1101 Beaver Creek Commons Dr"},
    "1879":{"Name":"Greenland","City":"Greenland","State":"NH","Zip":"03840","Lat":43.04854,"Lon":-70.81964,"Address":"1440 Greenland Rd"},
    "1880":{"Name":"Amsterdam","City":"Amsterdam","State":"NY","Zip":"12010","Lat":42.97236,"Lon":-74.18574,"Address":"4825 State Highway 30"},
    "1881":{"Name":"E. Amherst","City":"Williamsville","State":"NY","Zip":"14221","Lat":42.99057,"Lon":-78.69899,"Address":"8150 Transit Rd"},
    "1882":{"Name":"Orchard Park","City":"Orchard Park","State":"NY","Zip":"14127","Lat":42.79737,"Lon":-78.74649,"Address":"3195 Southwestern Blvd"},
    "1883":{"Name":"W. Amherst","City":"Amherst","State":"NY","Zip":"14228","Lat":43.00036,"Lon":-78.81766,"Address":"1659 Niagara Falls Blvd"},
    "1886":{"Name":"Pottstown","City":"Pottstown","State":"PA","Zip":"19465","Lat":40.2252,"Lon":-75.65816,"Address":"1136 Town Square Rd"},
    "1887":{"Name":"Longview","City":"Longview","State":"WA","Zip":"98632","Lat":46.14827,"Lon":-122.95854,"Address":"2850 Ocean Beach Highway"},
    "1888":{"Name":"Beckley","City":"Beckley","State":"WV","Zip":"25801","Lat":37.8014,"Lon":-81.17355,"Address":"1210 North Eisenhower Dr"},
    "1889":{"Name":"Milford","City":"Milford","State":"MA","Zip":"01757","Lat":42.16313,"Lon":-71.50462,"Address":"40 Fortune Blvd"},
    "1890":{"Name":"Mcminnville","City":"Mc Minnville","State":"TN","Zip":"37110","Lat":35.70238,"Lon":-85.78366,"Address":"1339 Smithville Highway, Suite 10"},
    "1891":{"Name":"Claremore","City":"Claremore","State":"OK","Zip":"74019","Lat":36.28891,"Lon":-95.6316,"Address":"1746 South Lynn Riggs Blvd"},
    "1892":{"Name":"Palestine","City":"Palestine","State":"TX","Zip":"75801","Lat":31.73474,"Lon":-95.62103,"Address":"2715 South Loop 256"},
    "1893":{"Name":"S. Jackson","City":"Jackson","State":"TN","Zip":"38301","Lat":35.55322,"Lon":-88.81141,"Address":"2071 South Highland Ave"},
    "1894":{"Name":"Bedford","City":"Bedford","State":"IN","Zip":"47421","Lat":38.85948,"Lon":-86.5193,"Address":"3300 16th St"},
    "1895":{"Name":"Fremont","City":"Fremont","State":"CA","Zip":"94538","Lat":37.5037,"Lon":-121.97084,"Address":"43612 Pacific Commons Blvd"},
    "1896":{"Name":"Grand Forks","City":"Grand Forks","State":"ND","Zip":"58201","Lat":47.88679,"Lon":-97.08542,"Address":"4001 32nd Ave South"},
    "1897":{"Name":"Orange Park","City":"Orange Park","State":"FL","Zip":"32073","Lat":30.16554,"Lon":-81.74511,"Address":"2285 Kingsley Ave"},
    "1898":{"Name":"Rosenberg","City":"Rosenberg","State":"TX","Zip":"77471","Lat":29.52979,"Lon":-95.80648,"Address":"28005 Southwest Freeway"},
    "1899":{"Name":"Sulphur","City":"Sulphur","State":"LA","Zip":"70663","Lat":30.21957,"Lon":-93.32363,"Address":"305 South Cities Service Highway"},
    "1900":{"Name":"Aliso Viejo","City":"Aliso Viejo","State":"CA","Zip":"92656","Lat":33.57891,"Lon":-117.72388,"Address":"26501 Aliso Creek Rd"},
    "1901":{"Name":"Cotati","City":"Cotati","State":"CA","Zip":"94931","Lat":38.33382,"Lon":-122.71541,"Address":"7921 Redwood Dr"},
    "1903":{"Name":"N. Lakewood","City":"Lakewood","State":"CO","Zip":"80215","Lat":39.74258,"Lon":-105.11528,"Address":"10555 West Colfax Ave"},
    "1904":{"Name":"Kalispell","City":"Kalispell","State":"MT","Zip":"59901","Lat":48.23621,"Lon":-114.33344,"Address":"2360 Highway 93 North"},
    "1905":{"Name":"Glenwood Springs","City":"Glenwood Springs","State":"CO","Zip":"81601","Lat":39.55659,"Lon":-107.34644,"Address":"215 West Meadows Dr"},
    "1906":{"Name":"Idaho Falls","City":"Idaho Falls","State":"ID","Zip":"83404","Lat":43.48364,"Lon":-112.01596,"Address":"925 E 17th St"},
    "1907":{"Name":"Bedford","City":"Bedford","State":"NH","Zip":"03110","Lat":42.94091,"Lon":-71.47195,"Address":"222 South River Rd"},
    "1908":{"Name":"Oswego","City":"Oswego","State":"NY","Zip":"13126","Lat":43.46403,"Lon":-76.47295,"Address":"445 State Route 104"},
    "1909":{"Name":"Stafford","City":"Stafford","State":"VA","Zip":"22556","Lat":38.47287,"Lon":-77.41159,"Address":"1330 Stafford Market Pl"},
    "1910":{"Name":"Kimball","City":"Kimball","State":"TN","Zip":"37347","Lat":35.04175,"Lon":-85.67856,"Address":"525 Dixie Lee Center Rd"},
    "1911":{"Name":"Riverview","City":"Riverview","State":"FL","Zip":"33578","Lat":27.85481,"Lon":-82.33089,"Address":"10425 Gibsonton Dr"},
    "1913":{"Name":"South Burlington","City":"South Burlington","State":"VT","Zip":"05403","Lat":44.44122,"Lon":-73.21419,"Address":"189 Hannaford Dr"},
    "1914":{"Name":"Dedham","City":"Dedham","State":"MA","Zip":"02026","Lat":42.25236,"Lon":-71.16997,"Address":"306 Providence Highway"},
    "1916":{"Name":"Hadley","City":"Hadley","State":"MA","Zip":"01035","Lat":42.3535,"Lon":-72.56386,"Address":"282 Russell St"},
    "1917":{"Name":"Farmingdale","City":"Farmingdale","State":"NY","Zip":"11735","Lat":40.74088,"Lon":-73.42557,"Address":"90 Price Pkwy"},
    "1920":{"Name":"E. Charlotte","City":"Charlotte","State":"NC","Zip":"28227","Lat":35.20893,"Lon":-80.69639,"Address":"8826 Albemarle Rd"},
    "1922":{"Name":"Marion","City":"Marion","State":"NC","Zip":"28752","Lat":35.7032,"Lon":-82.04125,"Address":"480 U.S. 70 West"},
    "1923":{"Name":"C. Louisville","City":"Louisville","State":"KY","Zip":"40218","Lat":38.2009,"Lon":-85.66578,"Address":"2100 Bashford Manor Ln"},
    "1924":{"Name":"Marianna","City":"Marianna","State":"FL","Zip":"32448","Lat":30.73008,"Lon":-85.18784,"Address":"4860 Malloy Plaza"},
    "1925":{"Name":"Cornelia","City":"Cornelia","State":"GA","Zip":"30531","Lat":34.5437,"Lon":-83.54034,"Address":"281 Carpenters Cove Ln"},
    "1926":{"Name":"Redding","City":"Redding","State":"CA","Zip":"96002","Lat":40.57253,"Lon":-122.34884,"Address":"1200 East Cypress Ave"},
    "1932":{"Name":"Seekonk","City":"Seekonk","State":"MA","Zip":"02771","Lat":41.79883,"Lon":-71.32734,"Address":"1000 Fall River Ave"},
    "1933":{"Name":"Yuba City","City":"Yuba City","State":"CA","Zip":"95993","Lat":39.13934,"Lon":-121.64755,"Address":"935 Tharp Rd"},
    "1934":{"Name":"Mt. Pocono","City":"Mount Pocono","State":"PA","Zip":"18344","Lat":41.12274,"Lon":-75.37597,"Address":"3207 Route 940"},
    "1935":{"Name":"N.E. Sarasota","City":"Sarasota","State":"FL","Zip":"34232","Lat":27.33626,"Lon":-82.45418,"Address":"5750 Fruitville Rd"},
    "1937":{"Name":"Jersey City","City":"Jersey City","State":"NJ","Zip":"07304","Lat":40.72283,"Lon":-74.09431,"Address":"727 Route 440"},
    "1938":{"Name":"Hackettstown","City":"Hackettstown","State":"NJ","Zip":"07840","Lat":40.83907,"Lon":-74.82107,"Address":"217 Mountain Ave"},
    "1939":{"Name":"Union","City":"Union","State":"NJ","Zip":"07083","Lat":40.6943,"Lon":-74.25564,"Address":"1721 Morris Ave"},
    "1940":{"Name":"Bangor","City":"Bangor","State":"ME","Zip":"04401","Lat":44.84013,"Lon":-68.73937,"Address":"70 Springer Dr"},
    "1941":{"Name":"Oxnard","City":"Oxnard","State":"CA","Zip":"93036","Lat":34.22004,"Lon":-119.17962,"Address":"301 West Gonzales Rd"},
    "1942":{"Name":"E. Rutherford","City":"E. Rutherford","State":"NJ","Zip":"07073","Lat":40.82819,"Lon":-74.09171,"Address":"150 Route 17 North"},
    "1944":{"Name":"Somerset","City":"Somerset","State":"PA","Zip":"15501","Lat":40.04111,"Lon":-79.07302,"Address":"1730 North Center Ave"},
    "1945":{"Name":"Deland","City":"Deland","State":"FL","Zip":"32724","Lat":29.05639,"Lon":-81.29741,"Address":"303 International Speedway Blvd"},
    "1946":{"Name":"Portland","City":"Portland","State":"ME","Zip":"04102","Lat":43.6732,"Lon":-70.32339,"Address":"1058 Brighton Ave"},
    "1948":{"Name":"Bee Cave","City":"Bee Cave","State":"TX","Zip":"78738","Lat":30.30369,"Lon":-97.94,"Address":"12611 Suite 100 Shops Pkwy"},
    "1952":{"Name":"Matamoras","City":"Matamoras","State":"PA","Zip":"18336","Lat":41.35193,"Lon":-74.72522,"Address":"115 Wenlock Rd"},
    "1953":{"Name":"Cortlandville","City":"Cortland","State":"NY","Zip":"13045","Lat":42.57282,"Lon":-76.21543,"Address":"872 Route 13"},
    "1955":{"Name":"Plymouth","City":"Plymouth","State":"MN","Zip":"55447","Lat":45.01689,"Lon":-93.48441,"Address":"3205 Vicksburg Ln North"},
    "1956":{"Name":"Plymouth","City":"Plymouth","State":"IN","Zip":"46563","Lat":41.36296,"Lon":-86.32184,"Address":"1100 Pilgrim Ln"},
    "1957":{"Name":"Butler","City":"Butler","State":"NJ","Zip":"07405","Lat":40.99142,"Lon":-74.33468,"Address":"1210 Route 23 North"},
    "1958":{"Name":"Madison","City":"Madison","State":"GA","Zip":"30650","Lat":33.56229,"Lon":-83.48014,"Address":"1821 Eatonton Highway"},
    "1959":{"Name":"Bluefield","City":"Bluefield","State":"VA","Zip":"24605","Lat":37.23798,"Lon":-81.25103,"Address":"515 Commerce Dr"},
    "1962":{"Name":"West Palm Beach","City":"West Palm Beach","State":"FL","Zip":"33417","Lat":26.70864,"Lon":-80.11501,"Address":"4701 Okeechobee Blvd"},
    "1965":{"Name":"Lindale","City":"Lindale","State":"TX","Zip":"75771","Lat":32.4766,"Lon":-95.38975,"Address":"3200 South Main St"},
    "1966":{"Name":"Maplewood","City":"Maplewood","State":"MO","Zip":"63143","Lat":38.61846,"Lon":-90.33142,"Address":"2300 Maplewood Commons Dr"},
    "1967":{"Name":"Oneonta","City":"Oneonta","State":"NY","Zip":"13820","Lat":42.44911,"Lon":-75.0207,"Address":"5283 State Highway 23"},
    "1968":{"Name":"S.E. Shreveport","City":"Shreveport","State":"LA","Zip":"71105","Lat":32.44061,"Lon":-93.71439,"Address":"7301 Youree Dr"},
    "1969":{"Name":"Weatherford","City":"Weatherford","State":"TX","Zip":"76087","Lat":32.7269,"Lon":-97.78605,"Address":"118 Interstate 20 East"},
    "1971":{"Name":"Simi Valley","City":"Simi Valley","State":"CA","Zip":"93065","Lat":34.28537,"Lon":-118.77559,"Address":"1275 Simi Town Center Way"},
    "1972":{"Name":"E. Santa Clarita","City":"Santa Clarita","State":"CA","Zip":"91321","Lat":34.39603,"Lon":-118.46094,"Address":"19001 Golden Valley Rd"},
    "1973":{"Name":"Albany-northway Mall","City":"Colonie","State":"NY","Zip":"12205","Lat":42.70633,"Lon":-73.82887,"Address":"1482 Central Ave"},
    "1976":{"Name":"Hampton Township","City":"Newton","State":"NJ","Zip":"07860","Lat":41.07621,"Lon":-74.74061,"Address":"39 Hampton House Rd"},
    "1979":{"Name":"Seabrook","City":"Seabrook","State":"NH","Zip":"03874","Lat":42.88591,"Lon":-70.87241,"Address":"417 Lafayette Rd"},
    "1980":{"Name":"Bensalem","City":"Trevose","State":"PA","Zip":"19053","Lat":40.13517,"Lon":-74.9683,"Address":"3421 Horizon Blvd"},
    "1982":{"Name":"Easton","City":"Easton","State":"MD","Zip":"21601","Lat":38.78595,"Lon":-76.07795,"Address":"501 Glebe Rd"},
    "1983":{"Name":"Greenville","City":"Greenville","State":"SC","Zip":"29607","Lat":34.82742,"Lon":-82.29581,"Address":"1131 Woodruff Rd"},
    "1984":{"Name":"Princeton","City":"Princeton","State":"WV","Zip":"24740","Lat":37.3651,"Lon":-81.05026,"Address":"1155 Oakvale Rd"},
    "1985":{"Name":"Fairbanks","City":"Fairbanks","State":"AK","Zip":"99701","Lat":64.85683,"Lon":-147.69583,"Address":"425 Merhar Ave"},
    "1986":{"Name":"Boiling Springs","City":"Boiling Springs","State":"SC","Zip":"29316","Lat":35.05184,"Lon":-81.9829,"Address":"170 Rainbow Lake Rd"},
    "1987":{"Name":"Lake Elsinore","City":"Lake Elsinore","State":"CA","Zip":"92532","Lat":33.69495,"Lon":-117.33744,"Address":"29335 Central Ave"},
    "1988":{"Name":"Olive Branch","City":"Olive Branch","State":"MS","Zip":"38654","Lat":34.96797,"Lon":-89.84193,"Address":"8370 Camp Creek Blvd"},
    "1989":{"Name":"Westminster","City":"Westminster","State":"CO","Zip":"80031","Lat":39.85525,"Lon":-105.05723,"Address":"5600 West 88th Ave"},
    "1990":{"Name":"Brevard","City":"Brevard","State":"NC","Zip":"28712","Lat":35.27077,"Lon":-82.70481,"Address":"119 Ecusta Rd"},
    "2201":{"Name":"S. Asheville","City":"Arden","State":"NC","Zip":"28704","Lat":35.44878,"Lon":-82.5379,"Address":"19 Mckenna Rd"},
    "2202":{"Name":"Bullhead City","City":"Bullhead City","State":"AZ","Zip":"86442","Lat":35.12257,"Lon":-114.57969,"Address":"1680 Highway 95"},
    "2203":{"Name":"Crowley","City":"Crowley","State":"LA","Zip":"70526","Lat":30.23264,"Lon":-92.36084,"Address":"142 Julia John Dr"},
    "2204":{"Name":"E. Athens","City":"Athens","State":"GA","Zip":"30605","Lat":33.94048,"Lon":-83.32245,"Address":"3341 Lexington Rd"},
    "2205":{"Name":"Fayetteville","City":"Fayetteville","State":"WV","Zip":"25840","Lat":38.03454,"Lon":-81.12031,"Address":"46 Fayette Town Center Rd"},
    "2206":{"Name":"Manitowoc","City":"Manitowoc","State":"WI","Zip":"54220","Lat":44.07566,"Lon":-87.70468,"Address":"4401 Dewey St"},
    "2207":{"Name":"N. Augusta","City":"North Augusta","State":"SC","Zip":"29841","Lat":33.50208,"Lon":-81.9609,"Address":"1220 Knox Ave"},
    "2208":{"Name":"Philadelphia","City":"Philadelphia","State":"MS","Zip":"39350","Lat":32.76199,"Lon":-89.14721,"Address":"1105 Central Dr"},
    "2209":{"Name":"Presque Isle","City":"Presque Isle","State":"ME","Zip":"04769","Lat":46.69584,"Lon":-67.99979,"Address":"135 Maysville St"},
    "2210":{"Name":"Roxboro","City":"Roxboro","State":"NC","Zip":"27573","Lat":36.36636,"Lon":-78.98461,"Address":"2044 Durham Rd"},
    "2211":{"Name":"Sunnyvale","City":"Sunnyvale","State":"CA","Zip":"94085","Lat":37.38216,"Lon":-122.01101,"Address":"811 East Arques Ave"},
    "2212":{"Name":"Troy","City":"Troy","State":"AL","Zip":"36081","Lat":31.7776,"Lon":-85.94153,"Address":"1421 U.S. Highway 231 South"},
    "2213":{"Name":"Wadsworth","City":"Wadsworth","State":"OH","Zip":"44281","Lat":41.04057,"Lon":-81.69495,"Address":"1065 Williams Reserve Blvd"},
    "2214":{"Name":"Durant","City":"Durant","State":"OK","Zip":"74701","Lat":34.00322,"Lon":-96.4091,"Address":"720 University Pl"},
    "2215":{"Name":"Hanford","City":"Hanford","State":"CA","Zip":"93230","Lat":36.32615,"Lon":-119.67798,"Address":"1955 West Lacey Blvd"},
    "2216":{"Name":"Lewistown","City":"Lewistown","State":"PA","Zip":"17044","Lat":40.58613,"Lon":-77.6017,"Address":"10472 Us Highway 522 South"},
    "2217":{"Name":"Rocky Mount","City":"Rocky Mount","State":"VA","Zip":"24151","Lat":37.01531,"Lon":-79.86087,"Address":"800 Old Franklin Turnpike"},
    "2218":{"Name":"Savannah","City":"Savannah","State":"TN","Zip":"38372","Lat":35.22756,"Lon":-88.21351,"Address":"1895 Wayne Rd"},
    "2219":{"Name":"N.E. Pittsburgh","City":"Tarentum","State":"PA","Zip":"15084","Lat":40.56885,"Lon":-79.80125,"Address":"1005 Village Center Dr"},
    "2220":{"Name":"Cleburne","City":"Cleburne","State":"TX","Zip":"76033","Lat":32.37906,"Lon":-97.39085,"Address":"2100 North Main St"},
    "2221":{"Name":"N.E. FT. Myers","City":"Ft. Myers","State":"FL","Zip":"33966","Lat":26.61029,"Lon":-81.80901,"Address":"8040 Dani Dr"},
    "2222":{"Name":"S.E. Greensboro","City":"Greensboro","State":"NC","Zip":"27406","Lat":36.00224,"Lon":-79.79542,"Address":"109 West Elmsley Dr"},
    "2223":{"Name":"Mechanicsburg","City":"Mechanicsburg","State":"PA","Zip":"17050","Lat":40.23848,"Lon":-76.9846,"Address":"5500 Carlisle Pike"},
    "2224":{"Name":"Sebring","City":"Sebring","State":"FL","Zip":"33870","Lat":27.50136,"Lon":-81.48862,"Address":"2050 U.S. 27 North"},
    "2225":{"Name":"Granbury","City":"Granbury","State":"TX","Zip":"76048","Lat":32.43281,"Lon":-97.77395,"Address":"1021 East Highway 377"},
    "2226":{"Name":"Ozark","City":"Ozark","State":"MO","Zip":"65721","Lat":37.00267,"Lon":-93.22361,"Address":"1800 West Marler Ln"},
    "2227":{"Name":"N. Stockton","City":"Stockton","State":"CA","Zip":"95219","Lat":38.05035,"Lon":-121.37219,"Address":"10342 Trinity Pkwy"},
    "2228":{"Name":"Waynesboro","City":"Waynesboro","State":"PA","Zip":"17268","Lat":39.7406,"Lon":-77.5297,"Address":"12925 Washington Township Blvd"},
    "2229":{"Name":"Lock Haven","City":"Mill Hall","State":"PA","Zip":"17751","Lat":41.11416,"Lon":-77.47759,"Address":"284 Hogan Blvd"},
    "2230":{"Name":"N. Bentonville","City":"Bentonville","State":"AR","Zip":"72712","Lat":36.41899,"Lon":-94.2243,"Address":"1100 N.W. Lowes Ave"},
    "2231":{"Name":"Cedar Rapids","City":"Cedar Rapids","State":"IA","Zip":"52402","Lat":42.03261,"Lon":-91.68469,"Address":"5300 Blairs Forest Blvd N.E."},
    "2232":{"Name":"S. Dekalb-lithonia","City":"Lithonia","State":"GA","Zip":"30038","Lat":33.69925,"Lon":-84.17008,"Address":"5375 Fairington Rd"},
    "2233":{"Name":"Stony Brook","City":"Stony Brook","State":"NY","Zip":"11790","Lat":40.8722,"Lon":-73.1279,"Address":"2150 Nesconset Highway"},
    "2234":{"Name":"Leesville","City":"Leesville","State":"LA","Zip":"71446","Lat":31.12188,"Lon":-93.27453,"Address":"2200 Mcrae St"},
    "2235":{"Name":"Decatur","City":"Decatur","State":"TX","Zip":"76234","Lat":33.23008,"Lon":-97.5997,"Address":"1201 West U.S. Highway 380 Business"},
    "2236":{"Name":"Mountain Home","City":"Mountain Home","State":"AR","Zip":"72653","Lat":36.35545,"Lon":-92.33549,"Address":"124 Charles Blackburn Dr"},
    "2237":{"Name":"Memphis","City":"Memphis","State":"TN","Zip":"38122","Lat":35.14706,"Lon":-89.90981,"Address":"585 North Perkins Rd"},
    "2238":{"Name":"Lutz","City":"Lutz","State":"FL","Zip":"33549","Lat":28.18989,"Lon":-82.46439,"Address":"21500 State Rd 54"},
    "2239":{"Name":"S. Knoxville","City":"Knoxville","State":"TN","Zip":"37920","Lat":35.90561,"Lon":-83.83991,"Address":"7520 Mountain Grove Dr"},
    "2240":{"Name":"Lake Wales","City":"Lake Wales","State":"FL","Zip":"33859","Lat":27.94876,"Lon":-81.61501,"Address":"23227 U.S. Highway 27"},
    "2241":{"Name":"Palm Coast","City":"Palm Coast","State":"FL","Zip":"32164","Lat":29.55099,"Lon":-81.21996,"Address":"315 Cypress Edge Dr"},
    "2244":{"Name":"Columbia","City":"Elkridge","State":"MD","Zip":"21075","Lat":39.18299,"Lon":-76.79242,"Address":"8281 Gateway Overlook Dr"},
    "2245":{"Name":"N.E. Louisville","City":"Louisville","State":"KY","Zip":"40241","Lat":38.31278,"Lon":-85.57511,"Address":"4930 Norton Healthcare Blvd"},
    "2246":{"Name":"S. Parkersburg","City":"Parkersburg","State":"WV","Zip":"26101","Lat":39.21751,"Lon":-81.54885,"Address":"2 Walton Dr"},
    "2247":{"Name":"Bethel Park","City":"Bethel Park","State":"PA","Zip":"15102","Lat":40.34889,"Lon":-80.0144,"Address":"5775 Baptist Rd"},
    "2248":{"Name":"Seaford","City":"Seaford","State":"DE","Zip":"19973","Lat":38.66291,"Lon":-75.59583,"Address":"22880 Sussex Highway"},
    "2249":{"Name":"Clarkstown","City":"Nanuet","State":"NY","Zip":"10954","Lat":41.10914,"Lon":-74.02452,"Address":"100 Overlook Blvd"},
    "2250":{"Name":"Potsdam","City":"Potsdam","State":"NY","Zip":"13676","Lat":44.69117,"Lon":-74.99057,"Address":"61 Country Ln"},
    "2251":{"Name":"Daphne","City":"Daphne","State":"AL","Zip":"36526","Lat":30.6569,"Lon":-87.85468,"Address":"29645 Frederick Blvd"},
    "2252":{"Name":"Stroudsburg","City":"Bartonsville","State":"PA","Zip":"18321","Lat":41.00147,"Lon":-75.26669,"Address":"5027 Windsor Dr"},
    "2253":{"Name":"N. Lakeland","City":"Lakeland","State":"FL","Zip":"33809","Lat":28.08739,"Lon":-81.97631,"Address":"3600 North Rd 98"},
    "2254":{"Name":"Hialeah","City":"Hialeah","State":"FL","Zip":"33012","Lat":25.85375,"Lon":-80.3159,"Address":"1650 West 37th St"},
    "2255":{"Name":"W. Jefferson","City":"W. Jefferson","State":"NC","Zip":"28694","Lat":36.3844,"Lon":-81.48122,"Address":"158 Lowe's Dr"},
    "2256":{"Name":"Surf City","City":"Hampstead","State":"NC","Zip":"28443","Lat":34.45293,"Lon":-77.60829,"Address":"106 Wilkes Ln"},
    "2257":{"Name":"Sylva","City":"Sylva","State":"NC","Zip":"28779","Lat":35.35398,"Lon":-83.20252,"Address":"1716 East Main St"},
    "2258":{"Name":"Newark","City":"Newark","State":"DE","Zip":"19711","Lat":39.68644,"Lon":-75.7164,"Address":"2000 Ogletown Rd"},
    "2260":{"Name":"Manahawkin","City":"Manahawkin","State":"NJ","Zip":"08050","Lat":39.69781,"Lon":-74.27112,"Address":"297 Route 72 West, Suite 30"},
    "2261":{"Name":"S. Naples","City":"Naples","State":"FL","Zip":"34113","Lat":26.06288,"Lon":-81.70134,"Address":"12730 Tamiami Trail East"},
    "2263":{"Name":"Waterford","City":"Waterford","State":"CT","Zip":"06385","Lat":41.36927,"Lon":-72.1596,"Address":"167 Waterford Pkwy North"},
    "2265":{"Name":"Augusta","City":"Augusta","State":"ME","Zip":"04330","Lat":44.31071,"Lon":-69.80665,"Address":"53 Crossing Way"},
    "2267":{"Name":"Quincy","City":"Quincy","State":"MA","Zip":"02169","Lat":42.23594,"Lon":-71.00779,"Address":"599 Thomas Burgin Pkwy"},
    "2268":{"Name":"W. Torrance","City":"Torrance","State":"CA","Zip":"90505","Lat":33.80299,"Lon":-118.33393,"Address":"2700 Skypark Dr"},
    "2270":{"Name":"Ontario","City":"Ontario","State":"CA","Zip":"91761","Lat":34.03214,"Lon":-117.63,"Address":"2390 South Grove Ave"},
    "2271":{"Name":"Las Vegas","City":"Las Vegas","State":"NV","Zip":"89119","Lat":36.08416,"Lon":-115.12162,"Address":"5825 South Eastern Ave"},
    "2272":{"Name":"Casa Grande","City":"Casa Grande","State":"AZ","Zip":"85122","Lat":32.88105,"Lon":-111.72496,"Address":"1436 East Florence Blvd"},
    "2273":{"Name":"Dublin","City":"Dublin","State":"CA","Zip":"94568","Lat":37.7028,"Lon":-121.86732,"Address":"3750 Dublin Blvd"},
    "2274":{"Name":"Castle Rock","City":"Castle Rock","State":"CO","Zip":"80108","Lat":39.4122,"Lon":-104.87597,"Address":"1360 New Beale St"},
    "2275":{"Name":"Salt Lake City","City":"Salt Lake City","State":"UT","Zip":"84115","Lat":40.74031,"Lon":-111.89817,"Address":"1335 South 300 West"},
    "2277":{"Name":"Helena","City":"Helena","State":"MT","Zip":"59602","Lat":46.61931,"Lon":-112.01403,"Address":"3291 North Sanders St"},
    "2278":{"Name":"Porterville","City":"Porterville","State":"CA","Zip":"93257","Lat":36.05374,"Lon":-119.02834,"Address":"500 West Vandalia Ave"},
    "2279":{"Name":"Sonora","City":"Sonora","State":"CA","Zip":"95370","Lat":37.97157,"Lon":-120.36878,"Address":"120 Old Wards Ferry Rd"},
    "2280":{"Name":"C. Dallas","City":"Dallas","State":"TX","Zip":"75209","Lat":32.83056,"Lon":-96.82877,"Address":"6011 Lemmon Ave"},
    "2282":{"Name":"E. Brandon","City":"Brandon","State":"FL","Zip":"33511","Lat":27.93573,"Lon":-82.2624,"Address":"1515 East Brandon Blvd"},
    "2284":{"Name":"Brooklyn - Kings Plaza","City":"Brooklyn","State":"NY","Zip":"11234","Lat":40.61166,"Lon":-73.91872,"Address":"5602 Ave U"},
    "2288":{"Name":"Wallingford","City":"Wallingford","State":"CT","Zip":"06492","Lat":41.49694,"Lon":-72.80711,"Address":"1094 North Colony Rd"},
    "2289":{"Name":"Oneida","City":"Oneida","State":"NY","Zip":"13421","Lat":43.08038,"Lon":-75.68589,"Address":"1200 Lowe's Dr"},
    "2291":{"Name":"Brewer","City":"Brewer","State":"ME","Zip":"04412","Lat":44.77422,"Lon":-68.72529,"Address":"15 Arista Dr"},
    "2293":{"Name":"Lehi","City":"Lehi","State":"UT","Zip":"84043","Lat":40.39045,"Lon":-111.82571,"Address":"242 North 1200 East"},
    "2294":{"Name":"Menifee","City":"Menifee","State":"CA","Zip":"92584","Lat":33.67871,"Lon":-117.17277,"Address":"30472 Haun Rd"},
    "2295":{"Name":"Buckeye","City":"Buckeye","State":"AZ","Zip":"85326","Lat":33.44081,"Lon":-112.55878,"Address":"700 South Watson Rd"},
    "2296":{"Name":"Riverton","City":"Riverton City","State":"UT","Zip":"84065","Lat":40.52473,"Lon":-111.98267,"Address":"12462 S. Creek Meadow Rd"},
    "2299":{"Name":"Bridgeton","City":"Bridgeton","State":"MO","Zip":"63044","Lat":38.74686,"Lon":-90.42612,"Address":"11974 Paul Mayer Ave"},
    "2300":{"Name":"S. St. Louis","City":"Saint Louis","State":"MO","Zip":"63111","Lat":38.55519,"Lon":-90.26411,"Address":"932 Loughborough Ave"},
    "2301":{"Name":"Chicago - 83rd And Stewart","City":"Chicago","State":"IL","Zip":"60620","Lat":41.74121,"Lon":-87.63082,"Address":"8411 South Holland Rd"},
    "2302":{"Name":"Belleville","City":"Belleville","State":"IL","Zip":"62221","Lat":38.52148,"Lon":-89.92707,"Address":"2501 Greenmount Commons"},
    "2303":{"Name":"Arnold","City":"Arnold","State":"MO","Zip":"63010","Lat":38.43674,"Lon":-90.38612,"Address":"920 Arnold Commons"},
    "2304":{"Name":"Chicago","City":"Chicago","State":"IL","Zip":"60652","Lat":41.74802,"Lon":-87.73934,"Address":"7971 South Cicero"},
    "2305":{"Name":"Rochester Hills","City":"Rochester Hills","State":"MI","Zip":"48307","Lat":42.63241,"Lon":-83.12982,"Address":"3277 South Rochester Rd"},
    "2308":{"Name":"Oshkosh","City":"Oshkosh","State":"WI","Zip":"54904","Lat":44.0298,"Lon":-88.58596,"Address":"1075 North Washburn St"},
    "2309":{"Name":"Wauwatosa","City":"Wauwatosa","State":"WI","Zip":"53222","Lat":43.07568,"Lon":-88.06291,"Address":"12000 West Burleigh St"},
    "2310":{"Name":"Machesney Park","City":"Machesney Park","State":"IL","Zip":"61115","Lat":42.36319,"Lon":-89.03042,"Address":"9700 North Alpine Rd"},
    "2311":{"Name":"Lake St. Louis","City":"Lake Saint Louis","State":"MO","Zip":"63367","Lat":38.76747,"Lon":-90.78638,"Address":"6302 Ronald Reagan Dr"},
    "2312":{"Name":"Madison Heights","City":"Madison Heights","State":"MI","Zip":"48071","Lat":42.50632,"Lon":-83.10965,"Address":"434 West Twelve Mile"},
    "2313":{"Name":"W. St. Paul","City":"West St. Paul","State":"MN","Zip":"55118","Lat":44.89187,"Lon":-93.08205,"Address":"1795 Robert St"},
    "2314":{"Name":"Republic","City":"Republic","State":"MO","Zip":"65738","Lat":37.13127,"Lon":-93.46112,"Address":"1225 U.S. Highway 60 East"},
    "2315":{"Name":"Oak Park Heights","City":"Oak Park Heights","State":"MN","Zip":"55082","Lat":45.0333,"Lon":-92.828,"Address":"5888 Nova Scotia Ave North"},
    "2318":{"Name":"Ludington","City":"Ludington","State":"MI","Zip":"49431","Lat":43.95814,"Lon":-86.39135,"Address":"4460 West U.S. 10"},
    "2319":{"Name":"Beech Grove","City":"Indianapolis","State":"IN","Zip":"46203","Lat":39.70231,"Lon":-86.08513,"Address":"4444 South Emerson Ave"},
    "2321":{"Name":"Littleton","City":"Littleton","State":"NH","Zip":"03561","Lat":44.29407,"Lon":-71.80436,"Address":"1037 Meadow St"},
    "2322":{"Name":"Gilford","City":"Gilford","State":"NH","Zip":"03249","Lat":43.56113,"Lon":-71.44627,"Address":"1407 Lakeshore Rd"},
    "2326":{"Name":"Lloyd","City":"Highland","State":"NY","Zip":"12528","Lat":41.7392,"Lon":-74.0346,"Address":"650 Route 299"},
    "2327":{"Name":"Derby","City":"Derby","State":"CT","Zip":"06418","Lat":41.31406,"Lon":-73.05822,"Address":"496 New Haven Ave"},
    "2328":{"Name":"Paterson","City":"Paterson","State":"NJ","Zip":"07504","Lat":40.90554,"Lon":-74.13395,"Address":"265 Mclean Blvd"},
    "2330":{"Name":"Mira Loma","City":"Mira Loma","State":"CA","Zip":"91752","Lat":33.97175,"Lon":-117.54694,"Address":"6413 Pats Ranch Rd"},
    "2331":{"Name":"Carlsbad","City":"Carlsbad","State":"CA","Zip":"92008","Lat":33.12826,"Lon":-117.26856,"Address":"2515 Palomar Airport Rd"},
    "2333":{"Name":"Hibbing","City":"Hibbing","State":"MN","Zip":"55746","Lat":47.40113,"Lon":-92.95433,"Address":"12025 Highway 169"},
    "2334":{"Name":"Turlock","City":"Turlock","State":"CA","Zip":"95380","Lat":37.52447,"Lon":-120.88491,"Address":"3303 Entertainment Way"},
    "2335":{"Name":"Martell","City":"Jackson","State":"CA","Zip":"95642","Lat":38.37065,"Lon":-120.80274,"Address":"12071 Industry Blvd"},
    "2336":{"Name":"Iwilei - Honolulu","City":"Honolulu","State":"HI","Zip":"96817","Lat":21.31532,"Lon":-157.87312,"Address":"411 Pacific St"},
    "2338":{"Name":"Western Hills","City":"Cincinnati","State":"OH","Zip":"45247","Lat":39.18436,"Lon":-84.64812,"Address":"6150 Harrison Rd"},
    "2339":{"Name":"Strongsville","City":"Strongsville","State":"OH","Zip":"44136","Lat":41.34387,"Lon":-81.82015,"Address":"9149 Pearl Rd"},
    "2340":{"Name":"N.W. Wichita","City":"Wichita","State":"KS","Zip":"67205","Lat":37.73102,"Lon":-97.46093,"Address":"2626 North Maize Rd"},
    "2341":{"Name":"Rancho Cordova","City":"Rancho Cordova","State":"CA","Zip":"95670","Lat":38.58352,"Lon":-121.28318,"Address":"3251 Zinfandel Dr"},
    "2343":{"Name":"Hillsboro","City":"Hillsboro","State":"OH","Zip":"45133","Lat":39.22756,"Lon":-83.62633,"Address":"107 South Careytown Rd"},
    "2344":{"Name":"Pasco","City":"Pasco","State":"WA","Zip":"99301","Lat":46.2687,"Lon":-119.18541,"Address":"4520 Road 68"},
    "2345":{"Name":"N.E. Lexington","City":"Lexington","State":"KY","Zip":"40509","Lat":38.03968,"Lon":-84.42267,"Address":"2300 Grey Lag Way"},
    "2346":{"Name":"Federal Way","City":"Federal Way","State":"WA","Zip":"98003","Lat":47.28389,"Lon":-122.31508,"Address":"35425 Enchanted Pkwy South"},
    "2348":{"Name":"Central Charlotte","City":"Charlotte","State":"NC","Zip":"28203","Lat":35.20549,"Lon":-80.86117,"Address":"217 Iverson Way"},
    "2349":{"Name":"St. Lucie West","City":"Port St. Lucie","State":"FL","Zip":"34986","Lat":27.31927,"Lon":-80.37759,"Address":"701 NW St. Lucie West Blvd"},
    "2350":{"Name":"Waveland","City":"Waveland","State":"MS","Zip":"39576","Lat":30.30949,"Lon":-89.38043,"Address":"9020 Highway 603"},
    "2351":{"Name":"Indian Harbour Beach","City":"Indian Harbour Beach","State":"FL","Zip":"32937","Lat":28.15124,"Lon":-80.58608,"Address":"1934 Highway A1A"},
    "2352":{"Name":"Charlotte - Northlake Mall","City":"Charlotte","State":"NC","Zip":"28216","Lat":35.34577,"Lon":-80.85559,"Address":"10275 Perimeter Pkwy"},
    "2354":{"Name":"La Plata","City":"La Plata","State":"MD","Zip":"20646","Lat":38.55776,"Lon":-76.98215,"Address":"300 Rosewick Rd"},
    "2355":{"Name":"State College","City":"State College","State":"PA","Zip":"16803","Lat":40.81183,"Lon":-77.92582,"Address":"104 Valley Vista Dr"},
    "2356":{"Name":"Richland County","City":"Columbia","State":"SC","Zip":"29223","Lat":34.11394,"Lon":-80.88661,"Address":"10106 Two Notch Rd"},
    "2357":{"Name":"N. Hagerstown","City":"Hagerstown","State":"MD","Zip":"21740","Lat":39.66384,"Lon":-77.69865,"Address":"12809 Shank Farm Way"},
    "2358":{"Name":"Gaffney","City":"Gaffney","State":"SC","Zip":"29341","Lat":35.09079,"Lon":-81.66562,"Address":"1601 West Floyd Baker Blvd"},
    "2360":{"Name":"N. Tampa","City":"Tampa","State":"FL","Zip":"33618","Lat":28.06327,"Lon":-82.50171,"Address":"12901 N. Dale Mabry Highway"},
    "2361":{"Name":"W. Cape Coral","City":"Cape Coral","State":"FL","Zip":"33914","Lat":26.60622,"Lon":-81.97921,"Address":"285 SW 25th Ln"},
    "2362":{"Name":"Estero","City":"Estero","State":"FL","Zip":"33928","Lat":26.42942,"Lon":-81.78585,"Address":"10070 Estero Town Commons Pl"},
    "2363":{"Name":"Poinciana","City":"Kissimmee","State":"FL","Zip":"34746","Lat":28.15822,"Lon":-81.44216,"Address":"4420 Pleasant Hill Rd"},
    "2364":{"Name":"Deltona","City":"Deltona","State":"FL","Zip":"32738","Lat":28.9253,"Lon":-81.18796,"Address":"2170 Howland Blvd"},
    "2365":{"Name":"N.E. Gainesville","City":"Gainesville","State":"FL","Zip":"32609","Lat":29.67623,"Lon":-82.34072,"Address":"2564 N.W. 13th St"},
    "2366":{"Name":"Evans","City":"Evans","State":"GA","Zip":"30809","Lat":33.53693,"Lon":-82.12619,"Address":"4305 Washington Rd"},
    "2367":{"Name":"Panama City Beach","City":"Panama City Beach","State":"FL","Zip":"32407","Lat":30.19863,"Lon":-85.82013,"Address":"11751 Panama City Beach Pkwy"},
    "2368":{"Name":"N. Concord","City":"Kannapolis","State":"NC","Zip":"28083","Lat":35.46887,"Lon":-80.58724,"Address":"3025 Dale Earnhardt Blvd"},
    "2369":{"Name":"W. Jackson","City":"Jackson","State":"MS","Zip":"39204","Lat":32.29195,"Lon":-90.27179,"Address":"2250 Greenway Dr"},
    "2370":{"Name":"N. Hickory","City":"Hickory","State":"NC","Zip":"28601","Lat":35.75266,"Lon":-81.33449,"Address":"1450 2nd St NE"},
    "2371":{"Name":"Cypress","City":"Cypress","State":"TX","Zip":"77429","Lat":29.97191,"Lon":-95.69873,"Address":"14128 Cypress-Rosehill Rd"},
    "2372":{"Name":"Saugus","City":"Saugus","State":"MA","Zip":"01906","Lat":42.44806,"Lon":-71.02564,"Address":"1500 Broadway"},
    "2374":{"Name":"N. Conway","City":"Conway","State":"NH","Zip":"03818","Lat":44.01855,"Lon":-71.1108,"Address":"32 Mountain Valley Blvd"},
    "2375":{"Name":"Hudson","City":"Hudson","State":"MA","Zip":"01749","Lat":42.39473,"Lon":-71.59299,"Address":"6 Highland Common East"},
    "2376":{"Name":"Wareham","City":"Wareham","State":"MA","Zip":"02571","Lat":41.77295,"Lon":-70.74393,"Address":"2421 Cranberry Highway, Suite 100"},
    "2378":{"Name":"W. Philadelphia","City":"Philadelphia","State":"PA","Zip":"19131","Lat":39.97804,"Lon":-75.22189,"Address":"1500 North 50th St"},
    "2379":{"Name":"Clay","City":"Liverpool","State":"NY","Zip":"13090","Lat":43.18278,"Lon":-76.24594,"Address":"3856 State Route 31"},
    "2380":{"Name":"Syracuse","City":"Syracuse","State":"NY","Zip":"13224","Lat":43.05722,"Lon":-76.10042,"Address":"131 Simon Dr"},
    "2382":{"Name":"Salem","City":"Salem","State":"NH","Zip":"03079","Lat":42.7409,"Lon":-71.19574,"Address":"541 South Broadway"},
    "2383":{"Name":"Cromwell","City":"Cromwell","State":"CT","Zip":"06416","Lat":41.6036,"Lon":-72.6973,"Address":"90 Berlin Rd"},
    "2384":{"Name":"Framingham","City":"Framingham","State":"MA","Zip":"01701","Lat":42.30478,"Lon":-71.40007,"Address":"350 Cochituate Rd"},
    "2385":{"Name":"Sayre","City":"Sayre","State":"PA","Zip":"18840","Lat":41.97996,"Lon":-76.54384,"Address":"2151 Elmira St"},
    "2386":{"Name":"Ware","City":"Ware","State":"MA","Zip":"01082","Lat":42.23807,"Lon":-72.27641,"Address":"348 Palmer Rd"},
    "2388":{"Name":"Sanford","City":"Sanford","State":"ME","Zip":"04073","Lat":43.40154,"Lon":-70.70241,"Address":"1900 Main St"},
    "2389":{"Name":"Voorhees","City":"Voorhees","State":"NJ","Zip":"08043","Lat":39.83363,"Lon":-74.92384,"Address":"144 Route 73 North"},
    "2391":{"Name":"S. Nashua","City":"Nashua","State":"NH","Zip":"03060","Lat":42.72611,"Lon":-71.44899,"Address":"143 Daniel Webster Highway"},
    "2393":{"Name":"Plainville","City":"Plainville","State":"MA","Zip":"02762","Lat":42.0294,"Lon":-71.30895,"Address":"201 Washington St"},
    "2395":{"Name":"Torrington","City":"Torrington","State":"CT","Zip":"06790","Lat":41.82472,"Lon":-73.11185,"Address":"420 Winsted Rd"},
    "2396":{"Name":"Killingly","City":"Dayville","State":"CT","Zip":"06241","Lat":41.83993,"Lon":-71.88072,"Address":"1150 Killingly Commons Dr"},
    "2397":{"Name":"N. Warwick","City":"Warwick","State":"RI","Zip":"02886","Lat":41.72019,"Lon":-71.46656,"Address":"555 Greenwich Ave"},
    "2399":{"Name":"Norwich","City":"Norwich","State":"NY","Zip":"13815","Lat":42.50023,"Lon":-75.5305,"Address":"5411 State Highway 12"},
    "2400":{"Name":"Herkimer","City":"Herkimer","State":"NY","Zip":"13350","Lat":43.02703,"Lon":-74.96981,"Address":"182 Lowes Blvd"},
    "2401":{"Name":"Ogdensburg","City":"Ogdensburg","State":"NY","Zip":"13669","Lat":44.70397,"Lon":-75.45996,"Address":"2001 Ford Street Extension"},
    "2402":{"Name":"Mantua Township","City":"Sewell","State":"NJ","Zip":"08080","Lat":39.75977,"Lon":-75.12982,"Address":"611 Woodbury Glassboro Rd"},
    "2405":{"Name":"Avondale","City":"Avondale","State":"PA","Zip":"19311","Lat":39.83654,"Lon":-75.80196,"Address":"561 Hepburn Rd"},
    "2407":{"Name":"Scarborough","City":"Scarborough","State":"ME","Zip":"04074","Lat":43.62429,"Lon":-70.33812,"Address":"1000 Gallery Blvd"},
    "2409":{"Name":"W. York","City":"York","State":"PA","Zip":"17404","Lat":39.96511,"Lon":-76.76521,"Address":"1175 Carlisle Rd"},
    "2411":{"Name":"Richland Township","City":"Gibsonia","State":"PA","Zip":"15044","Lat":40.64039,"Lon":-79.94071,"Address":"700 Grandview Crossing Rd"},
    "2412":{"Name":"Edwardsville","City":"Edwardsville","State":"PA","Zip":"18704","Lat":41.26126,"Lon":-75.904,"Address":"50 West Side Mall"},
    "2414":{"Name":"Pocomoke City","City":"Pocomoke City","State":"MD","Zip":"21851","Lat":38.07821,"Lon":-75.5598,"Address":"275 Newtown Blvd"},
    "2417":{"Name":"Scott Township","City":"Carnegie","State":"PA","Zip":"15106","Lat":40.38807,"Lon":-80.09483,"Address":"2100 Washington Pike"},
    "2418":{"Name":"Ruston","City":"Ruston","State":"LA","Zip":"71270","Lat":32.54586,"Lon":-92.62744,"Address":"809 Morrison Dr"},
    "2419":{"Name":"Littleton","City":"Littleton","State":"CO","Zip":"80120","Lat":39.62575,"Lon":-105.01404,"Address":"5095 S. Santa Fe Dr"},
    "2420":{"Name":"Renton","City":"Renton","State":"WA","Zip":"98055","Lat":47.50004,"Lon":-122.19896,"Address":"1000 Garden Ave North"},
    "2421":{"Name":"S. Phoenix","City":"Phoenix","State":"AZ","Zip":"85041","Lat":33.38002,"Lon":-112.10051,"Address":"1950 West Baseline Rd"},
    "2423":{"Name":"W. Colorado Springs","City":"Colorado Springs","State":"CO","Zip":"80918","Lat":38.90158,"Lon":-104.81984,"Address":"4880 N Nevada Ave"},
    "2424":{"Name":"N.E. Bakersfield","City":"Bakersfield","State":"CA","Zip":"93305","Lat":35.39611,"Lon":-118.97355,"Address":"1601 Columbus St"},
    "2428":{"Name":"Manchester Township","City":"Manchester","State":"NJ","Zip":"08759","Lat":40.01459,"Lon":-74.29594,"Address":"1053 Highway 70"},
    "2429":{"Name":"Wilmington","City":"New Castle","State":"DE","Zip":"19720","Lat":39.7134,"Lon":-75.56258,"Address":"2225 Hessler Blvd"},
    "2431":{"Name":"Paramus","City":"Paramus","State":"NJ","Zip":"07652","Lat":40.91266,"Lon":-74.052,"Address":"2000 Bergen Town Center"},
    "2432":{"Name":"N. Westminster","City":"Westminster","State":"CO","Zip":"80023","Lat":39.94462,"Lon":-104.99062,"Address":"13650 Orchard Pkwy"},
    "2434":{"Name":"Brockport","City":"Brockport","State":"NY","Zip":"14420","Lat":43.20107,"Lon":-77.92086,"Address":"300 Owens Rd"},
    "2435":{"Name":"Brookings","City":"Brookings","State":"SD","Zip":"57006","Lat":44.31436,"Lon":-96.76091,"Address":"812 25th Ave"},
    "2436":{"Name":"Cape Carteret","City":"Cape Carteret","State":"NC","Zip":"28584","Lat":34.69254,"Lon":-77.06443,"Address":"401 WB Mclean Dr"},
    "2437":{"Name":"Clermont","City":"Clermont","State":"FL","Zip":"34711","Lat":28.54419,"Lon":-81.73055,"Address":"1501 Sandy Grove Ave"},
    "2438":{"Name":"S.W. Orlando","City":"Clermont","State":"FL","Zip":"34714","Lat":28.35674,"Lon":-81.67497,"Address":"16905 Cagan Crossings Blvd"},
    "2440":{"Name":"Euless","City":"Euless","State":"TX","Zip":"76039","Lat":32.87993,"Lon":-97.09676,"Address":"3000 S.H. 121"},
    "2441":{"Name":"Forney","City":"Forney","State":"TX","Zip":"75126","Lat":32.74396,"Lon":-96.4439,"Address":"902 Highway 80"},
    "2442":{"Name":"Fort Mill","City":"Fort Mill","State":"SC","Zip":"29708","Lat":35.03252,"Lon":-80.96421,"Address":"1640 Highway 160 West"},
    "2444":{"Name":"Hornell","City":"Hornell","State":"NY","Zip":"14843","Lat":42.34515,"Lon":-77.66392,"Address":"949 State Route 36"},
    "2448":{"Name":"Pittsboro","City":"Pittsboro","State":"NC","Zip":"27312","Lat":35.74532,"Lon":-79.16498,"Address":"121 Lowe's Dr"},
    "2449":{"Name":"Rochester","City":"Rochester","State":"NH","Zip":"03839","Lat":43.29279,"Lon":-70.99405,"Address":"160 Washington Street, Suite 800"},
    "2450":{"Name":"Rocky River","City":"Rocky River","State":"OH","Zip":"44116","Lat":41.46057,"Lon":-81.84827,"Address":"20639 Center Rdg Rd"},
    "2451":{"Name":"Se Huntsville","City":"Owens Cross Roads","State":"AL","Zip":"35763","Lat":34.66268,"Lon":-86.48744,"Address":"6584 Us Highway 431 South"},
    "2452":{"Name":"South San Francisco","City":"South San Francisco","State":"CA","Zip":"94080","Lat":37.65849,"Lon":-122.40426,"Address":"720 Dubuque Ave"},
    "2453":{"Name":"Springville","City":"Springville","State":"NY","Zip":"14141","Lat":42.49686,"Lon":-78.6887,"Address":"440 South Cascade Dr"},
    "2457":{"Name":"Auburndale","City":"Auburndale","State":"FL","Zip":"33823","Lat":28.05509,"Lon":-81.81913,"Address":"2301 U.S. Highway 92 West"},
    "2458":{"Name":"Pulaski County","City":"Radford","State":"VA","Zip":"24141","Lat":37.1509,"Lon":-80.58633,"Address":"6115 Lowes Dr"},
    "2459":{"Name":"Chillicothe","City":"Chillicothe","State":"MO","Zip":"64601","Lat":39.77441,"Lon":-93.54351,"Address":"100 West Business 36"},
    "2460":{"Name":"E. Paducah","City":"Paducah","State":"KY","Zip":"42003","Lat":37.05252,"Lon":-88.57138,"Address":"3131 Irvin Cobb Dr"},
    "2462":{"Name":"Live Oak","City":"Live Oak","State":"FL","Zip":"32064","Lat":30.31637,"Lon":-82.96911,"Address":"208 72nd Trace"},
    "2464":{"Name":"Goose Creek","City":"Goose Creek","State":"SC","Zip":"29445","Lat":33.03222,"Lon":-80.05772,"Address":"520 Saint James Ave"},
    "2465":{"Name":"Blaine","City":"Blaine","State":"MN","Zip":"55434","Lat":45.18191,"Lon":-93.23842,"Address":"11651 Ulysess St"},
    "2466":{"Name":"Sioux Falls","City":"Sioux Falls","State":"SD","Zip":"57106","Lat":43.52699,"Lon":-96.7847,"Address":"4601 W. 26th St"},
    "2468":{"Name":"Harlingen","City":"Harlingen","State":"TX","Zip":"78550","Lat":26.16105,"Lon":-97.67879,"Address":"4705 South Expy 77/83 "},
    "2470":{"Name":"Central New Orleans","City":"New Orleans","State":"LA","Zip":"70117","Lat":29.98375,"Lon":-90.05637,"Address":"2501 Elysian Fields Ave"},
    "2471":{"Name":"Bryant","City":"Bryant","State":"AR","Zip":"72022","Lat":34.61689,"Lon":-92.49536,"Address":"2330 North Reynolds Rd"},
    "2472":{"Name":"N. Jacksonville","City":"Jacksonville","State":"FL","Zip":"32218","Lat":30.47544,"Lon":-81.63999,"Address":"13125 City Square Dr"},
    "2473":{"Name":"Tulare","City":"Tulare","State":"CA","Zip":"93274","Lat":36.22468,"Lon":-119.32929,"Address":"1145 East Prosperity Ave"},
    "2474":{"Name":"Spring Hill","City":"Spring Hill","State":"TN","Zip":"37174","Lat":35.76868,"Lon":-86.92178,"Address":"2000 Belshire Way"},
    "2476":{"Name":"Morgantown","City":"Elverson","State":"PA","Zip":"19520","Lat":40.15481,"Lon":-75.86652,"Address":"340 Crossing Blvd"},
    "2477":{"Name":"N.E. Las Vegas","City":"Las Vegas","State":"NV","Zip":"89115","Lat":36.2045,"Lon":-115.0651,"Address":"2465 N Nellis Blvd"},
    "2478":{"Name":"S. Warner Robins","City":"Kathleen","State":"GA","Zip":"31047","Lat":32.55018,"Lon":-83.69366,"Address":"1109 Highway 96"},
    "2479":{"Name":"Brighton","City":"Brighton","State":"CO","Zip":"80601","Lat":39.96917,"Lon":-104.75755,"Address":"4980 East Bromley Ln"},
    "2480":{"Name":"San Antonio","City":"San Antonio","State":"TX","Zip":"78257","Lat":29.61545,"Lon":-98.6025,"Address":"18303 Rim Dr"},
    "2481":{"Name":"Escondido","City":"Escondido","State":"CA","Zip":"92025","Lat":33.12861,"Lon":-117.09509,"Address":"620 West Mission Ave"},
    "2483":{"Name":"Catskill","City":"Catskill","State":"NY","Zip":"12414","Lat":42.21025,"Lon":-73.88189,"Address":"60 Catskill Commons"},
    "2484":{"Name":"E. Baton Rouge","City":"Baton Rouge","State":"LA","Zip":"70816","Lat":30.44331,"Lon":-91.02312,"Address":"1777 Millerville Rd"},
    "2485":{"Name":"Edinburg","City":"Edinburg","State":"TX","Zip":"78539","Lat":26.30364,"Lon":-98.19347,"Address":"2802 West University Dr"},
    "2486":{"Name":"Buchanan","City":"Appleton","State":"WI","Zip":"54915","Lat":44.25615,"Lon":-88.35237,"Address":"W3255 Van Roy Rd"},
    "2487":{"Name":"Milan","City":"Milan","State":"TN","Zip":"38358","Lat":35.87383,"Lon":-88.74604,"Address":"15471 South First St"},
    "2488":{"Name":"Northport","City":"Northport","State":"AL","Zip":"35476","Lat":33.2333,"Lon":-87.61337,"Address":"5703 Mcfarland Blvd"},
    "2489":{"Name":"Camden County","City":"Kingsland","State":"GA","Zip":"31548","Lat":30.78472,"Lon":-81.64509,"Address":"1410 East Boone Ave"},
    "2490":{"Name":"Mayfield","City":"Mayfield","State":"KY","Zip":"42066","Lat":36.72163,"Lon":-88.62443,"Address":"1208C Paris Rd"},
    "2491":{"Name":"Siloam Springs","City":"Siloam Springs","State":"AR","Zip":"72761","Lat":36.18282,"Lon":-94.5088,"Address":"3499 Highway 412 E"},
    "2496":{"Name":"Thomaston","City":"Thomaston","State":"ME","Zip":"04861","Lat":44.09444,"Lon":-69.14237,"Address":"164 New County Rd"},
    "2497":{"Name":"Maysville","City":"Maysville","State":"KY","Zip":"41056","Lat":38.61746,"Lon":-83.78247,"Address":"314 East Maple Leaf Rd"},
    "2499":{"Name":"N. Lincoln","City":"Lincoln","State":"CA","Zip":"95648","Lat":38.87425,"Lon":-121.29521,"Address":"51 Lincoln Blvd"},
    "2500":{"Name":"Brimfield Township","City":"Kent","State":"OH","Zip":"44240","Lat":41.09559,"Lon":-81.3844,"Address":"218 Nicholas Way"},
    "2501":{"Name":"Farmington","City":"Farmington","State":"NM","Zip":"87402","Lat":36.77243,"Lon":-108.14156,"Address":"5451 East Pinon Hills Blvd"},
    "2502":{"Name":"Lancaster","City":"Lancaster","State":"CA","Zip":"93534","Lat":34.6737,"Lon":-118.14539,"Address":"730 West Ave K"},
    "2503":{"Name":"Altoona","City":"Altoona","State":"IA","Zip":"50009","Lat":41.6418,"Lon":-93.50623,"Address":"3610 8th St SW"},
    "2504":{"Name":"Derby","City":"Derby","State":"KS","Zip":"67037","Lat":37.5782,"Lon":-97.27857,"Address":"424 West Patriot Ave"},
    "2505":{"Name":"Murphy","City":"Murphy","State":"NC","Zip":"28906","Lat":35.09851,"Lon":-84.01892,"Address":"198 Bulldog Dr"},
    "2506":{"Name":"Aransas Pass","City":"Aransas Pass","State":"TX","Zip":"78336","Lat":27.92358,"Lon":-97.1789,"Address":"150 South Fm 1069"},
    "2507":{"Name":"Lewisburg","City":"Lewisburg","State":"WV","Zip":"24901","Lat":37.81189,"Lon":-80.43463,"Address":"20 Gateway Blvd"},
    "2508":{"Name":"S. Antioch","City":"Antioch","State":"CA","Zip":"94531","Lat":37.96259,"Lon":-121.74561,"Address":"5503 Lone Tree Way"},
    "2509":{"Name":"Elizabethton","City":"Elizabethton","State":"TN","Zip":"37643","Lat":36.35142,"Lon":-82.2423,"Address":"925 Patriot Dr"},
    "2510":{"Name":"Espanola","City":"Espanola","State":"NM","Zip":"87532","Lat":36.01335,"Lon":-106.06658,"Address":"407 Lowdermilk Ln"},
    "2511":{"Name":"Sidney","City":"Sidney","State":"OH","Zip":"45365","Lat":40.28876,"Lon":-84.20009,"Address":"2700 Michigan St"},
    "2512":{"Name":"Wasilla","City":"Wasilla","State":"AK","Zip":"99654","Lat":61.57319,"Lon":-149.38422,"Address":"2561 East Sun Mountain Ave"},
    "2513":{"Name":"S.W. Austin","City":"Austin","State":"TX","Zip":"78745","Lat":30.21948,"Lon":-97.82901,"Address":"6400 Brodie Ln"},
    "2514":{"Name":"Auburn","City":"Auburn","State":"ME","Zip":"04210","Lat":44.11649,"Lon":-70.23606,"Address":"650 Turner St"},
    "2516":{"Name":"Flower Mound","City":"Flower Mound","State":"TX","Zip":"75028","Lat":33.07106,"Lon":-97.08104,"Address":"6200 Long Prairie Rd"},
    "2517":{"Name":"Mebane","City":"Mebane","State":"NC","Zip":"27302","Lat":36.0671,"Lon":-79.30201,"Address":"200 Lowes Blvd"},
    "2518":{"Name":"Owatonna","City":"Owatonna","State":"MN","Zip":"55060","Lat":44.0976,"Lon":-93.25467,"Address":"1280 21st Ave NW"},
    "2519":{"Name":"Starkville","City":"Starkville","State":"MS","Zip":"39759","Lat":33.4479,"Lon":-88.84399,"Address":"882 Highway 12 West"},
    "2520":{"Name":"Newberry","City":"Newberry","State":"SC","Zip":"29108","Lat":34.28411,"Lon":-81.5901,"Address":"2911 Main St"},
    "2521":{"Name":"Brenham","City":"Brenham","State":"TX","Zip":"77833","Lat":30.139,"Lon":-96.39768,"Address":"2750 Highway 36 South"},
    "2522":{"Name":"Lawrenceburg","City":"Lawrenceburg","State":"IN","Zip":"47025","Lat":39.08408,"Lon":-84.87896,"Address":"970 West Eads Pkwy"},
    "2523":{"Name":"Franklin","City":"Franklin","State":"IN","Zip":"46131","Lat":39.50511,"Lon":-86.06667,"Address":"2219 North Morton St"},
    "2524":{"Name":"Greenville","City":"Greenville","State":"OH","Zip":"45331","Lat":40.12918,"Lon":-84.6205,"Address":"1550 Wagner Ave"},
    "2525":{"Name":"Alabaster","City":"Alabaster","State":"AL","Zip":"35007","Lat":33.23141,"Lon":-86.80484,"Address":"235 Colonial Promenade Pkwy"},
    "2526":{"Name":"Amherst","City":"Amherst","State":"NH","Zip":"03031","Lat":42.80822,"Lon":-71.56595,"Address":"124 Route 101A, Unit 15"},
    "2527":{"Name":"Apache Junction","City":"Mesa","State":"AZ","Zip":"85209","Lat":33.39232,"Lon":-111.63053,"Address":"1229 S. Ellsworth Rd"},
    "2528":{"Name":"Apple Valley","City":"Apple Valley","State":"CA","Zip":"92308","Lat":34.47262,"Lon":-117.24069,"Address":"12189 Apple Valley Rd"},
    "2529":{"Name":"Arlington Heights","City":"Arlington Heights","State":"IL","Zip":"60005","Lat":42.05383,"Lon":-87.99534,"Address":"990 West Algonquin Rd"},
    "2530":{"Name":"Bardstown","City":"Bardstown","State":"KY","Zip":"40004","Lat":37.80006,"Lon":-85.43159,"Address":"3790 East John Rowan Blvd"},
    "2531":{"Name":"Bartow","City":"Bartow","State":"FL","Zip":"33830","Lat":27.90282,"Lon":-81.83929,"Address":"425 East Van Fleet Dr"},
    "2532":{"Name":"Big Rapids","City":"Big Rapids","State":"MI","Zip":"49307","Lat":43.68637,"Lon":-85.51527,"Address":"21555 Perry Ave"},
    "2533":{"Name":"Bismarck","City":"Bismarck","State":"ND","Zip":"58503","Lat":46.83126,"Lon":-100.81351,"Address":"1401 Century Ave West"},
    "2534":{"Name":"Blytheville","City":"Blytheville","State":"AR","Zip":"72315","Lat":35.93063,"Lon":-89.86842,"Address":"3790 East Main St"},
    "2535":{"Name":"Bolingbrook","City":"Bolingbrook","State":"IL","Zip":"60490","Lat":41.69339,"Lon":-88.12566,"Address":"245 South Weber Rd"},
    "2536":{"Name":"Brunswick","City":"Brunswick","State":"ME","Zip":"04011","Lat":43.9082,"Lon":-69.90516,"Address":"250 Bath Rd"},
    "2537":{"Name":"Camden","City":"Camden","State":"DE","Zip":"19934","Lat":39.0966,"Lon":-75.54893,"Address":"516 Walmart Dr"},
    "2538":{"Name":"Camillus","City":"Camillus","State":"NY","Zip":"13031","Lat":43.03849,"Lon":-76.26951,"Address":"5377 West Genesee St"},
    "2539":{"Name":"C. Albuquerque","City":"Albuquerque","State":"NM","Zip":"87104","Lat":35.10763,"Lon":-106.66017,"Address":"2001 12th St NW"},
    "2540":{"Name":"C. Oklahoma City","City":"Oklahoma City","State":"OK","Zip":"73112","Lat":35.51006,"Lon":-97.56713,"Address":"3801 North May Ave"},
    "2541":{"Name":"Cicero","City":"Cicero","State":"NY","Zip":"13039","Lat":43.14912,"Lon":-76.12028,"Address":"5701 East Circle Dr"},
    "2542":{"Name":"Clarksville","City":"Clarksville","State":"IN","Zip":"47129","Lat":38.32757,"Lon":-85.75763,"Address":"1350 Veterans Pkwy"},
    "2543":{"Name":"Collierville","City":"Collierville","State":"TN","Zip":"38017","Lat":35.05168,"Lon":-89.68944,"Address":"425 New Byhalia Rd"},
    "2544":{"Name":"Danbury","City":"Danbury","State":"CT","Zip":"06810","Lat":41.41812,"Lon":-73.41651,"Address":"67 Eagle Rd"},
    "2545":{"Name":"Delavan","City":"Delavan","State":"WI","Zip":"53115","Lat":42.63024,"Lon":-88.60785,"Address":"2015 East Geneva St"},
    "2546":{"Name":"E. Fort Worth","City":"Ft. Worth","State":"TX","Zip":"76120","Lat":32.76383,"Lon":-97.16597,"Address":"1111 Eastchase Pkwy"},
    "2547":{"Name":"E. Palmdale","City":"Palmdale","State":"CA","Zip":"93552","Lat":34.557,"Lon":-118.04285,"Address":"37080 47th St East"},
    "2548":{"Name":"E. Spartanburg","City":"Spartanburg","State":"SC","Zip":"29307","Lat":34.97141,"Lon":-81.88395,"Address":"2079 East Main St"},
    "2550":{"Name":"El Centro","City":"El Centro","State":"CA","Zip":"92243","Lat":32.81203,"Lon":-115.56759,"Address":"2053 North Imperial Ave"},
    "2551":{"Name":"Epping","City":"Epping","State":"NH","Zip":"03042","Lat":43.03135,"Lon":-71.06956,"Address":"36 Fresh River Rd"},
    "2552":{"Name":"Flemington - Raritan","City":"Flemington","State":"NJ","Zip":"08822","Lat":40.52712,"Lon":-74.85314,"Address":"150 Route 31"},
    "2553":{"Name":"Flowood","City":"Flowood","State":"MS","Zip":"39232","Lat":32.34083,"Lon":-90.07123,"Address":"120 Ridge Way"},
    "2554":{"Name":"Franklin","City":"Franklin","State":"WI","Zip":"53132","Lat":42.91812,"Lon":-87.95251,"Address":"7027 South 27th St"},
    "2555":{"Name":"Front Royal","City":"Front Royal","State":"VA","Zip":"22630","Lat":38.96251,"Lon":-78.18706,"Address":"80 Riverton Commons Dr"},
    "2556":{"Name":"Santa Fe","City":"Santa Fe","State":"NM","Zip":"87507","Lat":35.64363,"Lon":-106.0149,"Address":"3458 Zafarano Rd"},
    "2557":{"Name":"Happy Valley","City":"Phoenix","State":"AZ","Zip":"85085","Lat":33.71092,"Lon":-112.11003,"Address":"2501 W. Happy Valley Rd, Bldg 40"},
    "2558":{"Name":"Henderson","City":"Henderson","State":"KY","Zip":"42420","Lat":37.85856,"Lon":-87.564,"Address":"2190 U.S. Highway 60 East"},
    "2559":{"Name":"Henderson","City":"Henderson","State":"TX","Zip":"75654","Lat":32.13839,"Lon":-94.79529,"Address":"1603 U.S. Highway 79 South"},
    "2560":{"Name":"Kenosha","City":"Kenosha","State":"WI","Zip":"53142","Lat":42.5754,"Lon":-87.88839,"Address":"6500 Green Bay Rd"},
    "2561":{"Name":"Kent-midway","City":"Kent","State":"WA","Zip":"98032","Lat":47.38572,"Lon":-122.29488,"Address":"24050 Pacific Highway South"},
    "2562":{"Name":"Lake Havasu","City":"Lake Havasu City","State":"AZ","Zip":"86404","Lat":34.54534,"Lon":-114.35285,"Address":"4000 Highway 95N"},
    "2563":{"Name":"Laurel","City":"Laurel","State":"MS","Zip":"39440","Lat":31.7075,"Lon":-89.14995,"Address":"1490 Highway 15 North"},
    "2564":{"Name":"Laurinburg","City":"Laurinburg","State":"NC","Zip":"28352","Lat":34.76145,"Lon":-79.47964,"Address":"910 U.S. 15-401 By-pass"},
    "2565":{"Name":"Lebanon","City":"Lebanon","State":"MO","Zip":"65536","Lat":37.66575,"Lon":-92.64637,"Address":"190 East Highway 32"},
    "2566":{"Name":"Lehighton","City":"Lehighton","State":"PA","Zip":"18235","Lat":40.81696,"Lon":-75.73331,"Address":"1204 Blakeslee Blvd Dr East"},
    "2567":{"Name":"Little Elm","City":"Little Elm","State":"TX","Zip":"75068","Lat":33.1801,"Lon":-96.88885,"Address":"2773 East Eldorado Pkwy"},
    "2568":{"Name":"Loveland","City":"Loveland","State":"CO","Zip":"80537","Lat":40.40537,"Lon":-105.03739,"Address":"1355 Sculptor Dr"},
    "2570":{"Name":"Lyon Township","City":"New Hudson","State":"MI","Zip":"48165","Lat":42.51455,"Lon":-83.61122,"Address":"30547 Lyon Center Dr East"},
    "2571":{"Name":"Mcalester","City":"Mcalester","State":"OK","Zip":"74501","Lat":34.91584,"Lon":-95.74326,"Address":"530 South George Nigh Expy"},
    "2572":{"Name":"Mechanicsville","City":"Mechanicsville","State":"VA","Zip":"23111","Lat":37.61305,"Lon":-77.32627,"Address":"6425 Mechanicsville Turnpike"},
    "2573":{"Name":"Meridian","City":"Meridian","State":"ID","Zip":"83646","Lat":43.63487,"Lon":-116.35133,"Address":"3400 North Eagle Rd"},
    "2574":{"Name":"Midwest City","City":"Midwest City","State":"OK","Zip":"73110","Lat":35.43704,"Lon":-97.40301,"Address":"7151 SE 29th St"},
    "2575":{"Name":"Mocksville","City":"Mocksville","State":"NC","Zip":"27028","Lat":35.91764,"Lon":-80.58671,"Address":"1427 Yadkinville Rd"},
    "2576":{"Name":"Monett","City":"Monett","State":"MO","Zip":"65708","Lat":36.91172,"Lon":-93.89723,"Address":"925 East U.S. Highway 60"},
    "2577":{"Name":"Mt. Dora","City":"Mt. Dora","State":"FL","Zip":"32757","Lat":28.82671,"Lon":-81.64495,"Address":"18795 U.S. Highway 441"},
    "2578":{"Name":"N. Colorado Springs","City":"Colorado Springs","State":"CO","Zip":"80920","Lat":38.9707,"Lon":-104.74921,"Address":"4252 Royal Pine Dr"},
    "2579":{"Name":"Portland-delta Park","City":"Portland","State":"OR","Zip":"97217","Lat":45.59313,"Lon":-122.67721,"Address":"1160 N. Hayden Meadows Dr"},
    "2580":{"Name":"New Lenox","City":"New Lenox","State":"IL","Zip":"60451","Lat":41.50707,"Lon":-87.91875,"Address":"2480 East Lincoln Highway"},
    "2581":{"Name":"Nicholasville","City":"Nicholasville","State":"KY","Zip":"40356","Lat":37.90019,"Lon":-84.5856,"Address":"1421 Keene Rd"},
    "2582":{"Name":"Ocotillo","City":"Chandler","State":"AZ","Zip":"85248","Lat":33.24397,"Lon":-111.84289,"Address":"4300 South Arizona Ave"},
    "2583":{"Name":"Palm Desert","City":"Palm Desert","State":"CA","Zip":"92211","Lat":33.78878,"Lon":-116.38689,"Address":"35900 Monterey Ave"},
    "2584":{"Name":"Palmyra","City":"Palmyra","State":"PA","Zip":"17078","Lat":40.32213,"Lon":-76.56507,"Address":"70 North Londonderry Sq"},
    "2585":{"Name":"Petoskey","City":"Petoskey","State":"MI","Zip":"49770","Lat":45.34755,"Lon":-84.97353,"Address":"2140 Anderson Rd"},
    "2586":{"Name":"Plover","City":"Plover","State":"WI","Zip":"54467","Lat":44.49504,"Lon":-89.51027,"Address":"230 Crossroads Dr"},
    "2587":{"Name":"Pocatello","City":"Pocatello","State":"ID","Zip":"83202","Lat":42.91128,"Lon":-112.46046,"Address":"650 Bullock St"},
    "2588":{"Name":"Roeland Park","City":"Roeland Park","State":"KS","Zip":"66205","Lat":39.03849,"Lon":-94.64199,"Address":"4960 Roe Blvd"},
    "2589":{"Name":"S. Bel Air","City":"Abingdon","State":"MD","Zip":"21009","Lat":39.45761,"Lon":-76.31912,"Address":"414 Constant Friendship Blvd"},
    "2591":{"Name":"S. Bristol","City":"Bristol","State":"TN","Zip":"37620","Lat":36.56106,"Lon":-82.21154,"Address":"1340 Volunteer Pkwy"},
    "2592":{"Name":"Shelbyville","City":"Shelbyville","State":"KY","Zip":"40065","Lat":38.20813,"Lon":-85.26591,"Address":"544 Taylorsville Rd"},
    "2593":{"Name":"South Bend","City":"South Bend","State":"IN","Zip":"46614","Lat":41.6268,"Lon":-86.25424,"Address":"250 West Ireland Rd"},
    "2594":{"Name":"Severn","City":"Severn","State":"MD","Zip":"21144","Lat":39.14856,"Lon":-76.64774,"Address":"415 George Clauss Blvd"},
    "2595":{"Name":"Spartanburg","City":"Spartanburg","State":"SC","Zip":"29301","Lat":34.93409,"Lon":-81.99126,"Address":"120 East Blackstock Rd"},
    "2596":{"Name":"Thibodaux","City":"Thibodaux","State":"LA","Zip":"70301","Lat":29.81223,"Lon":-90.81701,"Address":"614 North Canal"},
    "2597":{"Name":"Twin Falls","City":"Twin Falls","State":"ID","Zip":"83301","Lat":42.58557,"Lon":-114.45817,"Address":"1350 Blue Lakes Blvd North"},
    "2598":{"Name":"Van Buren","City":"Van Buren","State":"AR","Zip":"72956","Lat":35.46696,"Lon":-94.3539,"Address":"2120 Fayetteville Rd"},
    "2600":{"Name":"Warrensburg","City":"Warrensburg","State":"MO","Zip":"64093","Lat":38.77771,"Lon":-93.73827,"Address":"912 North College Ave"},
    "2601":{"Name":"Waxahachie","City":"Waxahachie","State":"TX","Zip":"75165","Lat":32.42338,"Lon":-96.83727,"Address":"1420 N. Highway 77"},
    "2602":{"Name":"Waynesboro","City":"Waynesboro","State":"VA","Zip":"22980","Lat":38.0668,"Lon":-78.94019,"Address":"801 Lew Dewitt Blvd"},
    "2603":{"Name":"Xenia","City":"Xenia","State":"OH","Zip":"45385","Lat":39.68616,"Lon":-83.96918,"Address":"126 Hospitality Dr"},
    "2604":{"Name":"Concord","City":"Concord","State":"CA","Zip":"94520","Lat":38.00527,"Lon":-122.0437,"Address":"1935 Arnold Industrial Way"},
    "2605":{"Name":"Tustin","City":"Tustin","State":"CA","Zip":"92782","Lat":33.69955,"Lon":-117.82565,"Address":"2500 Park Ave"},
    "2606":{"Name":"Sandy","City":"Sandy","State":"UT","Zip":"84094","Lat":40.58514,"Lon":-111.86028,"Address":"9291 South Quarry Bend Dr"},
    "2607":{"Name":"Fountain","City":"Fountain","State":"CO","Zip":"80817","Lat":38.72134,"Lon":-104.7017,"Address":"7710 Fountain Mesa Rd"},
    "2608":{"Name":"Bozeman","City":"Bozeman","State":"MT","Zip":"59718","Lat":45.6981,"Lon":-111.06047,"Address":"1731 Tschache Ln"},
    "2609":{"Name":"Newport","City":"Newport","State":"TN","Zip":"37821","Lat":35.94055,"Lon":-83.21442,"Address":"120 Epley Rd"},
    "2610":{"Name":"Tilton","City":"Tilton","State":"NH","Zip":"03276","Lat":43.44994,"Lon":-71.57977,"Address":"48 Lowes Dr"},
    "2611":{"Name":"Papillion","City":"Papillion","State":"NE","Zip":"68133","Lat":41.17214,"Lon":-96.02076,"Address":"8707 South 71st Plaza"},
    "2612":{"Name":"Hicksville","City":"Hicksville","State":"NY","Zip":"11801","Lat":40.74629,"Lon":-73.50247,"Address":"920 South Broadway"},
    "2613":{"Name":"Clearfield","City":"Clearfield","State":"PA","Zip":"16830","Lat":41.0336,"Lon":-78.39748,"Address":"100 Lowes Blvd"},
    "2614":{"Name":"Warren","City":"Warren","State":"PA","Zip":"16365","Lat":41.87824,"Lon":-79.15277,"Address":"2625 Market St"},
    "2617":{"Name":"Concord","City":"Concord","State":"NH","Zip":"03301","Lat":43.21339,"Lon":-71.52924,"Address":"90 Fort Eddy Rd"},
    "2618":{"Name":"Gallatin","City":"Gallatin","State":"TN","Zip":"37066","Lat":36.36582,"Lon":-86.48677,"Address":"1301 Nashville Pike"},
    "2619":{"Name":"Keizer","City":"Keizer","State":"OR","Zip":"97303","Lat":45.01041,"Lon":-122.99987,"Address":"6225 Ulali Dr NE"},
    "2620":{"Name":"Madison","City":"Madison","State":"MS","Zip":"39110","Lat":32.46595,"Lon":-90.12979,"Address":"128 Grandview Blvd"},
    "2621":{"Name":"Moultrie","City":"Moultrie","State":"GA","Zip":"31788","Lat":31.19375,"Lon":-83.76319,"Address":"602 Veteran's Pkwy North"},
    "2622":{"Name":"Ridgeland","City":"Ridgeland","State":"MS","Zip":"39157","Lat":32.4011,"Lon":-90.13922,"Address":"910 East County Line"},
    "2623":{"Name":"Spotsylvania County","City":"Fredericksburg","State":"VA","Zip":"22407","Lat":38.23995,"Lon":-77.50827,"Address":"10101 Southpoint Pkwy"},
    "2624":{"Name":"Tappahannock","City":"Tappahannock","State":"VA","Zip":"22560","Lat":37.89843,"Lon":-76.86841,"Address":"2000 Tappahannock Blvd"},
    "2625":{"Name":"Wheeling","City":"Wheeling","State":"WV","Zip":"26003","Lat":40.05304,"Lon":-80.72691,"Address":"2801 Chapline St"},
    "2626":{"Name":"Raymore","City":"Raymore","State":"MO","Zip":"64083","Lat":38.81098,"Lon":-94.49052,"Address":"225 North Dean Ave"},
    "2627":{"Name":"Maple Grove","City":"Maple Grove","State":"MN","Zip":"55369","Lat":45.09008,"Lon":-93.42295,"Address":"11201 Fountains Dr North"},
    "2628":{"Name":"Shakopee","City":"Shakopee","State":"MN","Zip":"55379","Lat":44.77723,"Lon":-93.46634,"Address":"4270 Dean Lakes Blvd"},
    "2629":{"Name":"N. Windham","City":"Windham","State":"ME","Zip":"04062","Lat":43.8383,"Lon":-70.44856,"Address":"64 Manchester Dr"},
    "2630":{"Name":"Gloucester Township","City":"Sicklerville","State":"NJ","Zip":"08081","Lat":39.7485,"Lon":-74.99295,"Address":"485 Cross Keys Rd"},
    "2634":{"Name":"Weaverville","City":"Weaverville","State":"NC","Zip":"28787","Lat":35.70457,"Lon":-82.57635,"Address":"24 Northridge Commons Pkwy"},
    "2636":{"Name":"E. Lincoln County","City":"Denver","State":"NC","Zip":"28037","Lat":35.44831,"Lon":-81.00446,"Address":"7144 Highway 73"},
    "2637":{"Name":"Woodstock","City":"Woodstock","State":"VA","Zip":"22664","Lat":38.86671,"Lon":-78.53611,"Address":"1220 Henry Ford Dr"},
    "2638":{"Name":"Waxhaw","City":"Waxhaw","State":"NC","Zip":"28173","Lat":34.95935,"Lon":-80.75837,"Address":"2508 Cuthbertson Rd"},
    "2639":{"Name":"Oldsmar","City":"Tampa","State":"FL","Zip":"33635","Lat":28.03436,"Lon":-82.64441,"Address":"13841 W. Hillsborough Ave"},
    "2643":{"Name":"Brunswick","City":"Brunswick","State":"GA","Zip":"31525","Lat":31.2029,"Lon":-81.48052,"Address":"300 Glynn Isles"},
    "2644":{"Name":"Palm Bay","City":"Palm Bay","State":"FL","Zip":"32907","Lat":27.99667,"Lon":-80.63264,"Address":"1166 Malabar Rd"},
    "2645":{"Name":"Gonzales","City":"Gonzales","State":"LA","Zip":"70737","Lat":30.25086,"Lon":-90.92273,"Address":"12484 Airline Highway"},
    "2646":{"Name":"Greenville","City":"Greenville","State":"TX","Zip":"75402","Lat":33.09722,"Lon":-96.11351,"Address":"3122 Interstate 30 West"},
    "2647":{"Name":"Carthage","City":"Carthage","State":"MO","Zip":"64836","Lat":37.1413,"Lon":-94.31601,"Address":"433 West Fir Rd"},
    "2648":{"Name":"Jordan Creek","City":"West Des Moines","State":"IA","Zip":"50266","Lat":41.56275,"Lon":-93.80788,"Address":"450 South Jordan Creek Pkwy"},
    "2649":{"Name":"West Chester","City":"West Chester","State":"OH","Zip":"45069","Lat":39.35291,"Lon":-84.37812,"Address":"7975 Tylersville Square Rd"},
    "2650":{"Name":"Belmont","City":"Belmont","State":"NC","Zip":"28012","Lat":35.25488,"Lon":-81.03745,"Address":"200 Caldwell Farm Rd"},
    "2651":{"Name":"Winter Garden","City":"Winter Garden","State":"FL","Zip":"34787","Lat":28.52423,"Lon":-81.58022,"Address":"3391 Daniels Rd"},
    "2652":{"Name":"Fern Park","City":"Fern Park","State":"FL","Zip":"32730","Lat":28.65583,"Lon":-81.34383,"Address":"6735 South U.S. Highway 17-92"},
    "2653":{"Name":"S. Winston-Salem","City":"Winston Salem","State":"NC","Zip":"27127","Lat":36.03136,"Lon":-80.26396,"Address":"1450 Lumber Ln"},
    "2654":{"Name":"Mt. Juliet","City":"Mt. Juliet","State":"TN","Zip":"37122","Lat":36.17941,"Lon":-86.51453,"Address":"300 Pleasant Grove Rd, Suite 200"},
    "2655":{"Name":"Moore","City":"Moore","State":"OK","Zip":"73160","Lat":35.32496,"Lon":-97.49288,"Address":"1501 South I-35 Service Rd"},
    "2656":{"Name":"N. Mcallen","City":"Mcallen","State":"TX","Zip":"78504","Lat":26.25448,"Lon":-98.21916,"Address":"5700 North 10th St"},
    "2657":{"Name":"Lowell","City":"Lowell","State":"MA","Zip":"01851","Lat":42.61825,"Lon":-71.32374,"Address":"50 Lowes Way"},
    "2658":{"Name":"Milford","City":"Milford","State":"CT","Zip":"06460","Lat":41.23312,"Lon":-73.02361,"Address":"311 Old Gate Ln"},
    "2659":{"Name":"N. Anniston","City":"Anniston","State":"AL","Zip":"36206","Lat":33.70882,"Lon":-85.81905,"Address":"4901 Mcclellan Blvd"},
    "2660":{"Name":"N. Visalia","City":"Visalia","State":"CA","Zip":"93291","Lat":36.35745,"Lon":-119.33018,"Address":"3020 North Demaree St"},
    "2661":{"Name":"Fernley","City":"Fernley","State":"NV","Zip":"89408","Lat":39.61342,"Lon":-119.21142,"Address":"375 Stanley Dr"},
    "2662":{"Name":"West Bountiful","City":"West Bountiful","State":"UT","Zip":"84087","Lat":40.89247,"Lon":-111.89399,"Address":"350 North 545 West"},
    "2663":{"Name":"Sierra Vista","City":"Sierra Vista","State":"AZ","Zip":"85635","Lat":31.55743,"Lon":-110.26053,"Address":"3700 Martin Luther King Pkwy"},
    "2664":{"Name":"Rosedale","City":"Rosedale","State":"NY","Zip":"11422","Lat":40.63886,"Lon":-73.73972,"Address":"253-01 Rockaway Blvd"},
    "2666":{"Name":"London","City":"London","State":"KY","Zip":"40744","Lat":37.1047,"Lon":-84.08651,"Address":"136 Keavy Rd"},
    "2668":{"Name":"Macedon","City":"Macedon","State":"NY","Zip":"14502","Lat":43.06558,"Lon":-77.36889,"Address":"1605 Macedon Pkwy"},
    "2669":{"Name":"Brownsville","City":"Brownsville","State":"TX","Zip":"78520","Lat":25.95182,"Lon":-97.51025,"Address":"525 East Ruben Torres Blvd"},
    "2670":{"Name":"Hutto","City":"Hutto","State":"TX","Zip":"78634","Lat":30.54294,"Lon":-97.56295,"Address":"201 Ed Schmidt Blvd"},
    "2673":{"Name":"Apopka","City":"Apopka","State":"FL","Zip":"32712","Lat":28.68896,"Lon":-81.53987,"Address":"1651 West Orange Blossom Trail"},
    "2674":{"Name":"Americus","City":"Americus","State":"GA","Zip":"31709","Lat":32.0638,"Lon":-84.20023,"Address":"1700 East Lamar St"},
    "2676":{"Name":"Bayonne","City":"Bayonne","State":"NJ","Zip":"07002","Lat":40.6613,"Lon":-74.10623,"Address":"400 Bayonne Crossing Way"},
    "2681":{"Name":"Brownsburg","City":"Brownsburg","State":"IN","Zip":"46112","Lat":39.85923,"Lon":-86.41002,"Address":"630 West Northfield Dr"},
    "2683":{"Name":"Carefree","City":"Carefree","State":"AZ","Zip":"85377","Lat":33.8012,"Lon":-111.96403,"Address":"P.O. Box 6008, 34700 N. Cave Creek Rd"},
    "2685":{"Name":"Chester","City":"Chester","State":"NY","Zip":"10918","Lat":41.35518,"Lon":-74.28768,"Address":"3924 Summerville Way"},
    "2687":{"Name":"E. Lancaster","City":"Lancaster","State":"PA","Zip":"17601","Lat":40.05424,"Lon":-76.25814,"Address":"1845 Hempstead Rd"},
    "2690":{"Name":"E. New Orleans","City":"New Orleans","State":"LA","Zip":"70127","Lat":30.03455,"Lon":-89.97733,"Address":"5770 Read Blvd"},
    "2691":{"Name":"E. Richmond","City":"Henrico","State":"VA","Zip":"23231","Lat":37.52971,"Lon":-77.35156,"Address":"4551 S. Laburnum Ave"},
    "2693":{"Name":"Essex","City":"Essex Junction","State":"VT","Zip":"05452","Lat":44.50629,"Lon":-73.13862,"Address":"10 Susie Wilson Rd"},
    "2697":{"Name":"Fort Collins","City":"Fort Collins","State":"CO","Zip":"80525","Lat":40.52757,"Lon":-105.02828,"Address":"4227 Corbett Dr"},
    "2698":{"Name":"Franklin","City":"Franklin","State":"VA","Zip":"23851","Lat":36.67219,"Lon":-76.94493,"Address":"1240 Armory Dr"},
    "2700":{"Name":"Gautier","City":"Gautier","State":"MS","Zip":"39553","Lat":30.395,"Lon":-88.66183,"Address":"3200 Highway 90"},
    "2701":{"Name":"Glenville","City":"Glenville","State":"NY","Zip":"12302","Lat":42.83766,"Lon":-73.93891,"Address":"93 Freemans Bridge Rd"},
    "2702":{"Name":"Haines City","City":"Haines City","State":"FL","Zip":"33844","Lat":28.13849,"Lon":-81.6346,"Address":"37051 U.S. Highway 27"},
    "2704":{"Name":"Hamburg","City":"Hamburg","State":"NY","Zip":"14075","Lat":42.75463,"Lon":-78.84937,"Address":"4950 Southwestern Blvd"},
    "2706":{"Name":"Hatfield Township","City":"Hatfield","State":"PA","Zip":"19440","Lat":40.26568,"Lon":-75.31885,"Address":"160 Forty Foot Rd"},
    "2707":{"Name":"Homestead","City":"Homestead","State":"FL","Zip":"33033","Lat":25.47619,"Lon":-80.45117,"Address":"1850 NE Campbell Dr"},
    "2709":{"Name":"Jefferson City","City":"Jefferson City","State":"TN","Zip":"37760","Lat":36.13017,"Lon":-83.46639,"Address":"638 E. Broadway Blvd"},
    "2712":{"Name":"Madera","City":"Madera","State":"CA","Zip":"93637","Lat":36.97154,"Lon":-120.08173,"Address":"2100 West Cleveland Ave"},
    "2714":{"Name":"Mid-city Los Angeles","City":"Los Angeles","State":"CA","Zip":"90019","Lat":34.04777,"Lon":-118.33508,"Address":"4550 West Pico Blvd Unit D-101"},
    "2715":{"Name":"Milton","City":"Pace","State":"FL","Zip":"32571","Lat":30.60136,"Lon":-87.10948,"Address":"5143 Highway 90"},
    "2719":{"Name":"N. Abilene","City":"Abilene","State":"TX","Zip":"79601","Lat":32.47609,"Lon":-99.69293,"Address":"1634 Musgrave Blvd"},
    "2721":{"Name":"North Las Vegas","City":"North Las Vegas","State":"NV","Zip":"89030","Lat":36.2421,"Lon":-115.11548,"Address":"2570 East Craig Rd"},
    "2723":{"Name":"North Smithfield","City":"North Smithfield","State":"RI","Zip":"02896","Lat":41.98027,"Lon":-71.50666,"Address":"19 Dowling Village Blvd"},
    "2724":{"Name":"N. Winchester","City":"Winchester","State":"VA","Zip":"22602","Lat":39.22307,"Lon":-78.13391,"Address":"261 Market St"},
    "2725":{"Name":"Nashville","City":"Nashville","State":"TN","Zip":"37211","Lat":36.0474,"Lon":-86.71179,"Address":"5520 Nolensville Pike"},
    "2726":{"Name":"New Hartford","City":"New Hartford","State":"NY","Zip":"13413","Lat":43.09052,"Lon":-75.32038,"Address":"4699 Middle Settlement Rd"},
    "2727":{"Name":"North Port","City":"North Port","State":"FL","Zip":"34287","Lat":27.0418,"Lon":-82.22787,"Address":"5601 Tuscola Blvd"},
    "2728":{"Name":"Northbrook","City":"Northbrook","State":"IL","Zip":"60062","Lat":42.10806,"Lon":-87.80424,"Address":"1000 Willow Rd"},
    "2729":{"Name":"Oak Grove Village","City":"Sullivan","State":"MO","Zip":"63080","Lat":38.22568,"Lon":-91.15271,"Address":"760 Eagles Court"},
    "2730":{"Name":"Paso Robles","City":"Paso Robles","State":"CA","Zip":"93446","Lat":35.64605,"Lon":-120.66199,"Address":"2445 Golden Hill Rd"},
    "2731":{"Name":"Patchogue","City":"East Patchogue","State":"NY","Zip":"11772","Lat":40.76834,"Lon":-72.98415,"Address":"825 Montauk Highway"},
    "2732":{"Name":"Philadelphia - Aramingo Aven","City":"Philadelphia","State":"PA","Zip":"19137","Lat":39.99741,"Lon":-75.09154,"Address":"3800 Aramingo Ave"},
    "2733":{"Name":"Port Orchard","City":"Port Orchard","State":"WA","Zip":"98366","Lat":47.49853,"Lon":-122.64546,"Address":"150 Sedgwick Rd"},
    "2734":{"Name":"Puyallup","City":"Puyallup","State":"WA","Zip":"98374","Lat":47.15743,"Lon":-122.28598,"Address":"3511 5th St SE"},
    "2736":{"Name":"Rochester","City":"Rochester","State":"MN","Zip":"55904","Lat":43.95434,"Lon":-92.46007,"Address":"4550 Maine Ave SE"},
    "2737":{"Name":"S. Jacksonville","City":"Jacksonville","State":"NC","Zip":"28540","Lat":34.75007,"Lon":-77.4618,"Address":"425 Yopp Rd"},
    "2738":{"Name":"S. Lacey","City":"Lacey","State":"WA","Zip":"98503","Lat":46.99738,"Lon":-122.82654,"Address":"5610 Corporate Center Ln SE"},
    "2739":{"Name":"S. Lincoln","City":"Lincoln","State":"NE","Zip":"68516","Lat":40.75122,"Lon":-96.63812,"Address":"6101 Apples Way"},
    "2742":{"Name":"S. Pueblo","City":"Pueblo","State":"CO","Zip":"81005","Lat":38.21904,"Lon":-104.6463,"Address":"2900 West Pueblo Blvd"},
    "2746":{"Name":"Silverdale","City":"Silverdale","State":"WA","Zip":"98383","Lat":47.6587,"Lon":-122.67896,"Address":"2221 NW Myhre Rd"},
    "2750":{"Name":"Troutman","City":"Troutman","State":"NC","Zip":"28166","Lat":35.67098,"Lon":-80.85143,"Address":"1041 Charlotte Highway"},
    "2751":{"Name":"Vernon Hills","City":"Vernon Hills","State":"IL","Zip":"60061","Lat":42.25528,"Lon":-87.95004,"Address":"1660 N. Milwaukee Ave"},
    "2752":{"Name":"West Bridgewater","City":"West Bridgewater","State":"MA","Zip":"02379","Lat":42.01023,"Lon":-71.05041,"Address":"724 West Center St"},
    "2753":{"Name":"S.W. Marion County","City":"Ocala","State":"FL","Zip":"34476","Lat":29.09412,"Lon":-82.24587,"Address":"7575 SW 90th St"},
    "2755":{"Name":"West Sacramento","City":"West Sacramento","State":"CA","Zip":"95691","Lat":38.55535,"Lon":-121.53883,"Address":"2250 Lake Washington Blvd"},
    "2756":{"Name":"W. Tulsa","City":"Tulsa","State":"OK","Zip":"74132","Lat":36.059,"Lon":-96.00174,"Address":"7225 South Olympia West"},
    "2759":{"Name":"Waterloo","City":"Geneva","State":"NY","Zip":"14456","Lat":42.87819,"Lon":-76.94827,"Address":"3030 Sessler Dr"},
    "2761":{"Name":"Wentzville","City":"Wentzville","State":"MO","Zip":"63385","Lat":38.81812,"Lon":-90.8804,"Address":"1889 Wentzville Pkwy"},
    "2763":{"Name":"Whitehall Township","City":"Whitehall","State":"PA","Zip":"18052","Lat":40.64552,"Lon":-75.49625,"Address":"2650 Macarthur Rd"},
    "2765":{"Name":"Woodhaven","City":"Woodhaven","State":"MI","Zip":"48183","Lat":42.14131,"Lon":-83.23835,"Address":"21000 West Rd"},
    "2766":{"Name":"Zionsville","City":"Zionsville","State":"IN","Zip":"46077","Lat":39.94758,"Lon":-86.34156,"Address":"6711 E. State Rd 334"},
    "2767":{"Name":"Kansas City - Gladstone","City":"Kansas City","State":"MO","Zip":"64118","Lat":39.18295,"Lon":-94.57434,"Address":"4811 N. Oak Trafficway"},
    "2768":{"Name":"Mt. Sterling","City":"Mt Sterling","State":"KY","Zip":"40353","Lat":38.06807,"Lon":-83.95278,"Address":"550 Indian Mound Dr"},
    "2769":{"Name":"St. Robert","City":"Saint Robert","State":"MO","Zip":"65584","Lat":37.82853,"Lon":-92.16151,"Address":"120 Carson Blvd"},
    "2770":{"Name":"Avon","City":"Avon","State":"OH","Zip":"44011","Lat":41.46944,"Lon":-82.01731,"Address":"1445 Center Rd"},
    "2771":{"Name":"N.E. Greensboro","City":"Greensboro","State":"NC","Zip":"27405","Lat":36.11434,"Lon":-79.75258,"Address":"2005 East Cone Blvd"},
    "2772":{"Name":"Pooler","City":"Pooler","State":"GA","Zip":"31322","Lat":32.09141,"Lon":-81.27267,"Address":"1565 Pooler Pkwy"},
    "2773":{"Name":"West Kingsport","City":"Kingsport","State":"TN","Zip":"37660","Lat":36.5577,"Lon":-82.59922,"Address":"2324 West Stone Dr"},
    "2774":{"Name":"Leander","City":"Leander","State":"TX","Zip":"78641","Lat":30.55863,"Lon":-97.84645,"Address":"1495 Highway 183"},
    "2776":{"Name":"Franklin","City":"Franklin","State":"KY","Zip":"42134","Lat":36.69579,"Lon":-86.56902,"Address":"1555 Nashville Rd"},
    "2777":{"Name":"Tarpon Springs","City":"Tarpon Springs","State":"FL","Zip":"34689","Lat":28.15229,"Lon":-82.74089,"Address":"41800 US Hwy 19 N"},
    "2778":{"Name":"S. Durham","City":"Durham","State":"NC","Zip":"27713","Lat":35.94145,"Lon":-78.90851,"Address":"4402 Fayetteville Rd"},
    "2779":{"Name":"Richardson","City":"Richardson","State":"TX","Zip":"75081","Lat":32.94228,"Lon":-96.69726,"Address":"501 South Plano Rd"},
    "2780":{"Name":"E. Aurora","City":"Aurora","State":"CO","Zip":"80016","Lat":39.59769,"Lon":-104.70335,"Address":"24505 E. Wheatlands Pkwy"},
    "2781":{"Name":"Monroe","City":"Monroe","State":"WA","Zip":"98272","Lat":47.86305,"Lon":-121.97122,"Address":"19393 Tjerne Pl SE"},
    "2783":{"Name":"S. Chino Hills","City":"Chino Hills","State":"CA","Zip":"91709","Lat":33.98038,"Lon":-117.70098,"Address":"4777 Chino Hills Pkwy"},
    "2785":{"Name":"Abington","City":"Abington","State":"MA","Zip":"02351","Lat":42.1154,"Lon":-70.95103,"Address":"400 Bedford St"},
    "2786":{"Name":"S. San Antonio","City":"San Antonio","State":"TX","Zip":"78224","Lat":29.35304,"Lon":-98.53692,"Address":"7843 IH 35 S"},
    "2788":{"Name":"Ensley","City":"Pensacola","State":"FL","Zip":"32534","Lat":30.53185,"Lon":-87.2854,"Address":"777 West Nine Mile Rd"},
    "2789":{"Name":"S.E. San Antonio","City":"San Antonio","State":"TX","Zip":"78223","Lat":29.34885,"Lon":-98.42784,"Address":"3302 Goliad Rd"},
    "2790":{"Name":"E. San Jose","City":"San Jose","State":"CA","Zip":"95131","Lat":37.37968,"Lon":-121.90189,"Address":"775 Ridder Park Dr"},
    "2792":{"Name":"S. Meridian","City":"Meridian","State":"ID","Zip":"83642","Lat":43.58902,"Lon":-116.39731,"Address":"305 West Overland Rd"},
    "2793":{"Name":"E. Spokane Valley","City":"Spokane Valley","State":"WA","Zip":"99037","Lat":47.66553,"Lon":-117.18726,"Address":"16205 East Broadway Ave"},
    "2795":{"Name":"Millsboro","City":"Millsboro","State":"DE","Zip":"19966","Lat":38.5711,"Lon":-75.28701,"Address":"26688 Centerview Dr"},
    "2798":{"Name":"Eagle Pass","City":"Eagle Pass","State":"TX","Zip":"78852","Lat":28.69908,"Lon":-100.48147,"Address":"574 South Bibb Ave"},
    "2800":{"Name":"Oakland","City":"Oakland","State":"MD","Zip":"21550","Lat":39.44156,"Lon":-79.38097,"Address":"7000 Lowes Dr"},
    "2801":{"Name":"N.W. Amarillo","City":"Amarillo","State":"TX","Zip":"79124","Lat":35.20999,"Lon":-101.90708,"Address":"6401 Lowes Ln"},
    "2803":{"Name":"Hartsville","City":"Hartsville","State":"SC","Zip":"29550","Lat":34.36561,"Lon":-80.064,"Address":"819 South Fourth St"},
    "2806":{"Name":"C. Colorado Springs","City":"Colorado Springs","State":"CO","Zip":"80909","Lat":38.84215,"Lon":-104.75552,"Address":"701 North Academy Blvd"},
    "2808":{"Name":"E. Gilbert","City":"Gilbert","State":"AZ","Zip":"85297","Lat":33.2647,"Lon":-111.72273,"Address":"4730 S. Higley Rd"},
    "2809":{"Name":"Bedford","City":"Bedford","State":"VA","Zip":"24523","Lat":37.32078,"Lon":-79.48395,"Address":"1820 East Lynchburg Salem Tpke"},
    "2810":{"Name":"Farmville","City":"Farmville","State":"VA","Zip":"23901","Lat":37.2653,"Lon":-78.41015,"Address":"2644 Farmville Rd"},
    "2812":{"Name":"New Braunfels","City":"New Braunfels","State":"TX","Zip":"78130","Lat":29.68341,"Lon":-98.13139,"Address":"1455 IH 35 South"},
    "2813":{"Name":"Rincon","City":"Rincon","State":"GA","Zip":"31326","Lat":32.27315,"Lon":-81.23056,"Address":"5150 Highway 21 South"},
    "2816":{"Name":"Shippensburg","City":"Shippensburg","State":"PA","Zip":"17257","Lat":40.0631,"Lon":-77.4936,"Address":"250 South Conestoga Dr"},
    "2819":{"Name":"Exeter Township","City":"Reading","State":"PA","Zip":"19606","Lat":40.30949,"Lon":-75.86175,"Address":"4535 Perkiomen Ave"},
    "2820":{"Name":"N. Peoria","City":"Peoria","State":"AZ","Zip":"85383","Lat":33.71228,"Lon":-112.26823,"Address":"25311 N. Lake Pleasant Pkwy"},
    "2821":{"Name":"League City","City":"League City","State":"TX","Zip":"77573","Lat":29.47071,"Lon":-95.08741,"Address":"1655 W. Fm 646"},
    "2822":{"Name":"W. Spring","City":"Spring","State":"TX","Zip":"77379","Lat":30.07244,"Lon":-95.50863,"Address":"20902 Kuykendahl Rd"},
    "2823":{"Name":"La Follette","City":"La Follette","State":"TN","Zip":"37766","Lat":36.34319,"Lon":-84.16937,"Address":"2444 Jacksboro Pike"},
    "2824":{"Name":"Schertz","City":"Schertz","State":"TX","Zip":"78154","Lat":29.59583,"Lon":-98.2807,"Address":"17280 IH 35 N"},
    "2825":{"Name":"Mckinney","City":"Mckinney","State":"TX","Zip":"75070","Lat":33.22214,"Lon":-96.63805,"Address":"2055 N. Central Expy"},
    "2826":{"Name":"N. Frederick","City":"Frederick","State":"MD","Zip":"21701","Lat":39.44776,"Lon":-77.39911,"Address":"7850 Wormans Mill Rd"},
    "2828":{"Name":"Ruckersville","City":"Ruckersville","State":"VA","Zip":"22968","Lat":38.2354,"Lon":-78.37259,"Address":"385 Stoneridge Dr North"},
    "2833":{"Name":"Showlow","City":"Show Low","State":"AZ","Zip":"85901","Lat":34.19744,"Lon":-110.01892,"Address":"5800 South White Mountain Rd"},
    "2834":{"Name":"Vernal","City":"Vernal","State":"UT","Zip":"84078","Lat":40.43461,"Lon":-109.56777,"Address":"2105 West Highway 40"},
    "2837":{"Name":"E. Greenville","City":"Greenville","State":"NC","Zip":"27858","Lat":35.58959,"Lon":-77.31847,"Address":"3840 East 10th St"},
    "2838":{"Name":"Canton","City":"Canton","State":"GA","Zip":"30114","Lat":34.23439,"Lon":-84.45412,"Address":"2044 Cumming Highway"},
    "2840":{"Name":"Bastrop","City":"Bastrop","State":"TX","Zip":"78602","Lat":30.11428,"Lon":-97.35137,"Address":"719 Highway 71 West"},
    "2842":{"Name":"C. San Jose","City":"San Jose","State":"CA","Zip":"95110","Lat":37.34935,"Lon":-121.92242,"Address":"750 Newhall Dr"},
    "2844":{"Name":"Centennial Hills","City":"Las Vegas","State":"NV","Zip":"89143","Lat":36.30194,"Lon":-115.28607,"Address":"7751 N El Capitan Way"},
    "2845":{"Name":"Clinton","City":"Clinton","State":"UT","Zip":"84015","Lat":41.14242,"Lon":-112.06114,"Address":"1986 North 2000 West"},
    "2847":{"Name":"Paragould","City":"Paragould","State":"AR","Zip":"72450","Lat":36.06132,"Lon":-90.51598,"Address":"212 North 23rd St"},
    "2848":{"Name":"North East","City":"North East","State":"MD","Zip":"21901","Lat":39.6101,"Lon":-75.95087,"Address":"425 Mauldin Ave"},
    "2849":{"Name":"Neosho","City":"Neosho","State":"MO","Zip":"64850","Lat":36.8392,"Lon":-94.38944,"Address":"1490 Clemon Dr"},
    "2851":{"Name":"N. Nashville","City":"Nashville","State":"TN","Zip":"37207","Lat":36.24642,"Lon":-86.76135,"Address":"3460 Dickerson Pike"},
    "2852":{"Name":"Reynoldsburg","City":"Reynoldsburg","State":"OH","Zip":"43068","Lat":39.98427,"Lon":-82.78283,"Address":"8231 East Broad St"},
    "2853":{"Name":"S. Lebanon","City":"South Lebanon","State":"OH","Zip":"45065","Lat":39.37674,"Lon":-84.22314,"Address":"575 Corwin Nixon Blvd"},
    "2854":{"Name":"N. Edmond","City":"Edmond","State":"OK","Zip":"73003","Lat":35.67931,"Lon":-97.49794,"Address":"2401 North Kelly Ave"},
    "2855":{"Name":"Mankato","City":"Mankato","State":"MN","Zip":"56001","Lat":44.1613,"Lon":-93.94551,"Address":"2015 Bassett Dr"},
    "2856":{"Name":"Highland","City":"Highland","State":"CA","Zip":"92346","Lat":34.10707,"Lon":-117.19675,"Address":"27847 Greenspot Rd"},
    "2858":{"Name":"Ogden","City":"Ogden","State":"UT","Zip":"84404","Lat":41.26555,"Lon":-111.9681,"Address":"344 N. Washington Blvd"},
    "2862":{"Name":"Zion Crossroads","City":"Gordonsville","State":"VA","Zip":"22942","Lat":37.9801,"Lon":-78.20728,"Address":"165 Camp Creek Pkwy"},
    "2863":{"Name":"North Providence","City":"North Providence","State":"RI","Zip":"02904","Lat":41.86376,"Lon":-71.45527,"Address":"1703 Mineral Springs Ave"},
    "2865":{"Name":"Redmond","City":"Redmond","State":"OR","Zip":"97756","Lat":44.2655,"Lon":-121.17775,"Address":"1313 SW Canal Blvd"},
    "2866":{"Name":"Dayton","City":"Dayton","State":"TN","Zip":"37321","Lat":35.46622,"Lon":-85.04107,"Address":"3535 Rhea County Highway"},
    "2867":{"Name":"Lorain","City":"Lorain","State":"OH","Zip":"44053","Lat":41.41476,"Lon":-82.24147,"Address":"7500 Oak Point Rd"},
    "2868":{"Name":"Marquette","City":"Marquette","State":"MI","Zip":"49855","Lat":46.55071,"Lon":-87.47025,"Address":"3500 U.S. 41 West"},
    "2869":{"Name":"Whiteville","City":"Whiteville","State":"NC","Zip":"28472","Lat":34.30172,"Lon":-78.71713,"Address":"100 Green Hill Dr"},
    "2870":{"Name":"S. Stafford","City":"Fredericksburg","State":"VA","Zip":"22406","Lat":38.35631,"Lon":-77.51817,"Address":"299 Banks Ford Pkwy"},
    "2878":{"Name":"S. Mckinney","City":"Mckinney","State":"TX","Zip":"75070","Lat":33.12923,"Lon":-96.7259,"Address":"8550 S.H. 121"},
    "2879":{"Name":"Rio Rancho","City":"Rio Rancho","State":"NM","Zip":"87124","Lat":35.27626,"Lon":-106.65871,"Address":"3805 Northern Blvd NE"},
    "2884":{"Name":"N. Dothan","City":"Dothan","State":"AL","Zip":"36303","Lat":31.26711,"Lon":-85.44875,"Address":"4801 Montgomery Highway"},
    "2885":{"Name":"Wetumpka","City":"Wetumpka","State":"AL","Zip":"36092","Lat":32.50786,"Lon":-86.21695,"Address":"4501 U.S. Highway 231"},
    "2886":{"Name":"Defuniak Springs","City":"Defuniak Springs","State":"FL","Zip":"32435","Lat":30.6976,"Lon":-86.12044,"Address":"135 Business Park Rd"},
    "2893":{"Name":"Mansfield","City":"Mansfield","State":"PA","Zip":"16933","Lat":41.76865,"Lon":-77.07216,"Address":"2165 South Main St"},
    "2894":{"Name":"Hamburg","City":"Hamburg","State":"PA","Zip":"19526","Lat":40.56277,"Lon":-76.00819,"Address":"20 Wilderness Trail"},
    "2895":{"Name":"Bonney Lake","City":"Bonney Lake","State":"WA","Zip":"98391","Lat":47.16685,"Lon":-122.16419,"Address":"19911 South Prairie Rd East"},
    "2898":{"Name":"Alamo Ranch - San Antonio","City":"San Antonio","State":"TX","Zip":"78253","Lat":29.48716,"Lon":-98.71266,"Address":"5303 W Loop 1604 N"},
    "2903":{"Name":"Mustang","City":"Mustang","State":"OK","Zip":"73064","Lat":35.38925,"Lon":-97.70542,"Address":"1000 East State Highway 152"},
    "2904":{"Name":"Kendall","City":"Miami","State":"FL","Zip":"33186","Lat":25.68254,"Lon":-80.41582,"Address":"9191 SW 137th Ave"},
    "2905":{"Name":"W. Fayetteville","City":"Fayetteville","State":"NC","Zip":"28304","Lat":35.02754,"Lon":-79.0576,"Address":"7771 Good Middling Dr"},
    "2907":{"Name":"Indian Trail","City":"Indian Trail","State":"NC","Zip":"28079","Lat":35.06194,"Lon":-80.63797,"Address":"5711 W. Highway 74"},
    "2908":{"Name":"Suwanee","City":"Suwanee","State":"GA","Zip":"30024","Lat":34.03619,"Lon":-84.05452,"Address":"3260 Lawrenceville Suwanee Rd"},
    "2910":{"Name":"Southington","City":"Southington","State":"CT","Zip":"06489","Lat":41.61174,"Lon":-72.90382,"Address":"500 Executive Blvd"},
    "2918":{"Name":"Prince George","City":"Prince George","State":"VA","Zip":"23875","Lat":37.24822,"Lon":-77.36485,"Address":"2085 Waterside Dr"},
    "2920":{"Name":"N. York County","City":"Clover","State":"SC","Zip":"29710","Lat":35.12091,"Lon":-81.08714,"Address":"5288 Highway 557"},
    "2921":{"Name":"Riverhead - South","City":"Riverhead","State":"NY","Zip":"11901","Lat":40.92499,"Lon":-72.68997,"Address":"1461 Old Country Rd"},
    "2927":{"Name":"Greenport","City":"Hudson","State":"NY","Zip":"12534","Lat":42.27975,"Lon":-73.75028,"Address":"490 Fairview Ave"},
    "2928":{"Name":"Far East El Paso","City":"El Paso","State":"TX","Zip":"79938","Lat":31.8051,"Lon":-106.26516,"Address":"12100 Montana Ave"},
    "2929":{"Name":"Murphy","City":"Murphy","State":"TX","Zip":"75094","Lat":33.01324,"Lon":-96.61026,"Address":"111 East Fm 544"},
    "2930":{"Name":"Tiffin","City":"Tiffin","State":"OH","Zip":"44883","Lat":41.10831,"Lon":-83.21712,"Address":"1025 West Market St"},
    "2933":{"Name":"Sw Sarasota","City":"Sarasota","State":"FL","Zip":"34238","Lat":27.22473,"Lon":-82.48824,"Address":"4020 Central Sarasota Pkwy"},
    "2938":{"Name":"Lisbon","City":"Lisbon","State":"CT","Zip":"06351","Lat":41.58667,"Lon":-71.99589,"Address":"155 River Rd"},
    "2939":{"Name":"Salem","City":"Salem","State":"VA","Zip":"24153","Lat":37.28864,"Lon":-80.0725,"Address":"840 West Main St"},
    "2940":{"Name":"W. Eugene","City":"Eugene","State":"OR","Zip":"97402","Lat":44.04959,"Lon":-123.1462,"Address":"3595 West 11th Ave"},
    "2942":{"Name":"Elkhart","City":"Elkhart","State":"IN","Zip":"46514","Lat":41.72525,"Lon":-85.97826,"Address":"110 County Rd 6 W"},
    "2943":{"Name":"East Kansas City","City":"Kansas City","State":"MO","Zip":"64133","Lat":39.04516,"Lon":-94.44626,"Address":"4201 Sterling Ave"},
    "2944":{"Name":"Marysville","City":"Marysville","State":"OH","Zip":"43040","Lat":40.23787,"Lon":-83.33975,"Address":"15775 U.S. 36E"},
    "2945":{"Name":"Shepherdsville","City":"Shepherdsville","State":"KY","Zip":"40165","Lat":38.00336,"Lon":-85.70413,"Address":"800 Conestoga Pkwy"},
    "2948":{"Name":"N.W. Charleston","City":"Summerville","State":"SC","Zip":"29485","Lat":32.9379,"Lon":-80.14362,"Address":"9600 Dorchester Rd"},
    "2954":{"Name":"Lacamas Lake","City":"Vancouver","State":"WA","Zip":"98683","Lat":45.615,"Lon":-122.48004,"Address":"18801 SE Mill Plain Blvd"},
    "2955":{"Name":"N.E. Anchorage","City":"Anchorage","State":"AK","Zip":"99504","Lat":61.22911,"Lon":-149.74577,"Address":"1200 North Muldoon"},
    "2956":{"Name":"Moses Lake","City":"Moses Lake","State":"WA","Zip":"98837","Lat":47.10553,"Lon":-119.25551,"Address":"1400 East Yonezawa Blvd"},
    "2961":{"Name":"Kyle","City":"Kyle","State":"TX","Zip":"78640","Lat":30.01418,"Lon":-97.85734,"Address":"5753 Kyle Pkwy"},
    "2962":{"Name":"Odessa","City":"Odessa","State":"TX","Zip":"79762","Lat":31.89774,"Lon":-102.33939,"Address":"4101 East 42nd St, Ste P"},
    "2965":{"Name":"Pineville","City":"Pineville","State":"LA","Zip":"71360","Lat":31.35918,"Lon":-92.41365,"Address":"3200 Monroe Highway"},
    "2967":{"Name":"S.E. Lexington County","City":"Lexington","State":"SC","Zip":"29073","Lat":33.90865,"Lon":-81.22939,"Address":"5570 Platt Springs Rd"},
    "2968":{"Name":"Carrollton","City":"Carrollton","State":"GA","Zip":"30117","Lat":33.54509,"Lon":-85.07658,"Address":"1665 Highway 27 South"},
    "2969":{"Name":"Loganville","City":"Loganville","State":"GA","Zip":"30052","Lat":33.84887,"Lon":-83.91113,"Address":"4022 Atlanta Highway"},
    "2970":{"Name":"Middleburg","City":"Middleburg","State":"FL","Zip":"32068","Lat":30.10971,"Lon":-81.82463,"Address":"1700 Blanding Blvd"},
    "2974":{"Name":"Abingdon","City":"Abingdon","State":"VA","Zip":"24211","Lat":36.71101,"Lon":-81.93202,"Address":"24500 Falcon Place Blvd"},
    "2975":{"Name":"Marrero","City":"Marrero","State":"LA","Zip":"70072","Lat":29.88112,"Lon":-90.09645,"Address":"4950 Promenade Blvd"},
    "2978":{"Name":"Wapakoneta","City":"Wapakoneta","State":"OH","Zip":"45895","Lat":40.56563,"Lon":-84.17546,"Address":"1340 Bellefontaine St"},
    "2980":{"Name":"Weslaco","City":"Weslaco","State":"TX","Zip":"78596","Lat":26.17483,"Lon":-97.98199,"Address":"1015 East Expy 83"},
    "2981":{"Name":"S.W. Concord","City":"Concord","State":"NC","Zip":"28027","Lat":35.3758,"Lon":-80.72814,"Address":"8670 Concord Mills Blvd"},
    "2982":{"Name":"N.E. New Hanover County","City":"Wilmington","State":"NC","Zip":"28411","Lat":34.3023,"Lon":-77.78908,"Address":"191 Porters Neck Rd"},
    "2984":{"Name":"Alachua","City":"Alachua","State":"FL","Zip":"32615","Lat":29.80142,"Lon":-82.50015,"Address":"15910 NW 144 Terrace"},
    "2991":{"Name":"Hannibal","City":"Hannibal","State":"MO","Zip":"63401","Lat":39.72143,"Lon":-91.39932,"Address":"3651 Stardust Dr"},
    "2993":{"Name":"Jonesborough","City":"Jonesborough","State":"TN","Zip":"37659","Lat":36.30285,"Lon":-82.45134,"Address":"1498 E. Jackson Blvd"},
    "2995":{"Name":"Towson","City":"Parkville","State":"MD","Zip":"21234","Lat":39.38375,"Lon":-76.56837,"Address":"1400 Taylor Ave"},
    "2996":{"Name":"Mayodan","City":"Mayodan","State":"NC","Zip":"27027","Lat":36.41353,"Lon":-79.93966,"Address":"6844 NC Highway 135"},
    "3000":{"Name":"Tempe","City":"Tempe","State":"AZ","Zip":"85283","Lat":33.37705,"Lon":-111.93091,"Address":"777 East Baseline Rd"},
    "3002":{"Name":"Marble Falls","City":"Marble Falls","State":"TX","Zip":"78654","Lat":30.60436,"Lon":-98.26875,"Address":"3200 Highway 281"},
    "3003":{"Name":"S. Clarksville","City":"Clarksville","State":"TN","Zip":"37043","Lat":36.51285,"Lon":-87.31859,"Address":"1622 Madison St"},
    "3006":{"Name":"Hartselle","City":"Hartselle","State":"AL","Zip":"35640","Lat":34.46248,"Lon":-86.95148,"Address":"1807 Highway 31 NW"},
    "3015":{"Name":"Abbeville","City":"Abbeville","State":"LA","Zip":"70510","Lat":29.97045,"Lon":-92.10296,"Address":"2700 Charity St"},
    "3022":{"Name":"Tarboro","City":"Tarboro","State":"NC","Zip":"27886","Lat":35.88178,"Lon":-77.54681,"Address":"111 River Oaks Dr"},
    "3026":{"Name":"N. Richland County","City":"Columbia","State":"SC","Zip":"29229","Lat":34.14015,"Lon":-80.94157,"Address":"1051 Sams Crossing Dr"},
    "3027":{"Name":"Missouri City","City":"Missouri City","State":"TX","Zip":"77459","Lat":29.56644,"Lon":-95.56213,"Address":"3807 Fm 1092"},
    "3028":{"Name":"Granite City","City":"Granite City","State":"IL","Zip":"62040","Lat":38.73749,"Lon":-90.13842,"Address":"1333 Schaefer Rd"},
    "3032":{"Name":"College Station","City":"College Station","State":"TX","Zip":"77845","Lat":30.56215,"Lon":-96.25745,"Address":"4451 Highway 6 South"},
    "3033":{"Name":"Petal","City":"Petal","State":"MS","Zip":"39465","Lat":31.35351,"Lon":-89.23757,"Address":"40 Tyner Rd"},
    "3034":{"Name":"Sparks","City":"Sparks","State":"NV","Zip":"89434","Lat":39.53043,"Lon":-119.71808,"Address":"1355 Scheels Dr"},
    "3039":{"Name":"Graysville","City":"Graysville","State":"AL","Zip":"35073","Lat":33.61387,"Lon":-86.9703,"Address":"1100 Bankhead Highway"},
    "3040":{"Name":"N. Lancaster County","City":"Indian Land","State":"SC","Zip":"29707","Lat":34.99983,"Lon":-80.85833,"Address":"181 Fort Mill Highway"},
    "3041":{"Name":"New Albany","City":"New Albany","State":"MS","Zip":"38652","Lat":34.4901,"Lon":-89.02872,"Address":"500 Park Plaza Dr"},
    "3045":{"Name":"North Spokane Lowes","City":"Spokane","State":"WA","Zip":"99208","Lat":47.72075,"Lon":-117.40989,"Address":"6606 N Division St"},
    "3048":{"Name":"Los Lunas","City":"Los Lunas","State":"NM","Zip":"87031","Lat":34.81575,"Lon":-106.75241,"Address":"1600 Main St NW"},
    "3050":{"Name":"S. Anderson","City":"Anderson","State":"SC","Zip":"29626","Lat":34.48337,"Lon":-82.66343,"Address":"408 Highway 28 By-pass"},
    "3051":{"Name":"Mccandless Township","City":"Pittsburgh","State":"PA","Zip":"15237","Lat":40.57057,"Lon":-80.02504,"Address":"9051 St. Simon Way"},
    "3057":{"Name":"Albany","City":"Albany","State":"OR","Zip":"97322","Lat":44.63265,"Lon":-123.08779,"Address":"1300 9th Ave Se"},
    "3071":{"Name":"Clemson","City":"Central","State":"SC","Zip":"29630","Lat":34.69066,"Lon":-82.78718,"Address":"608 Issaqueena Trail"},
    "3088":{"Name":"Moberly","City":"Moberly","State":"MO","Zip":"65270","Lat":39.44337,"Lon":-92.42015,"Address":"1800 East Outer Rd"},
    "3095":{"Name":"San Francisco","City":"San Francisco","State":"CA","Zip":"94124","Lat":37.74023,"Lon":-122.40618,"Address":"491 Bayshore Blvd"},
    "3151":{"Name":"Covina","City":"Covina","State":"CA","Zip":"91722","Lat":34.10367,"Lon":-117.90438,"Address":"1348 North Azusa Ave"},
    "3159":{"Name":"Commack","City":"Commack","State":"NY","Zip":"11725","Lat":40.80723,"Lon":-73.29183,"Address":"100 Long Island Expressway "},
    "3164":{"Name":"Fairfield","City":"Fairfield","State":"CA","Zip":"94533","Lat":38.2921,"Lon":-122.03171,"Address":"3400 North Texas St"},
    "3166":{"Name":"Destin","City":"Destin","State":"FL","Zip":"32541","Lat":30.39159,"Lon":-86.4197,"Address":"4405 Legendary Dr"},
    "3167":{"Name":"Carlsbad","City":"Carlsbad","State":"NM","Zip":"88220","Lat":32.44281,"Lon":-104.26224,"Address":"2519 West Pierce St"},
    "3168":{"Name":"Bear","City":"Bear","State":"DE","Zip":"19701","Lat":39.63774,"Lon":-75.65789,"Address":"1030 E Songsmith Dr"},
    "3169":{"Name":"Havertown","City":"Havertown","State":"PA","Zip":"19083","Lat":39.9674,"Lon":-75.29968,"Address":"116 West Township Line Rd."},
    "3202":{"Name":"Hobbs","City":"Hobbs","State":"NM","Zip":"88240","Lat":32.74181,"Lon":-103.15457,"Address":"1510 West Joe Harvey Blvd"},
    "3206":{"Name":"Silverthorne","City":"Silverthorne","State":"CO","Zip":"80498","Lat":39.62528,"Lon":-106.07416,"Address":"201 Buffalo Mountain Dr"},
    "3214":{"Name":"Poway","City":"Poway","State":"CA","Zip":"92064","Lat":32.95691,"Lon":-117.03214,"Address":"13750 Poway Road"},
    "3216":{"Name":"Kill Devil Hills","City":"Kill Devil Hills","State":"NC","Zip":"27948","Lat":36.02661,"Lon":-75.67033,"Address":"1500 North Croatan Highway"},
    "3240":{"Name":"Yakima","City":"Yakima","State":"WA","Zip":"98903","Lat":46.55754,"Lon":-120.55645,"Address":"2235 Longfibre Ave"},
    "3248":{"Name":"Norwalk","City":"Norwalk","State":"CT","Zip":"06850","Lat":41.10756,"Lon":-73.42599,"Address":"100 Connecticut Ave"},
    "3256":{"Name":"Washington","City":"Washington","State":"DC","Zip":"20018","Lat":38.92049,"Lon":-76.95324,"Address":"2438 Market Street NE"},
    "3274":{"Name":"Fairfax","City":"Fairfax","State":"VA","Zip":"22030","Lat":38.85267,"Lon":-77.33424,"Address":"4080 Jermantown Rd"},
    "3278":{"Name":"Gainesville","City":"Gainesville","State":"FL","Zip":"32608","Lat":29.62588,"Lon":-82.38546,"Address":"3101 Clark Butler Blvd"},
    "3284":{"Name":"Wicker Park","City":"Chicago","State":"IL","Zip":"60622","Lat":41.90626,"Lon":-87.66827,"Address":"1360 North Ashland Ave"},
    "3292":{"Name":"Upper West Side","City":"New York","State":"NY","Zip":"10023","Lat":40.77572,"Lon":-73.98181,"Address":"2008 Broadway"},
    "3293":{"Name":"Chelsea","City":"New York","State":"NY","Zip":"10011","Lat":40.74076,"Lon":-73.99486,"Address":"635-641 Avenue Of The Americas"},
    "3456":{"Name":"Bristol","City":"Bristol","State":"VA","Zip":"24201","Lat":36.63018,"Lon":-82.15407,"Address":"401 Cabela Drive"},
    "3501":{"Name":"Wall Township","City":"Wall Township","State":"NJ","Zip":"07719","Lat":40.15569,"Lon":-74.05645,"Address":"1933 Route 35 South, Suite 125"},
    "3608":{"Name":"Sanford","City":"Sanford","State":"NC","Zip":"27332","Lat":35.45283,"Lon":-79.13479,"Address":"3015 S. Horner Blvd"},
    "0003":{"Name":"S.E. Columbus","City":"Columbus","State":"OH","Zip":"43232","Lat":39.92078,"Lon":-82.83028,"Address":"2888 Brice Rd"},
    "0004":{"Name":"Rainier","City":"Seattle","State":"WA","Zip":"98144","Lat":47.57956,"Lon":-122.29819,"Address":"2700 Rainier Ave South"},
    "0005":{"Name":"Shawnee","City":"Shawnee","State":"OK","Zip":"74804","Lat":35.38177,"Lon":-96.9279,"Address":"4817 North Kickapoo St"},
    "0008":{"Name":"Columbia","City":"Columbia","State":"MO","Zip":"65201","Lat":38.95294,"Lon":-92.29614,"Address":"201 Conley Rd North"},
    "0009":{"Name":"Bellefontaine","City":"Bellefontaine","State":"OH","Zip":"43311","Lat":40.33008,"Lon":-83.76352,"Address":"2168 U.S. 68 South"},
    "0010":{"Name":"Tukwila","City":"Tukwila","State":"WA","Zip":"98188","Lat":47.46053,"Lon":-122.25099,"Address":"101 Andover Park East"},
    "0012":{"Name":"Lafayette","City":"Lafayette","State":"IN","Zip":"47905","Lat":40.4188,"Lon":-86.84102,"Address":"100 North Creasy Ln"},
    "0015":{"Name":"Layton","City":"Layton","State":"UT","Zip":"84041","Lat":41.08815,"Lon":-111.9851,"Address":"1055 W. Antelope Dr"},
    "0016":{"Name":"Madisonville","City":"Madisonville","State":"KY","Zip":"42431","Lat":37.35071,"Lon":-87.48827,"Address":"550 Island Ford Rd"},
    "0018":{"Name":"Coeur D'alene","City":"Coeur D Alene","State":"ID","Zip":"83814","Lat":47.7021,"Lon":-116.80102,"Address":"901 Appleway Ave"},
    "0019":{"Name":"Fremont","City":"Fremont","State":"OH","Zip":"43420","Lat":41.37201,"Lon":-83.1196,"Address":"1952 North State, Route 53"},
    "0021":{"Name":"Kahului","City":"Kahului","State":"HI","Zip":"96732","Lat":20.88121,"Lon":-156.45398,"Address":"270 Dairy Road, Building A"},
    "0022":{"Name":"Lebanon","City":"Lebanon","State":"PA","Zip":"17042","Lat":40.31077,"Lon":-76.42626,"Address":"1755 Quentin Rd"},
    "0026":{"Name":"Tacoma","City":"Tacoma","State":"WA","Zip":"98466","Lat":47.23653,"Lon":-122.50331,"Address":"2701 South Orchard St"},
    "0028":{"Name":"Texas City","City":"Texas City","State":"TX","Zip":"77590","Lat":29.39734,"Lon":-94.953,"Address":"3620 Emmett F. Lowry Expway"},
    "0031":{"Name":"Hendersonville","City":"Hendersonville","State":"NC","Zip":"28792","Lat":35.33054,"Lon":-82.45061,"Address":"1415 7th Avenue, East"},
    "0033":{"Name":"Newnan","City":"Newnan","State":"GA","Zip":"30265","Lat":33.39372,"Lon":-84.74736,"Address":"955 Bullsboro Dr"},
    "0035":{"Name":"Mount Vernon","City":"Mount Vernon","State":"WA","Zip":"98273","Lat":48.437,"Lon":-122.34455,"Address":"1717 Freeway Dr"},
    "0037":{"Name":"W. Columbus","City":"Hilliard","State":"OH","Zip":"43026","Lat":40.02797,"Lon":-83.11888,"Address":"3600 Park Mill Run Dr"},
    "0040":{"Name":"Bellevue","City":"Bellevue","State":"WA","Zip":"98005","Lat":47.6309,"Lon":-122.18141,"Address":"11959 Northup Way"},
    "0042":{"Name":"Dayton-trotwood","City":"Trotwood","State":"OH","Zip":"45426","Lat":39.81987,"Lon":-84.28783,"Address":"5252 Salem Ave"},
    "0044":{"Name":"Steubenville","City":"Steubenville","State":"OH","Zip":"43952","Lat":40.37209,"Lon":-80.67172,"Address":"4115 Mall Dr"},
    "0046":{"Name":"Benton Harbor","City":"Benton Harbor","State":"MI","Zip":"49022","Lat":42.07996,"Lon":-86.42613,"Address":"1300 Mall Dr"},
    "0052":{"Name":"Danville","City":"Danville","State":"IL","Zip":"61832","Lat":40.1885,"Lon":-87.63109,"Address":"3636 North Vermillion"},
    "0053":{"Name":"W. Fort Wayne","City":"Fort Wayne","State":"IN","Zip":"46804","Lat":41.07615,"Lon":-85.1997,"Address":"4430 Illinois Rd"},
    "0057":{"Name":"Burlington","City":"Burlington","State":"IA","Zip":"52601","Lat":40.81244,"Lon":-91.14933,"Address":"3435 Agency"},
    "0056":{"Name":"Norwalk","City":"Norwalk","State":"CA","Zip":"90650","Lat":33.89606,"Lon":-118.04822,"Address":"14873 Carmenita Rd"},
    "0059":{"Name":"De Kalb","City":"Dekalb","State":"IL","Zip":"60115","Lat":41.94887,"Lon":-88.7264,"Address":"2050 Sycamore Rd"},
    "0061":{"Name":"Smokey Point","City":"Arlington","State":"WA","Zip":"98223","Lat":48.1498,"Lon":-122.18634,"Address":"3300 169th Pl NE"},
    "0063":{"Name":"Midland","City":"Midland","State":"TX","Zip":"79707","Lat":32.01324,"Lon":-102.16039,"Address":"3315 North Loop 250 W."},
    "0066":{"Name":"Mt. Vernon","City":"Mount Vernon","State":"IL","Zip":"62864","Lat":38.31036,"Lon":-88.96147,"Address":"111 Davidson Ave"},
    "0069":{"Name":"Battle Creek","City":"Battle Creek","State":"MI","Zip":"49014","Lat":42.25941,"Lon":-85.17456,"Address":"6122 B Dr North"},
    "0071":{"Name":"Goshen","City":"Goshen","State":"IN","Zip":"46526","Lat":41.61774,"Lon":-85.89532,"Address":"2219 Rieth Blvd"},
    "0072":{"Name":"Ponca City","City":"Ponca City","State":"OK","Zip":"74601","Lat":36.74701,"Lon":-97.06884,"Address":"3500 North 14th St"},
    "0075":{"Name":"Wichita Falls","City":"Wichita Falls","State":"TX","Zip":"76308","Lat":33.88059,"Lon":-98.53767,"Address":"3301 Kell Blvd"},
    "0077":{"Name":"Sandusky","City":"Sandusky","State":"OH","Zip":"44870","Lat":41.40711,"Lon":-82.65975,"Address":"5500 Milan Rd - Space 304"},
    "0080":{"Name":"Champaign","City":"Champaign","State":"IL","Zip":"61822","Lat":40.13902,"Lon":-88.25545,"Address":"1904 North Prospect Ave"},
    "0082":{"Name":"Lufkin","City":"Lufkin","State":"TX","Zip":"75901","Lat":31.31395,"Lon":-94.71089,"Address":"3501 South Medford"},
    "0086":{"Name":"Virginia Beach","City":"Virginia Beach","State":"VA","Zip":"23452","Lat":36.81093,"Lon":-76.0968,"Address":"3565 Holland Rd"},
    "0088":{"Name":"Adrian","City":"Adrian","State":"MI","Zip":"49221","Lat":41.8761,"Lon":-84.03136,"Address":"1369 Division St"},
    "0089":{"Name":"Beavercreek","City":"Fairborn","State":"OH","Zip":"45324","Lat":39.77374,"Lon":-84.04784,"Address":"2850-I Centre Dr"},
    "0090":{"Name":"San Angelo","City":"San Angelo","State":"TX","Zip":"76904","Lat":31.42794,"Lon":-100.50741,"Address":"5301 Sherwood Way"},
    "0091":{"Name":"Corinth","City":"Corinth","State":"MS","Zip":"38834","Lat":34.9145,"Lon":-88.50734,"Address":"1800 South Pkwy"},
    "0092":{"Name":"Galesburg","City":"Galesburg","State":"IL","Zip":"61401","Lat":40.97671,"Lon":-90.37863,"Address":"531 West Carl Sandburg Dr"},
    "0095":{"Name":"Beaumont","City":"Beaumont","State":"TX","Zip":"77706","Lat":30.11904,"Lon":-94.16479,"Address":"4120 Dowlen Rd"},
    "0097":{"Name":"Baytown","City":"Baytown","State":"TX","Zip":"77521","Lat":29.77951,"Lon":-94.97615,"Address":"5002 Garth Rd"},
    "0098":{"Name":"Katy","City":"Houston","State":"TX","Zip":"77094","Lat":29.78331,"Lon":-95.71389,"Address":"19935 Katy Freeway"},
    "0102":{"Name":"Aurora","City":"Aurora","State":"CO","Zip":"80012","Lat":39.68447,"Lon":-104.86745,"Address":"1701 South Havana St"},
    "0103":{"Name":"Bryan","City":"Bryan","State":"TX","Zip":"77802","Lat":30.65839,"Lon":-96.32671,"Address":"3225 Freedom Blvd"},
    "0104":{"Name":"Moline","City":"Moline","State":"IL","Zip":"61265","Lat":41.46927,"Lon":-90.48349,"Address":"3820 44th Ave Dr"},
    "0107":{"Name":"Davenport","City":"Davenport","State":"IA","Zip":"52807","Lat":41.56149,"Lon":-90.52481,"Address":"3955 Elmore Ave"},
    "0110":{"Name":"St. Clairsville","City":"Saint Clairsville","State":"OH","Zip":"43950","Lat":40.07239,"Lon":-80.87832,"Address":"50421 Valley Plaza Dr"},
    "0113":{"Name":"Midlothian","City":"Richmond","State":"VA","Zip":"23235","Lat":37.51451,"Lon":-77.60899,"Address":"1512 West Koger Center Dr"},
    "0116":{"Name":"Muncie","City":"Muncie","State":"IN","Zip":"47304","Lat":40.21736,"Lon":-85.4383,"Address":"4401 West Clara Ln"},
    "0117":{"Name":"Dubuque","City":"Dubuque","State":"IA","Zip":"52003","Lat":42.48813,"Lon":-90.7326,"Address":"4100 Dodge St"},
    "0118":{"Name":"Kankakee","City":"Bradley","State":"IL","Zip":"60915","Lat":41.15932,"Lon":-87.84778,"Address":"860 Kinzie Ave"},
    "0119":{"Name":"Waipahu","City":"Waipahu","State":"HI","Zip":"96797","Lat":21.39883,"Lon":-158.00842,"Address":"94-805 Lumiaina St"},
    "0120":{"Name":"Belle Vernon","City":"Belle Vernon","State":"PA","Zip":"15012","Lat":40.13749,"Lon":-79.84906,"Address":"203 Sarah Way"},
    "0124":{"Name":"Muskogee","City":"Muskogee","State":"OK","Zip":"74403","Lat":35.76808,"Lon":-95.3303,"Address":"2901 Old Shawnee"},
    "0127":{"Name":"Sherman","City":"Sherman","State":"TX","Zip":"75090","Lat":33.6682,"Lon":-96.60753,"Address":"2801 U.S. Highway 75 North"},
    "0126":{"Name":"E. Fort Wayne","City":"Fort Wayne","State":"IN","Zip":"46805","Lat":41.09555,"Lon":-85.09023,"Address":"1929 North Coliseum Blvd"},
    "0129":{"Name":"Waco","City":"Waco","State":"TX","Zip":"76710","Lat":31.52464,"Lon":-97.16899,"Address":"201 North New Rd"},
    "0137":{"Name":"Lake Jackson","City":"Lake Jackson","State":"TX","Zip":"77566","Lat":29.04195,"Lon":-95.45617,"Address":"200 Highway 332 East"},
    "0138":{"Name":"Abilene","City":"Abilene","State":"TX","Zip":"79606","Lat":32.402,"Lon":-99.76624,"Address":"4134 Ridgemont Dr"},
    "0139":{"Name":"Hermitage","City":"Hermitage","State":"PA","Zip":"16148","Lat":41.23007,"Lon":-80.45198,"Address":"3000 Glimcher Blvd"},
    "0140":{"Name":"Issaquah","City":"Issaquah","State":"WA","Zip":"98027","Lat":47.54938,"Lon":-122.05601,"Address":"1625 11th Ave N.W."},
    "0145":{"Name":"N.W. Indianapolis","City":"Indianapolis","State":"IN","Zip":"46268","Lat":39.90861,"Lon":-86.22287,"Address":"8440 Michigan Rd"},
    "0146":{"Name":"Jackson","City":"Jackson","State":"MI","Zip":"49202","Lat":42.2681,"Lon":-84.43625,"Address":"1535 Boardman Rd"},
    "0149":{"Name":"Everett","City":"Everett","State":"WA","Zip":"98201","Lat":47.97756,"Lon":-122.19731,"Address":"2505 Pacific Ave"},
    "0152":{"Name":"Wenatchee","City":"Wenatchee","State":"WA","Zip":"98801","Lat":47.44053,"Lon":-120.31979,"Address":"1200 Walla Walla Ave"},
    "0159":{"Name":"San Marcos","City":"San Marcos","State":"TX","Zip":"78666","Lat":29.85446,"Lon":-97.95194,"Address":"2211 South Interstate 35"},
    "0165":{"Name":"Butler","City":"Butler","State":"PA","Zip":"16001","Lat":40.8716,"Lon":-79.94974,"Address":"500 Moraine Point Plaza"},
    "0167":{"Name":"Peoria","City":"Peoria","State":"IL","Zip":"61615","Lat":40.74825,"Lon":-89.63831,"Address":"5001 North Big Hollow Rd"},
    "0168":{"Name":"Hamilton","City":"Hamilton","State":"OH","Zip":"45013","Lat":39.42433,"Lon":-84.5988,"Address":"1495 Main St"},
    "0172":{"Name":"Spokane Valley","City":"Spokane","State":"WA","Zip":"99212","Lat":47.65629,"Lon":-117.33467,"Address":"E. 5204 Sprague Ave"},
    "0174":{"Name":"Texarkana","City":"Texarkana","State":"TX","Zip":"75501","Lat":33.44778,"Lon":-94.10049,"Address":"501 Walton Dr"},
    "0175":{"Name":"Johnstown","City":"Johnstown","State":"PA","Zip":"15904","Lat":40.30672,"Lon":-78.83053,"Address":"630 Solomon Run Rd"},
    "0177":{"Name":"Statesboro","City":"Statesboro","State":"GA","Zip":"30461","Lat":32.43114,"Lon":-81.75506,"Address":"24065 Hwy 80 East"},
    "0178":{"Name":"Orem","City":"Orem","State":"UT","Zip":"84058","Lat":40.2743,"Lon":-111.69876,"Address":"140 West University Pkwy"},
    "0179":{"Name":"Lake City","City":"Lake City","State":"FL","Zip":"32055","Lat":30.18315,"Lon":-82.67419,"Address":"3463 N.W. Bascom Norris Dr"},
    "0180":{"Name":"Greensburg","City":"Greensburg","State":"PA","Zip":"15601","Lat":40.30408,"Lon":-79.59745,"Address":"Hempfield Square, Rt. 30 W."},
    "0181":{"Name":"S.W. Columbus","City":"Columbus","State":"OH","Zip":"43228","Lat":39.91846,"Lon":-83.11883,"Address":"1675 Georgesville Square Dr"},
    "0183":{"Name":"Denton","City":"Denton","State":"TX","Zip":"76205","Lat":33.19685,"Lon":-97.09014,"Address":"1255 South Loop 288"},
    "0186":{"Name":"S. Baton Rouge","City":"Baton Rouge","State":"LA","Zip":"70809","Lat":30.37615,"Lon":-91.06568,"Address":"10303 South Mall Dr"},
    "0187":{"Name":"Uniontown","City":"Uniontown","State":"PA","Zip":"15401","Lat":39.90488,"Lon":-79.75076,"Address":"79 Matthew Dr"},
    "0188":{"Name":"Boardman","City":"Youngstown","State":"OH","Zip":"44514","Lat":41.03126,"Lon":-80.63325,"Address":"1100 Doral Dr"},
    "0191":{"Name":"Rockford","City":"Rockford","State":"IL","Zip":"61108","Lat":42.2707,"Lon":-88.97798,"Address":"7130 East State Rd"},
    "0190":{"Name":"Cartersville","City":"Cartersville","State":"GA","Zip":"30120","Lat":34.20013,"Lon":-84.78945,"Address":"301 Marketplace Blvd"},
    "0195":{"Name":"Michigan City","City":"Michigan City","State":"IN","Zip":"46360","Lat":41.67272,"Lon":-86.89058,"Address":"5200 Franklin St"},
    "0197":{"Name":"Indiana","City":"Indiana","State":"PA","Zip":"15701","Lat":40.61472,"Lon":-79.18981,"Address":"475 Ben Franklin Rd South"},
    "0199":{"Name":"Muskegon","City":"Muskegon","State":"MI","Zip":"49444","Lat":43.20279,"Lon":-86.19444,"Address":"2035 East Sherman Blvd"},
    "0200":{"Name":"Mishawaka","City":"Mishawaka","State":"IN","Zip":"46545","Lat":41.70277,"Lon":-86.18508,"Address":"4660 North Grape Rd"},
    "0202":{"Name":"Vestal","City":"Vestal","State":"NY","Zip":"13850","Lat":42.09856,"Lon":-76.00473,"Address":"225 Sycamore Rd"},
    "0203":{"Name":"Dayton Mall","City":"West Carrollton","State":"OH","Zip":"45449","Lat":39.64094,"Lon":-84.22258,"Address":"2900 Martin's Dr"},
    "0205":{"Name":"Enid","City":"Enid","State":"OK","Zip":"73703","Lat":36.38926,"Lon":-97.94232,"Address":"5201 West Garriott"},
    "0207":{"Name":"Wilmington Pike","City":"Centerville","State":"OH","Zip":"45459","Lat":39.64485,"Lon":-84.10835,"Address":"6300 Wilmington Pike"},
    "0208":{"Name":"La Quinta","City":"La Quinta","State":"CA","Zip":"92253","Lat":33.71028,"Lon":-116.29162,"Address":"78-865 Highway 111"},
    "0209":{"Name":"Killeen","City":"Killeen","State":"TX","Zip":"76542","Lat":31.08763,"Lon":-97.72187,"Address":"2801 South W.S. Young Dr"},
    "0210":{"Name":"Zanesville","City":"Zanesville","State":"OH","Zip":"43701","Lat":39.99132,"Lon":-82.02854,"Address":"3755 Frazeysburg Rd"},
    "0211":{"Name":"Marion","City":"Marion","State":"IN","Zip":"46953","Lat":40.53524,"Lon":-85.67627,"Address":"2842 South Western Ave"},
    "0212":{"Name":"Mobile","City":"Mobile","State":"AL","Zip":"36606","Lat":30.68158,"Lon":-88.1256,"Address":"151 East I-65 Service Rd South"},
    "0215":{"Name":"Terre Haute","City":"Terre Haute","State":"IN","Zip":"47802","Lat":39.40805,"Lon":-87.41234,"Address":"4701 South U.S. Highway 41"},
    "0220":{"Name":"Louisville","City":"Louisville","State":"CO","Zip":"80027","Lat":39.9634,"Lon":-105.16654,"Address":"1171 Dillon Rd"},
    "0221":{"Name":"Temple","City":"Temple","State":"TX","Zip":"76502","Lat":31.07011,"Lon":-97.36174,"Address":"605 SW H.K. Dodgen Loop"},
    "0222":{"Name":"Canton","City":"North Canton","State":"OH","Zip":"44720","Lat":40.8735,"Lon":-81.43465,"Address":"6375 Strip Avenue, N.W."},
    "0223":{"Name":"Gaithersburg","City":"Gaithersburg","State":"MD","Zip":"20878","Lat":39.12496,"Lon":-77.2358,"Address":"40 Market St"},
    "0224":{"Name":"Elyria","City":"Elyria","State":"OH","Zip":"44035","Lat":41.39762,"Lon":-82.11832,"Address":"646 Midway Blvd"},
    "0226":{"Name":"Erie","City":"Erie","State":"PA","Zip":"16509","Lat":42.05754,"Lon":-80.08597,"Address":"1930 Keystone Dr Suite 2"},
    "0231":{"Name":"Defiance","City":"Defiance","State":"OH","Zip":"43512","Lat":41.30657,"Lon":-84.35741,"Address":"1831 North Clinton St"},
    "0232":{"Name":"Conroe","City":"Conroe","State":"TX","Zip":"77304","Lat":30.32748,"Lon":-95.48026,"Address":"1920 Westview Blvd"},
    "0235":{"Name":"Russellville","City":"Russellville","State":"AR","Zip":"72802","Lat":35.28334,"Lon":-93.09671,"Address":"3011 Pkwy East"},
    "0236":{"Name":"Conway","City":"Conway","State":"AR","Zip":"72032","Lat":35.10948,"Lon":-92.44316,"Address":"1325 Highway 64 West"},
    "0240":{"Name":"Vero Beach","City":"Vero Beach","State":"FL","Zip":"32966","Lat":27.64082,"Lon":-80.45174,"Address":"6110 20th St"},
    "0241":{"Name":"Stillwater","City":"Stillwater","State":"OK","Zip":"74075","Lat":36.139,"Lon":-97.05312,"Address":"1616 North Perkins Rd"},
    "0242":{"Name":"Scranton","City":"Dickson City","State":"PA","Zip":"18519","Lat":41.45345,"Lon":-75.64276,"Address":"901 Viewmont Dr"},
    "0243":{"Name":"S. Tulsa","City":"Tulsa","State":"OK","Zip":"74133","Lat":36.05908,"Lon":-95.86283,"Address":"10156 East 71st Street, South"},
    "0244":{"Name":"Trumbull County","City":"Warren","State":"OH","Zip":"44484","Lat":41.22807,"Lon":-80.74239,"Address":"940 Niles Cortland Rd"},
    "0246":{"Name":"Northglenn","City":"Northglenn","State":"CO","Zip":"80234","Lat":39.88938,"Lon":-104.9893,"Address":"261 West 104th Ave"},
    "0245":{"Name":"Decatur","City":"Forsyth","State":"IL","Zip":"62535","Lat":39.92113,"Lon":-88.95273,"Address":"990 Hickory Pt Plaza"},
    "0247":{"Name":"N. Richmond","City":"Richmond","State":"VA","Zip":"23227","Lat":37.63317,"Lon":-77.45381,"Address":"8001 Brook Rd"},
    "0248":{"Name":"Medford","City":"Medford","State":"OR","Zip":"97504","Lat":42.36506,"Lon":-122.85885,"Address":"3601 Crater Lake Highway"},
    "0249":{"Name":"Kennewick","City":"Kennewick","State":"WA","Zip":"99336","Lat":46.2198,"Lon":-119.22192,"Address":"N. 1020 Colorado St"},
    "0250":{"Name":"Torrance","City":"Torrance","State":"CA","Zip":"90501","Lat":33.82578,"Lon":-118.31028,"Address":"22255 Western Ave"},
    "0252":{"Name":"N. Seattle","City":"Seattle","State":"WA","Zip":"98133","Lat":47.7208,"Lon":-122.3468,"Address":"12525 Aurora Ave North"},
    "0255":{"Name":"Lima","City":"Lima","State":"OH","Zip":"45807","Lat":40.77268,"Lon":-84.16677,"Address":"2411 North Eastown Rd"},
    "0258":{"Name":"Springfield","City":"Springfield","State":"IL","Zip":"62704","Lat":39.76252,"Lon":-89.714,"Address":"3101 West Wabash"},
    "0265":{"Name":"N.E. Columbus","City":"Columbus","State":"OH","Zip":"43219","Lat":40.05513,"Lon":-82.92131,"Address":"4141 Morse Crossing"},
    "0264":{"Name":"Ontario","City":"Mansfield","State":"OH","Zip":"44906","Lat":40.77813,"Lon":-82.58868,"Address":"940 N Lexington Spring Mill Rd"},
    "0268":{"Name":"S. Oklahoma City","City":"Oklahoma City","State":"OK","Zip":"73139","Lat":35.3895,"Lon":-97.5139,"Address":"100 SW 74th St"},
    "0269":{"Name":"New Philadelphia","City":"New Philadelphia","State":"OH","Zip":"44663","Lat":40.47613,"Lon":-81.4389,"Address":"495 Mill Rd"},
    "0270":{"Name":"Amarillo","City":"Amarillo","State":"TX","Zip":"79119","Lat":35.15734,"Lon":-101.92307,"Address":"5000 South Coulter St"},
    "0271":{"Name":"Lubbock","City":"Lubbock","State":"TX","Zip":"79424","Lat":33.54624,"Lon":-101.93842,"Address":"5022 West Loop 289"},
    "0272":{"Name":"E. Indianapolis","City":"Indianapolis","State":"IN","Zip":"46219","Lat":39.80278,"Lon":-86.01308,"Address":"8801 East 25th St"},
    "0275":{"Name":"W. Indianapolis","City":"Indianapolis","State":"IN","Zip":"46224","Lat":39.77756,"Lon":-86.2664,"Address":"975 Beachway Dr"},
    "0278":{"Name":"Joplin","City":"Joplin","State":"MO","Zip":"64804","Lat":37.06158,"Lon":-94.47992,"Address":"2600 Range Line Rd"},
    "0279":{"Name":"Reading","City":"Reading","State":"PA","Zip":"19605","Lat":40.37323,"Lon":-75.92833,"Address":"500 Madison Ave"},
    "0281":{"Name":"Enterprise","City":"Enterprise","State":"AL","Zip":"36330","Lat":31.33253,"Lon":-85.86089,"Address":"1301 Boll Weevil Cir"},
    "0282":{"Name":"Victoria","City":"Victoria","State":"TX","Zip":"77904","Lat":28.8738,"Lon":-96.99636,"Address":"8602 North Navarro St"},
    "0285":{"Name":"Lynnwood","City":"Lynnwood","State":"WA","Zip":"98036","Lat":47.81984,"Lon":-122.27639,"Address":"3100 196th S.W."},
    "0288":{"Name":"N.E. Indianapolis","City":"Indianapolis","State":"IN","Zip":"46250","Lat":39.90042,"Lon":-86.04771,"Address":"8002 North Shadeland Ave."},
    "0289":{"Name":"Anchorage","City":"Anchorage","State":"AK","Zip":"99503","Lat":61.18157,"Lon":-149.87883,"Address":"333 East Tudor Rd"},
    "0292":{"Name":"Hazleton","City":"West Hazleton","State":"PA","Zip":"18202","Lat":40.96587,"Lon":-76.00661,"Address":"200 Weis Ln"},
    "0297":{"Name":"Alliance","City":"Alliance","State":"OH","Zip":"44601","Lat":40.90315,"Lon":-81.15714,"Address":"2595 West State St"},
    "0298":{"Name":"Wilmington","City":"Wilmington","State":"OH","Zip":"45177","Lat":39.44988,"Lon":-83.80937,"Address":"1175 Rombach Ave"},
    "0303":{"Name":"Middletown","City":"Middletown","State":"OH","Zip":"45044","Lat":39.49044,"Lon":-84.33175,"Address":"3125 Towne Blvd"},
    "0305":{"Name":"St. Joseph","City":"Saint Joseph","State":"MO","Zip":"64506","Lat":39.80572,"Lon":-94.81258,"Address":"3901 N. Belt Highway"},
    "0311":{"Name":"Greenwood Village","City":"Greenwood Village","State":"CO","Zip":"80111","Lat":39.59745,"Lon":-104.88409,"Address":"9100 East Peakview Ave"},
    "0313":{"Name":"Cullman","City":"Cullman","State":"AL","Zip":"35055","Lat":34.15672,"Lon":-86.84018,"Address":"1717 Cherokee Avenue, Sw"},
    "0316":{"Name":"Chino Hills","City":"Chino Hills","State":"CA","Zip":"91709","Lat":34.01354,"Lon":-117.74095,"Address":"13251 Peyton Dr"},
    "0317":{"Name":"Cape Girardeau","City":"Cape Girardeau","State":"MO","Zip":"63701","Lat":37.2963,"Lon":-89.58301,"Address":"3440 Lowes Dr"},
    "0318":{"Name":"Pueblo","City":"Pueblo","State":"CO","Zip":"81008","Lat":38.30977,"Lon":-104.62344,"Address":"1225 Highway 50 West"},
    "0319":{"Name":"Billings","City":"Billings","State":"MT","Zip":"59102","Lat":45.75766,"Lon":-108.58221,"Address":"2717 King Ave West"},
    "0321":{"Name":"Reno","City":"Reno","State":"NV","Zip":"89511","Lat":39.4748,"Lon":-119.7946,"Address":"5075 Kietzke Ln"},
    "0330":{"Name":"Holland","City":"Holland","State":"MI","Zip":"49424","Lat":42.82034,"Lon":-86.09388,"Address":"12635 Felch St, Suite 10"},
    "0340":{"Name":"Arvada","City":"Arvada","State":"CO","Zip":"80002","Lat":39.79515,"Lon":-105.08072,"Address":"5405 Wadsworth Bypass"},
    "0342":{"Name":"Murray","City":"Murray","State":"UT","Zip":"84123","Lat":40.67347,"Lon":-111.90462,"Address":"469 West 4500 South"},
    "0351":{"Name":"Bartlesville","City":"Bartlesville","State":"OK","Zip":"74006","Lat":36.74137,"Lon":-95.9518,"Address":"2205 SE Adams Blvd."},
    "0356":{"Name":"Montoursville","City":"Montoursville","State":"PA","Zip":"17754","Lat":41.25965,"Lon":-76.92079,"Address":"701 Loyalsock Ave"},
    "0358":{"Name":"Summerville","City":"Summerville","State":"SC","Zip":"29483","Lat":33.03318,"Lon":-80.15854,"Address":"1207 North Main St"},
    "0357":{"Name":"Kokomo","City":"Kokomo","State":"IN","Zip":"46902","Lat":40.43965,"Lon":-86.12894,"Address":"4005 South Lafountain"},
    "0377":{"Name":"Pineville","City":"Charlotte","State":"NC","Zip":"28226","Lat":35.09062,"Lon":-80.85619,"Address":"10625 Mcmullen Creek Pkwy"},
    "0381":{"Name":"W. Richmond","City":"Richmond","State":"VA","Zip":"23294","Lat":37.64134,"Lon":-77.5569,"Address":"9490 West Broad St"},
    "0385":{"Name":"Irmo","City":"Columbia","State":"SC","Zip":"29212","Lat":34.08076,"Lon":-81.15218,"Address":"390 Harbison Blvd"},
    "0387":{"Name":"N. Greensboro","City":"Greensboro","State":"NC","Zip":"27408","Lat":36.11511,"Lon":-79.83723,"Address":"3001 Battleground Ave"},
    "0388":{"Name":"Fayetteville","City":"Fayetteville","State":"NC","Zip":"28314","Lat":35.06642,"Lon":-78.96446,"Address":"1929 Skibo Square"},
    "0390":{"Name":"Hermitage","City":"Hermitage","State":"TN","Zip":"37076","Lat":36.19352,"Lon":-86.61958,"Address":"5025 Old Hickory Blvd."},
    "0397":{"Name":"N. Manassas","City":"Manassas","State":"VA","Zip":"20109","Lat":38.79265,"Lon":-77.5144,"Address":"7500 Broken Branch Ln"},
    "0402":{"Name":"Charles County","City":"Waldorf","State":"MD","Zip":"20601","Lat":38.64297,"Lon":-76.89625,"Address":"2525 Crain Hwy"},
    "0403":{"Name":"S. Savannah","City":"Savannah","State":"GA","Zip":"31419","Lat":31.9817,"Lon":-81.14131,"Address":"11114 Abercorn St"},
    "0404":{"Name":"S.W. Greensboro","City":"Greensboro","State":"NC","Zip":"27407","Lat":36.05371,"Lon":-79.88728,"Address":"1703 South Forty Dr"},
    "0408":{"Name":"N. Charlotte","City":"Charlotte","State":"NC","Zip":"28213","Lat":35.29234,"Lon":-80.74206,"Address":"1100 Chancellor Park Dr"},
    "0410":{"Name":"Myrtle Beach","City":"Myrtle Beach","State":"SC","Zip":"29577","Lat":33.71427,"Lon":-78.8926,"Address":"1160 Seaboard St"},
    "0411":{"Name":"Huntsville","City":"Huntsville","State":"AL","Zip":"35803","Lat":34.6427,"Lon":-86.56867,"Address":"10050 S. Memorial Pkwy"},
    "0413":{"Name":"Madison","City":"Madison","State":"TN","Zip":"37115","Lat":36.2791,"Lon":-86.71119,"Address":"10 Campbell Rd"},
    "0415":{"Name":"York","City":"York","State":"PA","Zip":"17402","Lat":39.97694,"Lon":-76.67754,"Address":"2449 East Market St"},
    "0414":{"Name":"Jonesboro","City":"Jonesboro","State":"AR","Zip":"72401","Lat":35.81903,"Lon":-90.67423,"Address":"2111 Fair Park Blvd"},
    "0416":{"Name":"Rock Hill","City":"Rock Hill","State":"SC","Zip":"29730","Lat":34.93907,"Lon":-80.96266,"Address":"1350 Springdale Rd"},
    "0417":{"Name":"N.E. Tallahassee","City":"Tallahassee","State":"FL","Zip":"32308","Lat":30.48124,"Lon":-84.23487,"Address":"2121 N.E. Capitol Cir"},
    "0419":{"Name":"Roanoke","City":"Roanoke","State":"VA","Zip":"24012","Lat":37.31627,"Lon":-79.96432,"Address":"5040 Rutgers Street, N.W."},
    "0420":{"Name":"Newport News","City":"Newport News","State":"VA","Zip":"23602","Lat":37.12402,"Lon":-76.51196,"Address":"300 Chatham Dr"},
    "0422":{"Name":"Springfield","City":"Springfield","State":"MO","Zip":"65804","Lat":37.14921,"Lon":-93.26136,"Address":"1850 East Primrose"},
    "0423":{"Name":"Tuscaloosa","City":"Tuscaloosa","State":"AL","Zip":"35405","Lat":33.1675,"Lon":-87.55398,"Address":"4900 Oscar Baxter Dr"},
    "0424":{"Name":"Salisbury","City":"Salisbury","State":"MD","Zip":"21801","Lat":38.41134,"Lon":-75.56927,"Address":"2606 N. Salisbury Blvd."},
    "0425":{"Name":"Chattanooga","City":"Chattanooga","State":"TN","Zip":"37421","Lat":35.03525,"Lon":-85.14988,"Address":"2180 Gunbarrel Rd"},
    "0426":{"Name":"Cary","City":"Cary","State":"NC","Zip":"27518","Lat":35.75739,"Lon":-78.74308,"Address":"2000 Walnut St"},
    "0428":{"Name":"Shreveport","City":"Shreveport","State":"LA","Zip":"71118","Lat":32.4101,"Lon":-93.80017,"Address":"2710 Alkay Dr"},
    "0432":{"Name":"Fayetteville","City":"Fayetteville","State":"AR","Zip":"72703","Lat":36.13014,"Lon":-94.14311,"Address":"1050 Zion Rd"},
    "0433":{"Name":"N.E. Columbia","City":"Columbia","State":"SC","Zip":"29223","Lat":34.07209,"Lon":-80.95193,"Address":"7441 Two Notch Rd"},
    "0434":{"Name":"Gainesville","City":"Gainesville","State":"GA","Zip":"30504","Lat":34.29058,"Lon":-83.84884,"Address":"1514 Skelton Rd"},
    "0435":{"Name":"Pikeville","City":"Pikeville","State":"KY","Zip":"41501","Lat":37.50345,"Lon":-82.53608,"Address":"183 Cassady Blvd"},
    "0436":{"Name":"West Winston","City":"Winston Salem","State":"NC","Zip":"27103","Lat":36.06359,"Lon":-80.31345,"Address":"935 Hanes Mall Blvd"},
    "0437":{"Name":"Lynchburg","City":"Lynchburg","State":"VA","Zip":"24502","Lat":37.3456,"Lon":-79.23232,"Address":"8216 Timberlake Rd"},
    "0439":{"Name":"Chesapeake","City":"Chesapeake","State":"VA","Zip":"23320","Lat":36.76308,"Lon":-76.25298,"Address":"1308 Battlefield Blvd, North"},
    "0438":{"Name":"Pensacola","City":"Pensacola","State":"FL","Zip":"32504","Lat":30.4801,"Lon":-87.21381,"Address":"1201 Airport Blvd"},
    "0440":{"Name":"Ocala","City":"Ocala","State":"FL","Zip":"34474","Lat":29.15102,"Lon":-82.18123,"Address":"3535 SW 36th Ave"},
    "0441":{"Name":"S. Montgomery","City":"Montgomery","State":"AL","Zip":"36117","Lat":32.35457,"Lon":-86.22015,"Address":"1950 Eastern Blvd"},
    "0442":{"Name":"S. Indianapolis","City":"Indianapolis","State":"IN","Zip":"46227","Lat":39.63698,"Lon":-86.11925,"Address":"8850 South Madison Ave"},
    "0444":{"Name":"N. Raleigh","City":"Raleigh","State":"NC","Zip":"27604","Lat":35.84596,"Lon":-78.58149,"Address":"4601 Capital Blvd"},
    "0445":{"Name":"University Centre","City":"Wilmington","State":"NC","Zip":"28403","Lat":34.2364,"Lon":-77.87883,"Address":"354 South College Rd"},
    "0446":{"Name":"Altoona","City":"Altoona","State":"PA","Zip":"16602","Lat":40.49538,"Lon":-78.38721,"Address":"1707 Mcmahon Rd"},
    "0447":{"Name":"Christiansburg","City":"Christiansburg","State":"VA","Zip":"24073","Lat":37.1634,"Lon":-80.41678,"Address":"350 Peppers Ferry Rd, NE"},
    "0448":{"Name":"Panama City","City":"Panama City","State":"FL","Zip":"32405","Lat":30.18813,"Lon":-85.65507,"Address":"300 East 23rd St"},
    "0449":{"Name":"Asheboro","City":"Asheboro","State":"NC","Zip":"27203","Lat":35.69338,"Lon":-79.79389,"Address":"1120 East Dixie Dr"},
    "0450":{"Name":"Monroe","City":"Monroe","State":"LA","Zip":"71202","Lat":32.49332,"Lon":-92.05941,"Address":"4750 Frontage Rd"},
    "0452":{"Name":"Bowie","City":"Bowie","State":"MD","Zip":"20716","Lat":38.94475,"Lon":-76.72081,"Address":"16301 Heritage Blvd"},
    "0451":{"Name":"Bowling Green","City":"Bowling Green","State":"KY","Zip":"42104","Lat":36.94883,"Lon":-86.43728,"Address":"150 American Ln"},
    "0453":{"Name":"Springfield","City":"Springfield","State":"OH","Zip":"45504","Lat":39.94514,"Lon":-83.83606,"Address":"1601 North Bechtle Ave"},
    "0454":{"Name":"Barboursville","City":"Barboursville","State":"WV","Zip":"25504","Lat":38.41758,"Lon":-82.26701,"Address":"700 Mall Rd"},
    "0455":{"Name":"Burlington","City":"South Point","State":"OH","Zip":"45680","Lat":38.41133,"Lon":-82.52907,"Address":"294 County Road, 120 South"},
    "0456":{"Name":"Bristol","City":"Bristol","State":"VA","Zip":"24202","Lat":36.63676,"Lon":-82.12803,"Address":"13255 Lee Highway"},
    "0457":{"Name":"Franklin Square","City":"Gastonia","State":"NC","Zip":"28056","Lat":35.25981,"Lon":-81.12031,"Address":"3250 East Franklin Blvd."},
    "0458":{"Name":"Statesville","City":"Statesville","State":"NC","Zip":"28625","Lat":35.81706,"Lon":-80.87967,"Address":"140 N. Pointe Blvd"},
    "0460":{"Name":"Elizabethtown","City":"Elizabethtown","State":"KY","Zip":"42701","Lat":37.73078,"Lon":-85.88144,"Address":"100 Lowe's Dr"},
    "0459":{"Name":"N. High Point","City":"High Point","State":"NC","Zip":"27265","Lat":35.99169,"Lon":-80.02654,"Address":"2600 North Main St"},
    "0461":{"Name":"N. Baton Rouge","City":"Baton Rouge","State":"LA","Zip":"70815","Lat":30.46202,"Lon":-91.09356,"Address":"9460 Cortana Pl"},
    "0462":{"Name":"Fort Smith","City":"Fort Smith","State":"AR","Zip":"72903","Lat":35.35069,"Lon":-94.34385,"Address":"8001 Rogers Ave"},
    "0463":{"Name":"Tyler","City":"Tyler","State":"TX","Zip":"75703","Lat":32.28576,"Lon":-95.30206,"Address":"5720 South Broadway"},
    "0464":{"Name":"Winchester","City":"Winchester","State":"KY","Zip":"40391","Lat":37.99765,"Lon":-84.21653,"Address":"1221 By-Pass Rd"},
    "0465":{"Name":"Paducah","City":"Paducah","State":"KY","Zip":"42001","Lat":37.0729,"Lon":-88.6918,"Address":"5176 Hinkleville Rd"},
    "0466":{"Name":"Gulfport","City":"Gulfport","State":"MS","Zip":"39501","Lat":30.39643,"Lon":-89.08754,"Address":"2151 John Hill Blvd"},
    "0467":{"Name":"Orange City","City":"Orange City","State":"FL","Zip":"32763","Lat":28.91393,"Lon":-81.28928,"Address":"901 Saxon Blvd"},
    "0468":{"Name":"Allegany","City":"Lavale","State":"MD","Zip":"21502","Lat":39.64066,"Lon":-78.83349,"Address":"1211 National Highway"},
    "0469":{"Name":"Easley","City":"Easley","State":"SC","Zip":"29640","Lat":34.82503,"Lon":-82.57673,"Address":"6068 Calhoun Memorial Hwy"},
    "0470":{"Name":"Waynesville","City":"Waynesville","State":"NC","Zip":"28786","Lat":35.52007,"Lon":-82.958,"Address":"100 Liner Cove Rd"},
    "0471":{"Name":"Hagerstown","City":"Hagerstown","State":"MD","Zip":"21740","Lat":39.63362,"Lon":-77.75992,"Address":"1500 Wesel Blvd"},
    "0472":{"Name":"Chillicothe","City":"Chillicothe","State":"OH","Zip":"45601","Lat":39.35231,"Lon":-82.9746,"Address":"867 North Bridge St"},
    "0473":{"Name":"Wood County","City":"Vienna","State":"WV","Zip":"26105","Lat":39.3121,"Lon":-81.55088,"Address":"1300 Grand Central Ave"},
    "0474":{"Name":"E. Louisville","City":"Louisville","State":"KY","Zip":"40222","Lat":38.23982,"Lon":-85.57459,"Address":"501 So. Hurstbourne Pkwy"},
    "0477":{"Name":"Wheelersburg","City":"Wheelersburg","State":"OH","Zip":"45694","Lat":38.73491,"Lon":-82.86212,"Address":"7915 Ohio River Rd"},
    "0476":{"Name":"Fredericksburg","City":"Fredericksburg","State":"VA","Zip":"22401","Lat":38.29978,"Lon":-77.50774,"Address":"1361 Carl D. Silver Pkwy"},
    "0478":{"Name":"Mount Airy","City":"Mount Airy","State":"NC","Zip":"27030","Lat":36.4849,"Lon":-80.61588,"Address":"692 South Andy Griffith Parkway, Ste. 100"},
    "0479":{"Name":"FT. Walton Beach","City":"Fort Walton Beach","State":"FL","Zip":"32547","Lat":30.44371,"Lon":-86.63975,"Address":"774 Beal Pkwy"},
    "0480":{"Name":"N. Winston","City":"Winston Salem","State":"NC","Zip":"27105","Lat":36.18298,"Lon":-80.27257,"Address":"5901 University Pky"},
    "0481":{"Name":"Florence","City":"Florence","State":"AL","Zip":"35630","Lat":34.82804,"Lon":-87.62999,"Address":"130 Cox Creek Pkwy. South"},
    "0482":{"Name":"Augusta","City":"Augusta","State":"GA","Zip":"30907","Lat":33.50756,"Lon":-82.09087,"Address":"224 Bobby Jones Exp"},
    "0483":{"Name":"Warner Robins","City":"Warner Robins","State":"GA","Zip":"31093","Lat":32.62025,"Lon":-83.67063,"Address":"2704 Watson Blvd"},
    "0484":{"Name":"Lafayette","City":"Lafayette","State":"LA","Zip":"70503","Lat":30.17059,"Lon":-92.06861,"Address":"3726 Ambassador Caffery"},
    "0486":{"Name":"W. Knoxville","City":"Knoxville","State":"TN","Zip":"37923","Lat":35.9183,"Lon":-84.08239,"Address":"210 N. Peters Rd"},
    "0485":{"Name":"FT. Oglethorpe","City":"Ft. Oglethorpe","State":"GA","Zip":"30742","Lat":34.94688,"Lon":-85.22716,"Address":"2215 Battlefield Pkwy"},
    "0487":{"Name":"Chapel Hill","City":"Chapel Hill","State":"NC","Zip":"27514","Lat":35.94742,"Lon":-79.01271,"Address":"1801 Fordham Blvd"},
    "0488":{"Name":"Garner","City":"Garner","State":"NC","Zip":"27529","Lat":35.72383,"Lon":-78.65005,"Address":"1575 U.S. Highway 70 West"},
    "0489":{"Name":"Huntersville","City":"Huntersville","State":"NC","Zip":"28078","Lat":35.44581,"Lon":-80.86484,"Address":"16830 Statesville Rd"},
    "0490":{"Name":"Lexington","City":"Lexington","State":"NC","Zip":"27292","Lat":35.79253,"Lon":-80.25777,"Address":"130 Lowe's Blvd"},
    "0491":{"Name":"Albany","City":"Albany","State":"GA","Zip":"31707","Lat":31.61474,"Lon":-84.21023,"Address":"1200 North Westover Blvd"},
    "0492":{"Name":"Frankfort","City":"Frankfort","State":"KY","Zip":"40601","Lat":38.16328,"Lon":-84.89856,"Address":"350 Leonardwood Dr"},
    "0493":{"Name":"Carbondale","City":"Carbondale","State":"IL","Zip":"62901","Lat":37.73305,"Lon":-89.1958,"Address":"1170 East Rendleman Rd"},
    "0494":{"Name":"Corbin","City":"Corbin","State":"KY","Zip":"40701","Lat":36.97202,"Lon":-84.09929,"Address":"777 West Cumberland Gap Pky"},
    "0495":{"Name":"Salisbury","City":"Salisbury","State":"NC","Zip":"28146","Lat":35.65378,"Lon":-80.46,"Address":"207 Faith Rd"},
    "0496":{"Name":"Jackson","City":"Jackson","State":"TN","Zip":"38305","Lat":35.66832,"Lon":-88.84805,"Address":"671 Vann Dr"},
    "0497":{"Name":"North Charleston","City":"North Charleston","State":"SC","Zip":"29406","Lat":32.93798,"Lon":-80.04729,"Address":"7555 Northwood Blvd"},
    "0498":{"Name":"Clarksville","City":"Clarksville","State":"TN","Zip":"37040","Lat":36.57496,"Lon":-87.30495,"Address":"2150 Lowe's Dr"},
    "0499":{"Name":"West Columbia","City":"West Columbia","State":"SC","Zip":"29170","Lat":33.97852,"Lon":-81.11221,"Address":"2829 Augusta Rd"},
    "0500":{"Name":"Monaca","City":"Monaca","State":"PA","Zip":"15061","Lat":40.68314,"Lon":-80.3039,"Address":"115 Wagner Rd"},
    "0501":{"Name":"N.W. Houston","City":"Houston","State":"TX","Zip":"77070","Lat":29.98065,"Lon":-95.56402,"Address":"19580 Tomball Pkwy, State Hwy 249"},
    "0502":{"Name":"S. Jacksonville","City":"Jacksonville","State":"FL","Zip":"32223","Lat":30.16713,"Lon":-81.60403,"Address":"4040 Oldfield Crossing Dr"},
    "0503":{"Name":"E. Jacksonville","City":"Jacksonville","State":"FL","Zip":"32225","Lat":30.33192,"Lon":-81.54976,"Address":"9525 Regency Square Blvd, No."},
    "0505":{"Name":"E. Plano","City":"Plano","State":"TX","Zip":"75023","Lat":33.05378,"Lon":-96.69788,"Address":"5001 Central Expy"},
    "0504":{"Name":"Titusville","City":"Titusville","State":"FL","Zip":"32780","Lat":28.55582,"Lon":-80.84987,"Address":"4660 South St"},
    "0506":{"Name":"Athens","City":"Athens","State":"GA","Zip":"30606","Lat":33.91713,"Lon":-83.44617,"Address":"1851 Epps Bridge Rd"},
    "0507":{"Name":"E. Lexington","City":"Lexington","State":"KY","Zip":"40509","Lat":38.00965,"Lon":-84.45103,"Address":"200 Old Todds Rd"},
    "0508":{"Name":"Burlington","City":"Burlington","State":"NC","Zip":"27215","Lat":36.07926,"Lon":-79.48134,"Address":"125 Huffman Mill Rd"},
    "0509":{"Name":"Harrisonburg","City":"Harrisonburg","State":"VA","Zip":"22802","Lat":38.43701,"Lon":-78.84577,"Address":"201 Linda Ln"},
    "0510":{"Name":"Mesquite","City":"Mesquite","State":"TX","Zip":"75150","Lat":32.82557,"Lon":-96.62151,"Address":"4444 N. Galloway Ave"},
    "0511":{"Name":"Sugar Land","City":"Sugar Land","State":"TX","Zip":"77479","Lat":29.59321,"Lon":-95.63166,"Address":"16510 S. W. Freeway"},
    "0512":{"Name":"Stockbridge","City":"Stockbridge","State":"GA","Zip":"30281","Lat":33.55001,"Lon":-84.27924,"Address":"3505 Mt. Zion Rd"},
    "0513":{"Name":"S.W. Dallas","City":"Dallas","State":"TX","Zip":"75232","Lat":32.64322,"Lon":-96.85539,"Address":"8520 S. Hampton Rd"},
    "0514":{"Name":"Burleson","City":"Burleson","State":"TX","Zip":"76028","Lat":32.56205,"Lon":-97.31594,"Address":"920 N. Burleson Blvd."},
    "0515":{"Name":"N. Dallas","City":"Dallas","State":"TX","Zip":"75244","Lat":32.91174,"Lon":-96.81717,"Address":"11920 Inwood Rd"},
    "0516":{"Name":"Frederick","City":"Frederick","State":"MD","Zip":"21704","Lat":39.38811,"Lon":-77.40732,"Address":"5611 Buckeystown Pike"},
    "0517":{"Name":"Charlottesville","City":"Charlottesville","State":"VA","Zip":"22901","Lat":38.09021,"Lon":-78.47154,"Address":"400 Woodbrook Dr"},
    "0518":{"Name":"Greenwood","City":"Greenwood","State":"SC","Zip":"29649","Lat":34.20509,"Lon":-82.18856,"Address":"513 Bypass 72 NW"},
    "0519":{"Name":"Longview","City":"Longview","State":"TX","Zip":"75605","Lat":32.54419,"Lon":-94.73237,"Address":"3313 North Fourth St"},
    "0520":{"Name":"S. Arlington","City":"Arlington","State":"TX","Zip":"76015","Lat":32.68057,"Lon":-97.12222,"Address":"1000 West Arbrook"},
    "0521":{"Name":"Topeka","City":"Topeka","State":"KS","Zip":"66615","Lat":39.03753,"Lon":-95.76837,"Address":"1621 Southwest Arvonia Pl"},
    "0522":{"Name":"Harrisburg","City":"Harrisburg","State":"PA","Zip":"17109","Lat":40.27995,"Lon":-76.82132,"Address":"4000 Union Deposit Rd"},
    "0523":{"Name":"Utica","City":"Utica","State":"NY","Zip":"13502","Lat":43.12607,"Lon":-75.22492,"Address":"710 Horatio St"},
    "0524":{"Name":"Ulster","City":"Kingston","State":"NY","Zip":"12401","Lat":41.97277,"Lon":-73.98281,"Address":"901 Frank Sottile Blvd."},
    "0525":{"Name":"S. FT. Worth","City":"Fort Worth","State":"TX","Zip":"76132","Lat":32.68728,"Lon":-97.41184,"Address":"4305 Bryant Irvin Rd"},
    "0526":{"Name":"W. Asheville","City":"Asheville","State":"NC","Zip":"28806","Lat":35.5694,"Lon":-82.62715,"Address":"95 Smokey Park Highway"},
    "0527":{"Name":"Lancaster","City":"Lancaster","State":"OH","Zip":"43130","Lat":39.73775,"Lon":-82.62904,"Address":"2240 Lowes Dr"},
    "0529":{"Name":"Tupelo","City":"Tupelo","State":"MS","Zip":"38804","Lat":34.30255,"Lon":-88.70549,"Address":"3354 North Gloster St"},
    "0528":{"Name":"Simpsonville","City":"Simpsonville","State":"SC","Zip":"29680","Lat":34.71037,"Lon":-82.24951,"Address":"3958 Grandview Dr"},
    "0530":{"Name":"Big Flats","City":"Elmira","State":"NY","Zip":"14903","Lat":42.15542,"Lon":-76.87512,"Address":"913 County RD., Route 64"},
    "0531":{"Name":"Austell","City":"Austell","State":"GA","Zip":"30106","Lat":33.85317,"Lon":-84.59971,"Address":"1717 East West Connector"},
    "0532":{"Name":"Franklin","City":"Franklin","State":"TN","Zip":"37067","Lat":35.9444,"Lon":-86.81781,"Address":"3060 Mallory Ln"},
    "0533":{"Name":"Hurst","City":"Hurst","State":"TX","Zip":"76054","Lat":32.85872,"Lon":-97.18474,"Address":"770 Grapevine Hwy"},
    "0534":{"Name":"N.W. Cincinnati","City":"Cincinnati","State":"OH","Zip":"45251","Lat":39.26022,"Lon":-84.60468,"Address":"10235 Colerain Ave"},
    "0538":{"Name":"Southern Pines","City":"Southern Pines","State":"NC","Zip":"28387","Lat":35.16351,"Lon":-79.41929,"Address":"10845 Us 15-501 Hwy."},
    "0535":{"Name":"N. Oklahoma City","City":"Oklahoma City","State":"OK","Zip":"73134","Lat":35.60706,"Lon":-97.55655,"Address":"2400 W. Memorial Rd"},
    "0539":{"Name":"Mt. Pleasant","City":"Mount Pleasant","State":"SC","Zip":"29464","Lat":32.82686,"Lon":-79.83378,"Address":"1104 Market Center Blvd"},
    "0537":{"Name":"Hattiesburg","City":"Hattiesburg","State":"MS","Zip":"39402","Lat":31.32052,"Lon":-89.37435,"Address":"6004 U.S. Hwy. 98"},
    "0540":{"Name":"Middletown","City":"Middletown","State":"NY","Zip":"10941","Lat":41.45881,"Lon":-74.37337,"Address":"700 North Galleria Dr"},
    "0542":{"Name":"Mason","City":"Mason","State":"OH","Zip":"45040","Lat":39.3015,"Lon":-84.31305,"Address":"9380 Mason-Montgomery Rd."},
    "0541":{"Name":"Poughkeepsie","City":"Poughkeepsie","State":"NY","Zip":"12601","Lat":41.62126,"Lon":-73.92209,"Address":"1941 South Rd"},
    "0543":{"Name":"Woodstock","City":"Woodstock","State":"GA","Zip":"30189","Lat":34.08181,"Lon":-84.53967,"Address":"575 Molly Ln"},
    "0545":{"Name":"W. Marietta","City":"Marietta","State":"GA","Zip":"30064","Lat":33.94832,"Lon":-84.62827,"Address":"2650 Dallas Hwy. S.W."},
    "0547":{"Name":"Rocky Mount","City":"Rocky Mount","State":"NC","Zip":"27804","Lat":35.9647,"Lon":-77.82115,"Address":"700 N. Wesleyan Blvd."},
    "0548":{"Name":"Crossville","City":"Crossville","State":"TN","Zip":"38555","Lat":35.97982,"Lon":-85.04028,"Address":"2431 N. Main"},
    "0546":{"Name":"Macon","City":"Macon","State":"GA","Zip":"31206","Lat":32.81351,"Lon":-83.68933,"Address":"3190 Macon Tech Dr"},
    "0549":{"Name":"W. Mobile","City":"Mobile","State":"AL","Zip":"36608","Lat":30.68615,"Lon":-88.22431,"Address":"7760 Airport Blvd."},
    "0550":{"Name":"Carrollton","City":"Carrollton","State":"TX","Zip":"75006","Lat":32.98573,"Lon":-96.90285,"Address":"1253 East Trinity Mills Rd"},
    "0552":{"Name":"W. Des Moines","City":"West Des Moines","State":"IA","Zip":"50266","Lat":41.59694,"Lon":-93.77287,"Address":"1700 50th St"},
    "0551":{"Name":"Lewisville","City":"Lewisville","State":"TX","Zip":"75067","Lat":33.05718,"Lon":-97.01498,"Address":"1051 Stemmons Freeway"},
    "0553":{"Name":"Pottsville","City":"Pottsville","State":"PA","Zip":"17901","Lat":40.70903,"Lon":-76.18964,"Address":"PA Route 61 & Ann St"},
    "0554":{"Name":"Florence","City":"Florence","State":"KY","Zip":"41042","Lat":39.0201,"Lon":-84.62492,"Address":"4800 Houston Rd"},
    "0555":{"Name":"Copperfield","City":"Copperfield","State":"TX","Zip":"77095","Lat":29.87811,"Lon":-95.64284,"Address":"15555 Fm 529"},
    "0556":{"Name":"Jacksonville","City":"Jacksonville","State":"NC","Zip":"28546","Lat":34.78336,"Lon":-77.40109,"Address":"1255 Western Blvd"},
    "0557":{"Name":"Goldsboro","City":"Goldsboro","State":"NC","Zip":"27534","Lat":35.37993,"Lon":-77.93018,"Address":"1202 Berkeley Blvd"},
    "0558":{"Name":"Somerset","City":"Somerset","State":"KY","Zip":"42501","Lat":37.06634,"Lon":-84.62316,"Address":"2001 South Hwy 27"},
    "0559":{"Name":"Orangeburg","City":"Orangeburg","State":"SC","Zip":"29118","Lat":33.52826,"Lon":-80.89051,"Address":"2896 North Rd Hwy 178"},
    "0560":{"Name":"Saratoga Springs","City":"Saratoga Springs","State":"NY","Zip":"12866","Lat":43.10515,"Lon":-73.74602,"Address":"10 Lowe's Dr"},
    "0561":{"Name":"Auburn","City":"Auburn","State":"NY","Zip":"13021","Lat":42.95626,"Lon":-76.54601,"Address":"299 Grant Ave"},
    "0562":{"Name":"Saginaw","City":"Saginaw","State":"MI","Zip":"48604","Lat":43.4823,"Lon":-83.96249,"Address":"2258 Tittabawasee Rd"},
    "0563":{"Name":"Spring","City":"Spring","State":"TX","Zip":"77388","Lat":30.05965,"Lon":-95.43487,"Address":"20201 N. IH 45"},
    "0564":{"Name":"Central Tampa","City":"Tampa","State":"FL","Zip":"33634","Lat":28.02782,"Lon":-82.54624,"Address":"6275 W. Waters Ave"},
    "0567":{"Name":"Morgantown","City":"Morgantown","State":"WV","Zip":"26508","Lat":39.65044,"Lon":-79.89459,"Address":"901 Venture Dr"},
    "0566":{"Name":"New Bern","City":"New Bern","State":"NC","Zip":"28562","Lat":35.09961,"Lon":-77.08908,"Address":"1400 Lowe's Blvd"},
    "0568":{"Name":"Westminster","City":"Westminster","State":"MD","Zip":"21157","Lat":39.5654,"Lon":-76.97058,"Address":"777 Market St"},
    "0569":{"Name":"Lake County","City":"Leesburg","State":"FL","Zip":"34788","Lat":28.82414,"Lon":-81.7987,"Address":"9540 U.S. Hwy 441"},
    "0573":{"Name":"Brandon","City":"Brandon","State":"FL","Zip":"33511","Lat":27.92111,"Lon":-82.32001,"Address":"11375 Causeway Blvd"},
    "0575":{"Name":"Midland","City":"Midland","State":"MI","Zip":"48642","Lat":43.65752,"Lon":-84.25071,"Address":"1918 Airport Rd"},
    "0576":{"Name":"N. Durham","City":"Durham","State":"NC","Zip":"27704","Lat":36.04438,"Lon":-78.9,"Address":"117 William Penn Plaza"},
    "0577":{"Name":"Foley","City":"Foley","State":"AL","Zip":"36535","Lat":30.36912,"Lon":-87.68049,"Address":"3101 South Mckenzie Hwy 59"},
    "0578":{"Name":"Cookeville","City":"Cookeville","State":"TN","Zip":"38501","Lat":36.13889,"Lon":-85.49497,"Address":"510 Neal St"},
    "0579":{"Name":"Morriston","City":"Morristown","State":"TN","Zip":"37814","Lat":36.20336,"Lon":-83.33197,"Address":"2744 West Andrew Johnson Hwy"},
    "0580":{"Name":"Homewood","City":"Homewood","State":"AL","Zip":"35209","Lat":33.44553,"Lon":-86.83069,"Address":"375 State Farm Pkwy W"},
    "0581":{"Name":"Ames","City":"Ames","State":"IA","Zip":"50010","Lat":41.99916,"Lon":-93.61165,"Address":"120 Airport Rd"},
    "0582":{"Name":"FT. Myers","City":"Fort Myers","State":"FL","Zip":"33912","Lat":26.52669,"Lon":-81.87288,"Address":"14960 S. Tamiami Trail"},
    "0586":{"Name":"Alexandria","City":"Alexandria","State":"LA","Zip":"71301","Lat":31.27445,"Lon":-92.45541,"Address":"3201 Industrial St"},
    "0588":{"Name":"Logan","City":"Logan","State":"WV","Zip":"25601","Lat":37.85743,"Lon":-82.04364,"Address":"Norman Morgan Blvd, U.S. Rt 119"},
    "0587":{"Name":"Dover","City":"Dover","State":"DE","Zip":"19901","Lat":39.19233,"Lon":-75.54802,"Address":"1450 N. Dupont Highway"},
    "0589":{"Name":"Lake Charles","City":"Lake Charles","State":"LA","Zip":"70607","Lat":30.192,"Lon":-93.17612,"Address":"2800 Derek Dr"},
    "0590":{"Name":"N.W. Austin","City":"Austin","State":"TX","Zip":"78717","Lat":30.4681,"Lon":-97.79259,"Address":"13201 N. Ranch Rd 620, Bldg. G."},
    "0591":{"Name":"Alton","City":"Alton","State":"IL","Zip":"62002","Lat":38.91763,"Lon":-90.16841,"Address":"1619 Homer Adams Pkwy."},
    "0593":{"Name":"New Haven","City":"New Haven","State":"CT","Zip":"06513","Lat":41.32193,"Lon":-72.88038,"Address":"115 Foxon Blvd"},
    "0592":{"Name":"Cape Coral","City":"Cape Coral","State":"FL","Zip":"33909","Lat":26.67014,"Lon":-81.93974,"Address":"1651 NE Pine Island Rd"},
    "0594":{"Name":"Trussville","City":"Birmingham","State":"AL","Zip":"35235","Lat":33.59727,"Lon":-86.64939,"Address":"1885 Edwards Lake Rd"},
    "0596":{"Name":"Houma","City":"Houma","State":"LA","Zip":"70360","Lat":29.61054,"Lon":-90.7483,"Address":"1592 Martin Luther King Blvd"},
    "0597":{"Name":"Hot Springs","City":"Hot Springs","State":"AR","Zip":"71913","Lat":34.46059,"Lon":-93.05698,"Address":"300 Corner Stone Blvd"},
    "0595":{"Name":"Mooresville","City":"Mooresville","State":"NC","Zip":"28117","Lat":35.59332,"Lon":-80.86658,"Address":"509 River Highway"},
    "0599":{"Name":"Chester","City":"Chester","State":"VA","Zip":"23831","Lat":37.34838,"Lon":-77.4127,"Address":"2601 Weir Pl"},
    "0598":{"Name":"Greenville","City":"Winterville","State":"NC","Zip":"28590","Lat":35.5631,"Lon":-77.4085,"Address":"800 Thomas Langston Rd"},
    "0603":{"Name":"North Myrtle Beach","City":"North Myrtle Beach","State":"SC","Zip":"29582","Lat":33.8292,"Lon":-78.67533,"Address":"214 U.S. Hwy 17 North"},
    "0604":{"Name":"Altamonte Springs","City":"Altamonte Springs","State":"FL","Zip":"32714","Lat":28.66256,"Lon":-81.42121,"Address":"110 N. State Rd 434"},
    "0605":{"Name":"Stow","City":"Stow","State":"OH","Zip":"44224","Lat":41.1673,"Lon":-81.47969,"Address":"3570 Hudson Dr"},
    "0606":{"Name":"Dothan","City":"Dothan","State":"AL","Zip":"36301","Lat":31.20595,"Lon":-85.42438,"Address":"2671 Ross Clark Cir"},
    "0607":{"Name":"S. Lexington","City":"Lexington","State":"KY","Zip":"40503","Lat":37.97963,"Lon":-84.53398,"Address":"4055 Nichols Park Dr"},
    "0609":{"Name":"W. Chesterfield","City":"Chesterfield","State":"VA","Zip":"23832","Lat":37.40257,"Lon":-77.66953,"Address":"7001 Winterpock Rd"},
    "0610":{"Name":"Rockwall","City":"Rockwall","State":"TX","Zip":"75032","Lat":32.89198,"Lon":-96.46811,"Address":"851 N. Steger Town Dr"},
    "0611":{"Name":"Garland","City":"Garland","State":"TX","Zip":"75040","Lat":32.94456,"Lon":-96.61033,"Address":"2949 N. George Bush Freeway"},
    "0612":{"Name":"Shelby","City":"Shelby","State":"NC","Zip":"28150","Lat":35.27923,"Lon":-81.5336,"Address":"425 Earl Rd"},
    "0613":{"Name":"Naples","City":"Naples","State":"FL","Zip":"34109","Lat":26.22131,"Lon":-81.77048,"Address":"6415 Naples Blvd"},
    "0614":{"Name":"W. Wichita","City":"Wichita","State":"KS","Zip":"67209","Lat":37.67886,"Lon":-97.42769,"Address":"333 South Rdg Rd"},
    "0615":{"Name":"Alpharetta","City":"Alpharetta","State":"GA","Zip":"30004","Lat":34.03806,"Lon":-84.31859,"Address":"10580 Duke Dr"},
    "0616":{"Name":"Nitro","City":"Cross Lanes","State":"WV","Zip":"25313","Lat":38.4131,"Lon":-81.81084,"Address":"1000 Nitro Marketplace"},
    "0617":{"Name":"E. Asheville","City":"Asheville","State":"NC","Zip":"28805","Lat":35.5777,"Lon":-82.52252,"Address":"89 South Tunnel Rd"},
    "0619":{"Name":"Morehead City","City":"Morehead City","State":"NC","Zip":"28557","Lat":34.73755,"Lon":-76.8122,"Address":"5219 Hwy 70"},
    "0618":{"Name":"N. Lafayette","City":"Lafayette","State":"LA","Zip":"70507","Lat":30.2944,"Lon":-92.02176,"Address":"120 East Gloria Switch Rd"},
    "0620":{"Name":"Hoover","City":"Hoover","State":"AL","Zip":"35244","Lat":33.35926,"Lon":-86.7755,"Address":"2100 Valleydale Rd"},
    "0621":{"Name":"Orange","City":"Orange","State":"CT","Zip":"06477","Lat":41.27792,"Lon":-72.98374,"Address":"50 Boston Post Rd"},
    "0622":{"Name":"N. Wilmington","City":"Wilmington","State":"DE","Zip":"19803","Lat":39.83271,"Lon":-75.53657,"Address":"3100 Brandywine Pkwy, 1st Floor"},
    "0623":{"Name":"Newington","City":"Newington","State":"CT","Zip":"06111","Lat":41.65958,"Lon":-72.72097,"Address":"3270 Berlin Turnpike"},
    "0624":{"Name":"Catonsville","City":"Baltimore","State":"MD","Zip":"21228","Lat":39.28841,"Lon":-76.73823,"Address":"5900 Baltimore National Pike"},
    "0625":{"Name":"W. Raleigh","City":"Raleigh","State":"NC","Zip":"27613","Lat":35.86929,"Lon":-78.71856,"Address":"4831 Grove Barton Rd"},
    "0626":{"Name":"Sumter","City":"Sumter","State":"SC","Zip":"29150","Lat":33.95826,"Lon":-80.38514,"Address":"1251 Broad St"},
    "0627":{"Name":"Martinsburg","City":"Martinsburg","State":"WV","Zip":"25401","Lat":39.44383,"Lon":-77.98469,"Address":"14725 Apple Harvest Dr"},
    "0628":{"Name":"Hanover","City":"Hanover","State":"PA","Zip":"17331","Lat":39.82647,"Lon":-76.98601,"Address":"310 Eisenhower Dr"},
    "0629":{"Name":"W. Nashville","City":"Nashville","State":"TN","Zip":"37209","Lat":36.13316,"Lon":-86.90594,"Address":"7034 Charlotte Pike"},
    "0630":{"Name":"E. Evansville","City":"Evansville","State":"IN","Zip":"47715","Lat":37.99279,"Lon":-87.47114,"Address":"6716 Oak Grove Rd"},
    "0631":{"Name":"Glen Burnie","City":"Glen Burnie","State":"MD","Zip":"21061","Lat":39.19509,"Lon":-76.61531,"Address":"6650 Ritchie Hwy Route 2"},
    "0632":{"Name":"Williamsburg","City":"Williamsburg","State":"VA","Zip":"23188","Lat":37.34353,"Lon":-76.73781,"Address":"801 East Rochambeau Dr"},
    "0633":{"Name":"Fairlawn","City":"Akron","State":"OH","Zip":"44333","Lat":41.14007,"Lon":-81.63901,"Address":"186 N. Cleveland Massillon Rd"},
    "0634":{"Name":"Bloomington","City":"Bloomington","State":"IN","Zip":"47404","Lat":39.1698,"Lon":-86.57489,"Address":"350 North Gates Dr"},
    "0635":{"Name":"Central Indianapolis","City":"Indianapolis","State":"IN","Zip":"46220","Lat":39.86429,"Lon":-86.11881,"Address":"6002 North Rural St"},
    "0637":{"Name":"N. Knoxville","City":"Knoxville","State":"TN","Zip":"37912","Lat":36.0092,"Lon":-84.01816,"Address":"6600 Clinton Hwy"},
    "0636":{"Name":"N. Columbus","City":"Columbus","State":"GA","Zip":"31909","Lat":32.54143,"Lon":-84.95261,"Address":"6750 Veterans Pkwy"},
    "0638":{"Name":"Blount County","City":"Alcoa","State":"TN","Zip":"37701","Lat":35.76796,"Lon":-83.99038,"Address":"1098 Hunters Crossing Dr"},
    "0639":{"Name":"Aiken","City":"Aiken","State":"SC","Zip":"29803","Lat":33.50901,"Lon":-81.7102,"Address":"2470 Whiskey Rd"},
    "0640":{"Name":"Stone Mountain","City":"Lilburn","State":"GA","Zip":"30047","Lat":33.82822,"Lon":-84.09835,"Address":"4855 Stone Mountain Highway"},
    "0641":{"Name":"Glens Falls","City":"Queensbury","State":"NY","Zip":"12804","Lat":43.33423,"Lon":-73.65144,"Address":"251 Quaker Rd"},
    "0642":{"Name":"W. Orlando","City":"Orlando","State":"FL","Zip":"32818","Lat":28.55048,"Lon":-81.50356,"Address":"8700 W. Colonial Dr"},
    "0644":{"Name":"Sunbury","City":"Selinsgrove","State":"PA","Zip":"17870","Lat":40.82925,"Lon":-76.84382,"Address":"1389 North Susquehanna Trail"},
    "0645":{"Name":"Henrietta","City":"Rochester","State":"NY","Zip":"14623","Lat":43.07602,"Lon":-77.63026,"Address":"2350 Marketplace Dr"},
    "0646":{"Name":"Staunton","City":"Staunton","State":"VA","Zip":"24401","Lat":38.13373,"Lon":-79.04614,"Address":"1028D Richmond Rd"},
    "0647":{"Name":"Smithfield","City":"Smithfield","State":"NC","Zip":"27577","Lat":35.51765,"Lon":-78.31417,"Address":"1230 N. Brightleaf Blvd"},
    "0643":{"Name":"Fairview Heights","City":"Fairview Heights","State":"IL","Zip":"62208","Lat":38.59059,"Lon":-89.98659,"Address":"6211 N. Illinois"},
    "0649":{"Name":"Cleveland","City":"Cleveland","State":"TN","Zip":"37312","Lat":35.20374,"Lon":-84.85035,"Address":"229 Paul Huff Pkwy NW"},
    "0650":{"Name":"Plainville","City":"Plainville","State":"CT","Zip":"06062","Lat":41.67373,"Lon":-72.84321,"Address":"246 New Britain Ave"},
    "0651":{"Name":"Baybrook","City":"Webster","State":"TX","Zip":"77598","Lat":29.54446,"Lon":-95.14141,"Address":"19225 Gulf Freeway"},
    "0652":{"Name":"Wilkes-barre","City":"Wilkes Barre","State":"PA","Zip":"18702","Lat":41.24173,"Lon":-75.83865,"Address":"501 Arena Hub Plaza"},
    "0653":{"Name":"Cranberry Township","City":"Cranberry Township","State":"PA","Zip":"16066","Lat":40.68822,"Lon":-80.07951,"Address":"1717 Route 228"},
    "0655":{"Name":"W. Ashley","City":"Charleston","State":"SC","Zip":"29414","Lat":32.81093,"Lon":-80.04606,"Address":"3125 Glenn Mcconnell Pkwy"},
    "0656":{"Name":"Winchester","City":"Winchester","State":"VA","Zip":"22601","Lat":39.15775,"Lon":-78.16823,"Address":"2200 S. Pleasant Valley Rd"},
    "0654":{"Name":"Royal Palm Beach","City":"Royal Palm Beach","State":"FL","Zip":"33411","Lat":26.67767,"Lon":-80.20532,"Address":"103 South State Rd 7"},
    "0657":{"Name":"Owensboro","City":"Owensboro","State":"KY","Zip":"42303","Lat":37.72198,"Lon":-87.11725,"Address":"415 Fulton Dr"},
    "0658":{"Name":"Sussex County","City":"Lewes","State":"DE","Zip":"19958","Lat":38.74704,"Lon":-75.17162,"Address":"20364 Plantations Rd"},
    "0659":{"Name":"Murfreesboro","City":"Murfreesboro","State":"TN","Zip":"37129","Lat":35.84359,"Lon":-86.42431,"Address":"1825 Old Fort Pkwy"},
    "0660":{"Name":"E. Springfield","City":"Springfield","State":"MA","Zip":"01129","Lat":42.14443,"Lon":-72.49133,"Address":"1600 Boston Rd"},
    "0661":{"Name":"James Island","City":"Charleston","State":"SC","Zip":"29412","Lat":32.74923,"Lon":-79.96828,"Address":"770 Daniel Ellis Dr"},
    "0663":{"Name":"Madison","City":"Madison","State":"AL","Zip":"35758","Lat":34.75469,"Lon":-86.74575,"Address":"7920 Highway 72 West"},
    "0662":{"Name":"Buford","City":"Buford","State":"GA","Zip":"30519","Lat":34.08704,"Lon":-83.98773,"Address":"1955 Buford Mill Dr"},
    "0664":{"Name":"S. Roanoke","City":"Roanoke","State":"VA","Zip":"24018","Lat":37.22406,"Lon":-79.97139,"Address":"4224 Valley Ave"},
    "0665":{"Name":"W. Plano","City":"Dallas","State":"TX","Zip":"75252","Lat":33.01022,"Lon":-96.79225,"Address":"19210 Preston Rd"},
    "0667":{"Name":"Greer","City":"Greer","State":"SC","Zip":"29650","Lat":34.94057,"Lon":-82.26598,"Address":"1370 Wade Hampton Blvd West"},
    "0668":{"Name":"Hendersonville","City":"Hendersonville","State":"TN","Zip":"37075","Lat":36.31528,"Lon":-86.59423,"Address":"360 East Main St"},
    "0669":{"Name":"Flint","City":"Flint","State":"MI","Zip":"48532","Lat":43,"Lon":-83.76926,"Address":"2100 T.A. Mansour Blvd"},
    "0670":{"Name":"S. Orlando","City":"Orlando","State":"FL","Zip":"32819","Lat":28.44885,"Lon":-81.42233,"Address":"2800 West Sandlake Rd"},
    "0671":{"Name":"Washington","City":"Washington","State":"PA","Zip":"15301","Lat":40.18985,"Lon":-80.22405,"Address":"Strabane Square 355 Washington Rd"},
    "0674":{"Name":"W. Chandler","City":"Chandler","State":"AZ","Zip":"85226","Lat":33.32125,"Lon":-111.96477,"Address":"7100 West Ray Rd"},
    "0675":{"Name":"E. Charleston","City":"Charleston","State":"WV","Zip":"25304","Lat":38.31314,"Lon":-81.56456,"Address":"5750 Maccorkle Ave SE"},
    "0677":{"Name":"Clayton","City":"Garner","State":"NC","Zip":"27529","Lat":35.60839,"Lon":-78.55894,"Address":"101 Cleveland Crossing Dr"},
    "0678":{"Name":"Cumming","City":"Cumming","State":"GA","Zip":"30041","Lat":34.183,"Lon":-84.13294,"Address":"935 Marketplace Blvd"},
    "0679":{"Name":"W. Evansville","City":"Evansville","State":"IN","Zip":"47712","Lat":37.97784,"Lon":-87.63985,"Address":"103 South Red Bank Rd"},
    "0680":{"Name":"Monroe","City":"Monroe","State":"NC","Zip":"28110","Lat":35.01205,"Lon":-80.56229,"Address":"2350 West Roosevelt Blvd"},
    "0681":{"Name":"N. Central Houston","City":"Houston","State":"TX","Zip":"77008","Lat":29.81063,"Lon":-95.42809,"Address":"1521 North Loop West"},
    "0682":{"Name":"Southport","City":"Southport","State":"NC","Zip":"28461","Lat":33.95358,"Lon":-78.04585,"Address":"5084 Southport - Supply Rd Southeast"},
    "0676":{"Name":"S. Richmond","City":"Richmond","State":"VA","Zip":"23225","Lat":37.53501,"Lon":-77.53117,"Address":"2501 Sheila Ln"},
    "0685":{"Name":"Pearland","City":"Pearland","State":"TX","Zip":"77581","Lat":29.55637,"Lon":-95.2606,"Address":"2741 Broadway St"},
    "0684":{"Name":"Warren","City":"Warren","State":"MI","Zip":"48093","Lat":42.52233,"Lon":-83.02735,"Address":"31140 Van Dyke Ave"},
    "0686":{"Name":"Fayetteville","City":"Fayetteville","State":"GA","Zip":"30214","Lat":33.47254,"Lon":-84.44652,"Address":"1030 Glynn St North"},
    "0687":{"Name":"Short Pump","City":"Glen Allen","State":"VA","Zip":"23060","Lat":37.65543,"Lon":-77.60977,"Address":"4401 Pouncey Tract Rd"},
    "0688":{"Name":"Boise","City":"Boise","State":"ID","Zip":"83709","Lat":43.59243,"Lon":-116.28182,"Address":"7990 West Overland Rd"},
    "0689":{"Name":"S.E. Austin","City":"Austin","State":"TX","Zip":"78745","Lat":30.20167,"Lon":-97.76651,"Address":"5510 South IH 35"},
    "0690":{"Name":"D'iberville","City":"D'iberville","State":"MS","Zip":"39540","Lat":30.45986,"Lon":-88.89737,"Address":"3700 Sangani Blvd"},
    "0691":{"Name":"White Marsh","City":"Baltimore","State":"MD","Zip":"21236","Lat":39.36915,"Lon":-76.44961,"Address":"5300 Campbell Blvd"},
    "0692":{"Name":"Piscataway","City":"Piscataway","State":"NJ","Zip":"08854","Lat":40.55271,"Lon":-74.4369,"Address":"1345 Centennial Ave"},
    "0695":{"Name":"FT. Gratiot","City":"Fort Gratiot","State":"MI","Zip":"48059","Lat":43.03142,"Lon":-82.45287,"Address":"4200 24th Ave"},
    "0693":{"Name":"Sevierville","City":"Sevierville","State":"TN","Zip":"37876","Lat":35.87783,"Lon":-83.57469,"Address":"610 Winfield Dunn Pkwy"},
    "0694":{"Name":"Rogers","City":"Rogers","State":"AR","Zip":"72756","Lat":36.33713,"Lon":-94.18081,"Address":"300 North 46th St"},
    "0697":{"Name":"Concord","City":"Concord","State":"NC","Zip":"28027","Lat":35.42617,"Lon":-80.61243,"Address":"940 Concord Pkwy North"},
    "0696":{"Name":"Melbourne","City":"Melbourne","State":"FL","Zip":"32904","Lat":28.07671,"Lon":-80.67361,"Address":"2150 Minton Rd"},
    "0698":{"Name":"Oxford","City":"Oxford","State":"AL","Zip":"36203","Lat":33.61352,"Lon":-85.79455,"Address":"1836 U.S. Highway 78 East"},
    "0701":{"Name":"Wilkesboro","City":"Wilkesboro","State":"NC","Zip":"28697","Lat":36.14832,"Lon":-81.20511,"Address":"2003 U.S. Highway 421"},
    "0700":{"Name":"Lincolnton","City":"Lincolnton","State":"NC","Zip":"28092","Lat":35.47955,"Lon":-81.2338,"Address":"1603 East Main St"},
    "0703":{"Name":"Jensen Beach","City":"Jensen Beach","State":"FL","Zip":"34957","Lat":27.25361,"Lon":-80.27986,"Address":"4100 Northwest Federal Highway"},
    "0702":{"Name":"Largo","City":"Upper Marlboro","State":"MD","Zip":"20774","Lat":38.89421,"Lon":-76.82458,"Address":"10440 Campus Way South"},
    "0704":{"Name":"Coral Springs","City":"Coral Springs","State":"FL","Zip":"33067","Lat":26.2758,"Lon":-80.20356,"Address":"3651 Turtle Creek Dr"},
    "0707":{"Name":"Martinsville","City":"Martinsville","State":"VA","Zip":"24112","Lat":36.69196,"Lon":-79.904,"Address":"1059 Commonwealth Blvd"},
    "0705":{"Name":"S.W. Louisville","City":"Louisville","State":"KY","Zip":"40258","Lat":38.15399,"Lon":-85.8331,"Address":"6651 Dixie Highway"},
    "0708":{"Name":"Heath","City":"Heath","State":"OH","Zip":"43056","Lat":40.02707,"Lon":-82.44219,"Address":"888 Hebron Rd"},
    "0706":{"Name":"Chambersburg","City":"Chambersburg","State":"PA","Zip":"17201","Lat":39.92293,"Lon":-77.61271,"Address":"1600 Lincoln Way East"},
    "0709":{"Name":"W. Chesapeake","City":"Chesapeake","State":"VA","Zip":"23321","Lat":36.81966,"Lon":-76.43822,"Address":"4708 Portsmouth Blvd"},
    "0710":{"Name":"John's Creek","City":"Suwanee","State":"GA","Zip":"30024","Lat":34.07354,"Lon":-84.16786,"Address":"3580 Peachtree Pkwy"},
    "0711":{"Name":"N. Columbus","City":"Columbus","State":"OH","Zip":"43240","Lat":40.1387,"Lon":-82.98069,"Address":"1465 Polaris Pkwy"},
    "0712":{"Name":"Pascagoula","City":"Pascagoula","State":"MS","Zip":"39581","Lat":30.37959,"Lon":-88.52725,"Address":"3301 Denny Ave"},
    "0713":{"Name":"Bloomfield Township","City":"Bloomfield Hills","State":"MI","Zip":"48302","Lat":42.61554,"Lon":-83.30789,"Address":"1801 Telegraph Rd"},
    "0714":{"Name":"E. Mesa","City":"Mesa","State":"AZ","Zip":"85206","Lat":33.3888,"Lon":-111.72045,"Address":"1440 South Higley Rd"},
    "0715":{"Name":"Alexandria","City":"Alexandria","State":"VA","Zip":"22306","Lat":38.77208,"Lon":-77.08357,"Address":"6750 Richmond Highway"},
    "0716":{"Name":"N.W. Tallahassee","City":"Tallahassee","State":"FL","Zip":"32303","Lat":30.47784,"Lon":-84.3658,"Address":"5500 Commonwealth Blvd"},
    "0717":{"Name":"Franklin","City":"Franklin","State":"NC","Zip":"28734","Lat":35.16544,"Lon":-83.39561,"Address":"161 Franklin Plaza"},
    "0719":{"Name":"St. Mary's County","City":"California","State":"MD","Zip":"20619","Lat":38.3,"Lon":-76.51683,"Address":"45075 Worth Ave"},
    "0718":{"Name":"Kingsport","City":"Kingsport","State":"TN","Zip":"37660","Lat":36.54868,"Lon":-82.50057,"Address":"2526 East Stone Dr"},
    "0720":{"Name":"Timonium","City":"Timonium","State":"MD","Zip":"21093","Lat":39.45975,"Lon":-76.63808,"Address":"19 Texas Station Court"},
    "0721":{"Name":"Olathe","City":"Olathe","State":"KS","Zip":"66062","Lat":38.88016,"Lon":-94.76367,"Address":"13750 South Blackbob Rd"},
    "0722":{"Name":"Murray","City":"Murray","State":"KY","Zip":"42071","Lat":36.62687,"Lon":-88.32059,"Address":"1400 Lowe's Dr"},
    "0724":{"Name":"Port Richey","City":"New Port Richey","State":"FL","Zip":"34654","Lat":28.27857,"Lon":-82.67291,"Address":"8312 Little Rd"},
    "0726":{"Name":"Wilson","City":"Wilson","State":"NC","Zip":"27893","Lat":35.73482,"Lon":-77.95463,"Address":"2501 Forest Hills Rd West"},
    "0727":{"Name":"Tullahoma","City":"Tullahoma","State":"TN","Zip":"37388","Lat":35.39287,"Lon":-86.24415,"Address":"2211 North Jackson St"},
    "0725":{"Name":"W. Davie","City":"Southwest Ranches","State":"FL","Zip":"33331","Lat":26.0329,"Lon":-80.35957,"Address":"6600 Dykes Rd"},
    "0728":{"Name":"Anderson","City":"Anderson","State":"SC","Zip":"29621","Lat":34.54861,"Lon":-82.67814,"Address":"3515 Clemson Blvd"},
    "0729":{"Name":"Columbia","City":"Columbia","State":"TN","Zip":"38401","Lat":35.59477,"Lon":-87.0602,"Address":"2000 Hillary Dr"},
    "0730":{"Name":"Douglasville","City":"Douglasville","State":"GA","Zip":"30135","Lat":33.7267,"Lon":-84.75955,"Address":"7001 Douglas Blvd."},
    "0731":{"Name":"Chesterfield","City":"Chesterfield","State":"MO","Zip":"63005","Lat":38.6662,"Lon":-90.60191,"Address":"290 T.H.F. Blvd"},
    "0732":{"Name":"Southlake","City":"Southlake","State":"TX","Zip":"76092","Lat":32.94159,"Lon":-97.11427,"Address":"201 North Kimball Ave"},
    "0733":{"Name":"N. Springfield","City":"Springfield","State":"MO","Zip":"65803","Lat":37.25287,"Lon":-93.31344,"Address":"1707 West Norton Rd"},
    "0734":{"Name":"Ann Arbor","City":"Ypsilanti","State":"MI","Zip":"48197","Lat":42.23194,"Lon":-83.68199,"Address":"3900 Carpenter Rd"},
    "0735":{"Name":"Warrington","City":"Warrington","State":"PA","Zip":"18976","Lat":40.22504,"Lon":-75.13695,"Address":"425 Easton Rd"},
    "0736":{"Name":"Opelika","City":"Opelika","State":"AL","Zip":"36801","Lat":32.62048,"Lon":-85.40177,"Address":"1701 Frederick Rd"},
    "0737":{"Name":"Johnson City","City":"Johnson City","State":"TN","Zip":"37604","Lat":36.34396,"Lon":-82.40699,"Address":"180 Market Place Blvd"},
    "0738":{"Name":"Henderson","City":"Henderson","State":"NC","Zip":"27537","Lat":36.33863,"Lon":-78.43912,"Address":"166 Dabney Rd"},
    "0740":{"Name":"St. Petersburg","City":"Saint Petersburg","State":"FL","Zip":"33713","Lat":27.79311,"Lon":-82.66569,"Address":"2365 25th St North"},
    "0739":{"Name":"Lumberton","City":"Lumberton","State":"NC","Zip":"28358","Lat":34.6643,"Lon":-79.00352,"Address":"5060 Fayetteville Rd"},
    "0742":{"Name":"Ormond Beach","City":"Ormond Beach","State":"FL","Zip":"32174","Lat":29.26096,"Lon":-81.10723,"Address":"1340 West Granada Blvd"},
    "0741":{"Name":"Port Orange","City":"Port Orange","State":"FL","Zip":"32127","Lat":29.11193,"Lon":-81.0277,"Address":"1751 Dunlawton Ave"},
    "0748":{"Name":"Florissant","City":"Florissant","State":"MO","Zip":"63033","Lat":38.80923,"Lon":-90.29537,"Address":"3180 North Highway 67"},
    "0746":{"Name":"S. Charleston","City":"South Charleston","State":"WV","Zip":"25309","Lat":38.33641,"Lon":-81.71514,"Address":"#50 Rhl Blvd"},
    "0749":{"Name":"N. Chattanooga","City":"Hixson","State":"TN","Zip":"37343","Lat":35.13766,"Lon":-85.24601,"Address":"5428 Highway 153"},
    "0750":{"Name":"Kingwood","City":"Kingwood","State":"TX","Zip":"77339","Lat":30.04083,"Lon":-95.25319,"Address":"22600 Eastex Freeway/Highway 59 North"},
    "0751":{"Name":"Turnersville","City":"Turnersville","State":"NJ","Zip":"08012","Lat":39.73542,"Lon":-75.04179,"Address":"100 Watson Dr"},
    "0754":{"Name":"Oakland Park","City":"Oakland Park","State":"FL","Zip":"33311","Lat":26.16798,"Lon":-80.15584,"Address":"1001 West Oakland Park Blvd"},
    "0753":{"Name":"O'fallon","City":"Saint Peters","State":"MO","Zip":"63376","Lat":38.79074,"Lon":-90.69445,"Address":"8501 Mexico Rd"},
    "0755":{"Name":"Dublin","City":"Dublin","State":"OH","Zip":"43017","Lat":40.10075,"Lon":-83.09592,"Address":"6555 Dublin Center Dr"},
    "0756":{"Name":"N.E. Albuquerque","City":"Albuquerque","State":"NM","Zip":"87113","Lat":35.1725,"Lon":-106.5799,"Address":"6200 Paseo Del-Norte"},
    "0757":{"Name":"Plymouth Meeting","City":"Plymouth Meeting","State":"PA","Zip":"19462","Lat":40.10202,"Lon":-75.29401,"Address":"2002 Chemical Rd"},
    "0758":{"Name":"Rancho Santa Margarita","City":"Rancho Santa Margarita","State":"CA","Zip":"92688","Lat":33.64233,"Lon":-117.60131,"Address":"30481 Avenida De Las Flores"},
    "0759":{"Name":"Redlands","City":"Redlands","State":"CA","Zip":"92373","Lat":34.06126,"Lon":-117.21403,"Address":"1725 West Redlands Blvd"},
    "0760":{"Name":"Springdale","City":"Cincinnati","State":"OH","Zip":"45246","Lat":39.2847,"Lon":-84.46022,"Address":"505 East Kemper Rd"},
    "0761":{"Name":"Burton","City":"Burton","State":"MI","Zip":"48509","Lat":43.0163,"Lon":-83.62684,"Address":"4274 East Court St"},
    "0763":{"Name":"Manchester","City":"Manchester","State":"CT","Zip":"06042","Lat":41.80869,"Lon":-72.55369,"Address":"31 Buckland Hills Dr"},
    "0765":{"Name":"Kalamazoo","City":"Kalamazoo","State":"MI","Zip":"49009","Lat":42.29205,"Lon":-85.65015,"Address":"5125 West Main St"},
    "0764":{"Name":"Kirkwood","City":"Kirkwood","State":"MO","Zip":"63122","Lat":38.56129,"Lon":-90.40355,"Address":"1212 South Kirkwood Rd"},
    "0766":{"Name":"Massillon","City":"Massillon","State":"OH","Zip":"44646","Lat":40.76546,"Lon":-81.52297,"Address":"101 Massillon Marketplace Dr SW"},
    "0768":{"Name":"Westland","City":"Westland","State":"MI","Zip":"48185","Lat":42.33223,"Lon":-83.41094,"Address":"6555 Newburgh Rd"},
    "0767":{"Name":"N. Fayetteville","City":"Fayetteville","State":"NC","Zip":"28311","Lat":35.11545,"Lon":-78.88237,"Address":"3909 Ramsey St"},
    "0769":{"Name":"Irvine","City":"Irvine","State":"CA","Zip":"92602","Lat":33.72671,"Lon":-117.78724,"Address":"13300 Jamboree Rd"},
    "0770":{"Name":"Brooklyn","City":"Brooklyn","State":"OH","Zip":"44144","Lat":41.42353,"Lon":-81.73665,"Address":"7327 North Cliff Ave"},
    "0771":{"Name":"Clearwater","City":"Clearwater","State":"FL","Zip":"33761","Lat":28.01691,"Lon":-82.73969,"Address":"26990 North Hwy 19"},
    "0772":{"Name":"Bradenton","City":"Bradenton","State":"FL","Zip":"34203","Lat":27.44475,"Lon":-82.46146,"Address":"7395 52nd Pl East"},
    "0773":{"Name":"N.E. Long Beach","City":"Long Beach","State":"CA","Zip":"90808","Lat":33.82835,"Lon":-118.08904,"Address":"7300 East Carson St"},
    "0774":{"Name":"Rancho Cucamonga","City":"Rancho Cucamonga","State":"CA","Zip":"91730","Lat":34.10487,"Lon":-117.55527,"Address":"11399 Foothill Blvd"},
    "0775":{"Name":"Temecula","City":"Temecula","State":"CA","Zip":"92591","Lat":33.53079,"Lon":-117.14955,"Address":"40390 Winchester Rd"},
    "0777":{"Name":"W. Lansing","City":"Lansing","State":"MI","Zip":"48917","Lat":42.73711,"Lon":-84.67094,"Address":"320 Marketplace Blvd"},
    "0778":{"Name":"Round Rock","City":"Round Rock","State":"TX","Zip":"78681","Lat":30.48517,"Lon":-97.67754,"Address":"120 Sundance Pkwy"},
    "0779":{"Name":"Howell","City":"Howell","State":"MI","Zip":"48843","Lat":42.58325,"Lon":-83.87623,"Address":"1100 South Latson Rd"},
    "0780":{"Name":"Homestead","City":"Munhall","State":"PA","Zip":"15120","Lat":40.41311,"Lon":-79.90167,"Address":"690 Waterfront Dr East"},
    "0781":{"Name":"Huber Heights","City":"Huber Heights","State":"OH","Zip":"45424","Lat":39.87689,"Lon":-84.13986,"Address":"8421 Old Troy Pike"},
    "0784":{"Name":"Summerlin","City":"Las Vegas","State":"NV","Zip":"89128","Lat":36.18232,"Lon":-115.25795,"Address":"7550 West Washington"},
    "0783":{"Name":"Lakeland","City":"Lakeland","State":"FL","Zip":"33803","Lat":27.99936,"Lon":-81.92646,"Address":"3525 Lakeland Highlands Rd"},
    "0785":{"Name":"Central Long Beach","City":"Long Beach","State":"CA","Zip":"90815","Lat":33.80788,"Lon":-118.12239,"Address":"2840 Bellflower Blvd"},
    "0786":{"Name":"Washington","City":"Washington","State":"NC","Zip":"27889","Lat":35.56616,"Lon":-77.06138,"Address":"1701 Carolina Ave"},
    "0787":{"Name":"Danville","City":"Danville","State":"VA","Zip":"24540","Lat":36.59938,"Lon":-79.42502,"Address":"280 Lowe's Dr"},
    "0790":{"Name":"Bakersfield","City":"Bakersfield","State":"CA","Zip":"93308","Lat":35.38146,"Lon":-119.08989,"Address":"7825 Rosedale Highway"},
    "0791":{"Name":"Palmdale","City":"Palmdale","State":"CA","Zip":"93551","Lat":34.59945,"Lon":-118.14432,"Address":"39500 Lowes Dr"},
    "0792":{"Name":"Scottsdale","City":"Scottsdale","State":"AZ","Zip":"85254","Lat":33.6348,"Lon":-111.91807,"Address":"16285 North Scottsdale Rd"},
    "0795":{"Name":"Fresno","City":"Fresno","State":"CA","Zip":"93720","Lat":36.84696,"Lon":-119.79358,"Address":"7651 North Blackstone Ave"}}
    //  End of past section ==============
    ;

}
// end of script ....
my_debug('Lowes price checker script loaded');