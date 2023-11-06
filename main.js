const http = require("http")
const htmlParser = require('node-html-parser')

const url = "localhost" // "192.168.0.13"

const server = http.createServer(async (req, res) => {
    let url = req.url

    try
    {
        if (url.startsWith("/get"))
        {

            let levelId = url.replace("/get/", "")
            if (!levelId.match(/\d\d\d\d-\d\d\d\d/)) // such a silly regex
            {
                serverEndRequest(res, "err:lvl-id-invalid-regex")
                return
            }
    
            let document = htmlParser.parse (
                await corsFetch("https://www.supersparkmaker.com/" + levelId)
            )
    
            if (document.querySelector("title").innerText == "Wrong Url | Super Spark Maker")
            {
                serverEndRequest(res, "err:lvl-id-invalid-fetched")
                return
            }

            // Here's where the magic happens:
            // anything prefixed by $ is level data and should only be set once
    
            let title = document.querySelector("title").innerText
            let $name = title.split(" - by ")[0]
            let $creator = title.split(" - by ")[1]

            let $description = document.querySelector("textarea").innerHTML

            let scriptTag = document.querySelector(".gameWrap").querySelector("script")

            // levelData starts from `level = JSON.parse('` and ends with `');`
            let $levelData = getStringBetween(scriptTag.innerText, `level = JSON.parse('`, `');`)
            
            serverEndRequest(res, JSON.stringify({
                name: $name,
                creator: $creator,
                description: $description,
                levelData: $levelData
            }), "application/json")
            return
        }
        else if (url == "/random")
        {
            let string = await corsFetch("https://www.supersparkmaker.com/random")
            
            let randomLevelId = getStringBetween(string, `location.href = '/`, `';`)

            serverEndRequest(res, JSON.stringify({
                id: randomLevelId
            }))
            return
        }
    }
    catch(e)
    {
        serverEndRequest(res, "err:unknown-internal")
        console.log("Internal server error!")
        console.log(e)
        return
    }

    serverEndRequest(res, "404")
    return
})

function run()
{
    server.listen(8080, url, () => {
        console.log(`Server is listening at port 8080`)
    })
}

function serverEndRequest(res, data="", contentType="text/plain")
{
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Content-Type", contentType)
    res.write(data)
    res.end()
}

function corsFetch(url)
{
    return new Promise(resolve => {
        fetch("http:127.0.0.1:1000/" + url)
        .then(data => data.text())
        .then(data => {
            resolve(data)
        })
    })
}

function getStringBetween(string, first, last)
{
    // https://stackoverflow.com/a/27522597/
    return string.split(first).pop().split(last)[0];
}

module.exports = { run }
