const http = require("http")
const htmlParser = require("node-html-parser")

const url = "192.168.0.13"

const errorCodes = {
    unknownInternal: "err:unknown-internal",

    idInvalidRegex: "err:lvl-id-invalid-regex",
    idInvalidFetched: "err:lvl-id-invalid-fetched",

    listInvalidRegex: "err:list-id-invalid-regex",
    listInvalidFetched: "err:list-id-invalid-fetched"
}

const levelIdRegex = /^\d\d\d\d-\d\d\d\d$/m

const server = http.createServer(async (req, res) => {
    let url = req.url

    try
    {
        if (url.startsWith("/level/"))
        {
            let levelId = url.replace("/level/", "")
            if (!levelId.match(levelIdRegex)) // such a silly regex
            {
                serverEndRequest(res, errorCodes.idInvalidRegex)
                return
            }
    
            let document = htmlParser.parse (
                await corsFetch("https://www.supersparkmaker.com/" + levelId)
            )
    
            if (document.querySelector("title").innerText == "Wrong Url | Super Spark Maker")
            {
                serverEndRequest(res, errorCodes.idInvalidFetched)
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
        else if (url.startsWith("/levels/"))
        {
            let levelListType = url.replace("/levels", "")
            if (levelListType == "/newest") levelListType = "/"

            let levelListTypes = [
                "/",
                "/plays",
                "/likes",
                "/hardest",
                "/easiest"
            ]

            if (!levelListTypes.includes(levelListType))
            {
                serverEndRequest(res, ) // OOPS THIS IS BROKEN LOL I DIDNT TEST IT
                return
            }

            let document = htmlParser.parse(await corsFetch("https://www.supersparkmaker.com/levels" + levelListType))

            let levelLinks = []

            document.querySelectorAll("a").forEach(link => {
                let levelId = link.innerText
                if (levelId.match(levelIdRegex))
                    levelLinks.push(levelId)
            })
            
            serverEndRequest(res, JSON.stringify({
                levels: levelLinks
            }), "application/json")
            return
        }
    }
    catch(e)
    {
        serverEndRequest(res, errorCodes.unknownInternal)
        console.log("Internal server error!")
        console.log(e)
        return
    }

    serverEndRequest(res, "404")
    return
})

function run()
{
    server.listen(80, url, () => {
        console.log(`Server is listening at port 80`)
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
