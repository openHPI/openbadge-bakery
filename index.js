const express      = require('express')
const bodyParser   = require('body-parser')
const jws          = require('jws')
const fs           = require('node-fs')
const config       = require('config')
const pngitxt      = require('png-itxt')
const randomstring = require('randomstring')


const app  = express()
const port = Number(process.env.PORT || config.server.port || 9000)
const env  = process.env.NODE_ENV || 'development'

app.use(bodyParser.json())

app.use((request, response, next) => {
  if (!request.body.assertion) return response.status(422).send({ error: "Request must contain assertion" })  
  if (!request.body.imagePath) return response.status(422).send({ error: "Request must contain imagePath" }) 
  next()
})

app.post('/bake', (request, response) => {
  signedAssertion = signAssertion(request.body.assertion)
  
  if (env == 'development') {
    //console.log("Raw body: %j", request.body)
    console.log("Signed assertion:", signedAssertion)
    console.log("Decoded assertion:", decodePayload(signedAssertion))
    console.log("Verified:", verifySignature(signedAssertion))
  }

  var itxtData = {
    type: 'iTXt',
    keyword: "openbadges",
    value: signedAssertion,
    language: '',
    translated: '',
    compressed: false,
    compression_type: 0
  }

  fs.createReadStream(config.images.basePath + request.body.imagePath)
    .pipe(pngitxt.set(itxtData))
    .pipe(response.contentType('image/png'))
})

app.listen(port, (err) => {
  if (err) {
    return console.log('Could not start server', err)
  }

  console.log(`Open Badges Bakery Server is listening on ${port}`)
})

function signAssertion(assertion) {
  return jws.sign({
    header: { alg: config.signing.algorithm },
    payload: assertion,
    privateKey: config.signing.privateKey
  })
}

function verifySignature(signed) {
  return jws.verify(signed, config.signing.algorithm, config.signing.publicKey)
}

function decodePayload(signed) {
  return jws.decode(signed).payload
}