var ros = new ROSLIB.Ros();
var glistRoles = [];
var glistInteractions = [];
var gInteractionsData = [];
var gUrlreadytoStart;


/*** main ***/
$(document).ready(function () {
    Init();
    Connect();
    DisConnect();
    AddUrl();
    ListItemSelect();
    StartApp();
});

function Init()
{
    settingROSCallbacks();
}

function settingROSCallbacks()
{
  ros.on('error', function(error) {
        console.log('error occured on ' + error.target + " : " + error.target.url);
        alert('error occured on ' + error.target + " : " + error.target.url);
        $("#connectionInfo").val("Disconnected");
        $("#connectionInfo").attr("style", "color:red");
        
        $("#connectBtn").show();
        $("#disconnectBtn").hide();
    });

    ros.on('connection', function() {
        console.log('Connection made!');
        $("#connectionInfo").val("Connected");
        $("#connectionInfo").attr("style", "color:green");
        
        $("#connectBtn").hide();
        $("#disconnectBtn").show();
    });

    ros.on('close', function() {
        console.log('Connection closed.');
        $("#connectionInfo").val("Disconnected");
        $("#connectionInfo").attr("style", "color:red");
        
        $("#connectBtn").show();
        $("#disconnectBtn").hide();
    });
}

function Connect()
{
    $("#connectBtn").click(function () {
        var url = $("#urlList option:selected").attr("url");
        var name = $("#urlList option:selected").attr("hostname");

        url.toLowerCase();
        var bhttp_exist = url.search("http://");
        var bhttps_exist = url.search("https://");
        
        var trimCnt = 0;
        if (bhttp_exist >= 0) {
            trimCnt = 7;
        }
        if (bhttps_exist >= 0) {
            trimCnt = 8;
        }

        if (url.charAt(url.length -1) == "/") {
            url = url.substring(0, url.length - 1);
        }

        url = url.substring(trimCnt, url.length);

        try {
            ros.connect('ws://' + url + ':9090');
            $(this).text = "Disconnect";
        }
        catch(e) {
            console.log(e.message);
            alert(e.message);
        }
        
        GetRoles();
    });
}

function DisConnect()
{
    $("#disconnectBtn").hide();
    $("#disconnectBtn").click(function () {
        ros.close();
        
        ResetRoleList();
        ResetInteractionList();
        ResetDescriptionList();
    });
}

function AddUrl()
{
    $("#addurl_addBtn").click(function () {
        var url = $("#typeURL").val();
        var name = $("#typeHostName").val();

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

        var namestr = $("#urlList option:last").text();
        var urlstr = $("#urlList option:last").val();
    });
}

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

function DisplayRoles()
{
    for (var i = 0; i < glistRoles.length; i++) {
        $("#roles_listgroup").append('<a href="#" id="rolelist_' + i + '" class="list-group-item">' + glistRoles[i] + '</a>');
    }
}

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

function DisplayInteractions()
{
    for (var i = 0; i < glistInteractions.length; i++) {
        $("#interactions_listgroup").append('<a href="#" id="interactionlist_' + i + '" class="list-group-item">' + glistInteractions[i].display_name + '</a>');
    }
}

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


function PrepareWebappUrl(interaction, base_url)
{
    gInteractionsData['display_name'] = interaction.display_name;
    gInteractionsData['parameters'] = jsyaml.load(interaction.parameters);
    gInteractionsData['remappings'] = [];
    for (var r in interaction.remappings) {
        gInteractionsData['remappings'][r.remap_from] = r.remap_to;
    }
    
    console.log("Remocon Info : web app query string %s" % interaction_data);
    
    query_string_mappings = [];
    query_string_mappings['interaction_data'] = JSON.stringfly(gInteractionsData);

    return base_url + "?" + encodeURIComponent(query_string_mappings);
}

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
        $("#descriptionpanel").append('<p>[ ' + key + '</span> : ' + value + ' ]</p>');
    });

}

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

function ResetRoleList()
{
    glistRoles = [];
    $("#roles_listgroup").children().remove();
}

function ResetInteractionList()
{
    $("#interactions_listgroup").children().remove();
    glistInteractions = [];
    $("#startappBtn").hide();
}

function ResetDescriptionList()
{
    $("#descriptionpanel").children().remove();
    $("#startappBtn").hide();
}

/****************Wrapper******************/
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







