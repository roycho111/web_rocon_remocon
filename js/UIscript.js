/**
    * @author Janghee Cho - roycho111@naver.com
*/

var ros = new ROSLIB.Ros();
var glistRoles = [];
var glistInteractions = [];
var gInteractionsData = [];
var gUrlreadytoStart;

var gUrl;
var gHostname;

/**
    * Starts from here
*/
$(document).ready(function () {
    Init();
    Connect();
    DisConnect();
    AddUrl();
    ListItemSelect();
    StartApp();
});

/**
    * Initialize lists and set ROS callbacks
    *
*/
function Init()
{
    settingROSCallbacks();
    InitList();
}


/*
    * Receives following ROS callbacks and throw exception for error
    *    * 'error'
    *    * 'connection'
    *    * 'close' 
    *
    * Updates connectionInfo text
    *
*/
function settingROSCallbacks()
{
  ros.on('error', function(error) {
        // throw exception for error
        console.log('Connection refused. Is the master running?');
        alert('Connection refused. Is the master running?');

        $("#connectionInfo").val("Disconnected");
        $("#connectionInfo").attr("style", "color:red");
        
        $("#connectBtn").show();
        $("#disconnectBtn").hide();
        
        InitList();
    });

    ros.on('connection', function() {
        console.log('Connection made!');
        $("#connectionInfo").val("Connected");
        $("#connectionInfo").attr("style", "color:green");
        
        $("#connectBtn").hide();
        $("#disconnectBtn").show();
        
        InitList();
        DisplayMasterInfo()
        GetRoles();
    });

    ros.on('close', function() {
        console.log('Connection closed.');
        $("#connectionInfo").val("Disconnected");
        $("#connectionInfo").attr("style", "color:red");
        
        $("#connectBtn").show();
        $("#disconnectBtn").hide();
        
        InitList();
    });
}

/**
    * Event function when 'Connect' button clicked
    *
    *   1. get the url, hostname value out of selected url list
    *   2. extract the url
    *   3. connect to rosbridge
    *
*/
function Connect()
{
    $("#connectBtn").click(function () {
        var url = $("#urlList option:selected").attr("url");
        var name = $("#urlList option:selected").attr("hostname");
        
        gUrl = url;
        gHostname = name;

        // extracts the exact url
        var newurl;
        newurl = url.replace("http://", "");
        newurl = newurl.replace("https://", "");
        
        for (var i = 0; i < newurl.length; i++) {
            newurl = newurl.replace("/", "");
            newurl = newurl.replace(" ", "");
        }

        try {
            ros.connect('ws://' + newurl + ':9090');
            $(this).text = "Disconnect";
        } catch(e) {
            console.log(e.message);
            alert(e.message);
        }
    });
}

/**
    * Event function when 'Disconnect' button clicked
    *
*/
function DisConnect()
{
    $("#disconnectBtn").hide();
    $("#disconnectBtn").click(function () {
        ros.close();
    });
}

/**
    * Event function when 'Add Url' button clicked
    *
    *   1. get the value of currently typed url and hostname
    *   2. add to url list
    *
*/
function AddUrl()
{
    $("#addurl_addBtn").click(function () {
        var url = $("#typeURL").val();
        var name = $("#typeHostName").val();

        // set default string
        if (url == "" || url == "http://") {
            url = "http://localhost";
        }
        if (name == "") {
            name = "localhost";
        }

        $("#urlList").append(new Option("<" + name + ">  :  " + url));
        $("#urlList option:last").attr("hostname", name);
        $("#urlList option:last").attr("url", url);
        $("#urlList option:last").attr("selected", "selected");
    });
}

function DisplayMasterInfo()
{
    GetParam(ros, "/concert/name", function(value) {
        $("#masterinfopanel").append('<p><strong>name</strong> : ' + value +'</p>');
    });
    
    $("#masterinfopanel").append('<p><strong>master_url</strong> : ' + gUrl +'</p>');
    $("#masterinfopanel").append('<p><strong>hostname</strong> : ' + gHostname +'</p>');

    GetParam(ros, "/concert/description", function(value) {
        $("#masterinfopanel").append('<p><strong>description</strong> : ' + value +'</p>');
    });
}

/**
    * Call service for roles and add to role list
    *
*/
function GetRoles()
{
    var request = new ROSLIB.ServiceRequest({
        uri : 'rocon:/*'
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
    *
*/
function DisplayRoles()
{
    for (var i = 0; i < glistRoles.length; i++) {
        $("#roles_listgroup").append('<a href="#" id="rolelist_' + i + '" class="list-group-item"><strong>' + glistRoles[i] + '</strong></a>');
    }
}

/**
    * Call service for interactions and add to interaction list
    * 
    *
    *   @param : selectedrole - string
*/
function GetInteractions(selectedrole)
{
    var request = new ROSLIB.ServiceRequest({
        roles : [selectedrole],
        uri : 'rocon:/*'
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
    *
*/
function DisplayInteractions()
{
    for (var i = 0; i < glistInteractions.length; i++) {
        $("#interactions_listgroup").append('<a href="#" id="interactionlist_' + i + '" class="list-group-item"><img src="data:' + glistInteractions[i].icon.resource_name + ';base64,' + glistInteractions[i].icon.data + 'alt="Red dot" style="height:50px; width:50px;"></img>&nbsp;&nbsp;&nbsp;<strong>' + glistInteractions[i].display_name + '</strong></a>');
    }
}

/**
    * Classify the interaction whether it's (web_url) or (web_app)
    *
    *
    *   @param : interaction - interactions[]
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
    *
    *   1. convert and set the informations
    *       - parameter (yaml string)
    *       - remapping (rocon_std_msgs.Remapping[])
    *   2. Package all the data in json format and dump it to one query string variable
    *   3. Encode the url and finish constructing
*/
function PrepareWebappUrl(interaction, base_url)
{
    var interaction_data = {};
    interaction_data['display_name'] = interaction.display_name;
    interaction_data['parameters'] = jsyaml.load(interaction.parameters);
    interaction_data['remappings'] = {};

    $.each(interaction.remappings, function(key, value) {
        interaction_data['remappings'][value.remap_from] = value.remap_to;
    });
    
    query_string_mappings = {};
    query_string_mappings['interaction_data'] = JSON.stringify(interaction_data);

    console.log(query_string_mappings['interaction_data']);
    
    var url = base_url + "?interaction_data=" + encodeURIComponent(query_string_mappings['interaction_data']);

    return url;
}

/**
    * Display the description list to the screen
    *
*/
function DisplayDescription(interaction)
{
    $("#startappBtn").show();

    $.each(interaction, function(key, value) {
        if (key == "remappings") {
            return true;
        }
        $("#descriptionpanel").append('<p><span style="font-weight:bold">' + key + '</span> : ' + value + '</p>');
    });
    
    $("#descriptionpanel").append('<p><span style="font-weight:bold">remappings</span> : </p>');
    $.each(interaction["remappings"], function(key, value) {
        $("#descriptionpanel").append('<p>[remap_from] : ' + value.remap_from + '</p>');
        $("#descriptionpanel").append('<p>[remap_to] : ' + value.remap_to + '</p>');
    });

}

/**
    * Event function when items in list is clicked
    *
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

function InitList()
{
    ResetMasterInfo();
    ResetRoleList();
    ResetInteractionList();
    ResetDescriptionList();
}

function ResetMasterInfo()
{
    $("#masterinfopanel").children().remove();
}

function ResetRoleList()
{
    glistRoles = [];
    $("#roles_listgroup").children().remove();
}

function ResetInteractionList()
{
    glistInteractions = [];
    $("#interactions_listgroup").children().remove();
    $("#startappBtn").hide();
}

function ResetDescriptionList()
{
    $("#descriptionpanel").children().remove();
    $("#startappBtn").hide();
}

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

function GetParam(ros, paramName, callBack)
{
    var request = new ROSLIB.Param({
        ros : ros,
        name : paramName
    });
    
    request.get(function(value) {
        callBack(value);
    });
}





