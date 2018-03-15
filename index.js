const express      = require("express")
const bodyParser   = require("body-parser")
const jws          = require("jws")
const fs           = require("node-fs")
const path         = require("path")
const config       = require("config")
const streampng    = require("streampng")
const randomstring = require("randomstring")


const app  = express()
const port = Number(process.env.PORT || config.server.port || 9000)
const env  = process.env.NODE_ENV || "development"

app.use(bodyParser.json())

app.use((request, response, next) => {
  if (!request.body.assertion) return response.status(422).send({ error: "request must contain assertion" })  
  if (!request.body.imagePath) return response.status(422).send({ error: "request must contain imagePath" })
  console.log("INFO - baking for assertion:", request.body.assertion.id) 
  next()
})

app.post("/bake", (request, response) => {
  signedAssertion = signAssertion(request.body.assertion)
  
  if (env == "development") {
    console.log("INFO - signed assertion:", signedAssertion)
    console.log("INFO - decoded assertion:", decodePayload(signedAssertion))
    console.log("INFO - verified:", verifySignature(signedAssertion))
  }

  try {
    imagePath = path.join(config.images.basePath, request.body.imagePath)
    if (fs.existsSync(imagePath)) {
      var png = streampng(fs.createReadStream(imagePath))
      var chunk = createAssertionChunk(signedAssertion)
      png.inject(chunk)
      png.out().pipe(response.contentType('image/png'))
     
    } else {
      console.log("ERROR - error when baking badge: can't find badge template file")
      response.status(500).send({ error: "could not bake badge: template file missing" })
    }
  } catch (err) {
    console.log("ERROR - error when baking badge:", err)
    response.status(500).send({ error: "could not bake badge" })
  }
})

app.listen(port, (err) => {
  if (err) {
    return console.log("ERROR - could not start server", err)
  }

  console.log(`INFO - Open Badges Bakery Server is listening on ${port}`)
})

function signAssertion(assertion) {
  return jws.sign({
    header: { alg: config.signing.algorithm },
    payload: assertion,
    privateKey: config.signing.privateKey
  })
}

function createAssertionChunk(data) {
  return streampng.Chunk.iTXt({
    keyword: 'openbadges',
    text: data
  })
}

function verifySignature(signed) {
  return jws.verify(signed, config.signing.algorithm, config.signing.publicKey)
}

function decodePayload(signed) {
  return jws.decode(signed).payload
}