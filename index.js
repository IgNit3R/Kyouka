var page = 0;
var maxPage = 0;
var per = 10;

var lastReq = JSON.stringify({history: 0});
var lastApi = "";

var mock = false;
var allow = true;
var waitTime = 1;

var nowHistoryTime = 0;

var bossData = {
    scoreRate: [
        [1, 1, 1.1, 1.1, 1.2],
        [1.2, 1.2, 1.5, 1.7, 2],
    ],
    hp: [6000000, 8000000, 10000000, 12000000, 20000000],
    max: 2,
    baseTime: 1593464400,
    endTime: 1593964800,
};

function convertTime(date) {
    return new Date(date * 1000).toLocaleString([], { minute: "numeric", hour: "numeric", day: "numeric", month: "narrow", year: "numeric" });
}

function serverError(xhr, state, errorThrown) {
    $(".search").button("reset");
    alert(xhr.responseJSON.msg);
}

function transPage() {
    var p = prompt("请输入要跳转的页码");
    if (p != null) {
        var g = parseInt(p);
        if (!isNaN(g)) {
            if (g <= 0 || g > maxPage) {
                alert("页码超出范围，请重试");
            } else {
                page = g - 1;
                getPage(page);
            }
        }
    }
}

function processPage() {
    allow = false;
    setTimeout(function () {
        allow = true;
    }, waitTime * 1000);
    $("#page2")[0].innerText = page + 1 + "/" + (maxPage == 0 ? 1 : maxPage);
    if (page <= 0) {
        $("#prev").attr("class", "previous disabled");
    } else {
        $("#prev").attr("class", "previous");
    }
    if (page + 1 >= maxPage) {
        $("#next").attr("class", "next disabled");
    } else {
        $("#next").attr("class", "next");
    }
}

function reset()
{
	nowHistoryTime = 0;
	lastReq = JSON.stringify({history: 0})
	defaultPage();
}

function calcHp(clanName, hpBase) {
    $(".footer2").show();
    var zm = 1;
    var king = 1;
    var cc = 0.0;
    var remain = 0.0;
    var damage = 0;
    var remainHp = 0.0;
    var remainPer = 0.0;
    while (true) {
        var nowZm = zm > bossData.max ? bossData.max - 1 : zm - 1;
        cc += bossData.scoreRate[nowZm][king - 1] * bossData.hp[king - 1];
        if (cc > hpBase) {
            cc -= bossData.scoreRate[nowZm][king - 1] * bossData.hp[king - 1];
            remain = (hpBase - cc) / bossData.scoreRate[nowZm][king - 1];
            damage += remain;
            remainPer = 1.0 - remain / bossData.hp[king - 1];
            remainHp = bossData.hp[king - 1] - remain;
            break;
        }
        damage += bossData.hp[king - 1];
        if (king == 5) {
            zm++;
            king = 1;
            continue;
        }
        king++;
    }
    remainPer *= 100;
    $(".clanName").text(clanName);
    $(".hpDetail").text(zm + "周目" + king + "王 [" + parseInt(remainHp) + "/" + bossData.hp[king - 1] + "]");
    $(".hp").attr("style", "width: " + remainPer + "%");
    $(".hp").text(remainPer.toFixed(2) + "%");
}

function searchFav() {
    $(".search").button("loading");
    page = 0;
    $.ajax({
        url: apiUrl + "/fav",
        type: "POST",
        dataType: "JSON",
        async: true,
        contentType: "application/json",
        data: JSON.stringify({ids: JSON.parse(Cookies.get("fav")), history: parseInt(nowHistoryTime)}),
        success: processData,
        error: serverError,
    });
}

function favLeader(leaderId, favId) {
    var i = $("#fav" + favId);
    var fav = JSON.parse(Cookies.get("fav"));
    var idx = fav.indexOf(leaderId);
    if (idx == -1) {
        if (fav.length >= 5) {
            alert("收藏过多，请取消一些收藏的公会");
            return;
        }
        fav.push(leaderId);
        i.attr("class", "glyphicon glyphicon-heart");
    } else {
        fav.splice(idx, 1);
        i.attr("class", "glyphicon glyphicon-heart-empty");
    }
    Cookies.set("fav", JSON.stringify(fav), { expires: 30 });
}

function setTableData(table) {
    $("#clanCore").html("");
    if (navigator.cookieEnabled) {
        if (Cookies.get("fav") == undefined) {
            Cookies.set("fav", "[]", { expires: 30 });
        }
        var fav = JSON.parse(Cookies.get("fav"));
    }
    for (var i = 0; i < table.length; i++) {
        var nm = table[i].clan_name == undefined ? "该行会已经解散。" : table[i].clan_name;
        var lnm = table[i].clan_name == undefined ? "" : table[i].leader_name;
        var tr = $(
            "<tr>" +
                "<td>" +
                table[i].rank +
                "</td>" +
                "<td>" +
                nm +
                "</td>" +
                "<td>" +
                table[i].damage +
                "</td>" +
                "<td>" +
                lnm +
                "</td>" +
                (navigator.cookieEnabled
                    ? "<td><a onclick='favLeader(" +
                      table[i].leader_viewer_id +
                      ", " +
                      i +
                      ");'><span id='fav" +
                      i +
                      "' class='glyphicon glyphicon-" +
                      (fav.indexOf(table[i].leader_viewer_id) == -1 ? "heart-empty" : "heart") +
                      "'></span></a></td>"
                    : "") +
                "</tr>"
        );
        tr.appendTo($("#clanCore"));
        tr.attr("name", nm);
        tr.attr("damage", table[i].damage);
        tr[0].onclick = function () {
            calcHp($(this).attr("name"), $(this).attr("damage"));
        };
    }
    $(".search").button("reset");
}

var apiUrl = mock ? "http://localhost:5002/clan" : "https://service-kjcbcnmw-1254119946.gz.apigw.tencentcs.com";

function onRadioChanged() {
    $("#bar").val("");
    var c = $('input:radio[name="searchType"]:checked').val();
    switch (parseInt(c)) {
        case 1:
        case 4:
            $("#bar").attr("type", "number");
            break;
        case 2:
        case 3:
            $("#bar").attr("type", "text");
            break;
        default:
            return;
    }
}

function historyRank(time) {
    page = 0;
	nowHistoryTime = time;
	lastReq = JSON.stringify({history: parseInt(time)})
	defaultPage();
}

var lst = ["#historyList", "#historyListMobile"];
function processHistory(data) {
    for (var j = 0; j < lst.length; j++) {
        $(lst[j]).html("");
        for (var i = 0; i < data.length; i++) {
            var li = $("<li><a>" + convertTime(data[i]) + "</a></li>");
            li.appendTo($(lst[j]));
            li.attr("time", data[i]);
            li[0].onclick = function () {
                historyRank($(this).attr("time"));
                $(".navbar-collapse").collapse("hide");
            };
        }
    }
}

function processData(data) {
    if (data.history != undefined) {
        processHistory(data.history);
    }
    $("#time").attr("ts", data.ts);
    $("#time").text(convertTime(data.ts));
    maxPage = Math.ceil((data.full * 1.0) / per);
    setTableData(data.data);
    processPage();
}

function defaultPage() {
	$(".search").button("loading");
    page = 0;
    lastApi = "/page/";
	if (nowHistoryTime == 0)
	{
		$.ajax({
		    url: apiUrl + "/default",
		    type: "GET",
		    dataType: "JSON",
		    async: true,
		    success: processData,
		    error: serverError,
		});
	}
	else
	{
		$.ajax({
		    url: apiUrl + "/page/0",
		    type: "POST",
		    dataType: "JSON",
			contentType: "application/json",
		    async: true,
			data: JSON.stringify({history: parseInt(nowHistoryTime)}),
		    success: processData,
		    error: serverError,
		});
	}
}

window.onload = defaultPage;

function getPage(pageNum) {
    if (!allow) {
        alert("休息一下再翻页吧");
        return;
    }
    if (pageNum < 0 || pageNum >= maxPage) return;
    $(".search").button("loading");
    page = pageNum;
    $.ajax({
        url: apiUrl + lastApi + pageNum,
        type: "POST",
        dataType: "JSON",
        async: true,
        contentType: "application/json",
        data: lastReq,
        success: processData,
        error: serverError,
    });
}

function searchRank() {
    $(".search").button("loading");
    page = 0;
    $.ajax({
        url: apiUrl + "/line",
        type: "POST",
        dataType: "JSON",
        async: true,
        contentType: "application/json",
		data: JSON.stringify({history: parseInt(nowHistoryTime)}),
        success: function (data) {
            $("#time").text(convertTime(data.ts));
            processData(data);
        },
        error: serverError,
    });
}

function search() {
    if ($("#bar").val() == "") {
        defaultPage();
        return;
    }
    var c = $('input:radio[name="searchType"]:checked').val();
    var text = $("#bar").val();
    rank = -1;
    switch (parseInt(c)) {
        case 1:
            lastApi = "/rank/";
            rank = parseInt(text);
			lastReq = JSON.stringify({history: parseInt(nowHistoryTime)})
            break;
        case 2:
            lastApi = "/name/";
            lastReq = JSON.stringify({history: parseInt(nowHistoryTime), clanName: text });
            break;
        case 3:
            lastApi = "/leader/";
            lastReq = JSON.stringify({history: parseInt(nowHistoryTime), leaderName: text });
            break;
        case 4:
            lastApi = "/score/";
            rank = parseInt(text);
			lastReq = JSON.stringify({history: parseInt(nowHistoryTime)})
            break;
    }
    page = 0;
    $.ajax({
        url: apiUrl + lastApi + (rank != -1 ? rank : 0),
        type: "POST",
        dataType: "JSON",
        async: true,
        contentType: "application/json",
        data: lastReq,
        success: processData,
        error: serverError,
    });
}
