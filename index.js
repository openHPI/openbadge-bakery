const express    = require('express')
const bodyParser = require('body-parser')
const bakery     = require('openbadges-bakery')
const jws        = require('jws')
const fs         = require('node-fs')
const config     = require('config')
const svg2img    = require('node-svg2img')

const app  = express()
const port = Number(process.env.PORT || config.server.port || 9000)
const env  = process.env.NODE_ENV || 'development'

app.use(bodyParser.json())

app.use((request, response, next) => {
  if (!request.body.assertion) return response.status(422).send({ error: "Request must contain assertion" })  
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

  var imageBuf = Buffer(request.body.image, 'utf8')
  bakery.bake({ image: imageBuf, signature: signedAssertion }, (err, imageData) => {
    if (err) {
      return fail(err)
    }

    console.log(imageData)
  })


  
  response.send(signedAssertion)
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
  return jws.decode(signed).payload;

}

function isSvg(data) {
  return typeof(data == 'string') && data.indexOf('svg version') > -1
}

function fail(err) {
  console.log('Could not bake badge', err)
  return response.status(500).send({ error: err })
}