function ajaxGET(url, callback) {

    const xhr = new XMLHttpRequest();

    xhr.onload = function () {
        let value = this.responseText;
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            value = this.responseText;
            callback(this.responseText);

        } else {
            console.log(this.status);
        }
    }
    xhr.open("GET", url); // localhost:8000/galleries?format=html
    xhr.send();

}

let homeContent = document.getElementById("card").innerHTML;
document.querySelector(".logo").addEventListener("click",
          function(event) { 
            let div = document.getElementsByClassName("card-group");
            document.getElementById("card").innerHTML = homeContent }, false);

document.querySelector("#artworksJSON").addEventListener("click", function (e) {
    ajaxGET("/artworks?format=json", function (data) {
        
        // this call is JSON so we have to parse it
        let parsedData = JSON.parse(data);

        let container = document.createElement("div");
        let div1 = document.createElement("div");
        div1.setAttribute("id", "artworks-json");
        let header = document.createElement("div");
        header.setAttribute("id", "header");
        header.innerHTML = "<hr> <h2>Welcome to Galleries</h2>";
        div1.appendChild(header);
        for (let i = 0; i < parsedData.length; i++) {
            let item = parsedData[i];
            let div = document.createElement("div");
            div.setAttribute("id", "artwork" + i);
            div.innerHTML = "<img class='image" + "' alt='imgages' src='" + item["image"] + "'/>" + "<p><i>" + item["title"] + "</i></p>"
                + "<p>" + item["artist"] + "</p>" + "<p>" + item["year"] + "</p>" + "<p><i>" + item["price"] + "</i></p>" + "<br/><br/>";
            div1.appendChild(div);
        }
        container.appendChild(div1);
        document.getElementById("card").innerHTML = container.innerHTML;

    });

});

document.querySelector("#galleriesHTML").addEventListener("click", function (e) {
    
    ajaxGET("/galleries?format=html", function (data) {

        let container = document.createElement("div");
        container.setAttribute("id", "galleries-html");
        let header = document.createElement("div");
        header.setAttribute("id", "header-galleries");
        header.innerHTML = "<hr> <h2>Welcome to Galleries</h2>";
        let div = document.createElement("div");
        div.setAttribute("id", "gallerieshtml");
        div.innerHTML = data;
        container.appendChild(header);
        container.appendChild(div);

        document.getElementById("card").innerHTML = container.innerHTML;
    });

});

