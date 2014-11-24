/**
 * @fileOverview Web version of rocon remocon
 * @author Janghee Cho [roycho111@naver.com]
 * @copyright Yujin Robot 2014.
*/

var ros = new ROSLIB.Ros();
var glistRoles = [];
var glistInteractions = [];
var gUrlreadytoStart;

var gUrl;
var ncookieCnt;

// Starts here
$(document).ready(function () {
    Init();
    Connect();
    DisConnect();
    AddUrl();
    DeleteUrl();
    ListItemSelect();
    StartApp();
});


/**
 * Initialize lists, set ROS callbacks, read cookies.
 * @function Init
*/
function Init()
{
    settingROSCallbacks();
    ReadCookies();
    InitList();
}

/**
 * Receive and set ROS callbacks
 * @function settingROSCallbacks
*/
function settingROSCallbacks()
{
  ros.on('error', function(error) {
        // throw exception for error
        console.log('Connection refused. Is the master running?');
        alert('Connection refused. Is the master running?');

        $("#connectBtn").show();
        $("#disconnectBtn").hide();
        
        InitList();
    });

    ros.on('connection', function() {
        console.log('Connection made!');

        $("#connectBtn").hide();
        $("#disconnectBtn").show();
        
        InitList();
        DisplayMasterInfo();
        GetRoles();
        MasterInfoMode();
    });

    ros.on('close', function() {
        console.log('Connection closed.');

        $("#connectBtn").show();
        $("#disconnectBtn").hide();
        
        InitList();
    });
}

/**
 * Read cookies and add to url list
 * @function ReadCookies
*/
function ReadCookies()
{
    $.cookie.defaults = { path: '/', expires: 365 };

    ncookieCnt = $.cookie("cookieCount");

    // init cookie count
    if (ncookieCnt == null || ncookieCnt < 0) {
        $.cookie("cookieCount", 0);
        ncookieCnt = 0;
    }

    // read cookie and add to url list
    for (var i = 0; i < ncookieCnt; i++) {
        $("#urlList").append(new Option($.cookie("cookie_url" + i)));
        $("#urlList option:last").attr("cookieNum", i);
    }
}

/**
 * Event function when 'Connect' button clicked
 * @function Connect
*/
function Connect()
{
    $("#connectBtn").click(function () {
        var url = $("#urlList option:selected").val();
        
        if (url == "(Please add URL)") {
            return;
        }
    
        gUrl = url;

        // extract the exact url
        var newurl;
        newurl = url.replace("ws://", "");

        for (var i = 0; i < newurl.length; i++) {
            newurl = newurl.replace("/", "");
            newurl = newurl.replace(" ", "");
        }
        
        // set default port
        if (newurl.search(":") < 0) {
            newurl += ":9090";
        }

        try {
            ros.connect('ws://' + newurl);
            $(this).text = "Disconnect";
        } catch(e) {
            console.log(e.message);
            alert(e.message);
        }
    });
}

/**
 * Event function when 'Disconnect' button clicked
 * @function DisConnect
*/
function DisConnect()
{
    $("#disconnectBtn").hide();
    $("#disconnectBtn").click(function () {
        ros.close();
        AddUrlMode();
    });
}

/**
 * Event function when 'Add Url' button clicked
 * @function AddUrl
*/
function AddUrl()
{
    $("#addurl_addBtn").click(function () {
        var url = $("#typeURL").val();

        // set default string
        if (url == "" || url == "ws://") {
            url = "ws://localhost:9090";
        }

        // add url
        $("#urlList").append(new Option(url));
        $("#urlList option:last").attr("selected", "selected");
        $("#urlList option:last").attr("cookieNum", ncookieCnt);

        // add cookie
        $.cookie("cookie_url" + ncookieCnt, url);
        $.cookie("cookieCount", ++ncookieCnt);
    });
}

/**
 * Event function when 'Minus' button clicked
 * @function DeleteUrl
*/
function DeleteUrl()
{
    $("#urldeleteBtn").click(function () {
        if ($("#urlList option:selected").val() != "(Please add URL)") {
        
            // delete cookie
            var cookieNum = $("#urlList option:selected").attr("cookieNum");
            $.cookie("cookie_url" + cookieNum, null);
            
            if (ncookieCnt > 0) {
                $.cookie("cookieCount", --ncookieCnt);
            }
            
            $("#urlList option:selected").remove();

            var listCnt = $("#urlList option").length;
            var cnt = 0;

            // rearrange cookies
            // not including the first disabled option
            for (var i = 1; i < listCnt; i++) {
                var url = $("#urlList option:eq(" + i + ")").val();

                $("#urlList option:eq(" + i + ")").attr("cookieNum", cnt);
                $.cookie("cookie_url" + cnt, url);
                cnt++;
            }
        }
    });
}

/**
 * Display master's info to the screen
 * @function DisplayMasterInfo
*/
function DisplayMasterInfo()
{
    $("#selecturl").hide();
    $("#masterinfo").show();

    SubscribeTopic(ros, "/concert/info", "rocon_std_msgs/MasterInfo", function(message) {
        $("#masterinfopanel").append('<p style="float: left"><img src="data:' + message["icon"]["resource_name"] + ';base64,' + message["icon"]["data"] + '" alt="Red dot" style="height:75px; width:75px;"></p>');
        $("#masterinfopanel").append('<p><strong>&nbsp;&nbsp;&nbsp;name</strong> : ' + message["name"] +'</p>');
        $("#masterinfopanel").append('<p><strong>&nbsp;&nbsp;&nbsp;master_url</strong> : ' + gUrl +'</p>');
        $("#masterinfopanel").append('<p><strong>&nbsp;&nbsp;&nbsp;description</strong> : ' + message["description"] +'</p>');
    });
}

/**
 * Call service for roles and add to role list
 * @function GetRoles
*/
function GetRoles()
{
    var browser = GetBrowser();
    var request = new ROSLIB.ServiceRequest({
        uri : 'rocon:/*/*/*/' + browser
    });

    CallService(ros, '/concert/interactions/get_roles', 'rocon_interaction_msgs/GetRoles', request, function(result) {
        for (var i = 0; i < result.roles.length; i++) {
            glistRoles.push(result.roles[i]);
        }
        
        DisplayRoles();
    });
}

/**
 * Display the roles list to the screen
 * @function DisplayRoles
*/
function DisplayRoles()
{
    for (var i = 0; i < glistRoles.length; i++) {
        $("#roles_listgroup").append('<a href="#" id="rolelist_' + i + '" class="list-group-item"><strong>' + glistRoles[i] + '</strong></a>');
    }
}

/**
 * Call service for interactions and add to interaction list
 * @function GetInteractions
 *
 * @param {string} selectedrole
*/
function GetInteractions(selectedrole)
{
    var browser = GetBrowser();
    var request = new ROSLIB.ServiceRequest({
        roles : [selectedrole],
        uri : 'rocon:/*/*/*/' + browser
    });

    CallService(ros, '/concert/interactions/get_interactions', 'rocon_interaction_msgs/GetInteractions', request, function(result) {
        for (var i = 0; i < result.interactions.length; i++) {
            glistInteractions.push(result.interactions[i]);
        }
        
        DisplayInteractions();
    });
}

/**
 * Display the interaction list to the screen
 * @function DisplayInteractions
*/
function DisplayInteractions()
{
    for (var i = 0; i < glistInteractions.length; i++) {
    
        console.log("data : " + glistInteractions[i].icon.resource_name);
        console.log("data : " + glistInteractions[i].icon.data);
        
        $("#interactions_listgroup").append('<a href="#" id="interactionlist_' + i + '" class="list-group-item"><img src="data:' + glistInteractions[i].icon.resource_name + ';base64,' + glistInteractions[i].icon.data + '" alt="Red dot" style="height:50px; width:50px;"></img>&nbsp;&nbsp;&nbsp;<strong>' + glistInteractions[i].display_name + '</strong></a>');
    }
}

/**
 * Classify the interaction whether it's (web_url) or (web_app)
 * @function ClassifyInteraction
 *
 * @param {interaction} interaction
 * @returns {string} extracted url
*/
function ClassifyInteraction(interaction)
{
    var newurl;
    var url = interaction.name;

    if (url.search("web_url") >= 0) {
        newurl = url.substring(8, url.length - 1);
    }
    else if (url.search("web_app") >= 0) {
        var tempurl = url.substring(8, url.length - 1);
        newurl = PrepareWebappUrl(interaction, tempurl);
    }
    else {
        newurl = null;
    }

    return newurl;
}

/**
 * Url synthesiser for sending remappings and parameters information.
 * @function PrepareWebappUrl
 * 
 * @param {interaction} interaction
 * @param {string} base_url - url before edited
 * @returns {string} the final remapped url
*/
function PrepareWebappUrl(interaction, base_url)
{
    // convert and set the informations
    var interaction_data = {};
    interaction_data['display_name'] = interaction.display_name;
    interaction_data['parameters'] = jsyaml.load(interaction.parameters);
    interaction_data['remappings'] = {};

    $.each(interaction.remappings, function(key, value) {
        interaction_data['remappings'][value.remap_from] = value.remap_to;
    });
    
    // Package all the data in json format and dump it to one query string variable
    query_string_mappings = {};
    query_string_mappings['interaction_data'] = JSON.stringify(interaction_data);
    
    // Encode the url and finish constructing
    var url = base_url + "?interaction_data=" + encodeURIComponent(query_string_mappings['interaction_data']);

    return url;
}

/**
 * Display the description list to the screen
 * @function DisplayDescription
 *
 * @param {interaction} interaction
*/
function DisplayDescription(interaction)
{
    $("#startappBtn").show();
    
    $("#descriptionpanel").append('<p><strong>name</strong> : ' + interaction["name"] + '</p><hr>');
    
    $("#descriptionpanel").append('<p><strong>display_name</strong> : ' + interaction["display_name"] + '</p>');
    $("#descriptionpanel").append('<p><strong>description</strong> : ' + interaction["description"] + '</p>');
    $("#descriptionpanel").append('<p><strong>compatibility</strong> : ' + interaction["compatibility"] + '</p>');
    $("#descriptionpanel").append('<p><strong>namespace</strong> : ' + interaction["namespace"] + '</p><hr>');
    
    var remap_from;
    var remap_to;
    $.each(interaction["remappings"], function(key, value) {
        remap_from = value.remap_from;
        remap_to = value.remap_to;
    });
    
    $("#descriptionpanel").append('<p><strong>remappings</strong> : [remap_from:' + remap_from + '] [remap_to:' + remap_to +']</p>');
    $("#descriptionpanel").append('<p><strong>parameters</strong> : ' + interaction["parameters"] + '</p>');
}

/**
 * Event function when item in role list and interaction list is clicked
 * @function ListItemSelect
*/
function ListItemSelect()
{
    $("#roles_listgroup").on("click", "a", function (e) {
        e.preventDefault();
        
        ResetInteractionList();
        ResetDescriptionList();

        var nCnt = $("#roles_listgroup").children().length;
        for (var i = 0; i < nCnt; i++){
            $("#roles_listgroup").children(i).attr('class', 'list-group-item');
        }
        $(this).toggleClass('list-group-item list-group-item active');

        var nCnt = $(this).attr('id').charAt($(this).attr('id').length - 1);
        GetInteractions(glistRoles[nCnt]);
    });

    $("#interactions_listgroup").on("click", "a", function (e) {
        e.preventDefault();
        
        ResetDescriptionList();
        
        var nCnt = $("#interactions_listgroup").children().length;
        for (var i = 0; i < nCnt; i++){
            $("#interactions_listgroup").children(i).attr('class', 'list-group-item');
        }
        $(this).toggleClass('list-group-item list-group-item active');

        var nCnt = $(this).attr('id').charAt($(this).attr('id').length - 1);
        gUrlreadytoStart = ClassifyInteraction(glistInteractions[nCnt]);
        DisplayDescription(glistInteractions[nCnt]);
    });
}

/**
 * Event function when 'Start App' button is clicked
 * @function StartApp
*/
function StartApp()
{
    $("#startappBtn").hide();
    $("#startappBtn").click(function () {
        if (gUrlreadytoStart == null) {
            alert("not available on this platform");
            return;
        }
        window.open(gUrlreadytoStart);
    });
}

/**
 * Initialize all lists
 * @function InitList
*/
function InitList()
{
    ResetMasterInfo();
    ResetRoleList();
    ResetInteractionList();
    ResetDescriptionList();
    AddUrlMode();
}

/**
 * Initialize master's info panel
 * @function ResetMasterInfo
*/
function ResetMasterInfo()
{
    $("#masterinfopanel").children().remove();
}

/**
 * Initialize role list
 * @function ResetRoleList
*/
function ResetRoleList()
{
    glistRoles = [];
    $("#roles_listgroup").children().remove();
}

/**
 * Initialize interaction list
 * @function ResetInteractionList
*/
function ResetInteractionList()
{
    glistInteractions = [];
    $("#interactions_listgroup").children().remove();
    $("#startappBtn").hide();
}

/**
 * Initialize description list
 * @function ResetDescriptionList
*/
function ResetDescriptionList()
{
    $("#descriptionpanel").children().remove();
    $("#startappBtn").hide();
}

/**
 * Switch to masterinfo mode
 * @function MasterInfoMode
*/
function MasterInfoMode()
{
    $("#selecturl").hide();
    $("#masterinfo").show();
    $("#urladdBtn").hide();
    $("#urldeleteBtn").hide();
}

/**
 * Switch to addurl mode
 * @function AddUrlMode
*/
function AddUrlMode()
{
    $("#selecturl").show();
    $("#masterinfo").hide();
    $("#urladdBtn").show();
    $("#urldeleteBtn").show();
}

/**
 * Wrapper function for Service.callService
 * @function CallService
 *
 * @param {ROSLIB.Ros} ros - handled ros
 * @param {string} serviceName - service's name
 * @param {string} serviceType - service's type
 * @param {ROSLIB.ServiceRequest} request - request
 * @param {callBack} callback for request response
*/
function CallService(ros, serviceName, serviceType, request, callBack)
{
    var service = new ROSLIB.Service({
        ros : ros,
        name : serviceName,
        serviceType : serviceType
    });

    // get response
    try {
        service.callService(request, function(result){
            callBack(result);
        } , function(error) {
            alert(error);
            console.log(error);
        });
    } catch (e) {
        console.log(message);
        alert(e.message);
    } 
}

/**
 * Wrapper function for Topic.subscribe
 * @function CallService
 *
 * @param {ROSLIB.Ros} ros - handled ros
 * @param {string} topicName - topic's name
 * @param {string} msgType - message type
 * @param {callBack} callback for returned message
*/
function SubscribeTopic(ros, topicName, msgType, callBack)
{
    var listener = new ROSLIB.Topic({
        ros : ros,
        name : topicName,
        messageType : msgType
    });
    
    // get returned message
    listener.subscribe(function(message) {
        callBack(message);
        listener.unsubscribe();
    });
}

/**
 * Get browser name
 * @function GetBrowser
 *
 * @returns {string} current browser's name
*/
function GetBrowser()
{
    var agt = navigator.userAgent.toLowerCase();
    if (agt.indexOf("chrome") != -1) return 'chrome';
    if (agt.indexOf("opera") != -1) return 'opera';
    if (agt.indexOf("firefox") != -1) return 'firefox';
    if (agt.indexOf("safari") != -1) return 'safari';
    if (agt.indexOf("msie") != -1) return 'internet_explorer';
}




