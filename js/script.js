var masterList = 0;

// Connect Btn - master chooser
$(document).ready(function () {
    $("#connectBtn").click(function () {
        var btn = $(this);
        btn.button('loading');
        setTimeout(function () {
            btn.button('reset');
            window.location.href = 'rolechooser.html';
        }, 2000);
    });
});

$(document).ready(function () {
    $("#nextBtn_role").click(function () {
        window.location.href = 'interactionchooser.html';
    });
});

$(document).ready(function () {
    $("#backBtn_role").click(function () {
        window.location.href = 'masterchooser.html';
    });
});

$(document).ready(function () {
    $("#backBtn_interaction").click(function () {
        window.location.href = 'rolechooser.html';
    });
});

// Add Url Button
$(document).ready(function () {
    $("#addurl_addBtn").click(function () {
        var url = $("#addurl_masterurl").val();
        var name = $("#addurl_hostname").val();

        if (url == "") {
            url = "http://localhost:11311";
        }
        if (name == "") {
            name = "localhost";
        }
        $("#masterchooser_selectbox").append(new Option(name, url));    // add to list
        $("#masterchooser_selectbox option:last").attr("selected", "selected");      // select the last one

        var namestr = $("#masterchooser_selectbox option:last").text();
        var urlstr = $("#masterchooser_selectbox option:last").val();
        setMasterInfoStr(namestr, urlstr);
    });
});

// Delete selected masterselect_box items
$(document).ready(function () {
    $("#deleteBtn").click(function () {
        $("#masterchooser_selectbox option:selected").remove();
        var namestr = $("#masterchooser_selectbox option:selected").text();
        var urlstr = $("#masterchooser_selectbox option:selected").val();
        setMasterInfoStr(namestr, urlstr);
    });
});

// Delete all masterselect_box items
$(document).ready(function () {
    $("#deleteAllBtn").click(function () {
        $("#masterchooser_selectbox").children().remove();
    });
});

// Get value when masterselect_box is changed
$(document).ready(function () {
    $("#masterchooser_selectbox").change(function () {
        var namestr = $(this).children("option:selected").text();
        var urlstr = $(this).val();
        setMasterInfoStr(namestr, urlstr);
    });
});

//************** wrapper functions**************//

function setMasterInfoStr(name, url) {
    $("#master_name").text("master name : " + name);
    $("#master_url").text("master url : " + url);
}