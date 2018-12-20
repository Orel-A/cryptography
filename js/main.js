var currencies;
var reports = [];
var chartTimer = null;

$(() => {
    currencies = localStorage.getItem("currencies");
    currencies = currencies != null ? JSON.parse(currencies) : {};

    $("input[type=text]").on("keyup", responsiveSearch);

    $("#discardList > .btn-block").click(replaceCurrency);

    $("nav.navbar li").click(handleNavigation);

    $.getJSON("https://api.coingecko.com/api/v3/coins/list", (arr) => {
        $("main > h2").hide();

        for (let i = 0; i < arr.length && i < 100; i++)
            insertCurrency(arr[i]);
    });
});

var chartOptions = {
    title: {

    },
    axisX: {
        valueFormatString: "HH:mm",
    },
    axisY: {
        title: "Currency Value"
    },
};

function renderChart() {
    chartOptions.title.text = reports + " to USD";
    chartOptions.data = [];

    for (let i = 0; i < reports.length; i++) {
        chartOptions.data.push({
            type: "line",
            name: reports[i],
            showInLegend: true,
            xValueFormatString: "HH:mm:ss",
            yValueFormatString: "$#,##0.#",
            dataPoints: []
        });
    }

    var updateChart = () => {
        $.getJSON("https://min-api.cryptocompare.com/data/pricemulti?tsyms=USD&fsyms=" + reports, (obj) => {
            var date = new Date();
            for (let i = 0; i < reports.length; i++) chartOptions.data[i].dataPoints.push({
                x: date,
                y: obj[reports[i]].USD
            });
            $("#reports").CanvasJSChart(chartOptions);
        });
    };

    updateChart();
    chartTimer = setInterval(updateChart, 2000);
}

function handleNavigation(e) {
    e.preventDefault();
    $("nav.navbar li").removeClass("active");
    $(this).addClass("active");

    if (chartTimer) clearInterval(chartTimer);

    var nav = this.innerText.trim();

    if (nav == "Currencies") {
        $("main > div.row").show();
        $("main > .navbar-form").show();
    } else {
        $("main > div.row").hide();
        $("main > .navbar-form").hide();
    }

    if (nav == "Reports") {
        $("#reports").prop("hidden", false);
        if (reports.length > 0) {
            $("#reports").html(document.querySelector("main > h2").outerHTML).find("h2").show();
            renderChart();
        } else $("#reports").html(`<h2 class="text-center">Nothing was selected!</h2>`);
    } else $("#reports").prop("hidden", true);

    if (nav == "About") $("#about").prop("hidden", false);
    else $("#about").prop("hidden", true);
}

function responsiveSearch() {
    var value = this.value.toUpperCase();
    if (!value) {
        $("div.row > div.panel").show();
        return;
    }
    $("div.row > div.panel").filter(function () {
        $(this).toggle($(this).data("symbol") == value);
    });
}

function replaceCurrency() {
    document.querySelector(`div.row>div.panel[data-symbol=${this.innerText}] label.switch>input`).checked = false;
    reports.splice(reports.indexOf(this.innerText), 1);
    var symbol = document.getElementById("discardList").getAttribute("data-wish");
    reports.push(symbol);
    document.querySelector(`div.row>div.panel[data-symbol=${symbol}] label.switch>input`).checked = true;
}

function toggleEvent() {
    var symbol = $(this).parent().parent().data("symbol");
    if (!this.checked) {
        reports.splice(reports.indexOf(symbol), 1);
        return;
    }
    if (reports.length == 5) {
        var btns = document.querySelectorAll("#discardList > .btn-block");
        for (let i = 0; i < btns.length; i++) btns[i].innerText = reports[i];
        document.getElementById("discardList").setAttribute("data-wish", symbol);
        $("#limitModal").modal();
        return false;
    }
    reports.push(symbol);
}

function createToggle() {
    var label = document.createElement("label");
    label.className = "switch pull-right";
    var input = document.createElement("input");
    input.onclick = toggleEvent;
    input.setAttribute("type", "checkbox");
    label.appendChild(input);
    label.appendChild(document.createElement("span"));
    return label;
}

function insertCurrency(obj) {
    obj.symbol = obj.symbol.toUpperCase();
    var ctr = document.createElement("div");
    ctr.className = "panel panel-default panel-body";
    ctr.setAttribute("data-id", obj.id);
    ctr.setAttribute("data-symbol", obj.symbol);
    ctr.appendChild(createToggle());

    var title = document.createElement("h4");
    title.innerText = obj.symbol;
    ctr.appendChild(title);

    var p = document.createElement("p");
    p.innerText = obj.name;
    ctr.appendChild(p);

    var btn = document.createElement("button");
    btn.className = "btn btn-info";
    btn.innerText = "More Info";
    btn.onclick = fetchInfo;
    btn.setAttribute("data-loading-text", `<i class="fa fa-spinner fa-spin"></i> Loading...`);
    ctr.appendChild(btn);

    var collapser = document.createElement("div");
    collapser.className = "panel panel-default panel-body collapse";
    ctr.appendChild(collapser);

    document.querySelector("main.container > div.row").appendChild(ctr);
}

function populateCollapser(collapser, obj) {
    collapser.innerHTML = "";

    var img = document.createElement("img");
    img.setAttribute("src", obj.img);
    img.setAttribute("alt", obj.id);
    img.className = "img-responsive";
    collapser.appendChild(img);

    var div = document.createElement("div");
    div.innerText = `USD: ${obj.usd}$\nEUR: ${obj.eur}€\nILS: ${obj.ils}₪`;
    collapser.appendChild(div);
}

function fetchInfo() {
    var ctr = this.parentElement;
    var collapser = ctr.querySelector(".panel");
    var symbol = ctr.getAttribute("data-symbol");
    var last = Math.floor(Date.now() / 1000) - 120;

    if (currencies[symbol] && currencies[symbol].now > last) {
        if (!collapser.innerHTML) populateCollapser(collapser, currencies[symbol]);
        $(collapser).collapse("toggle");
        return;
    }

    if ($(collapser).hasClass("in")) {
        $(collapser).collapse("hide");
        return;
    }

    $(this).button("loading");

    $.getJSON("https://api.coingecko.com/api/v3/coins/" + ctr.getAttribute("data-id"), (obj) => {
        currencies[symbol] = {
            id: obj.id,
            img: obj.image.large,
            usd: obj.market_data.current_price.usd,
            eur: obj.market_data.current_price.eur,
            ils: obj.market_data.current_price.ils,
            now: Math.floor(Date.now() / 1000)
        };
        localStorage.setItem("currencies", JSON.stringify(currencies));

        populateCollapser(collapser, currencies[symbol]);
        $(collapser).collapse("show");
    }).always(() => $(this).button("reset"));
}